import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Clock3,
  Handshake,
  Inbox,
  Leaf,
  MapPin,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Truck,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BottleGlyph } from "../../components/BottleGlyph";
import { ChartLegend, ChartTooltip } from "../../components/charts";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionHeader,
  SegmentedControl,
  StatCard,
  StatusBadge,
  cn,
} from "../../components/ui";
import { BOTTLE_BY_ID } from "../../data/bottles";
import {
  collectorStats,
  materialBreakdown,
  rankUsers,
  recycledRate,
  statusBreakdown,
  submissionsByDay,
  totalWeight,
  trendDelta,
} from "../../lib/analytics";
import {
  formatCompactCurrency,
  formatDate,
  formatKg,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "../../lib/format";
import { useAppStore } from "../../store/AppStore";
import type { Submission } from "../../types";

type Range = "7" | "30" | "90";

function NetworkMap() {
  return (
    <div className="network-map" aria-hidden="true">
      <svg viewBox="0 0 380 240" fill="none">
        <path d="M72 175 142 102l79 38 84-88" stroke="rgba(200,241,105,.26)" strokeWidth="1.3" strokeDasharray="4 5" />
        <path d="M72 175 220 207l85-155" stroke="rgba(200,241,105,.17)" strokeWidth="1.3" strokeDasharray="4 5" />
        <path d="M142 102 58 54l85 141" stroke="rgba(200,241,105,.13)" strokeWidth="1" />
        <path d="M305 52 283 147l22 60" stroke="rgba(200,241,105,.14)" strokeWidth="1" />
        <circle cx="72" cy="175" r="16" fill="rgba(200,241,105,.12)" stroke="#c8f169" strokeWidth="1.5" />
        <circle cx="72" cy="175" r="5" fill="#c8f169" />
        <circle cx="142" cy="102" r="13" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.35)" />
        <circle cx="142" cy="102" r="4" fill="#dce8dc" />
        <circle cx="221" cy="140" r="10" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.3)" />
        <circle cx="221" cy="140" r="3" fill="#dce8dc" />
        <circle cx="305" cy="52" r="15" fill="rgba(229,131,95,.16)" stroke="#e5835f" />
        <circle cx="305" cy="52" r="5" fill="#e5835f" />
        <circle cx="58" cy="54" r="8" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.28)" />
        <circle cx="283" cy="147" r="9" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.3)" />
        <circle cx="220" cy="207" r="7" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.25)" />
      </svg>
      <span className="network-map__label network-map__label--one">
        <MapPin size={10} /> Bengaluru
      </span>
      <span className="network-map__label network-map__label--two">Mumbai</span>
      <span className="network-map__label network-map__label--three">Delhi</span>
    </div>
  );
}

function RecentRow({ submission }: { submission: Submission }) {
  const { state } = useAppStore();
  const bottle = BOTTLE_BY_ID[submission.bottleTypeId];
  const user = state?.users.find((item) => item.id === submission.userId);
  const collector = state?.collectors.find((item) => item.id === submission.collectorId);
  return (
    <tr>
      <td>
        <div className="table-person">
          <BottleGlyph bottleTypeId={submission.bottleTypeId} size={20} />
          <div>
            <strong>{bottle?.name}</strong>
            <span>{submission.city}</span>
          </div>
        </div>
      </td>
      <td>
        <span className="table-muted">{user?.name}</span>
      </td>
      <td>
        <span className="table-muted">{collector?.name ?? "Unassigned"}</span>
      </td>
      <td>
        <span className="table-muted">{formatRelativeTime(submission.submittedAt)}</span>
      </td>
      <td>
        <StatusBadge status={submission.status} />
      </td>
      <td className="num">
        <strong className="point-value">+{submission.points}</strong>
      </td>
    </tr>
  );
}

