// itch.io 게임잼과 위비티 공모전을 수집해 Firestore `events`에 바로 등록합니다(자동 공지는 announce-discord.mjs).
// `event_candidates`는 "이미 본 행사" 기록이라, 운영진이 포털에서 행사를 삭제해도 다시 등록되지 않습니다.
// 기준에 안 맞아 등록되지 않은 과거 후보(status: pending)는 포털에서 수동 승인할 수 있습니다.
// GitHub Actions(.github/workflows/events-ics.yml)에서 FIREBASE_SERVICE_ACCOUNT 환경변수와 함께 실행.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ── 조정 가능한 설정 ──
const ITCH_MIN_JOINED = 300;          // 참가자 수가 이 값 이상이거나 "Ranked" 잼만 자동 등록
const ITCH_UPCOMING_PAGES = 2;        // 예정 잼 목록 페이지 수 (페이지당 약 50개, 인기순)
const MAX_NEW_PER_RUN = 15;           // 한 번에 자동 등록하는 최대 개수 (초과분은 다음 실행에서 처리)
const WEVITY_PAGES = 5;               // 위비티 IT 카테고리 목록 페이지 수 (페이지당 약 10개)
const WEVITY_KEYWORDS = ['게임', '인디', '해커톤', '유니티', '언리얼', '메타버스', 'game', 'unity', 'unreal', 'hackathon', 'XR', 'VR']; // 제목·분야에 포함되면 후보
const UA = 'Mozilla/5.0 (compatible; HMBG-club-bot; +https://hmbg.kr)';
const DELAY_MS = 1500;                // 사이트에 부담을 주지 않도록 요청 간격 유지

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s
  .replace(/&#0*39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const clean = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko,en;q=0.8' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  await sleep(DELAY_MS);
  return res.text();
}

// KST(UTC+9) 기준 'YYYY-MM-DD'
const kstDate = (d) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (ymd, n) => kstDate(new Date(new Date(`${ymd}T00:00:00+09:00`).getTime() + n * 86400000));

// ── itch.io ──
const UNIT_MS = { hour: 3600e3, day: 86400e3, week: 7 * 86400e3, month: 30 * 86400e3, year: 365 * 86400e3 };

function parseItch(html, mode) {
  const today = kstDate(new Date());
  const out = [];
  for (const block of html.split('<div class="jam lazy_images">').slice(1)) {
    const m = block.match(/<h3[^>]*><a href="(\/jam\/[^"]+)">(.*?)<\/a>/s);
    const iso = block.match(/class="date_countdown">([^<]+)</)?.[1];
    if (!m || !iso) continue;
    const joined = Number((block.match(/class="number">([\d,]+)<\/span> joined/)?.[1] || '0').replace(/,/g, ''));
    const ranked = block.includes('jam_ranked');
    if (joined < ITCH_MIN_JOINED && !ranked) continue;

    const at = new Date(iso);
    let startDate, endDate, note;
    if (mode === 'upcoming') {
      const dur = block.match(/class="date_duration">(\d+)\s+(hour|day|week|month|year)s?/);
      startDate = kstDate(at);
      endDate = dur ? kstDate(new Date(at.getTime() + Number(dur[1]) * UNIT_MS[dur[2]])) : startDate;
      note = `참가 ${joined.toLocaleString('en-US')}명${ranked ? ' · Ranked' : ''}`;
    } else {
      // 진행 중인 잼: 제출 마감일만 알 수 있음
      startDate = endDate = kstDate(at);
      note = `진행 중 · 제출 마감일 · 참가 ${joined.toLocaleString('en-US')}명`;
    }
    if (endDate < today) continue;
    // 시작일 기준 1년 넘게 먼 "Annual Jam" 자리표시 항목은 제외
    if (startDate > addDays(today, 365)) continue;

    const slug = m[1].replace('/jam/', '');
    const host = clean(block.match(/class="hosted_by[^"]*">(.*?)<\/div>/s)?.[1] || '').replace(/^Hosted by\s*/, '');
    out.push({
      id: `itch-${slug}`.slice(0, 100),
      source: 'itch.io',
      category: 'jam',
      title: clean(m[2]),
      startDate, endDate,
      link: `https://itch.io${m[1]}`,
      description: [host && `주최: ${host}`, note].filter(Boolean).join(' · '),
    });
  }
  return out;
}

