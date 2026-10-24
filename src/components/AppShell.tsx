import clsx from "clsx";
import {
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  LogOut,
  Menu,
  Search,
  Settings2,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ENV } from "../lib/env";
import { formatNumber } from "../lib/format";
import { getPageLabel, NAV_BY_ROLE, ROLE_META } from "../navigation";
import { useAppStore } from "../store/AppStore";
import type { Role } from "../types";
import { HelpWidget } from "./HelpPanel";
import {
  Avatar,
  Button,
  IconButton,
  Logo,
  Modal,
  RingProgress,
  cn,
} from "./ui";

function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { state, currentUser, currentCollector } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  if (!state || !currentUser || !currentCollector) return null;

  const role = state.currentRole;
  const meta = ROLE_META[role];
  const navItems = NAV_BY_ROLE[role];
  const RoleIcon = meta.icon;

  const userSubmissions = state.submissions.filter(
    (submission) => submission.userId === currentUser.id,
  );
  const thisWeek = userSubmissions.filter(
    (submission) => Date.now() - +new Date(submission.submittedAt) < 7 * 86400000,
  ).length;
  const weeklyGoal = Math.min(100, (thisWeek / 6) * 100);
  const collectorQueue = state.submissions.filter(
    (submission) =>
      submission.collectorId === currentCollector.id &&
      (submission.status === "assigned" || submission.status === "collected"),
  );
  const capacity = Math.min(
    100,
    ((currentCollector.processedKg + collectorQueue.reduce((sum, item) => sum + item.weightKg, 0)) /
      currentCollector.capacityKg) *
      100,
  );
  const pendingBottles = state.submissions.filter(
    (submission) => submission.status === "pending",
  ).length;
  const overdueBottles = state.submissions.filter(
    (submission) =>
      submission.status === "pending" &&
      Date.now() - +new Date(submission.submittedAt) > 5 * 86400000,
  ).length;

  const impactCard =
    role === "user" ? (
      <>
        <div className="sidebar-impact__head">
          <span>Weekly goal</span>
          <span className="sidebar-impact__tag">On track</span>
        </div>
        <div className="sidebar-impact__body">
          <RingProgress
            value={weeklyGoal}
            size={72}
            stroke={6}
            label={`${thisWeek}/6`}
            sublabel="bottles"
          />
          <div>
            <strong>{thisWeek} bottles</strong>
            <p>of 6 this week</p>
            <Link to="/app/scan" className="sidebar-impact__link">
              Scan another
            </Link>
          </div>
        </div>
      </>
    ) : role === "admin" ? (
      <>
        <div className="sidebar-impact__head">
          <span>Network pulse</span>
          <span className="sidebar-impact__tag">Live</span>
        </div>
        <div className="sidebar-impact__body">
          <RingProgress
            value={94}
            size={72}
            stroke={6}
            label="94"
            sublabel="health"
          />
          <div>
            <strong>{overdueBottles ? "Assignments need attention" : "All systems looping"}</strong>
            <p>
              {overdueBottles} overdue · {pendingBottles} awaiting pickup
            </p>
            <Link to="/app/admin/submissions" className="sidebar-impact__link">
              Open queue
            </Link>
          </div>
        </div>
      </>
    ) : (
      <>
        <div className="sidebar-impact__head">
          <span>Capacity</span>
          <span className="sidebar-impact__tag">This cycle</span>
        </div>
        <div className="sidebar-impact__body">
          <RingProgress
            value={capacity}
            size={72}
            stroke={6}
            label={`${Math.round(capacity)}%`}
            sublabel="used"
          />
          <div>
            <strong>{formatNumber(currentCollector.processedKg)} kg</strong>
            <p>processed to date</p>
            <Link to="/app/collector/intake" className="sidebar-impact__link">
              View intake
            </Link>
          </div>
        </div>
      </>
    );

  return (
    <aside className={cn("sidebar", mobileOpen && "is-open")} aria-label="Main navigation">
      <div className="sidebar__head">
        <Link to={meta.dashboard} className="sidebar__logo-link" aria-label="Loopr home">
          <Logo />
        </Link>
        <span className="env-pill">demo</span>
      </div>

      <div className="sidebar__workspace">
        <span className="sidebar__workspace-icon">
          <RoleIcon size={15} />
        </span>
        <div>
          <span>{meta.label}</span>
          <strong>
            {role === "admin"
              ? "Loopr India"
              : role === "collector"
                ? currentCollector.name
                : "Personal workspace"}
          </strong>
        </div>
        <ChevronDown size={14} />
      </div>

      <nav className="sidebar__nav">
        <span className="sidebar__nav-label">Workspace</span>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "sidebar__nav-item",
                  isActive && "is-active",
                  item.to === "/app/scan" && "sidebar__nav-item--accent",
                )
              }
              onClick={onClose}
            >
              <span className="sidebar__nav-icon">
                <Icon size={18} />
              </span>
              <span>{item.label}</span>
              {item.to === "/app/scan" ? <span className="sidebar__nav-pill">+25</span> : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__spacer" />

      <div className="sidebar-impact">{impactCard}</div>

      <div className="sidebar__profile">
        <Avatar
          name={
            role === "admin"
              ? ENV.auth.admin.name
              : role === "collector"
                ? currentCollector.name
                : currentUser.name
          }
          hue={role === "collector" ? currentCollector.avatarHue : role === "admin" ? 150 : currentUser.avatarHue}
          size={36}
        />
        <div className="sidebar__profile-copy">
          <strong>
            {role === "admin"
              ? ENV.auth.admin.name
              : role === "collector"
                ? currentCollector.manager
                : currentUser.name}
          </strong>
          <span>
            {role === "admin" ? "Network lead" : role === "collector" ? currentCollector.name : `${formatNumber(currentUser.points)} points`}
          </span>
        </div>
        <Link to="/app/settings" aria-label="Open settings" className="sidebar__settings">
          <Settings2 size={16} />
        </Link>
      </div>

      <button className="sidebar__mobile-close" onClick={onClose} aria-label="Close navigation">
        <X size={18} />
      </button>
    </aside>
  );
}

