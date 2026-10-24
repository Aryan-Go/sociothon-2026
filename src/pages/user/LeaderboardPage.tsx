import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Crown,
  MapPin,
  Medal,
  Recycle,
  ScanLine,
  Search,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  userMonthlyBottles,
  userMonthlyPoints,
  userSubmissions,
} from "../../lib/analytics";
import { formatKg, formatNumber } from "../../lib/format";
import { useAppStore } from "../../store/AppStore";
import { BottleGlyph } from "../../components/BottleGlyph";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  RingProgress,
  SectionHeader,
  SegmentedControl,
  TextInput,
  cn,
} from "../../components/ui";
import { BOTTLE_TYPES, CITIES } from "../../data/bottles";

type Period = "all" | "month";

interface Standing {
  userId: string;
  name: string;
  city: string;
  avatarHue: number;
  points: number;
  bottles: number;
  weightKg: number;
  tier: string;
}

export function LeaderboardPage() {
  const { state, currentUser } = useAppStore();
  const [period, setPeriod] = useState<Period>("all");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");

  if (!state || !currentUser) return null;

  const standings = useMemo<Standing[]>(() => {
    return state.users
      .map((user) => {
        const own = userSubmissions(state.submissions, user.id);
        const monthWeight = own
          .filter((submission) => {
            const date = new Date(submission.submittedAt);
            const now = new Date();
            return (
              submission.status === "recycled" &&
              date.getMonth() === now.getMonth() &&
              date.getFullYear() === now.getFullYear()
            );
          })
          .reduce((sum, item) => sum + item.weightKg, 0);
        return {
          userId: user.id,
          name: user.name,
          city: user.city,
          avatarHue: user.avatarHue,
          points: period === "all" ? user.points : userMonthlyPoints(state.submissions, user.id),
          bottles:
            period === "all" ? user.bottleCount : userMonthlyBottles(state.submissions, user.id),
          weightKg: period === "all" ? user.kgDiverted : monthWeight,
          tier: user.tier,
        };
      })
      .sort((a, b) => b.points - a.points);
  }, [state.users, state.submissions, period]);

  const filtered = standings.filter((standing) => {
    const matchesQuery = standing.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCity = city === "all" || standing.city === city;
    return matchesQuery && matchesCity;
  });

  const currentIndex = standings.findIndex((standing) => standing.userId === currentUser.id);
  const currentStanding = standings[currentIndex];
  const nextStanding = currentIndex > 0 ? standings[currentIndex - 1] : null;
  const gap = nextStanding ? nextStanding.points - currentStanding.points : 0;
  const podium = standings.slice(0, 3);
  const second = podium[1];
  const first = podium[0];
  const third = podium[2];
  const userSubmissionsList = userSubmissions(state.submissions, currentUser.id);
  const thisMonthBottles = userMonthlyBottles(state.submissions, currentUser.id);
  const weeklyPet = userSubmissionsList.filter((submission) => {
    return (
      submission.bottleTypeId === "pet-water" &&
      Date.now() - +new Date(submission.submittedAt) < 7 * 86400000
    );
  }).length;
  const activeCities = Array.from(new Set(state.users.map((user) => user.city))).sort();

  return (
    <div className="page leaderboard-page">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <Trophy size={13} /> All-time competition
          </span>
        }
        title={
          <>
            The people keeping <span className="serif-accent">bottles in play.</span>
          </>
        }
        description="Every verified bottle earns points. Climb the all-time board, defend your city's place, and turn small returns into a movement."
        actions={
          <Link to="/app/scan" className="btn btn--primary btn--md">
            <ScanLine size={16} />
            Scan for verified points
          </Link>
        }
      />

      <div className="leaderboard-toolbar">
        <SegmentedControl
          ariaLabel="Leaderboard period"
          value={period}
          onChange={(value) => setPeriod(value)}
          options={[
            { value: "all", label: "All time" },
            { value: "month", label: "This month" },
          ]}
        />
        <div className="leaderboard-toolbar__meta">
          <Badge tone="neutral" icon={UsersRound}>
            {state.users.length} members
          </Badge>
          <Badge tone="neutral" icon={MapPin}>
            {activeCities.length} cities
          </Badge>
          <span>{period === "all" ? "Lifetime verified points" : "Points earned this month"}</span>
        </div>
      </div>

      <div className="leaderboard-layout">
        <div className="leaderboard-main">
          <Card className="podium-card">
            <div className="podium-card__glow" aria-hidden="true" />
            <div className="podium-card__head">
              <div>
                <span className="eyebrow">Top of the loop</span>
                <h2>{period === "all" ? "Hall of circular fame" : "This month's pace-setters"}</h2>
              </div>
              <Badge tone="lime" dot>
                Updated live
              </Badge>
            </div>
            <div className="podium">
              {second ? (
                <div className="podium__person podium__person--second">
                  <div className="podium__medal">
                    <Medal size={15} />
                    02
                  </div>
                  <Avatar name={second.name} hue={second.avatarHue} size={64} />
                  <strong>{second.name}</strong>
                  <span>{second.city}</span>
                  <div className="podium__points">
                    {formatNumber(second.points)} <small>pts</small>
                  </div>
                  <div className="podium__base">
                    <span>{formatNumber(second.bottles)} bottles</span>
                  </div>
                </div>
              ) : null}
              {first ? (
                <div className="podium__person podium__person--first">
                  <span className="podium__crown">
                    <Crown size={22} />
                  </span>
                  <div className="podium__medal">
                    <Crown size={14} />
                    01
                  </div>
                  <Avatar name={first.name} hue={first.avatarHue} size={82} square />
                  <strong>{first.name}</strong>
                  <span>{first.city}</span>
                  <div className="podium__points">
                    {formatNumber(first.points)} <small>pts</small>
                  </div>
                  <div className="podium__base">
                    <span>{formatNumber(first.bottles)} bottles</span>
                  </div>
                  <span className="podium__tag">
                    <Sparkles size={12} /> Loop leader
                  </span>
                </div>
              ) : null}
              {third ? (
                <div className="podium__person podium__person--third">
                  <div className="podium__medal">
                    <Award size={15} />
                    03
                  </div>
                  <Avatar name={third.name} hue={third.avatarHue} size={64} />
                  <strong>{third.name}</strong>
                  <span>{third.city}</span>
                  <div className="podium__points">
                    {formatNumber(third.points)} <small>pts</small>
                  </div>
                  <div className="podium__base">
                    <span>{formatNumber(third.bottles)} bottles</span>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="leaderboard-table-card">
            <div className="leaderboard-table-head">
              <div>
                <span className="eyebrow">Full standings</span>
                <h2>{period === "all" ? "All-time leaderboard" : "Monthly leaderboard"}</h2>
              </div>
              <div className="leaderboard-filters">
                <label className="search-field">
                  <Search size={15} />
                  <TextInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Find a member"
                    aria-label="Find a member"
                  />
                </label>
                <select
                  className="input select compact-select"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  aria-label="Filter by city"
                >
                  <option value="all">All cities</option>
                  {activeCities.map((cityName) => (
                    <option value={cityName} key={cityName}>
                      {cityName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filtered.length ? (
              <div className="table-shell">
                <table className="data-table leaderboard-table">
                  <thead>
                    <tr>
                      <th className="col-rank">Rank</th>
                      <th>Member</th>
                      <th>City</th>
                      <th className="num">Bottles</th>
                      <th className="num">Waste diverted</th>
                      <th className="num">{period === "all" ? "Lifetime points" : "Month points"}</th>
                      <th aria-label="Profile actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((standing) => {
                      const rank = standings.findIndex((item) => item.userId === standing.userId) + 1;
                      const isYou = standing.userId === currentUser.id;
                      return (
                        <tr key={standing.userId} className={cn(isYou && "is-you")}>
                          <td className="col-rank">
                            <span className={cn("rank-pill", rank <= 3 && "is-top")}>{rank}</span>
                          </td>
                          <td>
                            <div className="table-person">
                              <Avatar name={standing.name} hue={standing.avatarHue} size={34} />
                              <div>
                                <strong>{standing.name}</strong>
                                <span>{standing.tier}</span>
                              </div>
                              {isYou ? <Badge tone="lime">You</Badge> : null}
                            </div>
                          </td>
                          <td>
                            <span className="table-muted">{standing.city}</span>
                          </td>
                          <td className="num">{formatNumber(standing.bottles)}</td>
                          <td className="num">{formatKg(standing.weightKg)}</td>
                          <td className="num">
                            <strong className="point-value">{formatNumber(standing.points)}</strong>
                          </td>
                          <td>
                            <span className="row-arrow" aria-hidden="true">
                              <ArrowUpRight size={15} />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="No member matches that search"
                    description="Try a different name or clear the city filter."
                  />
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title="No member matches that search"
                description="Try a different name or clear the city filter."
              />
            )}
            <div className="table-note">
              <span>
                <Recycle size={14} /> Points and bottle counts update only when a collector marks
                the bottle recycled.
              </span>
              <span>{filtered.length} of {standings.length} members shown</span>
            </div>
          </Card>
        </div>

        <aside className="leaderboard-side">
          <Card dark className="standing-card">
            <div className="standing-card__head">
              <span className="eyebrow">Your standing</span>
              <Badge tone="lime" dot>
                {period === "all" ? "All time" : "This month"}
              </Badge>
            </div>
            <div className="standing-card__rank">
              <RingProgress
                value={Math.max(6, 100 - (currentIndex / Math.max(1, standings.length - 1)) * 100)}
                size={118}
                stroke={9}
                label={`#${currentIndex + 1}`}
                sublabel="network"
              />
              <div>
                <h3>{currentStanding?.name}</h3>
                <p>
                  {formatNumber(currentStanding?.points ?? 0)} points ·{" "}
                  {formatNumber(currentStanding?.bottles ?? 0)} bottles
                </p>
                <div className="standing-card__rank-chip">
                  <Trophy size={13} />
                  {currentIndex < 3 ? "Podium position" : "Rising member"}
                </div>
              </div>
            </div>
            {nextStanding ? (
              <div className="standing-card__gap">
                <div>
                  <span>Next up · {nextStanding.name}</span>
                  <strong>{formatNumber(gap)} pts away</strong>
                </div>
                <ProgressBar
                  value={Math.min(100, ((currentStanding?.points ?? 0) / nextStanding.points) * 100)}
                />
                <span className="standing-card__gap-note">
                  {Math.ceil(gap / 25)} average bottles to overtake
                </span>
              </div>
            ) : (
              <div className="standing-card__gap">
                <div>
                  <span>Network summit</span>
                  <strong>You are setting the pace</strong>
                </div>
                <ProgressBar value={100} />
              </div>
            )}
            <Link to="/app/scan" className="btn btn--primary btn--md btn--full">
              <ScanLine size={15} />
              Add verified bottles
            </Link>
          </Card>

          <Card className="challenge-card">
            <div className="challenge-card__head">
              <span className="eyebrow">7-day challenge</span>
              <Badge tone="amber">+75 bonus</Badge>
            </div>
            <div className="challenge-card__body">
              <BottleGlyph bottleTypeId="pet-water" size={38} />
              <div>
                <h3>Clear five clear PETs</h3>
                <p>Water bottles count double toward this week's streak.</p>
              </div>
            </div>
            <div className="challenge-card__progress">
              <div>
                <span>{weeklyPet} of 5 bottles</span>
                <strong>{Math.min(100, (weeklyPet / 5) * 100)}%</strong>
              </div>
              <ProgressBar value={Math.min(100, (weeklyPet / 5) * 100)} tone="amber" />
            </div>
            <Link to="/app/scan" className="text-link">
              Finish the challenge <ArrowRight size={14} />
            </Link>
          </Card>

          <Card className="points-card">
            <SectionHeader title="How points work" subtitle="Material difficulty is rewarded." />
            <div className="points-list">
              {BOTTLE_TYPES.slice(0, 5).map((type) => (
                <div className="points-line" key={type.id}>
                  <BottleGlyph bottleTypeId={type.id} size={17} />
                  <span>{type.name}</span>
                  <strong>+{type.points}</strong>
                </div>
              ))}
            </div>
            <p>
              A scan does not move the leaderboard. Points and verified bottle counts are credited
              only after a collector processes the bottle. Rejected or contaminated bottles never
              reach the board.
            </p>
          </Card>

          <Card className="city-card">
            <div className="city-card__head">
              <span className="eyebrow">City pulse</span>
              <MapPin size={15} />
            </div>
            <h3>{currentUser.city}</h3>
            <p>
              {thisMonthBottles} bottles logged by you this month. The city target is to keep 25,000
              bottles in circulation before Diwali.
            </p>
            <div className="city-card__stat">
              <span>Bengaluru network progress</span>
              <strong>68%</strong>
            </div>
            <ProgressBar value={68} tone="forest" />
          </Card>
        </aside>
      </div>
    </div>
  );
}
