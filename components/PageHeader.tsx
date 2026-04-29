interface Props {
  kicker?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function PageHeader({
  kicker,
  title,
  description,
  action,
}: Props) {
  return (
    <header className="flex items-end justify-between gap-6 pb-6 mb-6">
      <div className="flex flex-col gap-1.5 min-w-0">
        {kicker && (
          <span
            className="text-[10.5px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--color-ink-3)" }}
          >
            {kicker}
          </span>
        )}
        <h1
          className="text-[26px] font-bold tracking-tight leading-tight m-0"
          style={{ color: "var(--color-ink)" }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="text-[14px] m-0 max-w-[640px]"
            style={{ color: "var(--color-ink-2)" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
