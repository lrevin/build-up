// 날짜·숫자 표시 규칙을 한 곳에 모은다. 서버 날짜는 ISO 문자열.

const pad = (n) => String(n).padStart(2, '0');
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 86_400_000);

export const toDate = (iso) => (iso ? new Date(iso) : null);

export function formatTime(iso) {
  const d = toDate(iso);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '-';
}

export function formatMonthDay(iso) {
  const d = toDate(iso);
  return d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : '-';
}

export function formatFullDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function formatDateTime(iso) {
  const d = toDate(iso);
  return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${formatTime(iso)}` : '-';
}

// '오늘 14:32' / '어제 09:10' / '9월 22일'
export function formatRelative(iso, now = new Date()) {
  const d = toDate(iso);
  if (!d) return '보고 없음';
  const diff = dayDiff(now, d);
  if (diff === 0) return `오늘 ${formatTime(iso)}`;
  if (diff === 1) return `어제 ${formatTime(iso)}`;
  if (diff < 7) return `${diff}일 전`;
  return formatMonthDay(iso);
}

export const daysSince = (iso, now = new Date()) => (iso ? dayDiff(now, toDate(iso)) : Infinity);

export const isToday = (iso, now = new Date()) => daysSince(iso, now) === 0;

// 날짜 키 (그룹핑용) 'YYYY-MM-DD' — 로컬 시간 기준
export function dateKey(iso) {
  const d = toDate(iso);
  return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : 'unknown';
}

export const formatPercent = (v) => `${Number(v ?? 0).toFixed(1)}%`;

export function formatDelta(from, to) {
  const delta = Number(to ?? 0) - Number(from ?? 0);
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return `${sign}${Math.abs(delta).toFixed(1)}%p`;
}

export const clampPercent = (v) => Math.min(100, Math.max(0, Number(v) || 0));

// 진행한 작업은 여러 개를 한 줄씩 입력한다 (앱 3주차 변경)
export const workLines = (work) =>
  String(work ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

// 목록용 한 줄 요약: '첫 작업 외 2건'
export function workSummary(work, fallback = '') {
  const lines = workLines(work);
  if (lines.length === 0) return fallback;
  return lines.length === 1 ? lines[0] : `${lines[0]} 외 ${lines.length - 1}건`;
}

export const todayYmd = (d = new Date()) => dateKey(d.toISOString());

export function addDaysYmd(days, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return dateKey(d.toISOString());
}

// 'YYYY-MM-DD' 까지 남은 날 (음수 = 지남)
export function daysUntil(ymd, now = new Date()) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return dayDiff(new Date(y, m - 1, d), now);
}
