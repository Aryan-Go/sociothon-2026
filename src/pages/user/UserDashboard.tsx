import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Droplets,
  Leaf,
  MapPin,
  Medal,
  Recycle,
  ScanLine,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BOTTLE_BY_ID, dropOffsForCity } from "../../data/bottles";
import {
  rankUsers,
  submissionsByDay,
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
import { BottleGlyph } from "../../components/BottleGlyph";
import { ChartTooltip } from "../../components/charts";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  ProgressBar,
  RingProgress,
  SectionHeader,
  Sparkline,
  StatCard,
  StatusBadge,
  Avatar,
  cn,
} from "../../components/ui";
import type { Submission } from "../../types";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function MiniSubmission({
  submission,
}: {
  submission: Submission;
}) {
  const bottle = BOTTLE_BY_ID[submission.bottleTypeId];
  return (
    <div className="submission-line">
      <BottleGlyph bottleTypeId={submission.bottleTypeId} size={24} />
      <div className="submission-line__copy">
        <strong>{bottle?.name ?? "Bottle"}</strong>
        <span>
          {formatRelativeTime(submission.submittedAt)} · {submission.weightKg.toFixed(2)} kg
        </span>
      </div>
      <StatusBadge status={submission.status} />
      <strong
        className={cn(
          "submission-line__points",
          submission.status !== "recycled" && "is-pending",
        )}
      >
        +{submission.points}
      </strong>
    </div>
  );
}

