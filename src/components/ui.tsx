import clsx from "clsx";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Info,
  LoaderCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { initials } from "../lib/format";
import { useAppStore } from "../store/AppStore";
import type { SubmissionStatus, UserStatus } from "../types";

export function cn(...values: Array<string | false | null | undefined>): string {
  return clsx(values);
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={cn("logo", compact && "logo--compact")}>
      <span className="logo__mark">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M8.7 9.9A9.4 9.4 0 0 1 25.3 14h2.8l-4.2 5.2L19.7 14h2.7a6.4 6.4 0 0 0-10.8-2.8L8.7 9.9Z"
            fill="currentColor"
          />
          <path
            d="M23.3 22.1A9.4 9.4 0 0 1 6.7 18H3.9l4.2-5.2L12.3 18h-2.7a6.4 6.4 0 0 0 10.8 2.8l2.9 1.3Z"
            fill="currentColor"
          />
        </svg>
      </span>
      {!compact && (
        <span className="logo__type">
          loopr<span>.</span>
        </span>
      )}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "danger" | "lime-ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn("btn", `btn--${variant}`, `btn--${size}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="spin" size={16} /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: LucideIcon;
  variant?: "default" | "dark" | "lime";
  size?: "sm" | "md";
}

export function IconButton({
  label,
  icon: Icon,
  className,
  variant = "default",
  size = "md",
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn("icon-btn", `icon-btn--${variant}`, `icon-btn--${size}`, className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={size === "sm" ? 16 : 18} />
    </button>
  );
}

export function Card({
  children,
  className,
  dark,
  ...props
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", dark && "card--dark", className)} {...props}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("page-header", className)}>
      <div className="page-header__copy">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("section-head", className)}>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <div className="section-head__action">{action}</div> : null}
    </div>
  );
}

export function Avatar({
  name,
  hue = 90,
  size = 40,
  className,
  square = false,
}: {
  name: string;
  hue?: number;
  size?: number;
  className?: string;
  square?: boolean;
}) {
  const style = {
    "--avatar-hue": hue,
    "--avatar-size": `${size}px`,
    width: size,
    height: size,
    fontSize: Math.max(10, size * 0.3),
  } as CSSProperties;
  return (
    <span
      className={cn("avatar", square && "avatar--square", className)}
      style={style}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

type BadgeTone = "neutral" | "lime" | "green" | "amber" | "blue" | "violet" | "red" | "dark";

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
  icon: Icon,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <span className={cn("badge", `badge--${tone}`, className)}>
      {dot ? <span className="badge__dot" /> : Icon ? <Icon size={12} /> : null}
      {children}
    </span>
  );
}

const statusTone: Record<SubmissionStatus, BadgeTone> = {
  pending: "amber",
  assigned: "blue",
  collected: "violet",
  recycled: "green",
};

const statusLabel: Record<SubmissionStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  collected: "Collected",
  recycled: "Recycled",
};

export function StatusBadge({
  status,
  className,
}: {
  status: SubmissionStatus;
  className?: string;
}) {
  return (
    <Badge tone={statusTone[status]} dot className={cn("status-badge", className)}>
      {statusLabel[status]}
    </Badge>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge tone={status === "active" ? "green" : "neutral"} dot>
      {status === "active" ? "Active" : "Paused"}
    </Badge>
  );
}

export interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}

export function Sparkline({
  data,
  color = "#6f9c3d",
  className,
  width = 100,
  height = 36,
  fill = true,
}: SparklineProps) {
  const { line, area } = useMemo(() => {
    if (!data.length) return { line: "", area: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const stepX = width / Math.max(1, data.length - 1);
    const points = data.map((value, index) => {
      const x = index * stepX;
      const y = height - 3 - ((value - min) / span) * (height - 6);
      return [x, y];
    });
    const linePath = points
      .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
    const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
    return { line: linePath, area: areaPath };
  }, [data, height, width]);

  const gradientId = `spark-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("sparkline", className)}
      aria-hidden="true"
    >
      {fill ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  detail,
  trend,
  icon: Icon,
  tone = "default",
  spark,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  trend?: { value: string; direction: "up" | "down"; positive?: boolean };
  icon?: LucideIcon;
  tone?: "default" | "lime" | "dark" | "clay";
  spark?: number[];
  className?: string;
}) {
  const TrendIcon = trend?.direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={cn("stat-card", `stat-card--${tone}`, className)}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {Icon ? (
          <span className="stat-card__icon">
            <Icon size={17} />
          </span>
        ) : null}
      </div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__foot">
        <div className="stat-card__meta">
          {trend ? (
            <span
              className={cn(
                "trend",
                (trend.positive ?? trend.direction === "up") ? "trend--up" : "trend--down",
              )}
            >
              <TrendIcon size={13} />
              {trend.value}
            </span>
          ) : null}
          {detail ? <span>{detail}</span> : null}
        </div>
        {spark ? <Sparkline data={spark} width={86} height={30} /> : null}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "lime",
  label,
  className,
}: {
  value: number;
  tone?: "lime" | "forest" | "amber" | "blue" | "clay";
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("progress", `progress--${tone}`, className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function RingProgress({
  value,
  size = 96,
  stroke = 8,
  label,
  sublabel,
  color = "#c8f169",
  track = "rgba(255,255,255,.13)",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  color?: string;
  track?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${Math.round(value)} percent`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring__label">
        <strong>{label ?? `${Math.round(value)}%`}</strong>
        {sublabel ? <span>{sublabel}</span> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("empty-state", compact && "empty-state--compact")}>
      <span className="empty-state__icon">
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("field", className)}>
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...props} />;
}

export function SelectInput({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input", "select", className)} {...props}>
      {children}
    </select>
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input", "textarea", className)} {...props} />;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div className={cn("segmented", `segmented--${size}`, className)} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            className={cn("segmented__item", value === option.value && "is-active")}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {Icon ? <Icon size={14} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const ModalContext = createContext<null | { close: () => void }>(null);

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.classList.add("modal-open");
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      focusable?.focus();
    }, 50);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <ModalContext.Provider value={{ close: onClose }}>
      <div className="modal-layer">
        <button className="modal-backdrop" onClick={onClose} aria-label="Close dialog" tabIndex={-1} />
        <div
          className={cn("modal", `modal--${size}`)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          ref={panelRef}
        >
          <div className="modal__head">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description ? <p>{description}</p> : null}
            </div>
            <IconButton icon={X} label="Close dialog" onClick={onClose} />
          </div>
          <div className="modal__body">{children}</div>
          {footer ? <div className="modal__footer">{footer}</div> : null}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body,
  );
}

export function ToastViewport() {
  const { toasts, dismissToast } = useAppStore();
  return createPortal(
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon =
          toast.tone === "success" ? Check : toast.tone === "error" ? AlertCircle : Info;
        return (
          <div key={toast.id} className={cn("toast", `toast--${toast.tone}`)} role="status">
            <span className="toast__icon">
              <Icon size={16} />
            </span>
            <span>{toast.message}</span>
            <button
              className="toast__close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

export function InlineLink({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button className={cn("inline-link", className)} onClick={onClick} type="button">
      {children}
      <ChevronRight size={14} />
    </button>
  );
}