async function collectItch() {
  const items = [];
  for (let p = 1; p <= ITCH_UPCOMING_PAGES; p++) {
    items.push(...parseItch(await get(`https://itch.io/jams/upcoming?page=${p}`), 'upcoming'));
  }
  items.push(...parseItch(await get('https://itch.io/jams/in-progress'), 'in-progress'));
  return items;
}

// ── 위비티 (IT/개발 카테고리 + 키워드 검색) ──
// 목록 페이지에는 마감까지 남은 일수(D-N)만 있어서 마감일 하나만 일정으로 만듭니다.
function parseWevity(html) {
  const today = kstDate(new Date());
  const out = [];
  for (const li of html.split(/<li[ >]/).slice(1)) {
    const m = li.match(/<a href="(\?c=find[^"]*gbn=view[^"]*ix=(\d+))">(.*?)<\/a>/s);
    const d = li.match(/<div class="day">\s*D-(\d+|day)/i);
    if (!m || !d) continue; // 마감된 건("마감")은 D-N이 없어 제외
    const title = clean(m[3].replace(/<span class='stat[^>]*>.*?<\/span>/gs, ''));
    const field = clean(li.match(/class="sub-tit">(.*?)<\/div>/s)?.[1] || '').replace(/^분야\s*:\s*/, '');
    const organ = clean(li.match(/class="organ">(.*?)<\/div>/s)?.[1] || '');
    const deadline = addDays(today, d[1].toLowerCase() === 'day' ? 0 : Number(d[1]));
    out.push({
      id: `wevity-${m[2]}`,
      source: 'wevity',
      category: 'contest',
      title,
      startDate: deadline, endDate: deadline,
      link: `https://www.wevity.com/?c=find&s=1&gbn=view&gp=1&ix=${m[2]}`,
      description: [organ && `주최: ${organ}`, field && `분야: ${field}`, '접수 마감일'].filter(Boolean).join(' · '),
    });
  }
  return out;
}

async function collectWevity() {
  const re = new RegExp(WEVITY_KEYWORDS.join('|'), 'i');
  const items = new Map();
  for (let p = 1; p <= WEVITY_PAGES; p++) {
    const html = await get(`https://www.wevity.com/?c=find&s=1&gub=1&cidx=20&gp=${p}`);
    for (const it of parseWevity(html)) {
      if (re.test(`${it.title} ${it.description}`)) items.set(it.id, it);
    }
  }
  return [...items.values()];
}

// ── 저장 ──
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const results = [];
for (const [name, fn] of [['itch.io', collectItch], ['wevity', collectWevity]]) {
  try {
    const items = await fn();
    console.log(`${name}: 후보 ${items.length}개 발견`);
    results.push(...items);
  } catch (e) {
    console.error(`${name} 수집 실패:`, e.message); // 한쪽이 실패해도 나머지는 계속
  }
}

let created = 0;
for (const it of results) {
  if (created >= MAX_NEW_PER_RUN) { console.log('상한 도달 — 나머지는 다음 실행에서 등록'); break; }
  const { id, source, ...ev } = it;
  const ref = db.collection('event_candidates').doc(id);
  const seen = await ref.get();
  // 이미 자동 등록됐거나 운영진이 처리(승인/거절)한 건 건너뜀 → 삭제된 행사가 부활하지 않음.
  // 예전 방식으로 쌓인 pending 후보는 기준을 통과하면 이번에 자동 등록으로 넘김.
  if (seen.exists && seen.data().status !== 'pending') continue;
  await ref.set({ ...it, status: 'auto', createdAt: seen.exists ? seen.data().createdAt : FieldValue.serverTimestamp() });
  await db.collection('events').doc(id).set({
    ...ev, source, createdBy: 'bot', createdAt: FieldValue.serverTimestamp(),
  });
  created++;
  console.log(`자동 등록: ${it.title}`);
}
console.log(`새 행사 ${created}개 자동 등록`);
