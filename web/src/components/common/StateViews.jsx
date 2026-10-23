import Icon from './Icon';

export function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-ink-900 ${className}`}
      aria-label="불러오는 중"
    />
  );
}

export function LoadingBlock({ label = '불러오는 중…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-10 text-sm text-gray-500 ${className}`}>
      <Spinner /> {label}
    </div>
  );
}

export function EmptyState({ title, description, className = '' }) {
  return (
    <div className={`px-6 py-10 text-center ${className}`}>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-3 px-6 py-10 text-center ${className}`}>
      <Icon name="alert" className="text-bad" size={22} />
      <p className="text-sm text-gray-700">{error?.message ?? '데이터를 불러오지 못했습니다.'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