function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { state, currentUser, currentCollector } = useAppStore();
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  if (!state || !currentUser || !currentCollector || !session) return null;
  const role = session.role;
  const meta = ROLE_META[role];
  const RoleIcon = meta.icon;
  const accountName =
    role === "admin"
      ? session.name
      : role === "collector"
        ? currentCollector.manager
        : currentUser.name;
  const accountHue =
    role === "admin"
      ? 150
      : role === "collector"
        ? currentCollector.avatarHue
        : currentUser.avatarHue;

  const handleSignOut = () => {
    setOpen(false);
    onNavigate?.();
    signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="role-switcher" ref={ref}>
      <button
        className="role-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu. Signed in as ${meta.label}.`}
      >
        <span className="role-trigger__icon">
          <RoleIcon size={15} />
        </span>
        <span className="role-trigger__copy">
          <small>Signed in as</small>
          <strong>{meta.label}</strong>
        </span>
        <ChevronDown size={14} className={open ? "rotate" : ""} />
      </button>
      {open ? (
        <div className="role-menu" role="menu" aria-label="Account menu">
          <div className="role-menu__head">
            <span>Your session</span>
            <span className="role-menu__hint">Local workspace</span>
          </div>
          <div className="role-menu__account">
            <Avatar name={accountName} hue={accountHue} size={34} square />
            <div>
              <strong>{accountName}</strong>
              <span>{session.email}</span>
            </div>
            <span className="role-menu__account-badge">{meta.label}</span>
          </div>
          <Link
            to="/app/settings"
            className="role-menu__settings"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <Settings2 size={14} />
            Workspace settings
          </Link>
          <button
            type="button"
            className="role-menu__signout"
            onClick={handleSignOut}
            role="menuitem"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NotificationsMenu() {
  const { state } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const role = state?.currentRole ?? "user";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const items =
    role === "admin"
      ? [
          { title: "3 pickups are past their promised window", time: "12m ago", tone: "amber" },
          { title: "GreenLoop closed a 48.6 kg rPET batch", time: "1h ago", tone: "green" },
          { title: "Meera Nair crossed 3,000 Loop points", time: "3h ago", tone: "lime" },
        ]
      : role === "collector"
        ? [
            { title: "12 new bottles assigned to your Bengaluru route", time: "18m ago", tone: "blue" },
            { title: "Kora Living settled the Loop tote invoice", time: "2h ago", tone: "green" },
            { title: "New buyer match: EcoWeave Textiles", time: "5h ago", tone: "lime" },
          ]
        : [
            { title: "Your PET bottle was verified for recycling", time: "2h ago", tone: "green" },
            { title: "You moved up to #4 on the leaderboard", time: "1d ago", tone: "lime" },
            { title: "A new drop-off point opened in Indiranagar", time: "2d ago", tone: "blue" },
          ];

  return (
    <div className="notifications" ref={ref}>
      <button
        className="topbar-icon-btn"
        onClick={() => setOpen((current) => !current)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        <span className="notification-dot" />
      </button>
      {open ? (
        <div className="notification-menu">
          <div className="notification-menu__head">
            <strong>Notifications</strong>
            <span>3 new</span>
          </div>
          {items.map((item) => (
            <div className="notification-menu__item" key={item.title}>
              <span className={cn("notification-menu__dot", `is-${item.tone}`)} />
              <div>
                <p>{item.title}</p>
                <span>{item.time}</span>
              </div>
            </div>
          ))}
          <div className="notification-menu__foot">You are all caught up after these.</div>
        </div>
      ) : null}
    </div>
  );
}

function SearchDialog({
  open,
  onOpenChange,
  onHelp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHelp: () => void;
}) {
  const { state } = useAppStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const role = state?.currentRole ?? "user";
  const items = NAV_BY_ROLE[role];
  const quickActions = useMemo(() => {
    const primary =
      role === "user"
        ? { label: "Scan a bottle", icon: Sparkles, to: "/app/scan" }
        : role === "admin"
          ? { label: "Review submissions", icon: Truck, to: "/app/admin/submissions" }
          : { label: "Open collector intake", icon: Truck, to: "/app/collector/intake" };
    return [
      primary,
      { label: "Integration settings", icon: Settings2, to: "/app/settings" },
      { label: "Ask the Loopr guide", icon: CircleHelp, to: "__help__" },
    ];
  }, [role]);

  const results = items.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const go = (to: string) => {
    onOpenChange(false);
    setQuery("");
    navigate(to);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onOpenChange(false);
        setQuery("");
      }}
      title="Jump to"
      description="Move around Loopr without lifting your hands from the keyboard."
      size="md"
    >
      <div className="command-search">
        <Search size={17} />
        <input
          data-autofocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages, tools, settings..."
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) go(results[0].to);
          }}
          aria-label="Search pages"
        />
        <kbd>ESC</kbd>
      </div>
      <div className="command-list">
        <span className="command-list__label">Navigate</span>
        {results.length ? (
          results.map((item) => {
            const Icon = item.icon;
            return (
              <button className="command-item" key={item.to} onClick={() => go(item.to)}>
                <span className="command-item__icon">
                  <Icon size={16} />
                </span>
                <span>{item.label}</span>
                <span className="command-item__hint">Go</span>
              </button>
            );
          })
        ) : (
          <p className="command-empty">No page matches “{query}”.</p>
        )}
      </div>
      <div className="command-list">
        <span className="command-list__label">Quick tools</span>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              className="command-item"
              key={action.label}
              onClick={() => {
                if (action.to === "__help__") {
                  onOpenChange(false);
                  onHelp();
                  return;
                }
                go(action.to);
              }}
            >
              <span className="command-item__icon">
                <Icon size={16} />
              </span>
              <span>{action.label}</span>
              <span className="command-item__hint">
                {action.to === "__help__" ? "Voice" : "Open"}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function MobileBottomNav({ onMenu }: { onMenu: () => void }) {
  const { state } = useAppStore();
  if (!state) return null;
  const items = NAV_BY_ROLE[state.currentRole].filter((item) => item.to !== "/app/settings").slice(0, 4);
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn("mobile-nav-item", isActive && "is-active")}
          >
            <Icon size={19} />
            <span>{item.shortLabel ?? item.label}</span>
          </NavLink>
        );
      })}
      <button className="mobile-nav-item" onClick={onMenu}>
        <Menu size={19} />
        <span>Menu</span>
      </button>
    </nav>
  );
}