export function UserDashboard() {
  const { state, currentUser } = useAppStore();
  if (!state || !currentUser) return null;

  const submissions = userSubmissions(state.submissions, currentUser.id);
  const ranked = rankUsers(state.users, state.submissions);
  const rank = ranked.findIndex((user) => user.id === currentUser.id) + 1;
  const weekly = submissions.filter(
    (submission) => Date.now() - +new Date(submission.submittedAt) < 7 * 86400000,
  );
  const weeklyPoints = weekly
    .filter((submission) => submission.status === "recycled")
    .reduce((sum, item) => sum + item.points, 0);
  const monthBottles = userMonthlyBottles(state.submissions, currentUser.id);
  const weeklyGoal = Math.min(100, (weekly.length / 6) * 100);
  const dayData = submissionsByDay(submissions, 14);
  const dropOffs = dropOffsForCity(currentUser.city).slice(0, 3);
  const topUsers = ranked.slice(0, 5);
  const recent = submissions.slice(0, 5);
  const favourite =
    submissions.reduce<Record<string, number>>((acc, submission) => {
      acc[submission.bottleTypeId] = (acc[submission.bottleTypeId] ?? 0) + 1;
      return acc;
    }, {});
  const favouriteType =
    Object.entries(favourite).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "pet-water";

  const sparkPoints = dayData.map((point) => point.submitted * 25);

  return (
    <div className="page user-dashboard">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <CalendarDays size={13} />
            {new Intl.DateTimeFormat("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </span>
        }
        title={
          <>
            {greeting()}, <span className="serif-accent">{currentUser.name.split(" ")[0]}.</span>
          </>
        }
        description="A small scan today keeps a bottle in circulation for decades. Your next drop-off is closer than you think."
        actions={
          <>
            <Link to="/app/activity" className="btn btn--secondary btn--md">
              My impact
            </Link>
            <Link to="/app/scan" className="btn btn--primary btn--md">
              <ScanLine size={16} />
              Scan a bottle
            </Link>
          </>
        }
      />

      <Card dark className="dash-hero">
        <div className="dash-hero__copy">
          <Badge tone="lime" icon={Sparkles}>
            Your circular passport
          </Badge>
          <h2>
            {formatNumber(currentUser.bottleCount)} bottles.
            <br />
            <span className="serif-accent">{formatKg(currentUser.kgDiverted)}</span> kept in the loop.
          </h2>
          <p>
            You are #{rank} in the network and{" "}
            {weekly.length >= 6
              ? "this week's goal is already complete"
              : weekly.length === 0
                ? "one scan away"
                : `${6 - weekly.length} bottles away`}
            . Your nearest verified drop-off is{" "}
            {dropOffs[0]?.distanceKm.toFixed(1)} km away.
          </p>
          <div className="dash-hero__actions">
            <Link to="/app/scan" className="btn btn--primary btn--md">
              <ScanLine size={16} />
              Log a bottle
            </Link>
            <Link to="/app/leaderboard" className="btn btn--lime-ghost btn--md">
              View leaderboard
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="dash-hero__metrics">
            <div>
              <strong>{formatNumber(currentUser.points)}</strong>
              <span>Loop points</span>
            </div>
            <div>
              <strong>+{weeklyPoints}</strong>
              <span>Verified points this week</span>
            </div>
            <div>
              <strong>{monthBottles}</strong>
              <span>Verified bottles this month</span>
            </div>
          </div>
        </div>
        <div className="dash-hero__art" aria-hidden="true">
          <div className="impact-orbit">
            <span className="impact-orbit__ring impact-orbit__ring--a" />
            <span className="impact-orbit__ring impact-orbit__ring--b" />
            <span className="impact-orbit__ring impact-orbit__ring--c" />
            <div className="impact-orbit__bottle">
              <BottleGlyph bottleTypeId={favouriteType} size={86} />
            </div>
            <span className="orbit-chip orbit-chip--a">
              <Recycle size={13} />
              {formatKg(currentUser.kgDiverted)} diverted
            </span>
            <span className="orbit-chip orbit-chip--b">
              <Trophy size={13} />
              #{rank} network rank
            </span>
            <span className="orbit-chip orbit-chip--c">
              <Leaf size={13} />
              {weekly.length}/6 this week
            </span>
            <span className="orbit-spark orbit-spark--a" />
            <span className="orbit-spark orbit-spark--b" />
            <span className="orbit-spark orbit-spark--c" />
          </div>
        </div>
      </Card>

      <div className="stats-grid">
        <StatCard
          label="Loop points"
          value={formatNumber(currentUser.points)}
          detail="all time"
          trend={{ value: "12.4%", direction: "up" }}
          icon={Sparkles}
          spark={sparkPoints}
          tone="lime"
        />
        <StatCard
          label="Bottles rescued"
          value={formatNumber(currentUser.bottleCount)}
          detail={`${weekly.length} this week`}
          trend={{ value: "8.1%", direction: "up" }}
          icon={Recycle}
        />
        <StatCard
          label="Waste diverted"
          value={formatKg(currentUser.kgDiverted)}
          detail="from landfill"
          trend={{ value: "0.6 kg", direction: "up" }}
          icon={Droplets}
        />
        <StatCard
          label="Your network rank"
          value={`#${rank}`}
          detail={`of ${state.users.length} members`}
          trend={{ value: rank <= 3 ? "Top 3" : "1 place", direction: "up" }}
          icon={Medal}
        />
      </div>

      <div className="dashboard-grid dashboard-grid--wide">
        <Card className="chart-card">
          <SectionHeader
            title="Your loop activity"
            subtitle="Bottles scanned and verified over the last 14 days."
            action={
              <Badge tone="neutral" dot>
                Live
              </Badge>
            }
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={238}>
              <AreaChart data={dayData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="userSubmitted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#658b3b" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#658b3b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="userRecycled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b48a49" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#b48a49" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#838b82", fontSize: 11 }}
                  interval={2}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#838b82", fontSize: 11 }}
                  width={34}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(value, name) =>
                        `${value} ${name === "Recycled" ? "verified" : "scanned"}`
                      }
                    />
                  }
                  cursor={{ stroke: "rgba(16,37,27,.14)", strokeDasharray: "4 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="submitted"
                  name="Scanned"
                  stroke="#658b3b"
                  strokeWidth={2.2}
                  fill="url(#userSubmitted)"
                  activeDot={{ r: 4, fill: "#658b3b", stroke: "#fbf9f3", strokeWidth: 3 }}
                />
                <Area
                  type="monotone"
                  dataKey="recycled"
                  name="Recycled"
                  stroke="#b48a49"
                  strokeWidth={1.8}
                  fill="url(#userRecycled)"
                  activeDot={{ r: 4, fill: "#b48a49", stroke: "#fbf9f3", strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>
              <span className="legend-dot" style={{ background: "#658b3b" }} /> Scanned
            </span>
            <span>
              <span className="legend-dot" style={{ background: "#b48a49" }} /> Recycled
            </span>
            <span className="chart-foot__note">+{weeklyPoints} points this week</span>
          </div>
        </Card>

        <Card className="goal-card">
          <div className="goal-card__head">
            <div>
              <span className="eyebrow">Weekly rhythm</span>
              <h2>{weekly.length} of 6 bottles</h2>
            </div>
            <Badge tone="lime">{Math.round(weeklyGoal)}%</Badge>
          </div>
          <div className="goal-card__ring">
            <RingProgress
              value={weeklyGoal}
              size={154}
              stroke={12}
              label={`${weekly.length}/6`}
              sublabel="this week"
              color="#6d973f"
              track="rgba(16,37,27,.09)"
            />
            <p>
              {weekly.length >= 6
                ? "Weekly goal complete. Every extra bottle adds to your all-time score."
                : `Scan ${6 - weekly.length} more to complete your weekly loop.`}
            </p>
          </div>
          <div className="goal-card__streak">
            <span className="goal-card__flame">5</span>
            <div>
              <strong>Week streak</strong>
              <span>Personal best is 7 weeks</span>
            </div>
            <Sparkline data={[2, 3, 4, 3, 6, 5, 5]} color="#6d973f" width={74} height={28} />
          </div>
          <Link to="/app/scan" className="btn btn--dark btn--md btn--full">
            Keep the streak alive
            <ArrowRight size={15} />
          </Link>
        </Card>
      </div>

      <div className="dashboard-grid dashboard-grid--split">
        <Card>
          <SectionHeader
            title="Recent drop-offs"
            subtitle="Your latest bottles and where they are in the loop."
            action={
              <Link to="/app/activity" className="text-link">
                See all <ArrowRight size={14} />
              </Link>
            }
          />
          {recent.length ? (
            <div className="submission-list">
              {recent.map((submission) => (
                <MiniSubmission key={submission.id} submission={submission} />
              ))}
            </div>
          ) : (
            <div className="empty-inline">
              <p>No bottles yet. Your first scan will show up here.</p>
              <Link to="/app/scan" className="btn btn--primary btn--sm">
                Scan your first bottle
              </Link>
            </div>
          )}
        </Card>

        <Card className="dropoff-card">
          <SectionHeader
            title={`Near you in ${currentUser.city}`}
            subtitle="Verified places to hand over your bottles."
            action={
              <Badge tone="neutral">
                <MapPin size={12} />
                {dropOffs.length} spots
              </Badge>
            }
          />
          <div className="mini-map" aria-hidden="true">
            <svg viewBox="0 0 400 150" preserveAspectRatio="none">
              <path d="M-10 118C55 82 78 96 120 62S210 30 263 68s71 41 147 7" fill="none" stroke="rgba(16,37,27,.14)" strokeWidth="1.5" />
              <path d="M32 5c20 33 19 66 44 92s47 26 63 54" fill="none" stroke="rgba(16,37,27,.1)" strokeWidth="1.3" />
              <path d="M314 0c-17 31-8 54-38 78s-53 43-45 78" fill="none" stroke="rgba(16,37,27,.1)" strokeWidth="1.3" />
              <path d="M0 42c83 12 150-27 213-12s103 51 187 36" fill="none" stroke="rgba(16,37,27,.08)" strokeWidth="1" />
              <path d="M0 70c86 12 145-16 210 6s115 40 190 17" fill="none" stroke="rgba(16,37,27,.08)" strokeWidth="1" />
            </svg>
            <span className="mini-map__you">You</span>
            <span className="mini-map__pin mini-map__pin--a">
              <MapPin size={15} />
            </span>
            <span className="mini-map__pin mini-map__pin--b">
              <MapPin size={15} />
            </span>
            <span className="mini-map__pin mini-map__pin--c">
              <MapPin size={15} />
            </span>
          </div>
          <div className="dropoff-list">
            {dropOffs.map((center, index) => (
              <div className="dropoff-line" key={center.id}>
                <span className={cn("dropoff-line__index", `is-${index + 1}`)}>{index + 1}</span>
                <div>
                  <strong>{center.name}</strong>
                  <span>
                    {center.type} · {center.hours}
                  </span>
                </div>
                <Badge tone="neutral">{center.distanceKm.toFixed(1)} km</Badge>
              </div>
            ))}
          </div>
          <Link to="/app/scan" className="dropoff-card__cta">
            Open the scanner and get directions
            <ArrowRight size={14} />
          </Link>
        </Card>
      </div>

      <div className="dashboard-grid dashboard-grid--split">
        <Card>
          <SectionHeader
            title="Top of the loop"
            subtitle="All-time points across the Loopr network."
            action={
              <Link to="/app/leaderboard" className="text-link">
                Full board <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="mini-leaderboard">
            {topUsers.map((user, index) => (
              <div
                key={user.id}
                className={cn("mini-leaderboard__row", user.id === currentUser.id && "is-you")}
              >
                <span className={cn("mini-leaderboard__rank", index < 3 && "is-top")}>
                  {index + 1}
                </span>
                <Avatar
                  name={user.name}
                  hue={user.avatarHue}
                  size={34}
                  square={index === 0}
                />
                <div>
                  <strong>{user.name}</strong>
                  <span>
                    {user.city} · {formatNumber(user.bottleCount)} bottles
                  </span>
                </div>
                {user.id === currentUser.id ? <Badge tone="lime">You</Badge> : null}
                <strong className="mini-leaderboard__points">{formatNumber(user.points)}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card className="reward-card">
          <div className="reward-card__top">
            <span className="eyebrow">Next unlock</span>
            <Badge tone="amber">240 pts away</Badge>
          </div>
          <h2>Circularity badge: Silver</h2>
          <p>
            Collect 20 more verified bottles this month to unlock a limited-edition recycled steel
            tag.
          </p>
          <div className="reward-card__progress">
            <div>
              <span>{monthBottles} bottles</span>
              <strong>20</strong>
            </div>
            <ProgressBar value={Math.min(100, (monthBottles / 20) * 100)} tone="amber" />
          </div>
          <div className="reward-card__perks">
            <span>
              <Trophy size={14} /> Profile badge
            </span>
            <span>
              <Leaf size={14} /> Verified impact
            </span>
            <span>
              <Recycle size={14} /> Drop-off perks
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
