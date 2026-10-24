import { useMemo, useState } from 'react';
import PhotoViewer from './PhotoViewer';
import { EmptyState } from '../common/StateViews';
import { dateKey, formatMonthDay, formatTime, workSummary } from '../../services/format';

// 사진 타임라인: 보고 사진을 촬영일(없으면 보고일) 기준으로 날짜별로 묶어 최신순 표시
export default function PhotoTimeline({ reports, maxDays }) {
  const [viewerIndex, setViewerIndex] = useState(null);

  const { groups, flat } = useMemo(() => {
    const items = reports.flatMap((r) =>
      (r.photos ?? []).map((p) => ({
        ...p,
        caption: [r.processName, workSummary(r.work)].filter(Boolean).join(' · '),
        when: p.takenAt ?? r.createdAt,
        reportId: r.id,
      })),
    );
    items.sort((a, b) => (a.when < b.when ? 1 : -1));
    const map = new Map();
    items.forEach((it) => {
      const k = dateKey(it.when);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    });
    let list = [...map.entries()].map(([key, photos]) => ({ key, date: photos[0].when, photos }));
    if (maxDays) list = list.slice(0, maxDays);
    return { groups: list, flat: list.flatMap((g) => g.photos) };
  }, [reports, maxDays]);

  if (groups.length === 0) return <EmptyState title="아직 올라온 사진이 없어요." />;

  let offset = 0;
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const start = offset;
        offset += g.photos.length;
        return (
          <div key={g.key} className="flex gap-4">
            <div className="w-16 shrink-0 pt-1">
              <p className="text-[12px] font-bold text-gray-900">{formatMonthDay(g.date)}</p>
              <p className="text-[11px] text-gray-500">{g.photos.length}장</p>
            </div>
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
              {g.photos.map((p, i) => (
                <button
                  key={`${p.reportId}-${i}`}
                  type="button"
                  onClick={() => setViewerIndex(start + i)}
                  className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100"
                  title={p.caption}
                >
                  <img src={p.url} alt={p.caption} className="h-full w-full object-cover" loading="lazy" />
                  <span className="tabular absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[10px] text-white">
                    {formatTime(p.when)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {viewerIndex != null && (
        <PhotoViewer items={flat} index={viewerIndex} onChange={setViewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  );
}
