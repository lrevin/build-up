// 보고 체계(작업자 → 현장 관리자 → 본사): 현장 관리자가 작업자 보고·자재 요청을 정리해서 본사에 올릴 때 쓰는 도우미
import { MaterialItem, MaterialRequest, Report } from '../types';

const time = (iso: string) => new Date(iso).getTime();

/** 같은 이름·단위 자재는 수량을 합친다 */
export function mergeItems(lists: MaterialItem[][]): MaterialItem[] {
  const out: MaterialItem[] = [];
  for (const it of lists.flat()) {
    const key = (s: string) => s.replace(/\s+/g, '').toLowerCase();
    const same = out.find(
      o => key(o.name) === key(it.name) && key(o.unit) === key(it.unit),
    );
    if (same) {
      same.quantity = Math.round((same.quantity + it.quantity) * 100) / 100;
    } else {
      out.push({ ...it });
    }
  }
  return out;
}

/**
 * 내가(현장 관리자) 마지막으로 올린 보고 뒤에 작업자들이 올린 보고(보완 요청 중인 것은 뺀다).
 * 아직 내 보고가 없으면 작업자 보고 전부.
 */
export function workerReportsSinceMine(
  reports: Report[],
  myId: string,
): Report[] {
  const mine = reports
    .filter(r => r.authorId === myId)
    .reduce((t, r) => Math.max(t, time(r.createdAt)), 0);
  return reports
    .filter(
      r =>
        r.authorId !== myId &&
        time(r.createdAt) > mine &&
        r.review?.status !== 'revision',
    )
    .sort((a, b) => time(a.createdAt) - time(b.createdAt));
}

/** 본사에 올릴 정리: 진행한 작업(짧게) · 메모(작업자별 자세히) · 사용 자재(합계) */
export function summarizeReports(list: Report[]): {
  works: string[];
  memo: string;
  materials: MaterialItem[];
} {
  const people = [...new Set(list.map(r => r.author))];
  // 진행한 작업은 모두 합쳐 100자까지(서버 제한)라 짧게: 자세한 내용은 메모에
  const names =
    people.length > 3
      ? `${people.slice(0, 3).join(', ')} 외 ${people.length - 3}명`
      : people.join(', ');
  const works = [`작업자 보고 ${list.length}건 정리 (${names})`.slice(0, 100)];
  const memo = list
    .map(r => {
      const d = new Date(r.createdAt);
      const when = `${d.getMonth() + 1}/${d.getDate()} ${String(
        d.getHours(),
      ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const status = r.review?.status === 'approved' ? '승인' : '검토 대기';
      const photos = r.photoUris.length
        ? ` · 사진 ${r.photoUris.length}장`
        : '';
      return `[${when} ${r.author}] ${r.work.replace(
        /\n/g,
        ', ',
      )}${photos} (${status})`;
    })
    .join('\n');
  return {
    works,
    memo,
    materials: mergeItems(list.map(r => r.materialUsages ?? [])),
  };
}

/** 승인된 시각(처리 이력의 마지막 승인). 이력이 없으면 요청 시각 */
const approvedAt = (m: MaterialRequest) => {
  const ev = [...(m.timeline ?? [])]
    .reverse()
    .find(e => e.status === 'approved');
  return time(ev?.at ?? m.createdAt);
};

/** 내가 마지막으로 본사에 요청한 뒤에 승인한 작업자 자재 요청(= 아직 본사에 안 올린 것) */
export function workerRequestsSinceMine(
  requests: MaterialRequest[],
  myId: string,
): MaterialRequest[] {
  const mine = requests
    .filter(m => m.authorId === myId)
    .reduce((t, m) => Math.max(t, time(m.createdAt)), 0);
  return requests.filter(
    m => m.authorId !== myId && m.status === 'approved' && approvedAt(m) > mine,
  );
}
