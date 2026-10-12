// Firestore `events` 컬렉션을 읽어 루트의 events.ics를 생성합니다.
// GitHub Actions(.github/workflows/events-ics.yml)에서 실행되며, 서비스 계정 JSON은
// 환경변수 FIREBASE_SERVICE_ACCOUNT 로 전달받습니다.
import { writeFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const CATEGORY = { jam: '게임잼', contest: '공모전', external: '외부 활동', club: '동아리 행사' };

// RFC 5545 텍스트 이스케이프
const esc = (s) => String(s ?? '')
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// 75바이트 초과 줄 접기 (UTF-8 문자 경계 유지)
function fold(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const ymd = (s) => s.replace(/-/g, '');

// 종일 일정의 DTEND는 종료일 "다음 날" (배타적)
function nextDay(s) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const snap = await getFirestore().collection('events').orderBy('startDate').get();

const lines = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//HMBG//Events//KO',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'X-WR-CALNAME:햄부기 HMBG 일정',
  'X-WR-TIMEZONE:Asia/Seoul',
  'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
  'X-PUBLISHED-TTL:PT6H',
];

for (const d of snap.docs) {
  const ev = d.data();
  if (!ev.title || !ev.startDate) continue;
  const desc = [ev.description, ev.link].filter(Boolean).join('\n');
  lines.push(
    'BEGIN:VEVENT',
    `UID:${d.id}@hmbg.kr`,
    // DTSTAMP를 고정값(등록 시각)으로 두어야 내용이 안 바뀌면 파일도 안 바뀌어 불필요한 커밋이 생기지 않음
    `DTSTAMP:${(ev.createdAt?.toDate?.() ?? new Date(0)).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    `DTSTART;VALUE=DATE:${ymd(ev.startDate)}`,
    `DTEND;VALUE=DATE:${nextDay(ev.endDate || ev.startDate)}`,
    `SUMMARY:${esc(`[${CATEGORY[ev.category] || '일정'}] ${ev.title}`)}`,
  );
  if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
  if (ev.link) lines.push(`URL:${esc(ev.link)}`);
  lines.push('END:VEVENT');
}
lines.push('END:VCALENDAR');

writeFileSync('events.ics', lines.map(fold).join('\r\n') + '\r\n');
console.log(`events.ics 생성: 행사 ${snap.size}개`);
