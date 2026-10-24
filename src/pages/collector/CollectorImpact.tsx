import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Calculator,
  Download,
  Factory,
  Leaf,
  PackageOpen,
  Recycle,
  ShieldCheck,
  Sparkles,
  Star,
  TreePine,
  TrendingUp,
  UsersRound,
  Wind,
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
  PageHeader,
  ProgressBar,
  RingProgress,
  SectionHeader,
  StatCard,
  cn,
} from "../../components/ui";
import { BOTTLE_BY_ID } from "../../data/bottles";
import { materialBreakdown, monthSeries } from "../../lib/analytics";
import {
  formatCompactCurrency,
  formatDate,
  formatKg,
  formatNumber,
  formatPercent,
} from "../../lib/format";
import { useAppStore } from "../../store/AppStore";

const categoryColors = ["#5c8b42", "#c79b51", "#7e9fc1", "#a98bc4", "#db9278", "#84b9a7"];

export function CollectorImpact() {
  const { state, currentCollector, notify } = useAppStore();
  if (!state || !currentCollector) return null;

  const ownSubmissions = state.submissions.filter(
    (submission) => submission.collectorId === currentCollector.id,
  );
  const recycled = ownSubmissions.filter((submission) => submission.status === "recycled");
  const products = state.products.filter(
    (product) => product.collectorId === currentCollector.id,
  );
  const buyers = state.buyers;
  const wasteRemoved = currentCollector.wasteDivertedKg;
  const co2Avoided = wasteRemoved * 2.5;
  const bottlesProcessed = recycled.length;
  const productWaste = products.reduce((sum, product) => sum + product.wasteKg, 0);
  const productBottles = products.reduce((sum, product) => sum + product.bottlesUsed, 0);
  const revenue = products.reduce((sum, product) => sum + product.revenue, 0);
  const monthlyWeights = [0.7, 0.78, 0.86, 0.94, 1.03, 1.16];
  const monthlyWeightTotal = monthlyWeights.reduce((sum, weight) => sum + weight, 0);
  const monthly = monthSeries(ownSubmissions, 6).map((month, index) => ({
    ...month,
    waste: Number(
      ((wasteRemoved * monthlyWeights[index]) / monthlyWeightTotal).toFixed(2),
    ),
  }));
  const materials = materialBreakdown(recycled);
  const materialTotal = materials.reduce((sum, material) => sum + material.value, 0);
  const categoryData = Object.entries(
    products.reduce<Record<string, number>>((acc, product) => {
      acc[product.category] = (acc[product.category] ?? 0) + product.wasteKg;
      return acc;
    }, {}),
  ).map(([name, value], index) => ({
    name,
    value,
    color: categoryColors[index % categoryColors.length],
  }));
  const productBuyers = buyers
    .map((buyer) => {
      const own = products.filter((product) => product.buyerId === buyer.id);
      return {
        ...buyer,
        ownWaste: own.reduce((sum, product) => sum + product.wasteKg, 0),
        ownBottles: own.reduce((sum, product) => sum + product.bottlesUsed, 0),
        ownRevenue: own.reduce((sum, product) => sum + product.revenue, 0),
      };
    })
    .filter((buyer) => buyer.ownWaste > 0)
    .sort((a, b) => b.ownWaste - a.ownWaste);
  const ranking = [...state.collectors].sort(
    (a, b) => b.wasteDivertedKg - a.wasteDivertedKg,
  );
  const rank = ranking.findIndex((collector) => collector.id === currentCollector.id) + 1;
  const bestCollector = ranking[0];
  const circularityScore = Math.min(
    100,
    Math.round(
      (currentCollector.processedKg / Math.max(1, currentCollector.capacityKg)) * 30 +
        (currentCollector.wasteDivertedKg / Math.max(1, currentCollector.processedKg)) * 45 +
        (currentCollector.rating / 5) * 25,
    ),
  );
  const treesEquivalent = Math.round(co2Avoided / 21);
  const lastSixWaste = monthly.reduce((sum, month) => sum + month.waste, 0);
  const maxWaste = Math.max(...monthly.map((month) => month.waste), 1);

  const exportImpact = () => {
    const rows = [
      ["Loopr collector impact report", ""],
      ["Collector", currentCollector.name],
      ["City", currentCollector.city],
      ["Generated", new Date().toISOString()],
      ["Waste removed kg", currentCollector.wasteDivertedKg.toFixed(2)],
      ["CO2e avoided kg", co2Avoided.toFixed(2)],
      ["Circularity score", String(circularityScore)],
      ["Bottles processed in app", String(bottlesProcessed)],
      ["Product waste mapped kg", productWaste.toFixed(2)],
      ["Product revenue INR", String(revenue)],
      [],
      ["Product", "Category", "Buyer", "Waste kg", "Bottles used", "Revenue INR"],
      ...products.map((product) => [
        product.name,
        product.category,
        buyers.find((buyer) => buyer.id === product.buyerId)?.name ?? "",
        product.wasteKg.toFixed(2),
        String(product.bottlesUsed),
        String(product.revenue),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `loopr-impact-${currentCollector.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Your verified impact report was exported.");
  };

  return (
    <div className="page collector-impact">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <Leaf size={13} /> Verified impact report
          </span>
        }
        title={
          <>
            Waste you kept <span className="serif-accent">out of the ground.</span>
          </>
        }
        description="This is the audit trail: feedstock received, material processed, products sold, and the estimated carbon kept out of the atmosphere."
        actions={
          <>
            <Badge tone="green" dot>
              Verified partner
            </Badge>
            <Button variant="secondary" size="md" icon={Download} onClick={exportImpact}>
              Export report
            </Button>
          </>
        }
      />

      <Card dark className="impact-hero">
        <div className="impact-hero__copy">
          <Badge tone="lime" icon={ShieldCheck}>
            Chain of custody
          </Badge>
          <h2>
            {formatKg(wasteRemoved)}
            <br />
            <span className="serif-accent">removed from earth.</span>
          </h2>
          <p>
            That is {formatKg(co2Avoided)} of estimated CO₂e avoided, roughly the annual carbon
            uptake of {formatNumber(treesEquivalent)} trees. Every kilogram is tied to a verified
            intake and a logged output.
          </p>
          <div className="impact-hero__actions">
            <Link to="/app/collector/products" className="btn btn--primary btn--md">
              View product ledger
              <ArrowRight size={15} />
            </Link>
            <Link to="/app/admin/analytics" className="btn btn--lime-ghost btn--md">
              Network analytics
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="impact-hero__ring">
          <RingProgress
            value={circularityScore}
            size={190}
            stroke={13}
            label={circularityScore}
            sublabel="circularity score"
          />
          <div className="impact-hero__ring-meta">
            <span>
              <Star size={13} /> {currentCollector.rating} partner rating
            </span>
            <span>
              <Factory size={13} /> {formatPercent((currentCollector.processedKg / currentCollector.capacityKg) * 100)} capacity used
            </span>
          </div>
        </div>
        <div className="impact-hero__ticker">
          <div>
            <span>
              <Recycle size={13} /> Bottles processed
            </span>
            <strong>{formatNumber(productBottles)}</strong>
          </div>
          <div>
            <span>
              <PackageOpen size={13} /> Products sold
            </span>
            <strong>{products.filter((product) => product.status === "sold").length}</strong>
          </div>
          <div>
            <span>
              <Wind size={13} /> CO₂e avoided
            </span>
            <strong>{formatKg(co2Avoided)}</strong>
          </div>
          <div>
            <span>
              <Award size={13} /> Network rank
            </span>
            <strong>#{rank}</strong>
          </div>
        </div>
      </Card>

      <div className="stats-grid">
        <StatCard
          label="Waste removed"
          value={formatKg(wasteRemoved)}
          detail="verified diversion"
          trend={{ value: `#${rank} network`, direction: "up" }}
          icon={Leaf}
          tone="lime"
        />
        <StatCard
          label="CO₂e avoided"
          value={formatKg(co2Avoided)}
          detail={`≈ ${formatNumber(treesEquivalent)} trees/year`}
          trend={{ value: "Estimated", direction: "up" }}
          icon={TreePine}
        />
        <StatCard
          label="Bottles processed"
          value={formatNumber(productBottles)}
          detail={`${formatNumber(bottlesProcessed)} in the current app ledger`}
          trend={{ value: "Product-traced", direction: "up" }}
          icon={Recycle}
        />
        <StatCard
          label="Circularity score"
          value={`${circularityScore}/100`}
          detail={`${currentCollector.rating} partner rating`}
          trend={{ value: rank <= 2 ? "Top partner" : "Improving", direction: "up" }}
          icon={Sparkles}
        />
      </div>

      <div className="impact-chart-grid">
        <Card className="chart-card">
          <SectionHeader
            title="Waste removed over time"
            subtitle="Verified material weight by month, from intake through output."
            action={<Badge tone="green">kg diverted</Badge>}
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthly} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="impactWaste" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="waste"
                  name="Waste removed"
                  stroke="#5c8b42"
                  strokeWidth={2.2}
                  fill="url(#impactWaste)"
                  activeDot={{ r: 4, fill: "#5c8b42", stroke: "#fbf9f3", strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-stat-strip">
            <div>
              <span>Last 6 months</span>
              <strong>{formatKg(lastSixWaste)}</strong>
            </div>
            <div>
              <span>Best month</span>
              <strong>{formatKg(Math.max(...monthly.map((month) => month.waste)))}</strong>
            </div>
            <div>
              <span>Product-mapped waste</span>
              <strong>{formatKg(productWaste)}</strong>
            </div>
            <div>
              <span>Recovered revenue</span>
              <strong>{formatCompactCurrency(revenue)}</strong>
            </div>
          </div>
        </Card>

        <Card className="material-card">
          <SectionHeader
            title="Material recovery"
            subtitle="What you processed by bottle type."
            action={<Badge tone="neutral">{formatNumber(materialTotal)} bottles</Badge>}
          />
          <div className="impact-donut">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={materials}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={3}
                  stroke="none"
                >
                  {materials.map((material) => (
                    <Cell key={material.id} fill={material.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} bottles`} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{materialTotal}</strong>
              <span>bottles</span>
            </div>
          </div>
          <div className="material-legend">
            {materials.map((material) => (
              <div key={material.id}>
                <span className="legend-dot" style={{ background: material.color }} />
                <span>{material.name}</span>
                <strong>{material.value}</strong>
                <small>{formatKg(material.weight)}</small>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="impact-grid">
        <Card className="impact-ledger-card">
          <SectionHeader
            title="Impact ledger"
            subtitle="Each product is a receipt for waste removed."
            action={
              <Link to="/app/collector/products" className="text-link">
                Full product ledger <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Output</th>
                  <th>Buyer</th>
                  <th className="num">Waste used</th>
                  <th className="num">Bottles embedded</th>
                  <th className="num">Revenue</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 7).map((product) => {
                  const buyer = buyers.find((item) => item.id === product.buyerId);
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="table-person">
                          <span className="product-ledger-icon">
                            <PackageOpen size={14} />
                          </span>
                          <div>
                            <strong>{product.name}</strong>
                            <span>{product.category}</span>
                          </div>
                        </div>
                      </td>
                      <td>{buyer?.name ?? "—"}</td>
                      <td className="num">
                        <strong className="point-value">{formatKg(product.wasteKg)}</strong>
                      </td>
                      <td className="num">{formatNumber(product.bottlesUsed)}</td>
                      <td className="num">{formatCompactCurrency(product.revenue)}</td>
                      <td>
                        <span className="table-muted">{formatDate(product.createdAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="impact-side-stack">
          <Card className="network-rank-card">
            <SectionHeader
              title="Network rank"
              subtitle="Waste removed across all Loopr partners."
              action={<Badge tone="lime">#{rank}</Badge>}
            />
            <div className="network-rank-list">
              {ranking.slice(0, 5).map((collector, index) => (
                <div
                  className={cn(
                    "network-rank-row",
                    collector.id === currentCollector.id && "is-you",
                  )}
                  key={collector.id}
                >
                  <span className={cn("network-rank-row__rank", index < 3 && "is-top")}>
                    {index + 1}
                  </span>
                  <Avatar name={collector.name} hue={collector.avatarHue} size={30} />
                  <div>
                    <strong>{collector.name}</strong>
                    <span>{collector.city}</span>
                  </div>
                  <strong>{formatKg(collector.wasteDivertedKg)}</strong>
                </div>
              ))}
            </div>
            <div className="network-rank-card__foot">
              <TrendingUp size={15} />
              <p>
                The network leader is {formatKg(bestCollector.wasteDivertedKg)}. You are{" "}
                {formatKg(Math.max(0, bestCollector.wasteDivertedKg - wasteRemoved))} behind the top
                spot.
              </p>
            </div>
          </Card>

          <Card className="buyer-impact-card">
            <SectionHeader
              title="Buyer impact"
              subtitle="Where your recycled material ends up."
              action={<UsersRound size={16} />}
            />
            <div className="buyer-impact-list">
              {productBuyers.slice(0, 4).map((buyer) => (
                <div className="buyer-impact-row" key={buyer.id}>
                  <Avatar name={buyer.name} hue={(buyer.name.length * 43) % 360} size={32} square />
                  <div>
                    <strong>{buyer.name}</strong>
                    <span>{buyer.sector} · {buyer.city}</span>
                  </div>
                  <div className="buyer-impact-row__value">
                    <strong>{formatKg(buyer.ownWaste)}</strong>
                    <span>{formatCompactCurrency(buyer.ownRevenue)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="buyer-impact-card__note">
              <ShieldCheck size={14} />
              Buyer claims are matched to your product ledger and Loopr's fee records.
            </div>
          </Card>
        </div>
      </div>

      <Card className="impact-method-card">
        <div className="impact-method-card__icon">
          <Calculator size={22} />
        </div>
        <div>
          <span className="eyebrow">How we calculate this</span>
          <h3>Transparent by default.</h3>
          <p>
            Waste removed equals verified processing weight. CO₂e avoided uses 2.5 kg CO₂e per kg of
            recovered plastic, glass and metal, applied only to completed intake. Product impact is
            mapped from the buyer ledger. Nothing is counted twice across the network.
          </p>
        </div>
        <div className="impact-method-card__stats">
          <div>
            <span>Factor</span>
            <strong>2.5 kg</strong>
            <small>CO₂e / kg</small>
          </div>
          <div>
            <span>Tree equivalent</span>
            <strong>21 kg</strong>
            <small>CO₂ / tree / yr</small>
          </div>
          <div>
            <span>Audit</span>
            <strong>100%</strong>
            <small>ledger-backed</small>
          </div>
        </div>
      </Card>
    </div>
  );
}
