import {
  ArrowRight,
  Award,
  CalendarRange,
  Check,
  Download,
  Flame,
  GlassWater,
  Leaf,
  Medal,
  PackageCheck,
  Recycle,
  ScanLine,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
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
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionHeader,
  SelectInput,
  StatCard,
  StatusBadge,
  cn,
} from "../../components/ui";
import { BOTTLE_BY_ID } from "../../data/bottles";
import {
  materialBreakdown,
  monthSeries,
  recycledRate,
  userMonthlyBottles,
  userSubmissions,
} from "../../lib/analytics";
import {
  formatDate,
  formatKg,
  formatNumber,
  formatRelativeTime,
} from "../../lib/format";
import { useAppStore } from "../../store/AppStore";
import type { SubmissionStatus } from "../../types";

function buildHeatmap(submissions: ReturnType<typeof userSubmissions>) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const cells: { date: Date; count: number; points: number }[] = [];
  for (let offset = 83; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setDate(date.getDate() - offset);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const matches = submissions.filter((submission) => {
      const submitted = new Date(submission.submittedAt);
      return submitted >= date && submitted < next;
    });
    cells.push({
      date,
      count: matches.length,
      points: matches.reduce((sum, item) => sum + item.points, 0),
    });
  }
  return cells;
}

export function ActivityPage() {
  const { state, currentUser, notify } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<"all" | SubmissionStatus>("all");

  if (!state || !currentUser) return null;

  const submissions = userSubmissions(state.submissions, currentUser.id);
  const heatmap = buildHeatmap(submissions);
  const monthly = monthSeries(submissions, 6);
  const materials = materialBreakdown(submissions);
  const filtered =
    statusFilter === "all"
      ? submissions
      : submissions.filter((submission) => submission.status === statusFilter);
  const recycled = submissions.filter((submission) => submission.status === "recycled").length;
  const inFlight = submissions.filter((submission) => submission.status !== "recycled").length;
  const monthBottles = userMonthlyBottles(state.submissions, currentUser.id);
  const glassCount = submissions.filter((submission) => submission.bottleTypeId === "glass").length;
  const materialTotal = materials.reduce((sum, item) => sum + item.value, 0);

  const now = new Date();
  const monthLabels = useMemo(() => {
    const labels: string[] = [];
    for (let offset = 2; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      labels.push(date.toLocaleDateString("en-IN", { month: "short" }));
    }
    return labels;
  }, [now.getMonth(), now.getFullYear()]);

  const exportHistory = () => {
    const rows = [
      ["Date", "Bottle", "Material", "Status", "Points", "Weight (kg)", "City", "Source"],
      ...submissions.map((submission) => {
        const bottle = BOTTLE_BY_ID[submission.bottleTypeId];
        return [
          new Date(submission.submittedAt).toISOString(),
          bottle?.name ?? submission.bottleTypeId,
          bottle?.material ?? "",
          submission.status,
          String(submission.points),
          submission.weightKg.toFixed(3),
          submission.city,
          submission.source,
        ];
      }),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `loopr-impact-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Your bottle history was exported as a CSV.");
  };

  const achievements = [
    {
      name: "First loop",
      description: "Log your first bottle",
      icon: Sparkles,
      unlocked: submissions.length > 0,
      tone: "lime",
    },
    {
      name: "Half century",
      description: "Rescue 50 bottles",
      icon: Medal,
      unlocked: currentUser.bottleCount >= 50,
      tone: "amber",
    },
    {
      name: "Glass guardian",
      description: "Return 5 glass bottles",
      icon: GlassWater,
      unlocked: glassCount >= 5,
      tone: "violet",
    },
    {
      name: "Ten kilo club",
      description: "Divert 10 kg from landfill",
      icon: Leaf,
      unlocked: currentUser.kgDiverted >= 10,
      tone: "green",
    },
  ];

  return (
    <div className="page activity-page">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <CalendarRange size={13} /> Your impact ledger
          </span>
        }
        title={
          <>
            Every bottle, <span className="serif-accent">accounted for.</span>
          </>
        }
        description="A transparent record of what you returned, what was verified, and the waste that never reached a landfill."
        actions={
          <>
            <Button variant="secondary" size="md" icon={Download} onClick={exportHistory}>
              Export history
            </Button>
            <Link to="/app/scan" className="btn btn--primary btn--md">
              <ScanLine size={16} />
              Scan a bottle
            </Link>
          </>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Bottles in your ledger"
          value={formatNumber(currentUser.bottleCount)}
          detail={`${submissions.length} shown here`}
          icon={Recycle}
          trend={{ value: `${monthBottles} this month`, direction: "up" }}
          tone="lime"
        />
        <StatCard
          label="Waste diverted"
          value={formatKg(currentUser.kgDiverted)}
          detail="verified by collectors"
          icon={Leaf}
          trend={{ value: "94% recovered", direction: "up" }}
        />
        <StatCard
          label="Loop points earned"
          value={formatNumber(currentUser.points)}
          detail="lifetime balance"
          icon={Trophy}
          trend={{ value: "+12.4%", direction: "up" }}
        />
        <StatCard
          label="Closed-loop rate"
          value={`${Math.round(recycledRate(submissions))}%`}
          detail={`${inFlight} still in pickup`}
          icon={Check}
          trend={{ value: `${recycled} verified`, direction: "up" }}
        />
      </div>

      <div className="activity-top">
        <Card className="activity-chart">
          <SectionHeader
            title="Six months of returns"
            subtitle="Verified bottles compared with those still in the pickup flow."
            action={
              <Badge tone="neutral" icon={CalendarRange}>
                Last 6 months
              </Badge>
            }
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={252}>
              <BarChart data={monthly} barGap={4} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#838b82", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#838b82", fontSize: 11 }}
                  width={34}
                />
                <Tooltip
                  cursor={{ fill: "rgba(16,37,27,.035)" }}
                  content={<ChartTooltip valueFormatter={(value) => `${value} bottles`} />}
                />
                <Bar dataKey="recycled" name="Verified recycled" fill="#5c8b42" radius={[6, 6, 0, 0]} maxBarSize={26} />
                <Bar dataKey="pending" name="In pickup" fill="#e1c189" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={[
              { label: "Verified recycled", color: "#5c8b42" },
              { label: "In pickup", color: "#e1c189" },
            ]}
          />
        </Card>

        <Card className="material-card">
          <SectionHeader title="Your material mix" subtitle="What you return most often." />
          <div className="donut-wrap">
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={materials}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={80}
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
                <strong>{materialTotal}</strong>
                <span>scans</span>
              </div>
            </div>
            <div className="donut-legend">
              {materials.map((item) => (
                <div key={item.id}>
                  <span className="legend-dot" style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <strong>{Math.round((item.value / Math.max(1, materialTotal)) * 100)}%</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="heatmap-card">
        <SectionHeader
          title="Return rhythm"
          subtitle="Every square is a day. Darker means more bottles returned."
          action={
            <div className="heatmap-months">
              {monthLabels.map((month) => (
                <span key={month}>{month}</span>
              ))}
            </div>
          }
        />
        <div className="heatmap">
          <div className="heatmap__labels">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          {Array.from({ length: 12 }).map((_, week) => (
            <div className="heatmap__week" key={week}>
              {heatmap
                .slice(week * 7, week * 7 + 7)
                .map((cell) => (
                  <span
                    key={cell.date.toISOString()}
                    className={cn(
                      "heatmap__cell",
                      cell.count === 0 && "is-empty",
                      cell.count === 1 && "is-one",
                      cell.count === 2 && "is-two",
                      cell.count >= 3 && "is-three",
                    )}
                    title={`${formatDate(cell.date.toISOString())} · ${cell.count} bottles · ${cell.points} points`}
                  />
                ))}
            </div>
          ))}
        </div>
        <div className="heatmap__foot">
          <div className="heatmap__scale">
            <span>Less</span>
            <span className="heatmap__cell is-empty" />
            <span className="heatmap__cell is-one" />
            <span className="heatmap__cell is-two" />
            <span className="heatmap__cell is-three" />
            <span>More</span>
          </div>
          <span>
            <Flame size={14} /> 5-week return streak. Your best streak is 7 weeks.
          </span>
        </div>
      </Card>

      <div className="activity-grid">
        <Card className="journey-card">
          <SectionHeader
            title="Bottle journey"
            subtitle="From scan to its next useful life."
            action={
              <Badge tone="green" dot>
                {recycled} verified
              </Badge>
            }
          />
          <div className="journey">
            {[
              { label: "Scanned", value: submissions.length, icon: ScanLine },
              { label: "Assigned", value: submissions.filter((item) => item.status === "assigned" || item.status === "collected" || item.status === "recycled").length, icon: Target },
              { label: "Collected", value: submissions.filter((item) => item.status === "collected" || item.status === "recycled").length, icon: PackageCheck },
              { label: "Recycled", value: recycled, icon: Recycle },
            ].map((stage, index) => {
              const Icon = stage.icon;
              const max = submissions.length || 1;
              return (
                <div className="journey__step" key={stage.label}>
                  <div className="journey__line">
                    <span className="journey__icon">
                      <Icon size={16} />
                    </span>
                    {index < 3 ? <span className="journey__connector" /> : null}
                  </div>
                  <div className="journey__copy">
                    <span>{stage.label}</span>
                    <strong>{stage.value}</strong>
                    <div className="journey__bar">
                      <span style={{ width: `${(stage.value / max) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="journey-card__note">
            A bottle is only marked recycled after a partner collector completes processing. This
            keeps every point honest.
          </p>
        </Card>

        <Card className="milestones-card">
          <SectionHeader
            title="Milestones"
            subtitle="Small proofs of a consistent habit."
            action={<Badge tone="lime">4 of 6</Badge>}
          />
          <div className="achievement-grid">
            {achievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <div
                  className={cn(
                    "achievement",
                    achievement.unlocked ? "is-unlocked" : "is-locked",
                    `is-${achievement.tone}`,
                  )}
                  key={achievement.name}
                >
                  <span className="achievement__icon">
                    <Icon size={19} />
                  </span>
                  <strong>{achievement.name}</strong>
                  <span>{achievement.description}</span>
                  {achievement.unlocked ? (
                    <span className="achievement__state">
                      <Check size={11} /> Unlocked
                    </span>
                  ) : (
                    <span className="achievement__state">Locked</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="milestone-progress">
            <div>
              <span>Next: 10 kg diverted</span>
              <strong>{currentUser.kgDiverted.toFixed(1)} / 10 kg</strong>
            </div>
            <ProgressBar value={Math.min(100, (currentUser.kgDiverted / 10) * 100)} />
          </div>
        </Card>
      </div>

      <Card className="history-card">
        <div className="history-head">
          <SectionHeader
            title="Bottle history"
            subtitle={`${filtered.length} of ${submissions.length} scans in this ledger.`}
          />
          <div className="history-filters">
            <SelectInput
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | SubmissionStatus)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="collected">Collected</option>
              <option value="recycled">Recycled</option>
            </SelectInput>
            <Button variant="secondary" size="md" icon={Download} onClick={exportHistory}>
              Export
            </Button>
          </div>
        </div>
        {filtered.length ? (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bottle</th>
                  <th>Logged</th>
                  <th>City</th>
                  <th>Weight</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th className="num">Points</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((submission) => {
                  const bottle = BOTTLE_BY_ID[submission.bottleTypeId];
                  return (
                    <tr key={submission.id}>
                      <td>
                        <div className="table-person">
                          <BottleGlyph bottleTypeId={submission.bottleTypeId} size={22} />
                          <div>
                            <strong>{bottle?.name}</strong>
                            <span>
                              {bottle?.material} ·{" "}
                              {submission.source === "gemini" ? "Gemini" : "Demo"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="table-muted">{formatRelativeTime(submission.submittedAt)}</span>
                      </td>
                      <td>
                        <span className="table-muted">{submission.city}</span>
                      </td>
                      <td>{submission.weightKg.toFixed(2)} kg</td>
                      <td>{Math.round(submission.confidence * 100)}%</td>
                      <td>
                        <StatusBadge status={submission.status} />
                      </td>
                      <td className="num">
                        <strong
                          className={cn(
                            "point-value",
                            submission.status !== "recycled" && "is-pending",
                          )}
                        >
                          +{submission.points}
                        </strong>
                      </td>
                      <td>
                        <span className="row-arrow">
                          <ArrowRight size={15} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Recycle}
            title="No bottles match that filter"
            description="Try another status or scan a bottle to start a new entry."
            action={
              <Link to="/app/scan" className="btn btn--primary btn--sm">
                Scan a bottle
              </Link>
            }
          />
        )}
      </Card>
    </div>
  );
}
