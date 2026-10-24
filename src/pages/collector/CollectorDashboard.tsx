import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  Check,
  CircleDollarSign,
  Factory,
  Leaf,
  MapPin,
  PackageCheck,
  PackageOpen,
  Plus,
  Recycle,
  Scale,
  Sparkles,
  Star,
  Truck,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
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
  PageHeader,
  ProgressBar,
  RingProgress,
  SectionHeader,
  StatCard,
  StatusBadge,
  cn,
} from "../../components/ui";
import { BOTTLE_BY_ID } from "../../data/bottles";
import { submissionsByWeek } from "../../lib/analytics";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatKg,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "../../lib/format";
import { useAppStore } from "../../store/AppStore";

const categoryColors = ["#5c8b42", "#c79b51", "#7e9fc1", "#a98bc4", "#db9278", "#84b9a7"];

export function CollectorDashboard() {
  const {
    state,
    currentCollector,
    receiveSubmissions,
    processSubmissions,
  } = useAppStore();

  if (!state || !currentCollector) return null;

  const ownSubmissions = state.submissions.filter(
    (submission) => submission.collectorId === currentCollector.id,
  );
  const queue = ownSubmissions
    .filter(
      (submission) => submission.status === "assigned" || submission.status === "collected",
    )
    .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
  const recycled = ownSubmissions.filter((submission) => submission.status === "recycled");
  const products = state.products.filter(
    (product) => product.collectorId === currentCollector.id,
  );
  const soldProducts = products.filter((product) => product.status === "sold");
  const buyers = state.buyers.filter((buyer) =>
    products.some((product) => product.buyerId === buyer.id),
  );
  const queueWeight = queue.reduce((sum, submission) => sum + submission.weightKg, 0);
  const recycledWeight = recycled.reduce((sum, submission) => sum + submission.weightKg, 0);
  const receivedWeight = ownSubmissions.reduce((sum, submission) => sum + submission.weightKg, 0);
  const utilisation = Math.min(
    100,
    (currentCollector.processedKg / currentCollector.capacityKg) * 100,
  );
  const weekly = submissionsByWeek(ownSubmissions, 8);
  const productRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
  const productCost = products.reduce((sum, product) => sum + product.cost, 0);
  const productProfit = productRevenue - productCost;
  const productWaste = products.reduce((sum, product) => sum + product.wasteKg, 0);
  const bottlesUsed = products.reduce((sum, product) => sum + product.bottlesUsed, 0);
  const transactions = state.transactions
    .filter((transaction) => transaction.collectorId === currentCollector.id)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);
  const productsByCategory = Object.entries(
    soldProducts.reduce<Record<string, number>>((acc, product) => {
      acc[product.category] = (acc[product.category] ?? 0) + product.revenue;
      return acc;
    }, {}),
  ).map(([name, value], index) => ({
    name,
    value,
    color: categoryColors[index % categoryColors.length],
  }));
  const categoryTotal = productsByCategory.reduce((sum, category) => sum + category.value, 0);
  const topBuyers = [...buyers]
    .map((buyer) => ({
      ...buyer,
      ownSpend: products
        .filter((product) => product.buyerId === buyer.id)
        .reduce((sum, product) => sum + product.revenue, 0),
      ownProducts: products.filter((product) => product.buyerId === buyer.id).length,
    }))
    .sort((a, b) => b.ownSpend - a.ownSpend)
    .slice(0, 4);

  return (
    <div className="page collector-dashboard">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <Truck size={13} /> {currentCollector.city} facility · verified partner
          </span>
        }
        title={
          <>
            Turn sorted material into <span className="serif-accent">a second life.</span>
          </>
        }
        description={`${currentCollector.name} is running at ${formatPercent(utilisation)} capacity. Keep the intake moving and document every recycled product.`}
        actions={
          <>
            <Link to="/app/collector/intake" className="btn btn--secondary btn--md">
              Open intake
            </Link>
            <Link to="/app/collector/products" className="btn btn--primary btn--md">
              <Plus size={16} />
              Log product
            </Link>
          </>
        }
      />

      <Card dark className="collector-hero">
        <div className="collector-hero__copy">
          <Badge tone="lime" icon={Sparkles}>
            Partner impact
          </Badge>
          <h2>
            {formatKg(currentCollector.wasteDivertedKg)} removed.
            <br />
            <span className="serif-accent">{formatNumber(bottlesUsed)}</span> bottles reborn.
          </h2>
          <p>
            You have sold {soldProducts.length} recycled product batches to {buyers.length} vetted
            buyers. The loop is only closed when processing is documented here.
          </p>
          <div className="collector-hero__actions">
            <Link to="/app/collector/impact" className="btn btn--primary btn--md">
              Open impact report
              <ArrowRight size={15} />
            </Link>
            <Link to="/app/collector/products" className="btn btn--lime-ghost btn--md">
              Manage products
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="collector-hero__stats">
            <div>
              <strong>{formatCompactCurrency(currentCollector.revenue)}</strong>
              <span>product revenue</span>
            </div>
            <div>
              <strong>{formatCompactCurrency(currentCollector.profit)}</strong>
              <span>retained profit</span>
            </div>
            <div>
              <strong>{formatKg(queueWeight)}</strong>
              <span>ready to receive</span>
            </div>
          </div>
        </div>
        <div className="collector-hero__visual">
          <div className="facility-orbit">
            <div className="facility-orbit__ring" />
            <div className="facility-orbit__ring facility-orbit__ring--two" />
            <div className="facility-orbit__core">
              <Factory size={34} />
              <strong>{formatPercent(utilisation)}</strong>
              <span>capacity</span>
            </div>
            <span className="facility-chip facility-chip--a">
              <Scale size={13} /> {formatKg(currentCollector.processedKg)}
            </span>
            <span className="facility-chip facility-chip--b">
              <Leaf size={13} /> {formatKg(currentCollector.wasteDivertedKg)}
            </span>
            <span className="facility-chip facility-chip--c">
              <Star size={13} /> {currentCollector.rating}
            </span>
          </div>
        </div>
        <div className="collector-hero__ticker">
          <div>
            <span>
              <Truck size={13} /> Intake queue
            </span>
            <strong>{queue.length} bottles</strong>
          </div>
          <div>
            <span>
              <Check size={13} /> Processed to date
            </span>
            <strong>{formatKg(currentCollector.processedKg)}</strong>
          </div>
          <div>
            <span>
              <PackageOpen size={13} /> Product stock
            </span>
            <strong>{products.filter((product) => product.status === "in-stock").length} batches</strong>
          </div>
          <div>
            <span>
              <Wallet size={13} /> Paid to Loopr
            </span>
            <strong>{formatCompactCurrency(currentCollector.paidToNetwork)}</strong>
          </div>
        </div>
      </Card>

      <div className="stats-grid">
        <StatCard
          label="Open intake"
          value={formatKg(queueWeight + recycledWeight)}
          detail={`${ownSubmissions.length} app-logged bottles`}
          trend={{ value: `${queue.length} in queue`, direction: "up" }}
          icon={Boxes}
          spark={weekly.map((point) => point.submitted)}
        />
        <StatCard
          label="Material processed"
          value={formatKg(currentCollector.processedKg)}
          detail={`${formatPercent(utilisation)} of capacity`}
          trend={{ value: `${formatKg(recycledWeight)} in app`, direction: "up" }}
          icon={Factory}
          tone="lime"
        />
        <StatCard
          label="Product revenue"
          value={formatCompactCurrency(currentCollector.revenue)}
          detail={`${formatCompactCurrency(currentCollector.profit)} retained margin`}
          trend={{ value: `${soldProducts.length} logged sales`, direction: "up" }}
          icon={Banknote}
        />
        <StatCard
          label="Waste removed"
          value={formatKg(currentCollector.wasteDivertedKg)}
          detail={`${formatKg(productWaste)} mapped to logged products`}
          trend={{ value: "Verified", direction: "up" }}
          icon={Leaf}
        />
      </div>

      <div className="collector-chart-grid">
        <Card className="chart-card">
          <SectionHeader
            title="Throughput"
            subtitle="Bottles assigned to your facility, compared with verified processing."
            action={<Badge tone="neutral" icon={Recycle}>Last 8 weeks</Badge>}
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={weekly} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="collectorIntake" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5c8b42" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#5c8b42" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 10 }} width={34} />
                <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} bottles`} />} />
                <Area
                  type="monotone"
                  dataKey="submitted"
                  name="Received"
                  stroke="#5c8b42"
                  strokeWidth={2.2}
                  fill="url(#collectorIntake)"
                />
                <Area
                  type="monotone"
                  dataKey="recycled"
                  name="Processed"
                  stroke="#c79b51"
                  strokeWidth={1.8}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>
              <span className="legend-dot" style={{ background: "#5c8b42" }} /> Received
            </span>
            <span>
              <span className="legend-dot" style={{ background: "#c79b51" }} /> Processed
            </span>
            <span className="chart-foot__note">{queue.length} currently waiting</span>
          </div>
        </Card>

        <Card className="capacity-card">
          <SectionHeader
            title="Facility capacity"
            subtitle="Keep utilisation below 90% to protect processing quality."
          />
          <div className="capacity-ring">
            <RingProgress
              value={utilisation}
              size={166}
              stroke={12}
              label={formatPercent(utilisation)}
              sublabel="used"
              color={utilisation > 88 ? "#d29a4f" : "#6d973f"}
              track="rgba(16,37,27,.09)"
            />
          </div>
          <div className="capacity-metrics">
            <div>
              <span>Processed</span>
              <strong>{formatKg(currentCollector.processedKg)}</strong>
            </div>
            <div>
              <span>Capacity</span>
              <strong>{formatKg(currentCollector.capacityKg)}</strong>
            </div>
            <div>
              <span>Available</span>
              <strong>{formatKg(Math.max(0, currentCollector.capacityKg - currentCollector.processedKg))}</strong>
            </div>
          </div>
          <div className="capacity-status">
            <span className="status-pulse" />
            <span>
              {utilisation > 88
                ? "Capacity is tight. Pause new assignments or add a shift."
                : "Capacity is healthy. Accepting new material."}
            </span>
          </div>
        </Card>
      </div>

      <div className="collector-mid-grid">
        <Card className="queue-card">
          <SectionHeader
            title="Intake queue"
            subtitle="Receive bottles at the gate, then mark them processed."
            action={
              <Link to="/app/collector/intake" className="text-link">
                Full queue <ArrowRight size={14} />
              </Link>
            }
          />
          {queue.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bottle</th>
                    <th>Member</th>
                    <th>Received</th>
                    <th>Weight</th>
                    <th>Feedstock value</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.slice(0, 5).map((submission) => {
                    const bottle = BOTTLE_BY_ID[submission.bottleTypeId];
                    const user = state.users.find((item) => item.id === submission.userId);
                    return (
                      <tr key={submission.id}>
                        <td>
                          <div className="table-person">
                            <BottleGlyph bottleTypeId={submission.bottleTypeId} size={20} />
                            <div>
                              <strong>{bottle?.name}</strong>
                              <span>{bottle?.material}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="table-muted">{user?.name}</span>
                        </td>
                        <td>
                          <span className="table-muted">{formatRelativeTime(submission.submittedAt)}</span>
                        </td>
                        <td>{submission.weightKg.toFixed(2)} kg</td>
                        <td>
                          <strong className="point-value">
                            {formatCurrency(submission.weightKg * currentCollector.ratePerKg)}
                          </strong>
                        </td>
                        <td>
                          <StatusBadge status={submission.status} />
                        </td>
                        <td>
                          {submission.status === "assigned" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => receiveSubmissions([submission.id])}
                            >
                              Receive
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => processSubmissions([submission.id])}
                            >
                              Process
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={PackageCheck}
              title="Your intake is clear"
              description="New assignments from Loopr will appear here. Check back after the next admin assignment."
              action={
                <Link to="/app/collector/intake" className="btn btn--secondary btn--sm">
                  Open intake
                </Link>
              }
            />
          )}
        </Card>

        <Card className="product-mix-card">
          <SectionHeader
            title="Revenue by product"
            subtitle="What buyers are paying for."
            action={<Badge tone="green">Sold</Badge>}
          />
          <div className="donut-wrap">
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={productsByCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {productsByCategory.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => formatCompactCurrency(Number(value))} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{formatCompactCurrency(categoryTotal)}</strong>
                <span>revenue</span>
              </div>
            </div>
            <div className="donut-legend">
              {productsByCategory.map((item) => (
                <div key={item.name}>
                  <span className="legend-dot" style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <strong>{Math.round((item.value / Math.max(1, categoryTotal)) * 100)}%</strong>
                </div>
              ))}
            </div>
          </div>
          <Link to="/app/collector/products" className="text-link">
            Open product ledger <ArrowRight size={14} />
          </Link>
        </Card>
      </div>

      <div className="collector-lower-grid">
        <Card className="product-list-card">
          <SectionHeader
            title="Recycled products"
            subtitle="Verified output from your feedstock."
            action={
              <Link to="/app/collector/products" className="text-link">
                All products <ArrowRight size={14} />
              </Link>
            }
          />
          {products.length ? (
            <div className="product-list">
              {products.slice(0, 4).map((product) => {
                const buyer = state.buyers.find((item) => item.id === product.buyerId);
                return (
                  <div className="product-line" key={product.id}>
                    <span className="product-line__mark">
                      <PackageOpen size={17} />
                    </span>
                    <div className="product-line__copy">
                      <strong>{product.name}</strong>
                      <span>
                        {formatNumber(product.units)} {product.unitLabel} · {buyer?.name}
                      </span>
                    </div>
                    <Badge tone={product.status === "sold" ? "green" : "amber"} dot>
                      {product.status === "sold" ? "Sold" : "In stock"}
                    </Badge>
                    <div className="product-line__waste">
                      <span>{formatKg(product.wasteKg)}</span>
                      <small>waste used</small>
                    </div>
                    <strong className="product-line__value">
                      {formatCompactCurrency(product.revenue || product.cost)}
                    </strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={PackageOpen}
              title="No recycled products yet"
              description="Log your first output batch to connect feedstock to revenue."
              action={
                <Link to="/app/collector/products" className="btn btn--primary btn--sm">
                  Log a product
                </Link>
              }
            />
          )}
        </Card>

        <div className="collector-side-stack">
          <Card className="buyer-card">
            <SectionHeader
              title="Buyer network"
              subtitle="Vetted buyers taking your output."
              action={<Badge tone="neutral">{buyers.length} buyers</Badge>}
            />
            <div className="buyer-list">
              {topBuyers.map((buyer) => (
                <div className="buyer-line" key={buyer.id}>
                  <Avatar name={buyer.name} hue={(buyer.name.length * 47) % 360} size={34} square />
                  <div>
                    <strong>{buyer.name}</strong>
                    <span>{buyer.sector} · {buyer.city}</span>
                  </div>
                  <div className="buyer-line__value">
                    <strong>{formatCompactCurrency(buyer.ownSpend)}</strong>
                    <span>{buyer.ownProducts} products</span>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/app/collector/products" className="text-link">
              View buyer details <ArrowRight size={14} />
            </Link>
          </Card>

          <Card className="settlement-card">
            <SectionHeader
              title="Recent settlements"
              subtitle="Feedstock, fees and product sales."
              action={<Wallet size={16} />}
            />
            <div className="settlement-list">
              {transactions.map((transaction) => (
                <div className="settlement-line" key={transaction.id}>
                  <span
                    className={cn(
                      "settlement-line__icon",
                      transaction.type === "product_sale" ? "is-in" : "is-out",
                    )}
                  >
                    {transaction.type === "product_sale" ? (
                      <Banknote size={14} />
                    ) : transaction.type === "platform_fee" ? (
                      <CircleDollarSign size={14} />
                    ) : (
                      <Truck size={14} />
                    )}
                  </span>
                  <div>
                    <strong>{transaction.description}</strong>
                    <span>{formatDate(transaction.createdAt)}</span>
                  </div>
                  <strong
                    className={cn(
                      "settlement-line__amount",
                      transaction.type === "product_sale" && "is-in",
                    )}
                  >
                    {transaction.type === "product_sale" ? "+" : "−"}
                    {formatCurrency(transaction.amount)}
                  </strong>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="collector-footer-strip">
        <div>
          <UsersRound size={17} />
          <p>
            <strong>{buyers.length} buyers</strong> are connected to your facility. Logging a product
            automatically updates Loopr's circularity fee and your retention.
          </p>
        </div>
        <Link to="/app/collector/products" className="btn btn--secondary btn--sm">
          Manage sales
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
