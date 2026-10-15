export function Card({ className = '', children, ...rest }) {
  return (
    <section className={`rounded-xl border border-line bg-white ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, right, className = '' }) {
  return (
    <header className={`flex items-start justify-between gap-3 px-5 pt-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0 text-xs text-gray-500">{right}</div>}
    </header>
  );
}
