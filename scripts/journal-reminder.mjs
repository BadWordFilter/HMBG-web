// 이번 주(월~일, KST) 개발 일지를 한 번도 올리지 않은 팀을 찾아 디스코드로 알립니다.
// 한 팀에서 한 명이라도 제출했으면 그 팀은 제출한 것으로 봅니다. 마감: 일요일 23:59(KST).
//
// 사용: node scripts/journal-reminder.mjs [auto|remind|final]
//   remind : 이번 주 기준 리마인드 (미제출 팀이 없으면 아무것도 보내지 않음)
//   final  : 지난주 기준 최종 공지 (전부 제출했으면 축하 메시지)
//   auto   : KST 요일로 판단 — 월요일이면 final, 그 외엔 remind
// 환경변수: FIREBASE_SERVICE_ACCOUNT, DISCORD_REMINDER_WEBHOOK_URL(없으면 DISCORD_WEBHOOK_URL),
//           TEAM_WEBHOOKS(선택, {"팀이름":"웹훅URL"} JSON), DRY_RUN=1 이면 전송 없이 출력만.
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const PORTAL_URL = 'https://hmbg.kr/portal.html';
const KST = 9 * 3600e3;
const DAY = 86400e3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dry = process.env.DRY_RUN === '1';

// ── 기간 계산 (KST 월요일 00:00 ~ 다음 월요일 00:00) ──
const nowKst = new Date(Date.now() + KST);
const dow = nowKst.getUTCDay(); // 0=일 … 6=토
let mode = process.argv[2] || 'auto';
if (mode === 'auto') mode = dow === 1 ? 'final' : 'remind';

const daysSinceMonday = (dow + 6) % 7;
let weekStart = Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate() - daysSinceMonday) - KST;
if (mode === 'final') weekStart -= 7 * DAY; // 최종 공지는 방금 끝난 지난주 기준
const weekEnd = weekStart + 7 * DAY;
const md = (ms) => { const d = new Date(ms + KST); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const rangeLabel = `${md(weekStart)}(월) ~ ${md(weekEnd - DAY)}(일)`;

// ── 설정 ──
const cfg = JSON.parse(readFileSync(new URL('../config/discord-teams.json', import.meta.url), 'utf-8')).teams || {};
const teamWebhooks = process.env.TEAM_WEBHOOKS ? JSON.parse(process.env.TEAM_WEBHOOKS) : {};
const sharedWebhook = process.env.DISCORD_REMINDER_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
if (!sharedWebhook && !dry) {
  console.log('디스코드 웹훅 URL이 없어 건너뜁니다.');
  process.exit(0);
}

// ── 휴지기: 대상 주가 config/journal-skip.json 의 기간과 하루라도 겹치면 알림을 보내지 않음 ──
// (월요일 최종 공지도 "지난주"를 기준으로 판단하므로, 시험 직후 월요일 공지도 함께 건너뜀)
const kstDay = (ms) => new Date(ms + KST).toISOString().slice(0, 10);
const monday = kstDay(weekStart);
const sunday = kstDay(weekEnd - DAY);
const skips = JSON.parse(readFileSync(new URL('../config/journal-skip.json', import.meta.url), 'utf-8')).skip || [];
const hit = skips.find((r) => r.from <= sunday && (r.to || r.from) >= monday);
if (hit) {
  console.log(`[${mode}] ${rangeLabel} — 휴지기(${hit.reason || `${hit.from}~${hit.to || hit.from}`})라 알림을 건너뜁니다.`);
  process.exit(0);
}

// ── 제출 현황 ──
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const [teamsSnap, usersSnap, subsSnap] = await Promise.all([
  db.collection('teams').get(),
  db.collection('users').get(),
  db.collection('submissions')
    .where('createdAt', '>=', Timestamp.fromMillis(weekStart))
    .where('createdAt', '<', Timestamp.fromMillis(weekEnd))
    .get(),
]);

// 팀원이 한 명도 없는 팀은 제출할 수 없으므로 제외
const activeTeamIds = new Set(
  usersSnap.docs.map((d) => d.data()).filter((u) => u.teamId && u.role !== 'pending').map((u) => u.teamId),
);
const submittedTeamIds = new Set(subsSnap.docs.map((d) => d.data().teamId).filter(Boolean));

const teams = teamsSnap.docs.map((d) => ({ id: d.id, name: d.data().name })).filter((t) => activeTeamIds.has(t.id));
const missing = teams.filter((t) => !submittedTeamIds.has(t.id));
console.log(`[${mode}] ${rangeLabel} — 팀 ${teams.length}개 중 미제출 ${missing.length}개: ${missing.map((t) => t.name).join(', ') || '없음'}`);

const roleMention = (t) => (cfg[t.name]?.roleId ? `<@&${cfg[t.name].roleId}>` : `**${t.name}**`);

async function send(url, body) {
  if (dry) { console.log('DRY_RUN →', JSON.stringify(body, null, 1)); return true; }
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) console.error(`전송 실패 (${res.status})`);
  await sleep(1500); // 웹훅 속도 제한 여유
  return res.ok;
}

if (!missing.length) {
  if (mode === 'final') {
    await send(sharedWebhook, {
      username: '햄부기 일지 알림',
      embeds: [{ title: '🎉 모든 팀이 개발 일지를 제출했어요!', description: rangeLabel, color: 0x3ba55d }],
    });
  }
  process.exit(0);
}

const roleIds = missing.map((t) => cfg[t.name]?.roleId).filter(Boolean);
const title = mode === 'final' ? '📋 지난주 개발 일지 미제출 팀' : '⏰ 개발 일지 마감 임박!';
const lead = mode === 'final'
  ? '마감이 지났어요. 아직 안 올린 팀은 이번 주 안에 꼭 올려 주세요.'
  : '오늘 **23:59**까지 포털에 올려 주세요. 팀원 한 명만 올려도 돼요.';

// 공용 채널: 미제출 팀 목록 + 역할 멘션
await send(sharedWebhook, {
  username: '햄부기 일지 알림',
  content: missing.map(roleMention).join(' '),
  allowed_mentions: { roles: roleIds },
  embeds: [{
    title,
    url: PORTAL_URL,
    description: `${lead}\n\n**대상 기간** ${rangeLabel}\n**미제출 팀** ${missing.map((t) => t.name).join(', ')}`,
    color: mode === 'final' ? 0xed4245 : 0xf0b232,
    footer: { text: '햄부기 HMBG · 일요일 23:59 마감' },
  }],
});

// 팀별 전용 채널: 웹훅이 등록된 팀에만 따로 발송
for (const t of missing) {
  const url = teamWebhooks[t.name];
  if (!url) continue;
  await send(url, {
    username: '햄부기 일지 알림',
    content: `${roleMention(t)} ${lead}\n${PORTAL_URL}`,
    allowed_mentions: { roles: cfg[t.name]?.roleId ? [cfg[t.name].roleId] : [] },
  });
}