export function AdminOverview() {
  const { state } = useAppStore();
  const [range, setRange] = useState<Range>("30");

  if (!state) return null;

  const days = Number(range);
  const cutoff = Date.now() - days * 86400000;
  const previousCutoff = cutoff - days * 86400000;
  const periodSubmissions = state.submissions.filter(
    (submission) => +new Date(submission.submittedAt) >= cutoff,
  );
  const previousSubmissions = state.submissions.filter((submission) => {
    const time = +new Date(submission.submittedAt);
    return time >= previousCutoff && time < cutoff;
  });
  const recycled = periodSubmissions.filter((submission) => submission.status === "recycled");
  const inFlight = periodSubmissions.filter((submission) => submission.status !== "recycled");
  const monthData = submissionsByDay(periodSubmissions, days > 30 ? 90 : 30);
  const materials = materialBreakdown(periodSubmissions);
  const statuses = statusBreakdown(periodSubmissions);
  const partners = collectorStats(state.collectors, state.submissions);
  const topMembers = rankUsers(state.users, state.submissions).slice(0, 5);
  const pending = state.submissions.filter((submission) => submission.status === "pending");
  const aged = state.submissions.filter(
    (submission) =>
      submission.status === "pending" &&
      Date.now() - +new Date(submission.submittedAt) > 5 * 86400000,
  );
  const reviewPartners = state.collectors.filter((collector) => collector.status === "review");
  const activePartners = state.collectors.filter((collector) => collector.status === "verified");
  const totalBottleValue = state.submissions
    .filter((submission) => submission.status !== "recycled")
    .reduce((sum, submission) => sum + submission.weightKg, 0);
  const revenue = state.collectors.reduce((sum, collector) => sum + collector.revenue, 0);
  const platformFees = state.transactions
    .filter((transaction) => transaction.type === "platform_fee")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const growth = trendDelta(periodSubmissions.length, previousSubmissions.length);
  const recycledGrowth = trendDelta(
    recycled.length,
    previousSubmissions.filter((submission) => submission.status === "recycled").length,
  );
  const topCollectors = [...partners].sort((a, b) => b.processedKg - a.processedKg);
  const materialTotal = materials.reduce((sum, material) => sum + material.value, 0);

  const collectorChart = topCollectors.map((collector) => ({
    name: collector.name.replace("Materials", "Mat.").replace("Recovery", "Rec."),
    processed: collector.processedKg,
    queue: Math.round(collector.queueWeight),
  }));

  return (
    <div className="page admin-overview">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <ShieldCheck size={13} /> Network operations
          </span>
        }
        title={
          <>
            Keep the whole loop <span className="serif-accent">moving.</span>
          </>
        }
        description="Every bottle, partner and payout in one control room. Spot friction before it becomes waste."
        actions={
          <>
            <SegmentedControl
              ariaLabel="Reporting range"
              value={range}
              onChange={(value) => setRange(value)}
              options={[
                { value: "7", label: "7D" },
                { value: "30", label: "30D" },
                { value: "90", label: "90D" },
              ]}
              size="sm"
            />
            <Link to="/app/admin/submissions" className="btn btn--primary btn--md">
              <Inbox size={16} />
              Review queue
            </Link>
          </>
        }
      />

      <Card dark className="admin-ops">
        <div className="admin-ops__copy">
          <Badge tone="lime" icon={Sparkles}>
            Live network
          </Badge>
          <h2>
            {formatKg(totalBottleValue)} of feedstock is ready.
            <br />
            <span className="serif-accent">{aged.length || 3} pickups</span> need a decision.
          </h2>
          <p>
            {activePartners.length} verified collectors across {new Set(state.collectors.map((collector) => collector.city)).size} cities are keeping material in motion. The network is processing {formatPercent(recycledRate(state.submissions), 1)} of all bottles received.
          </p>
          <div className="admin-ops__actions">
            <Link to="/app/admin/submissions" className="btn btn--primary btn--md">
              Assign bottles
              <ArrowRight size={15} />
            </Link>
            <Link to="/app/admin/collectors" className="btn btn--lime-ghost btn--md">
              Partner desk
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="admin-ops__visual">
          <NetworkMap />
          <div className="admin-ops__floating admin-ops__floating--top">
            <span className="status-pulse" />
            <div>
              <strong>{formatCompactCurrency(revenue)}</strong>
              <span>network GMV</span>
            </div>
          </div>
          <div className="admin-ops__floating admin-ops__floating--bottom">
            <TrendingUp size={14} />
            <div>
              <strong>+{formatPercent(growth, 1)}</strong>
              <span>vs previous period</span>
            </div>
          </div>
        </div>
        <div className="admin-ops__ticker">
          <div>
            <span>
              <Inbox size={13} /> Awaiting assignment
            </span>
            <strong>{pending.length}</strong>
          </div>
          <div>
            <span>
              <Clock3 size={13} /> Overdue pickups
            </span>
            <strong>{aged.length}</strong>
          </div>
          <div>
            <span>
              <Handshake size={13} /> Partner review
            </span>
            <strong>{reviewPartners.length}</strong>
          </div>
          <div>
            <span>
              <CircleDollarSign size={13} /> Circularity fees
            </span>
            <strong>{formatCompactCurrency(platformFees)}</strong>
          </div>
        </div>
      </Card>

      <div className="stats-grid">
        <StatCard
          label="Bottles in network"
          value={formatNumber(periodSubmissions.length)}
          detail={`last ${days} days`}
          trend={{
            value: formatPercent(growth, 1),
            direction: growth >= 0 ? "up" : "down",
            positive: growth >= 0,
          }}
          icon={Boxes}
          spark={monthData.map((point) => point.submitted)}
        />
        <StatCard
          label="Recycled rate"
          value={formatPercent(recycledRate(periodSubmissions), 1)}
          detail={`${recycled.length} verified`}
          trend={{
            value: formatPercent(recycledGrowth, 1),
            direction: recycledGrowth >= 0 ? "up" : "down",
            positive: recycledGrowth >= 0,
          }}
          icon={Recycle}
          tone="lime"
        />
        <StatCard
          label="Waste diverted"
          value={formatKg(totalWeight(recycled))}
          detail="confirmed by partners"
          trend={{ value: "verified", direction: "up" }}
          icon={Leaf}
        />
        <StatCard
          label="Active collectors"
          value={formatNumber(activePartners.length)}
          detail={`${state.collectors.length - activePartners.length} in review`}
          trend={{ value: `${state.collectors.length} partners`, direction: "up" }}
          icon={Truck}
          spark={topCollectors.map((collector) => collector.processedKg)}
        />
      </div>

      <div className="admin-chart-grid">
        <Card className="chart-card admin-flow-chart">
          <SectionHeader
            title="Material flow"
            subtitle={`Bottles received versus verified over ${days} days.`}
            action={
              <div className="chart-head-stats">
                <span>
                  <i style={{ background: "#5b8b45" }} /> Received
                </span>
                <span>
                  <i style={{ background: "#c79b51" }} /> Verified
                </span>
              </div>
            }
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b8b45" stopOpacity={0.29} />
                    <stop offset="100%" stopColor="#5b8b45" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="adminVerified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c79b51" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#c79b51" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#838b82", fontSize: 11 }}
                  interval={days === 7 ? 0 : 4}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#838b82", fontSize: 11 }}
                  width={34}
                />
                <Tooltip
                  content={<ChartTooltip valueFormatter={(value) => `${value} bottles`} />}
                  cursor={{ stroke: "rgba(16,37,27,.14)", strokeDasharray: "4 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="submitted"
                  name="Received"
                  stroke="#5b8b45"
                  strokeWidth={2.2}
                  fill="url(#adminReceived)"
                  activeDot={{ r: 4, fill: "#5b8b45", stroke: "#fbf9f3", strokeWidth: 3 }}
                />
                <Area
                  type="monotone"
                  dataKey="recycled"
                  name="Verified"
                  stroke="#c79b51"
                  strokeWidth={1.8}
                  fill="url(#adminVerified)"
                  activeDot={{ r: 4, fill: "#c79b51", stroke: "#fbf9f3", strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-stat-strip">
            <div>
              <span>Received</span>
              <strong>{formatNumber(periodSubmissions.length)}</strong>
            </div>
            <div>
              <span>Verified recycled</span>
              <strong>{formatNumber(recycled.length)}</strong>
            </div>
            <div>
              <span>In pickup</span>
              <strong>{formatNumber(inFlight.length)}</strong>
            </div>
            <div>
              <span>Avg. confidence</span>
              <strong>
                {formatPercent(
                  (periodSubmissions.reduce((sum, item) => sum + item.confidence, 0) /
                    Math.max(1, periodSubmissions.length)) *
                    100,
                  1,
                )}
              </strong>
            </div>
          </div>
        </Card>

        <Card className="material-card admin-material">
          <SectionHeader
            title="Material mix"
            subtitle={`${formatNumber(materialTotal)} bottles sorted in this period.`}
            action={<Badge tone="neutral">By volume</Badge>}
          />
          <div className="admin-donut">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={materials}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={3}
                  stroke="none"
                >
                  {materials.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={<ChartTooltip valueFormatter={(value) => `${value} bottles`} />}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{formatNumber(materialTotal)}</strong>
              <span>bottles</span>
            </div>
          </div>
          <div className="material-legend">
            {materials.map((material) => (
              <div key={material.id}>
                <span className="legend-dot" style={{ background: material.color }} />
                <span>{material.name}</span>
                <strong>{formatNumber(material.value)}</strong>
                <small>
                  {Math.round((material.value / Math.max(1, materialTotal)) * 100)}%
                </small>
              </div>
            ))}
          </div>
          <Link to="/app/admin/analytics" className="text-link">
            Open material analytics <ArrowRight size={14} />
          </Link>
        </Card>
      </div>

      <div className="admin-chart-grid admin-chart-grid--reverse">
        <Card className="ops-queue-card">
          <SectionHeader
            title="Operations queue"
            subtitle="What needs a human decision right now."
            action={
              <Badge tone={aged.length ? "amber" : "green"} dot>
                {aged.length ? `${aged.length} overdue` : "On track"}
              </Badge>
            }
          />
          <div className="status-stack">
            {statuses.map((status) => (
              <div className="status-stack__row" key={status.status}>
                <span className="status-stack__dot" style={{ background: status.color }} />
                <span>{status.label}</span>
                <div className="status-stack__bar">
                  <span
                    style={{
                      width: `${(status.value / Math.max(1, periodSubmissions.length)) * 100}%`,
                      background: status.color,
                    }}
                  />
                </div>
                <strong>{status.value}</strong>
              </div>
            ))}
          </div>
          <div className="ops-queue__alerts">
            <Link to="/app/admin/submissions" className="ops-alert">
              <span className="ops-alert__icon is-amber">
                <Inbox size={15} />
              </span>
              <div>
                <strong>{pending.length} bottles need collector assignment</strong>
                <span>Oldest waiting {pending.length ? formatRelativeTime(pending[pending.length - 1].submittedAt) : "—"}</span>
              </div>
              <ArrowRight size={15} />
            </Link>
            <Link to="/app/admin/collectors" className="ops-alert">
              <span className="ops-alert__icon is-blue">
                <Handshake size={15} />
              </span>
              <div>
                <strong>{reviewPartners.length} collectors awaiting verification</strong>
                <span>Review certifications and pickup capacity</span>
              </div>
              <ArrowRight size={15} />
            </Link>
            <Link to="/app/admin/users" className="ops-alert">
              <span className="ops-alert__icon is-green">
                <UsersRound size={15} />
              </span>
              <div>
                <strong>
                  {formatNumber(state.users.reduce((sum, user) => sum + user.points, 0))} points
                  issued to members
                </strong>
                <span>{state.users.filter((user) => user.status === "active").length} active members</span>
              </div>
              <ArrowRight size={15} />
            </Link>
          </div>
        </Card>

        <Card className="collector-chart-card">
          <SectionHeader
            title="Collector throughput"
            subtitle="Processed kilograms against the current queue."
            action={
              <Link to="/app/admin/collectors" className="text-link">
                Partner desk <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={264}>
              <BarChart
                data={collectorChart}
                layout="vertical"
                margin={{ top: 6, right: 12, left: 4, bottom: 0 }}
                barGap={3}
              >
                <CartesianGrid horizontal={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#838b82", fontSize: 10 }}
                  width={34}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#66736a", fontSize: 11 }}
                  width={88}
                />
                <Tooltip
                  cursor={{ fill: "rgba(16,37,27,.035)" }}
                  content={<ChartTooltip valueFormatter={(value) => `${value} kg`} />}
                />
                <Bar dataKey="processed" name="Processed" fill="#5b8b45" radius={[0, 5, 5, 0]} maxBarSize={12} />
                <Bar dataKey="queue" name="In queue" fill="#dfc38f" radius={[0, 5, 5, 0]} maxBarSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={[
              { label: "Processed", color: "#5b8b45" },
              { label: "In queue", color: "#dfc38f" },
            ]}
          />
        </Card>
      </div>

      <div className="admin-lower-grid">
        <Card className="recent-table-card">
          <SectionHeader
            title="Latest submissions"
            subtitle="The newest bottles entering the network."
            action={
              <Link to="/app/admin/submissions" className="text-link">
                View all <ArrowRight size={14} />
              </Link>
            }
          />
          {periodSubmissions.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bottle</th>
                    <th>Member</th>
                    <th>Collector</th>
                    <th>Received</th>
                    <th>Status</th>
                    <th className="num">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {[...periodSubmissions]
                    .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt))
                    .slice(0, 6)
                    .map((submission) => (
                      <RecentRow key={submission.id} submission={submission} />
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No bottles in this period"
              description="Try a longer reporting window or invite members to scan."
            />
          )}
        </Card>

        <div className="admin-side-stack">
          <Card className="top-members-card">
            <SectionHeader
              title="Top members"
              subtitle="All-time verified points."
              action={
                <Link to="/app/admin/users" className="text-link">
                  Manage <ArrowRight size={14} />
                </Link>
              }
            />
            <div className="mini-leaderboard">
              {topMembers.map((member, index) => (
                <div className="mini-leaderboard__row" key={member.id}>
                  <span className={cn("mini-leaderboard__rank", index < 3 && "is-top")}>
                    {index + 1}
                  </span>
                  <Avatar name={member.name} hue={member.avatarHue} size={30} />
                  <div>
                    <strong>{member.name}</strong>
                    <span>{member.city}</span>
                  </div>
                  <strong className="mini-leaderboard__points">
                    {formatNumber(member.points)}
                  </strong>
                </div>
              ))}
            </div>
          </Card>

          <Card className="network-health-card">
            <div className="network-health-card__head">
              <div>
                <span className="eyebrow">Network health</span>
                <h3>All routes looping</h3>
              </div>
              <span className="health-score">94</span>
            </div>
            <div className="health-list">
              <div>
                <span>Collector verification</span>
                <strong>{activePartners.length}/{state.collectors.length}</strong>
                <ProgressBar value={(activePartners.length / state.collectors.length) * 100} tone="forest" />
              </div>
              <div>
                <span>Capacity used</span>
                <strong>
                  {Math.round(
                    (state.collectors.reduce((sum, collector) => sum + collector.processedKg, 0) /
                      Math.max(
                        1,
                        state.collectors.reduce((sum, collector) => sum + collector.capacityKg, 0),
                      )) *
                      100,
                  )}
                  %
                </strong>
                <ProgressBar
                  value={
                    (state.collectors.reduce((sum, collector) => sum + collector.processedKg, 0) /
                      Math.max(
                        1,
                        state.collectors.reduce((sum, collector) => sum + collector.capacityKg, 0),
                      )) *
                    100
                  }
                  tone="amber"
                />
              </div>
              <div>
                <span>Recycled verification</span>
                <strong>{formatPercent(recycledRate(state.submissions), 1)}</strong>
                <ProgressBar value={recycledRate(state.submissions)} />
              </div>
            </div>
            <Link to="/app/admin/analytics" className="network-health-card__link">
              Inspect all signals <ArrowRight size={14} />
            </Link>
          </Card>
        </div>
      </div>

      <div className="admin-footer-strip">
        <div>
          <Timer size={17} />
          <p>
            Pickups older than 5 days affect partner reliability scores. The network currently has{" "}
            <strong>{aged.length} overdue bottles</strong>.
          </p>
        </div>
        <Link to="/app/admin/submissions" className="text-link">
          Clear the queue <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
