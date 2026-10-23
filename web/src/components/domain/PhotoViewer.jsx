import { useCallback, useEffect } from 'react';
import Icon from '../common/Icon';
import { formatDateTime } from '../../services/format';

// 사진 크게 보기. items: [{ url, takenAt, latitude, longitude, caption }]
export default function PhotoViewer({ items, index, onChange, onClose }) {
  const item = items[index];
  const go = useCallback(
    (step) => onChange((index + step + items.length) % items.length),
    [index, items.length, onChange],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  if (!item) return null;
  const hasGeo = item.latitude != null && item.longitude != null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="relative flex max-h-full w-full max-w-4xl flex-col" onClick={(e) => e.stopPropagation()}>
        <img src={item.url} alt={item.caption ?? '현장 사진'} className="max-h-[75vh] w-full rounded-lg object-contain" />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
          {item.caption && <span className="font-semibold text-white">{item.caption}</span>}
          <span className="flex items-center gap-1">
            <Icon name="clock" size={14} /> 촬영 {item.takenAt ? formatDateTime(item.takenAt) : '정보 없음'}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="pin" size={14} />
            {hasGeo ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}` : '위치 정보 없음'}
          </span>
          <span className="ml-auto text-white/60">
            {index + 1} / {items.length}
          </span>
        </div>
        {items.length > 1 && (
          <>
            <button
              type="button"
              aria-label="이전 사진"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            >
              <Icon name="left" />
            </button>
            <button
              type="button"
              aria-label="다음 사진"
              onClick={() => go(1)}
              className="absolute right-2 top-1/3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            >
              <Icon name="right" />
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-gray-800 shadow"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
