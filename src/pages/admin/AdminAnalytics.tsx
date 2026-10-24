import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  Check,
  Download,
  Gauge,
  Layers3,
  Leaf,
  Lightbulb,
  MapPin,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BOTTLE_TYPES } from "../../data/bottles";
import {
  collectorStats,
  materialBreakdown,
  monthSeries,
  recycledRate,
  statusBreakdown,
  totalWeight,
} from "../../lib/analytics";
import {
  formatCompactCurrency,
  formatKg,
  formatNumber,
  formatPercent,
} from "../../lib/format";
import { useAppStore } from "../../store/AppStore";
import { ChartLegend, ChartTooltip } from "../../components/charts";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  ProgressBar,
  SectionHeader,
  StatCard,
  cn,
} from "../../components/ui";

export function AdminAnalytics() {
  const { state, notify } = useAppStore();
  if (!state) return null;

  const monthly = monthSeries(state.submissions, 6);
  const materials = materialBreakdown(state.submissions);
  const statuses = statusBreakdown(state.submissions);
  const partners = collectorStats(state.collectors, state.submissions);
  const totalRecycled = state.submissions.filter((submission) => submission.status === "recycled");
  const totalWeightRecycled = totalWeight(totalRecycled);
  const pending = state.submissions.filter((submission) => submission.status === "pending");
  const avgPendingAge = pending.length
    ? pending.reduce(
        (sum, submission) => sum + (Date.now() - +new Date(submission.submittedAt)) / 86400000,
        0,
      ) / pending.length
    : 0;
  const cityMap = state.submissions.reduce<Record<string, number>>((acc, submission) => {
    acc[submission.city] = (acc[submission.city] ?? 0) + 1;
    return acc;
  }, {});
  const cityData = Object.entries(cityMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const maxCity = Math.max(...cityData.map((city) => city.value), 1);
  const materialTotal = materials.reduce((sum, material) => sum + material.value, 0);
  const materialRecovery = BOTTLE_TYPES.map((bottle) => {
    const matches = state.submissions.filter((submission) => submission.bottleTypeId === bottle.id);
    const recycled = matches.filter((submission) => submission.status === "recycled");
    return {
      ...bottle,
      count: matches.length,
      recycled: recycled.length,
      rate: matches.length ? (recycled.length / matches.length) * 100 : 0,
      weight: matches.reduce((sum, item) => sum + item.weightKg, 0),
    };
  }).sort((a, b) => b.count - a.count);

  const agingBuckets = [
    { label: "0–2 days", value: 0, color: "#5c8b42" },
    { label: "3–5 days", value: 0, color: "#d5b26d" },
    { label: "6–10 days", value: 0, color: "#e39665" },
    { label: "10+ days", value: 0, color: "#c7664f" },
  ];
  state.submissions
    .filter((submission) => submission.status === "pending")
    .forEach((submission) => {
      const days = (Date.now() - +new Date(submission.submittedAt)) / 86400000;
      const index = days <= 2 ? 0 : days <= 5 ? 1 : days <= 10 ? 2 : 3;
      agingBuckets[index].value += 1;
    });

  const funnel = [
    { label: "Logged by members", value: state.submissions.length, icon: Layers3 },
    {
      label: "Assigned to collectors",
      value: state.submissions.filter((submission) => submission.status !== "pending").length,
      icon: Truck,
    },
    {
      label: "Collected at facility",
      value: state.submissions.filter(
        (submission) => submission.status === "collected" || submission.status === "recycled",
      ).length,
      icon: PackageCheck,
    },
    { label: "Verified recycled", value: totalRecycled.length, icon: Recycle },
  ];
  const funnelMax = funnel[0].value || 1;

  const topPartners = [...partners].sort((a, b) => b.processedKg - a.processedKg).slice(0, 3);
  const maxProcessed = Math.max(...partners.map((partner) => partner.processedKg), 1);
  const maxRevenue = Math.max(...partners.map((partner) => partner.revenue), 1);
  const radarData = [
    "Throughput",
    "Utilisation",
    "Diversion",
    "Reliability",
    "Revenue",
  ].map((metric) => {
    const entry: Record<string, string | number> = { metric };
    topPartners.forEach((partner) => {
      entry[partner.name] =
        metric === "Throughput"
          ? Math.round((partner.processedKg / maxProcessed) * 100)
          : metric === "Utilisation"
            ? Math.round(partner.utilisation)
            : metric === "Diversion"
              ? Math.round(
                  (partner.wasteDivertedKg / Math.max(1, partner.processedKg)) * 100,
                )
              : metric === "Reliability"
                ? Math.round((partner.rating / 5) * 100)
                : Math.round((partner.revenue / maxRevenue) * 100);
    });
    return entry;
  });
  const radarColors = ["#5c8b42", "#c79b51", "#7e9fc1"];

  const sortedMaterials = [...materials].sort((a, b) => b.value - a.value);
  const topMaterial = sortedMaterials[0];
  const slowPartner = [...partners].sort((a, b) => b.queueWeight - a.queueWeight)[0];
  const bestCity = cityData[0];
  const unassignedShare = (pending.length / Math.max(1, state.submissions.length)) * 100;

  const insights = [
    {
      icon: Sparkles,
      tone: "lime",
      title: `${topMaterial?.name ?? "PET"} leads the material mix`,
      body: `${topMaterial?.value ?? 0} bottles, ${Math.round(((topMaterial?.value ?? 0) / Math.max(1, materialTotal)) * 100)}% of everything scanned. Keep the PET route prioritized.`,
    },
    {
      icon: Timer,
      tone: "amber",
      title: `${avgPendingAge.toFixed(1)} day average assignment wait`,
      body: `${pending.length} bottles are unassigned. Moving this below 1.5 days would lift the recycled rate by an estimated 6–9 points.`,
    },
    {
      icon: Truck,
      tone: "blue",
      title: `${slowPartner?.name ?? "A partner"} holds the largest open queue`,
      body: `${formatKg(slowPartner?.queueWeight ?? 0)} waiting at ₹${slowPartner?.ratePerKg ?? 0}/kg. Rebalancing to an under-used partner can protect pickup SLAs.`,
    },
    {
      icon: MapPin,
      tone: "green",
      title: `${bestCity?.name ?? "Bengaluru"} is the busiest city`,
      body: `${bestCity?.value ?? 0} logged bottles. Use this concentration to test a city-specific reward and local collector route.`,
    },
  ];

  const exportAnalytics = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total bottles", String(state.submissions.length)],
      ["Verified recycled", String(totalRecycled.length)],
      ["Recycled rate", `${recycledRate(state.submissions).toFixed(2)}%`],
      ["Waste diverted kg", totalWeightRecycled.toFixed(2)],
      ["Pending assignment", String(pending.length)],
      ["Average pending age days", avgPendingAge.toFixed(2)],
      [],
      ["Material", "Bottles", "Recycled", "Recovery %", "Weight kg"],
      ...materialRecovery.map((material) => [
        material.name,
        String(material.count),
        String(material.recycled),
        material.rate.toFixed(1),
        material.weight.toFixed(2),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `loopr-network-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Network analysis exported as a CSV.");
  };

  return (
    <div className="page admin-analytics">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <Gauge size={13} /> Circular intelligence
          </span>
        }
        title={
          <>
            See where the loop <span className="serif-accent">gets stuck.</span>
          </>
        }
        description="A deeper read on material recovery, collector capacity, pickup ageing and the moments where circular value leaks away."
        actions={
          <>
            <Badge tone="neutral" icon={CalendarRange}>
              Lifetime view
            </Badge>
            <Button variant="secondary" size="md" icon={Download} onClick={exportAnalytics}>
              Export analysis
            </Button>
          </>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Circularity rate"
          value={formatPercent(recycledRate(state.submissions), 1)}
          detail={`${totalRecycled.length} of ${state.submissions.length} bottles`}
          trend={{ value: "Network", direction: "up" }}
          icon={Recycle}
          tone="lime"
        />
        <StatCard
          label="Verified recovery"
          value={formatKg(totalWeightRecycled)}
          detail={`${formatNumber(totalRecycled.length)} bottles`}
          trend={{ value: "Audited", direction: "up" }}
          icon={Leaf}
        />
        <StatCard
          label="Average assignment wait"
          value={`${avgPendingAge.toFixed(1)} days`}
          detail={`${pending.length} bottles pending`}
          trend={{ value: "Target < 1.5d", direction: "down", positive: false }}
          icon={Timer}
        />
        <StatCard
          label="Network margin pool"
          value={formatCompactCurrency(
            state.collectors.reduce((sum, collector) => sum + collector.profit, 0),
          )}
          detail="retained by partners"
          trend={{ value: "6% fee", direction: "up" }}
          icon={TrendingUp}
        />
      </div>

      <Card className="circularity-card">
        <div className="circularity-card__head">
          <div>
            <span className="eyebrow">Circularity funnel</span>
            <h2>From scan to second life</h2>
            <p>Each stage is a real commitment, not an estimate.</p>
          </div>
          <div className="circularity-card__rate">
            <span>End-to-end</span>
            <strong>{formatPercent((totalRecycled.length / Math.max(1, state.submissions.length)) * 100, 1)}</strong>
            <small>fully recycled</small>
          </div>
        </div>
        <div className="funnel">
          {funnel.map((stage, index) => {
            const Icon = stage.icon;
            const width = Math.max(28, (stage.value / funnelMax) * 100);
            const conversion =
              index === 0 ? 100 : (stage.value / Math.max(1, funnel[index - 1].value)) * 100;
            return (
              <div className="funnel__row" key={stage.label}>
                <div className="funnel__label">
                  <span className={cn("funnel__icon", `is-${index + 1}`)}>
                    <Icon size={16} />
                  </span>
                  <div>
                    <strong>{stage.label}</strong>
                    <span>{formatNumber(stage.value)} bottles</span>
                  </div>
                </div>
                <div className="funnel__track">
                  <span
                    className={cn("funnel__bar", `is-${index + 1}`)}
                    style={{ width: `${width}%` }}
                  >
                    {Math.round(width)}%
                  </span>
                </div>
                <div className="funnel__conversion">
                  {index === 0 ? (
                    <Badge tone="neutral">Start</Badge>
                  ) : (
                    <span className={cn(conversion < 65 ? "is-warn" : conversion < 85 ? "is-mid" : "is-good")}>
                      {Math.round(conversion)}% step conversion
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="circularity-card__foot">
          <span>
            <AlertTriangle size={14} /> {unassignedShare.toFixed(1)}% of intake is still waiting for
            a collector. This is the highest-leverage fix in the network.
          </span>
          <Link to="/app/admin/submissions" className="text-link">
            Open queue <ArrowRight size={14} />
          </Link>
        </div>
      </Card>

      <div className="analytics-grid analytics-grid--wide">
        <Card className="chart-card">
          <SectionHeader
            title="Recovery by month"
            subtitle="Verified bottles versus everything still in the loop."
            action={<Badge tone="green" dot>Verified only</Badge>}
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly} barGap={4} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 10 }} width={34} />
                <Tooltip cursor={{ fill: "rgba(16,37,27,.035)" }} content={<ChartTooltip valueFormatter={(value) => `${value} bottles`} />} />
                <Bar dataKey="recycled" name="Verified recycled" fill="#5c8b42" radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Bar dataKey="pending" name="Still in loop" fill="#dfc592" radius={[5, 5, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={[
              { label: "Verified recycled", color: "#5c8b42" },
              { label: "Still in loop", color: "#dfc592" },
            ]}
          />
        </Card>

        <Card className="status-donut-card">
          <SectionHeader title="Current status mix" subtitle="Where every bottle sits today." />
          <div className="admin-donut">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={statuses}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#66736a", fontSize: 11 }}
                  width={70}
                />
                <Tooltip cursor={{ fill: "rgba(16,37,27,.035)" }} content={<ChartTooltip valueFormatter={(value) => `${value} bottles`} />} />
                <Bar dataKey="value" name="Bottles" radius={[0, 5, 5, 0]} maxBarSize={18}>
                  {statuses.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="status-pills">
            {statuses.map((status) => (
              <div key={status.status}>
                <span className="legend-dot" style={{ background: status.color }} />
                <span>{status.label}</span>
                <strong>{status.value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="analytics-grid">
        <Card className="aging-card">
          <SectionHeader
            title="Pickup ageing"
            subtitle="How long unassigned bottles are waiting."
            action={<Badge tone="amber" dot>{pending.length} pending</Badge>}
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={agingBuckets} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 10 }} width={34} />
                <Tooltip cursor={{ fill: "rgba(16,37,27,.035)" }} content={<ChartTooltip valueFormatter={(value) => `${value} bottles`} />} />
                <Bar dataKey="value" name="Pending bottles" radius={[6, 6, 0, 0]} maxBarSize={38}>
                  {agingBuckets.map((bucket) => (
                    <Cell key={bucket.label} fill={bucket.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="aging-callout">
            <Timer size={16} />
            <p>
              Bottles older than 5 days reduce member trust and clog warehouse space. The oldest
              batch in this queue has been waiting since{" "}
              <strong>
                {pending.length
                  ? new Date(
                      Math.min(...pending.map((submission) => +new Date(submission.submittedAt))),
                    ).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  : "—"}
              </strong>
              .
            </p>
          </div>
        </Card>

        <Card className="waste-area-card">
          <SectionHeader
            title="Waste diverted over time"
            subtitle="Recycled material weight by month."
            action={<Badge tone="green">kg recovered</Badge>}
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={monthly} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="wasteArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5c8b42" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#5c8b42" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 10 }} width={34} />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${Number(value).toFixed(1)} kg`} />} />
                <Area
                  type="monotone"
                  dataKey="weight"
                  name="Waste diverted"
                  stroke="#5c8b42"
                  strokeWidth={2.2}
                  fill="url(#wasteArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="waste-area-card__foot">
            <div>
              <span>Lifetime recovered</span>
              <strong>{formatKg(state.submissions.reduce((sum, item) => sum + (item.status === "recycled" ? item.weightKg : 0), 0))}</strong>
            </div>
            <div>
              <span>Two-month trend</span>
              <strong>
                {formatKg(monthly.slice(-2).reduce((sum, item) => sum + item.weight, 0))}
              </strong>
            </div>
          </div>
        </Card>
      </div>

      <div className="analytics-grid">
        <Card className="material-recovery-card">
          <SectionHeader
            title="Material recovery"
            subtitle="Recovery rate and weight by bottle type."
            action={<Badge tone="neutral">All time</Badge>}
          />
          <div className="material-recovery-list">
            {materialRecovery.map((material) => (
              <div className="material-recovery-row" key={material.id}>
                <span className="material-recovery-row__dot" style={{ background: material.color }} />
                <div className="material-recovery-row__name">
                  <strong>{material.name}</strong>
                  <span>{material.code} · {formatNumber(material.count)} bottles</span>
                </div>
                <div className="material-recovery-row__bar">
                  <span style={{ width: `${material.rate}%`, background: material.color }} />
                </div>
                <strong className="material-recovery-row__rate">{material.rate.toFixed(0)}%</strong>
                <span className="material-recovery-row__weight">{formatKg(material.weight)}</span>
              </div>
            ))}
          </div>
          <div className="material-recovery-card__foot">
            <ShieldCheck size={15} />
            <p>
              Recovery is calculated against every bottle scanned, not just the ones assigned. Low
              rates point to sorting or collector coverage issues.
            </p>
          </div>
        </Card>

        <Card className="radar-card">
          <SectionHeader
            title="Collector strengths"
            subtitle="Top three partners, normalised across five signals."
            action={<Badge tone="neutral">Partner score</Badge>}
          />
          <div className="radar-chart">
            <ResponsiveContainer width="100%" height={286}>
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="rgba(16,37,27,.12)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "#66736a", fontSize: 10 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                {topPartners.map((partner, index) => (
                  <Radar
                    key={partner.id}
                    name={partner.name}
                    dataKey={partner.name}
                    stroke={radarColors[index]}
                    fill={radarColors[index]}
                    fillOpacity={0.12}
                    strokeWidth={1.8}
                  />
                ))}
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#66736a" }}
                  iconType="circle"
                  iconSize={7}
                />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value}/100`} />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="analytics-grid">
        <Card className="city-volume-card">
          <SectionHeader
            title="City volume"
            subtitle="Bottles logged by member city."
            action={<Badge tone="neutral">{cityData.length} cities</Badge>}
          />
          <div className="city-bars">
            {cityData.map((city) => (
              <div className="city-bar" key={city.name}>
                <span>{city.name}</span>
                <div>
                  <span style={{ width: `${(city.value / maxCity) * 100}%` }} />
                </div>
                <strong>{city.value}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card className="insights-card">
          <SectionHeader
            title="What to fix next"
            subtitle="Signals worth acting on this week."
            action={<Lightbulb size={17} />}
          />
          <div className="insight-list">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <div className={cn("insight", `is-${insight.tone}`)} key={insight.title}>
                  <span className="insight__icon">
                    <Icon size={16} />
                  </span>
                  <div>
                    <strong>{insight.title}</strong>
                    <p>{insight.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="material-economics-card">
        <SectionHeader
          title="Material scorecard"
          subtitle="Volume, recovery, value and recyclability by stream."
          action={
            <Link to="/app/admin/submissions" className="text-link">
              Manage submissions <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material</th>
                <th className="num">Scans</th>
                <th className="num">Verified</th>
                <th>Recovery</th>
                <th className="num">Weight</th>
                <th className="num">Points / bottle</th>
                <th>Recyclability</th>
              </tr>
            </thead>
            <tbody>
              {materialRecovery.map((material) => (
                <tr key={material.id}>
                  <td>
                    <div className="table-person">
                      <span className="material-dot" style={{ background: material.color }} />
                      <div>
                        <strong>{material.name}</strong>
                        <span>{material.material}</span>
                      </div>
                    </div>
                  </td>
                  <td className="num">{material.count}</td>
                  <td className="num">{material.recycled}</td>
                  <td>
                    <div className="mini-progress-row">
                      <ProgressBar value={material.rate} />
                      <span>{material.rate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="num">{formatNumber(material.weight)} kg</td>
                  <td className="num">+{material.points}</td>
                  <td>
                    <Badge tone={material.recyclability > 85 ? "green" : "amber"}>
                      {material.recyclability}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
