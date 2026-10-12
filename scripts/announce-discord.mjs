// 승인되어 `events`에 등록됐지만 아직 공지하지 않은 행사를 디스코드 웹훅으로 알립니다.
// 공지 후 `announcedAt`을 기록해 중복 공지를 막습니다. DISCORD_WEBHOOK_URL이 없으면 건너뜁니다.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const webhook = process.env.DISCORD_WEBHOOK_URL;
if (!webhook) {
  console.log('DISCORD_WEBHOOK_URL 없음 — 디스코드 공지를 건너뜁니다.');
  process.exit(0);
}

const CATEGORY = { jam: '🎮 게임잼', contest: '🏆 공모전', external: '🌐 외부 활동', club: '🍔 동아리 행사' };
const COLOR = { jam: 0x5865f2, contest: 0xf0b232, external: 0x3ba55d, club: 0xeb459e };
const MAX_PER_RUN = 10; // 한 번에 보내는 최대 공지 수 (초과분은 다음 실행에서)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const snap = await db.collection('events').orderBy('startDate').get();
const today = kstToday();
const pending = snap.docs.filter((d) => {
  const ev = d.data();
  return !ev.announcedAt && (ev.endDate || ev.startDate) >= today; // 이미 끝난 행사는 공지하지 않음
});
console.log(`공지할 행사 ${pending.length}개 (이번에 최대 ${MAX_PER_RUN}개)`);

for (const d of pending.slice(0, MAX_PER_RUN)) {
  const ev = d.data();
  const range = ev.endDate && ev.endDate !== ev.startDate ? `${ev.startDate} ~ ${ev.endDate}` : ev.startDate;
  const embed = {
    title: String(ev.title).slice(0, 250),
    url: /^https?:\/\//.test(ev.link || '') ? ev.link : undefined,
    description: ev.description ? String(ev.description).slice(0, 1000) : undefined,
    color: COLOR[ev.category] ?? 0x99aab5,
    fields: [{ name: '📅 일정', value: range, inline: true }],
    footer: { text: '햄부기 HMBG · 자동 수집 행사 공지' },
  };
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: '햄부기 공지',
      content: `📢 **새 ${CATEGORY[ev.category] || '일정'}** 이 등록됐어요!`,
      embeds: [embed],
      allowed_mentions: { parse: [] },
    }),
  });
  if (!res.ok) {
    console.error(`전송 실패 (${res.status}): ${ev.title}`);
    if (res.status === 429) await sleep(5000);
    continue; // 실패한 건 announcedAt을 남기지 않아 다음 실행 때 재시도
  }
  await d.ref.update({ announcedAt: FieldValue.serverTimestamp() });
  console.log(`공지 완료: ${ev.title}`);
  await sleep(1500); // 웹훅 속도 제한(5회/2초 수준) 여유
}