export function AppShell() {
  const { state, currentUser } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  const pageLabel = getPageLabel(location.pathname);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.classList.add("drawer-open");
    else document.body.classList.remove("drawer-open");
    return () => document.body.classList.remove("drawer-open");
  }, [mobileOpen]);

  if (!state || !currentUser) return null;
  const meta = ROLE_META[state.currentRole];

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      {mobileOpen ? (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              className="topbar-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div className="topbar__title">
              <span>{meta.label}</span>
              <strong>{pageLabel}</strong>
            </div>
          </div>

          <button
            className="topbar__search"
            onClick={() => setSearchOpen(true)}
            aria-label="Search or jump to"
          >
            <Search size={16} />
            <span>Search or jump to…</span>
            <kbd>
              <Command size={11} /> K
            </kbd>
          </button>

          <div className="topbar__right">
            <NotificationsMenu />
            <AccountMenu />
            <div className="topbar__avatar">
              <Avatar
                name={
                  state.currentRole === "admin"
                    ? ENV.auth.admin.name
                    : state.currentRole === "collector"
                      ? (state.collectors.find((collector) => collector.id === state.currentCollectorId)?.name ??
                        ENV.auth.collector.name)
                      : currentUser.name
                }
                hue={
                  state.currentRole === "admin"
                    ? 150
                    : state.currentRole === "collector"
                      ? (state.collectors.find((collector) => collector.id === state.currentCollectorId)?.avatarHue ?? 90)
                      : currentUser.avatarHue
                }
                size={36}
                square
              />
            </div>
          </div>
        </header>

        <main className="page-shell" id="main-content">
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                <span className="page-loading__ring" />
                <div>
                  <strong>Opening workspace</strong>
                  <span>Loading the latest local ledger…</span>
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      <MobileBottomNav onMenu={() => setMobileOpen(true)} />
      <HelpWidget open={helpOpen} onOpenChange={setHelpOpen} />
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onHelp={() => setHelpOpen(true)}
      />
    </div>
  );
}
