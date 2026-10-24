import {
  ArrowRight,
  Award,
  Ban,
  Check,
  Download,
  Eye,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  UserRound,
  UsersRound,
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
import { ChartTooltip } from "../../components/charts";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
  ProgressBar,
  SectionHeader,
  SelectInput,
  StatCard,
  StatusBadge,
  TextInput,
  UserStatusBadge,
  cn,
} from "../../components/ui";
import { BOTTLE_BY_ID } from "../../data/bottles";
import {
  rankUsers,
  recycledRate,
  userMonthlyBottles,
  userSubmissions,
} from "../../lib/analytics";
import { formatDate, formatKg, formatNumber, formatRelativeTime } from "../../lib/format";
import { useAppStore } from "../../store/AppStore";
import type { User } from "../../types";

const cityColors = ["#5c8b42", "#c79b51", "#7e9fc1", "#a98bc4", "#db9278", "#84b9a7", "#b9b26b"];

export function AdminUsers() {
  const { state, toggleUserStatus, notify } = useAppStore();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [status, setStatus] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  if (!state) return null;

  const ranked = rankUsers(state.users, state.submissions);
  const detail = state.users.find((user) => user.id === detailId);
  const filtered = useMemo(() => {
    return ranked.filter((user) => {
      const matchesQuery = user.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        user.email.toLowerCase().includes(query.trim().toLowerCase());
      const matchesCity = city === "all" || user.city === city;
      const matchesStatus = status === "all" || user.status === status;
      return matchesQuery && matchesCity && matchesStatus;
    });
  }, [ranked, query, city, status]);

  const active = state.users.filter((user) => user.status === "active").length;
  const totalBottles = state.users.reduce((sum, user) => sum + user.bottleCount, 0);
  const totalWeight = state.users.reduce((sum, user) => sum + user.kgDiverted, 0);
  const totalPoints = state.users.reduce((sum, user) => sum + user.points, 0);
  const topUsers = ranked.slice(0, 7);
  const cities = Array.from(new Set(state.users.map((user) => user.city))).sort();
  const cityData = cities
    .map((cityName, index) => ({
      name: cityName,
      value: state.users.filter((user) => user.city === cityName).length,
      color: cityColors[index % cityColors.length],
    }))
    .sort((a, b) => b.value - a.value);
  const cityTotal = cityData.reduce((sum, item) => sum + item.value, 0);
  const topScorer = ranked[0];
  const detailSubmissions = detail
    ? userSubmissions(state.submissions, detail.id).slice(0, 5)
    : [];
  const monthlyBottles = detail
    ? userMonthlyBottles(state.submissions, detail.id)
    : 0;

  const exportMembers = () => {
    const rows = [
      ["Name", "Email", "City", "Tier", "Bottles", "Kg diverted", "Points", "Status", "Joined"],
      ...filtered.map((user) => [
        user.name,
        user.email,
        user.city,
        user.tier,
        String(user.bottleCount),
        user.kgDiverted.toFixed(2),
        String(user.points),
        user.status,
        new Date(user.joinedAt).toISOString(),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "loopr-members.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    notify(`${filtered.length} members exported.`);
  };

  return (
    <div className="page admin-users">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <UsersRound size={13} /> Member network
          </span>
        }
        title={
          <>
            The habit behind <span className="serif-accent">the impact.</span>
          </>
        }
        description="See who is returning bottles, who is pulling ahead, and where a nudge can keep a member in the loop."
        actions={
          <>
            <Button variant="secondary" size="md" icon={Download} onClick={exportMembers}>
              Export members
            </Button>
            <LinkToBoard />
          </>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Active members"
          value={formatNumber(active)}
          detail={`${state.users.length - active} paused`}
          trend={{ value: `${Math.round((active / state.users.length) * 100)}% active`, direction: "up" }}
          icon={UserCheck}
          tone="lime"
        />
        <StatCard
          label="Bottles returned"
          value={formatNumber(totalBottles)}
          detail="all-time member scans"
          trend={{ value: "Verified", direction: "up" }}
          icon={UserRound}
        />
        <StatCard
          label="Waste diverted"
          value={formatKg(totalWeight)}
          detail="across the community"
          trend={{ value: `${formatNumber(totalBottles)} bottles`, direction: "up" }}
          icon={Sparkles}
        />
        <StatCard
          label="Points issued"
          value={formatNumber(totalPoints)}
          detail="lifetime balances"
          trend={{ value: "Non-cash rewards", direction: "up" }}
          icon={Award}
        />
      </div>

      <div className="top-scorer-banner">
        <div className="top-scorer-banner__avatar">
          {topScorer ? (
            <Avatar name={topScorer.name} hue={topScorer.avatarHue} size={48} square />
          ) : null}
          <span>
            <Trophy size={13} />
          </span>
        </div>
        <div>
          <span className="eyebrow">Network leader</span>
          <strong>{topScorer?.name}</strong>
          <p>
            {formatNumber(topScorer?.points ?? 0)} points · {formatNumber(topScorer?.bottleCount ?? 0)} bottles ·{" "}
            {formatKg(topScorer?.kgDiverted ?? 0)} diverted
          </p>
        </div>
        <div className="top-scorer-banner__right">
          <Badge tone="lime" icon={Trophy}>
            All-time #1
          </Badge>
          <span>{topScorer?.city}</span>
        </div>
      </div>

      <Card className="members-card">
        <div className="filter-bar">
          <label className="search-field search-field--wide">
            <Search size={16} />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a member by name or email…"
              aria-label="Search members"
            />
          </label>
          <div className="filter-group">
            <MapPin size={14} />
            <SelectInput
              value={city}
              onChange={(event) => setCity(event.target.value)}
              aria-label="Filter members by city"
            >
              <option value="all">All cities</option>
              {cities.map((cityName) => (
                <option key={cityName} value={cityName}>
                  {cityName}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="filter-group">
            <UserCheck size={14} />
            <SelectInput
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter members by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </SelectInput>
          </div>
          <span className="filter-count">{filtered.length} members</span>
        </div>

        {filtered.length ? (
          <>
            <div className="table-shell">
              <table className="data-table members-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>City</th>
                    <th>Tier</th>
                    <th className="num">Bottles</th>
                    <th className="num">Diverted</th>
                    <th className="num">Loop points</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => {
                    const rank = ranked.findIndex((item) => item.id === user.id) + 1;
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="table-person">
                            <Avatar name={user.name} hue={user.avatarHue} size={34} />
                            <div>
                              <strong>{user.name}</strong>
                              <span>{user.email}</span>
                            </div>
                            {rank <= 3 ? <Badge tone="amber">#{rank}</Badge> : null}
                          </div>
                        </td>
                        <td>
                          <span className="table-location">
                            <MapPin size={12} /> {user.city}
                          </span>
                        </td>
                        <td>
                          <Badge tone="neutral">{user.tier}</Badge>
                        </td>
                        <td className="num">{formatNumber(user.bottleCount)}</td>
                        <td className="num">{formatKg(user.kgDiverted)}</td>
                        <td className="num">
                          <strong className="point-value">{formatNumber(user.points)}</strong>
                        </td>
                        <td>
                          <span className="table-muted">{formatDate(user.joinedAt)}</span>
                        </td>
                        <td>
                          <UserStatusBadge status={user.status} />
                        </td>
                        <td>
                          <div className="row-actions">
                            <IconButton
                              icon={Eye}
                              label={`Open ${user.name}`}
                              size="sm"
                              onClick={() => setDetailId(user.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>{filtered.length} of {state.users.length} members shown</span>
              <span>
                <UsersRound size={13} /> {active} active · {state.users.length - active} paused
              </span>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Search}
            title="No members found"
            description="Try another name, city, or account status."
          />
        )}
      </Card>

      <div className="members-insights">
        <Card>
          <SectionHeader
            title="Top scorers"
            subtitle="The members carrying the loop this season."
            action={<Badge tone="lime">All time</Badge>}
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart
                data={topUsers.map((user) => ({
                  name: user.name.split(" ")[0],
                  points: user.points,
                  bottles: user.bottleCount,
                }))}
                margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid vertical={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#66736a", fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#838b82", fontSize: 10 }}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: "rgba(16,37,27,.035)" }}
                  content={<ChartTooltip />}
                />
                <Bar dataKey="points" name="Points" fill="#5c8b42" radius={[5, 5, 0, 0]} maxBarSize={24} />
                <Bar dataKey="bottles" name="Bottles" fill="#d7ba85" radius={[5, 5, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>
              <span className="legend-dot" style={{ background: "#5c8b42" }} /> Points
            </span>
            <span>
              <span className="legend-dot" style={{ background: "#d7ba85" }} /> Bottles
            </span>
          </div>
        </Card>

        <Card className="member-city-card">
          <SectionHeader title="Member cities" subtitle="Where the network is growing." />
          <div className="city-donut">
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={cityData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {cityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} members`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{cityTotal}</strong>
                <span>members</span>
              </div>
            </div>
            <div className="city-donut__legend">
              {cityData.map((item) => (
                <div key={item.name}>
                  <span className="legend-dot" style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="member-health">
            <div>
              <span>Active rate</span>
              <strong>{Math.round((active / state.users.length) * 100)}%</strong>
              <ProgressBar value={(active / state.users.length) * 100} tone="forest" />
            </div>
            <div>
              <span>Verification rate</span>
              <strong>{Math.round(recycledRate(state.submissions))}%</strong>
              <ProgressBar value={recycledRate(state.submissions)} />
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.name ?? "Member"}
        description={detail ? `${detail.city} · joined ${formatDate(detail.joinedAt)}` : undefined}
        size="lg"
        footer={
          detail ? (
            <>
              <Button
                variant={detail.status === "active" ? "secondary" : "primary"}
                size="md"
                icon={detail.status === "active" ? Ban : Check}
                onClick={() => toggleUserStatus(detail.id)}
              >
                {detail.status === "active" ? "Pause account" : "Reactivate account"}
              </Button>
              <Button variant="ghost" size="md" onClick={() => setDetailId(null)}>
                Close
              </Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="member-detail">
            <div className="member-detail__hero">
              <Avatar name={detail.name} hue={detail.avatarHue} size={64} square />
              <div>
                <div className="member-detail__name">
                  <h3>{detail.name}</h3>
                  <UserStatusBadge status={detail.status} />
                </div>
                <p>
                  {detail.email} · {detail.city}
                </p>
                <div className="member-detail__chips">
                  <Badge tone="lime">{detail.tier}</Badge>
                  <Badge tone="neutral">
                    <Trophy size={11} /> #{ranked.findIndex((user) => user.id === detail.id) + 1}
                  </Badge>
                  <Badge tone="neutral">{monthlyBottles} this month</Badge>
                </div>
              </div>
            </div>

            <div className="member-detail__metrics">
              <div>
                <span>Bottles returned</span>
                <strong>{formatNumber(detail.bottleCount)}</strong>
              </div>
              <div>
                <span>Waste diverted</span>
                <strong>{formatKg(detail.kgDiverted)}</strong>
              </div>
              <div>
                <span>Loop points</span>
                <strong>{formatNumber(detail.points)}</strong>
              </div>
              <div>
                <span>Recycled rate</span>
                <strong>{Math.round(recycledRate(userSubmissions(state.submissions, detail.id)))}%</strong>
              </div>
            </div>

            <div className="member-points member-points--policy">
              <span className="member-points__policy-icon">
                <ShieldCheck size={18} />
              </span>
              <div>
                <span className="eyebrow">Verified scoring only</span>
                <h3>Leaderboard credits require recycling</h3>
                <p>
                  Points and bottle counts change only when a collector processes a bottle. There
                  is no manual shortcut to move this member on the leaderboard.
                </p>
              </div>
              <Badge tone="green">{formatNumber(detail.points)} verified</Badge>
            </div>

            <div className="member-detail__submissions">
              <div className="partner-detail__recent-head">
                <span>Recent bottle activity</span>
                <Badge tone="neutral">
                  {userSubmissions(state.submissions, detail.id).length} total
                </Badge>
              </div>
              {detailSubmissions.length ? (
                detailSubmissions.map((submission) => (
                  <div className="member-submission" key={submission.id}>
                    <BottleGlyph bottleTypeId={submission.bottleTypeId} size={18} />
                    <div>
                      <strong>{BOTTLE_BY_ID[submission.bottleTypeId]?.name}</strong>
                      <span>{formatRelativeTime(submission.submittedAt)} · {submission.city}</span>
                    </div>
                    <StatusBadge status={submission.status} />
                    <strong className="point-value">+{submission.points}</strong>
                  </div>
                ))
              ) : (
                <p className="table-muted">No bottle activity yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function LinkToBoard() {
  return (
    <Link to="/app/leaderboard" className="btn btn--secondary btn--md">
      <Trophy size={15} />
      View leaderboard
      <ArrowRight size={14} />
    </Link>
  );
}
