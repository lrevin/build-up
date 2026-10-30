// 작업 평점 별 5개. 점수만큼 칠한다(3.5점 → 별 3개 + 반 개, 3.6점 → 네 번째 별 60%)
// onSelect를 주면 별을 눌러 고를 수 있다(같은 별을 다시 누르면 0.5점 내려감)
export default function RatingStars({ value, onSelect, size = 22 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={value == null ? '평점 없음' : `${value.toFixed(1)}점`}>
      {[1, 2, 3, 4, 5].map((score) => {
        const fill = Math.max(0, Math.min(1, (value ?? 0) - (score - 1)));
        const star = (
          <span className="relative inline-block leading-none" style={{ fontSize: size }}>
            <span className="text-gray-200">★</span>
            <span className="absolute inset-y-0 left-0 overflow-hidden text-brand-strong" style={{ width: `${fill * 100}%` }}>
              ★
            </span>
          </span>
        );
        return onSelect ? (
          <button
            key={score}
            type="button"
            onClick={() => onSelect(value === score ? score - 0.5 : score)}
            aria-label={`${score}점`}
          >
            {star}
          </button>
        ) : (
          <span key={score}>{star}</span>
        );
      })}
    </span>
  );
}
