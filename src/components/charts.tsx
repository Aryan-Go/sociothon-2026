import type { ReactNode } from "react";

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string }>;
  label?: string | number;
  valueFormatter?: (value: number | string, name?: string) => string;
  labelFormatter?: (label: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label !== undefined ? (
        <div className="chart-tooltip__label">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      ) : null}
      <div className="chart-tooltip__rows">
        {payload.map((item, index) => (
          <div className="chart-tooltip__row" key={`${item.dataKey ?? item.name}-${index}`}>
            <span className="chart-tooltip__dot" style={{ background: item.color }} />
            <span>{item.name}</span>
            <strong>
              {valueFormatter
                ? valueFormatter(item.value ?? 0, item.name)
                : typeof item.value === "number"
                  ? item.value.toLocaleString("en-IN")
                  : item.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartLegend({
  items,
  className = "",
}: {
  items: { label: string; color: string; value?: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={`chart-legend ${className}`}>
      {items.map((item) => (
        <span className="chart-legend__item" key={item.label}>
          <span className="chart-legend__dot" style={{ background: item.color }} />
          {item.label}
          {item.value !== undefined ? <strong>{item.value}</strong> : null}
        </span>
      ))}
    </div>
  );
}

export function ChartEmpty({
  title = "No data yet",
  description = "Activity will appear here as soon as the first bottle is logged.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="chart-empty">
      <span className="chart-empty__orbit" />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
