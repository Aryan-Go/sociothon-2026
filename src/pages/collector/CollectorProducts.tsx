import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  Check,
  CircleDollarSign,
  Filter,
  Leaf,
  PackageOpen,
  Plus,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { ChartTooltip } from "../../components/charts";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  SectionHeader,
  SelectInput,
  StatCard,
  TextArea,
  TextInput,
  cn,
} from "../../components/ui";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatKg,
  formatNumber,
} from "../../lib/format";
import { useAppStore } from "../../store/AppStore";

const categories = [
  "Raw material",
  "Textile",
  "Consumer goods",
  "Industrial",
  "Construction",
  "Packaging",
];

const categoryColors = ["#5c8b42", "#c79b51", "#7e9fc1", "#a98bc4", "#db9278", "#84b9a7"];

const emptyProduct = {
  name: "",
  category: "Raw material",
  units: "",
  unitLabel: "kg",
  revenue: "",
  cost: "",
  buyerId: "",
  description: "",
  wasteKg: "",
  bottlesUsed: "",
  status: "sold" as "sold" | "in-stock",
};

export function CollectorProducts() {
  const { state, currentCollector, addProduct, notify } = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyProduct);

  if (!state || !currentCollector) return null;

  const products = state.products.filter(
    (product) => product.collectorId === currentCollector.id,
  );
  const buyers = state.buyers;
  const filtered = useMemo(() => {
    return products
      .filter((product) => {
        const query = search.trim().toLowerCase();
        const buyer = buyers.find((item) => item.id === product.buyerId);
        return (
          (!query ||
            [product.name, product.category, buyer?.name ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(query)) &&
          (status === "all" || product.status === status) &&
          (category === "all" || product.category === category)
        );
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [products, buyers, search, status, category]);

  const totalRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
  const totalCost = products.reduce((sum, product) => sum + product.cost, 0);
  const totalWaste = products.reduce((sum, product) => sum + product.wasteKg, 0);
  const bottlesUsed = products.reduce((sum, product) => sum + product.bottlesUsed, 0);
  const sold = products.filter((product) => product.status === "sold");
  const inStock = products.filter((product) => product.status === "in-stock");
  const margin = totalRevenue - totalCost;

  const categoryData = Object.entries(
    products.reduce<Record<string, number>>((acc, product) => {
      acc[product.category] = (acc[product.category] ?? 0) + product.revenue;
      return acc;
    }, {}),
  ).map(([name, value], index) => ({
    name,
    value,
    color: categoryColors[index % categoryColors.length],
  }));
  const totalCategory = categoryData.reduce((sum, item) => sum + item.value, 0);

  const weekly = useMemo(() => {
    const data: { label: string; revenue: number; waste: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let offset = 7; offset >= 0; offset -= 1) {
      const end = new Date(today);
      end.setDate(end.getDate() - offset * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      const matches = products.filter((product) => {
        const created = new Date(product.createdAt);
        return created >= start && created < end;
      });
      data.push({
        label: end.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        revenue: matches.reduce((sum, product) => sum + product.revenue, 0),
        waste: matches.reduce((sum, product) => sum + product.wasteKg, 0),
      });
    }
    return data;
  }, [products]);

  const topBuyers = buyers
    .map((buyer) => {
      const own = products.filter((product) => product.buyerId === buyer.id);
      return {
        ...buyer,
        ownProducts: own.length,
        ownSpend: own.reduce((sum, product) => sum + product.revenue, 0),
        ownWaste: own.reduce((sum, product) => sum + product.wasteKg, 0),
      };
    })
    .filter((buyer) => buyer.ownProducts > 0)
    .sort((a, b) => b.ownSpend - a.ownSpend);

  const submitProduct = () => {
    if (!form.name.trim() || !form.units || !form.revenue || !form.buyerId) {
      notify("Add a product name, units, revenue and buyer before saving.", "error");
      return;
    }
    if (Number(form.revenue) < 0 || Number(form.cost) < 0) {
      notify("Revenue and cost must be zero or above.", "error");
      return;
    }
    addProduct({
      collectorId: currentCollector.id,
      name: form.name.trim(),
      category: form.category,
      units: Number(form.units),
      unitLabel: form.unitLabel,
      revenue: Number(form.revenue),
      cost: Number(form.cost || 0),
      buyerId: form.buyerId,
      description: form.description.trim() || "Recycled output batch logged by the collector.",
      wasteKg: Number(form.wasteKg || 0),
      bottlesUsed: Number(form.bottlesUsed || 0),
      status: form.status,
    });
    setForm(emptyProduct);
    setAddOpen(false);
  };

  const openAdd = () => {
    setForm({ ...emptyProduct, buyerId: buyers[0]?.id ?? "" });
    setAddOpen(true);
  };

  return (
    <div className="page collector-products">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <PackageOpen size={13} /> Recycled output ledger
          </span>
        }
        title={
          <>
            Waste becomes <span className="serif-accent">worth.</span>
          </>
        }
        description="Every product here is traceable to sorted bottles, a verified buyer, and a measurable chunk of waste removed from the earth."
        actions={
          <>
            <Badge tone="neutral" icon={UsersRound}>
              {topBuyers.length} active buyers
            </Badge>
            <Button variant="primary" size="md" icon={Plus} onClick={openAdd}>
              Log product
            </Button>
          </>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Product revenue"
          value={formatCompactCurrency(totalRevenue)}
          detail={`${sold.length} sold batches`}
          trend={{ value: "Verified", direction: "up" }}
          icon={Banknote}
          tone="lime"
        />
        <StatCard
          label="Retained margin"
          value={formatCompactCurrency(margin)}
          detail={`${Math.round((margin / Math.max(1, totalRevenue)) * 100)}% of revenue`}
          trend={{ value: "After costs", direction: "up" }}
          icon={TrendingUp}
        />
        <StatCard
          label="Waste transformed"
          value={formatKg(totalWaste)}
          detail={`${formatNumber(bottlesUsed)} bottles embedded`}
          trend={{ value: "Measured", direction: "up" }}
          icon={Leaf}
        />
        <StatCard
          label="In-stock output"
          value={formatNumber(inStock.length)}
          detail={`${formatNumber(inStock.reduce((sum, product) => sum + product.units, 0))} units/deposits`}
          trend={{ value: "Ready to sell", direction: "up" }}
          icon={Boxes}
        />
      </div>

      <Card dark className="products-hero">
        <div className="products-hero__copy">
          <Badge tone="lime" icon={Sparkles}>
            Material worth
          </Badge>
          <h2>
            {formatKg(totalWaste)} of waste
            <br />
            became <span className="serif-accent">{formatCompactCurrency(totalRevenue)}</span> of value.
          </h2>
          <p>
            Your margin is {formatPercentOf(margin, totalRevenue)} across {products.length} output
            batches. Every logged sale also feeds Loopr's circularity fee and the buyer's verified
            recycled spend.
          </p>
          <Button variant="primary" size="md" icon={Plus} onClick={openAdd}>
            Record the next output
          </Button>
        </div>
        <div className="products-hero__stats">
          <div>
            <span>Revenue</span>
            <strong>{formatCompactCurrency(totalRevenue)}</strong>
            <small>recycled output</small>
          </div>
          <div>
            <span>Cost base</span>
            <strong>{formatCompactCurrency(totalCost)}</strong>
            <small>processing + feedstock</small>
          </div>
          <div>
            <span>Profit</span>
            <strong>{formatCompactCurrency(margin)}</strong>
            <small>retained by partner</small>
          </div>
          <div>
            <span>Bottles embedded</span>
            <strong>{formatNumber(bottlesUsed)}</strong>
            <small>across sold + stock</small>
          </div>
        </div>
      </Card>

      <div className="products-chart-grid">
        <Card className="chart-card">
          <SectionHeader
            title="Revenue rhythm"
            subtitle="Recycled product sales over the last eight weeks."
            action={<Badge tone="neutral">₹ in thousands</Badge>}
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={weekly.map((week) => ({
                  ...week,
                  revenueK: Math.round(week.revenue / 1000),
                }))}
                margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#838b82", fontSize: 10 }} width={34} />
                <Tooltip
                  cursor={{ fill: "rgba(16,37,27,.035)" }}
                  content={<ChartTooltip valueFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}k`} />}
                />
                <Bar dataKey="revenueK" name="Revenue" fill="#5c8b42" radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>
              <span className="legend-dot" style={{ background: "#5c8b42" }} /> Product revenue
            </span>
            <span className="chart-foot__note">₹ thousands</span>
          </div>
        </Card>

        <Card className="product-mix-card">
          <SectionHeader title="Category mix" subtitle="Where your revenue comes from." />
          <div className="donut-wrap">
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height={194}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => formatCompactCurrency(Number(value))} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{formatCompactCurrency(totalCategory)}</strong>
                <span>revenue</span>
              </div>
            </div>
            <div className="donut-legend">
              {categoryData.map((item) => (
                <div key={item.name}>
                  <span className="legend-dot" style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <strong>{Math.round((item.value / Math.max(1, totalCategory)) * 100)}%</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="products-catalog">
        <div className="catalog-head">
          <SectionHeader
            title="Recycled product ledger"
            subtitle={`${filtered.length} of ${products.length} batches shown.`}
          />
          <div className="catalog-filters">
            <label className="search-field">
              <Search size={15} />
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a product"
                aria-label="Search products"
              />
            </label>
            <div className="filter-group">
              <Filter size={14} />
              <SelectInput
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter products by status"
              >
                <option value="all">All output</option>
                <option value="sold">Sold</option>
                <option value="in-stock">In stock</option>
              </SelectInput>
            </div>
            <SelectInput
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter products by category"
            >
              <option value="all">All categories</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>

        {filtered.length ? (
          <div className="product-grid">
            {filtered.map((product) => {
              const buyer = buyers.find((item) => item.id === product.buyerId);
              const marginValue = product.revenue - product.cost;
              return (
                <div className="product-card" key={product.id}>
                  <div
                    className={cn(
                      "product-card__visual",
                      `product-card__visual--${product.category.split(" ")[0].toLowerCase()}`,
                    )}
                  >
                    <span className="product-card__category">{product.category}</span>
                    <Badge tone={product.status === "sold" ? "green" : "amber"} dot>
                      {product.status === "sold" ? "Sold" : "In stock"}
                    </Badge>
                    <div className="product-card__shape" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <PackageOpen size={26} />
                    </div>
                    <span className="product-card__batch">
                      {product.units.toLocaleString("en-IN")} {product.unitLabel}
                    </span>
                  </div>
                  <div className="product-card__body">
                    <div>
                      <h3>{product.name}</h3>
                      <p>{product.description}</p>
                    </div>
                    <div className="product-card__buyer">
                      {buyer ? (
                        <>
                          <Avatar
                            name={buyer.name}
                            hue={(buyer.name.length * 53) % 360}
                            size={26}
                            square
                          />
                          <span>{buyer.name}</span>
                        </>
                      ) : (
                        <span>No buyer linked</span>
                      )}
                    </div>
                    <div className="product-card__metrics">
                      <div>
                        <span>Waste used</span>
                        <strong>{formatKg(product.wasteKg)}</strong>
                      </div>
                      <div>
                        <span>Bottles</span>
                        <strong>{formatNumber(product.bottlesUsed)}</strong>
                      </div>
                      <div>
                        <span>Margin</span>
                        <strong>{formatCompactCurrency(marginValue)}</strong>
                      </div>
                    </div>
                    <div className="product-card__foot">
                      <div>
                        <span>Revenue</span>
                        <strong>{formatCompactCurrency(product.revenue)}</strong>
                      </div>
                      <span className="product-card__date">{formatDate(product.createdAt, { year: undefined })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={PackageOpen}
            title="No output matches those filters"
            description="Change the category or status, or log a new recycled product batch."
            action={
              <Button variant="primary" size="sm" onClick={openAdd}>
                Log a product
              </Button>
            }
          />
        )}
      </Card>

      <Card className="buyer-ledger-card">
        <SectionHeader
          title="Buyer book"
          subtitle="Who buys your recycled output, and how much circular value they have taken."
          action={<Badge tone="neutral">{topBuyers.length} buyers</Badge>}
        />
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Sector</th>
                <th>City</th>
                <th className="num">Products</th>
                <th className="num">Spend</th>
                <th className="num">Waste purchased</th>
                <th>Relationship</th>
              </tr>
            </thead>
            <tbody>
              {topBuyers.map((buyer) => (
                <tr key={buyer.id}>
                  <td>
                    <div className="table-person">
                      <Avatar
                        name={buyer.name}
                        hue={(buyer.name.length * 53) % 360}
                        size={32}
                        square
                      />
                      <div>
                        <strong>{buyer.name}</strong>
                        <span>Since {new Date(buyer.since).getFullYear()}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge tone="neutral">{buyer.sector}</Badge>
                  </td>
                  <td>{buyer.city}</td>
                  <td className="num">{buyer.ownProducts}</td>
                  <td className="num">
                    <strong className="point-value">{formatCompactCurrency(buyer.ownSpend)}</strong>
                  </td>
                  <td className="num">{formatKg(buyer.ownWaste)}</td>
                  <td>
                    <span className="buyer-relationship">
                      <Star size={13} fill="currentColor" /> Preferred
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-note">
          <span>
            <CircleDollarSign size={14} /> Loopr takes a 6% circularity fee on product sales.
          </span>
          <span>
            <ArrowUpRight size={14} /> Buyers are vetted by the network admin.
          </span>
        </div>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Log a recycled product"
        description="Connect a verified output batch to its buyer, revenue and waste impact."
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={submitProduct}>
              <Check size={15} />
              Save product
            </Button>
          </>
        }
      >
        <div className="form-grid form-grid--two">
          <Field label="Product name">
            <TextInput
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. rPET clear flake"
              data-autofocus
            />
          </Field>
          <Field label="Category">
            <SelectInput
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Quantity">
            <TextInput
              type="number"
              min="0"
              value={form.units}
              onChange={(event) => setForm({ ...form, units: event.target.value })}
              placeholder="e.g. 820"
            />
          </Field>
          <Field label="Unit">
            <SelectInput
              value={form.unitLabel}
              onChange={(event) => setForm({ ...form, unitLabel: event.target.value })}
            >
              <option value="kg">kg</option>
              <option value="units">units</option>
              <option value="m">metres</option>
              <option value="sq ft">sq ft</option>
            </SelectInput>
          </Field>
          <Field label="Revenue (₹)">
            <TextInput
              type="number"
              min="0"
              value={form.revenue}
              onChange={(event) => setForm({ ...form, revenue: event.target.value })}
              placeholder="168000"
            />
          </Field>
          <Field label="Cost (₹)" hint="Feedstock, processing, labour and logistics.">
            <TextInput
              type="number"
              min="0"
              value={form.cost}
              onChange={(event) => setForm({ ...form, cost: event.target.value })}
              placeholder="112000"
            />
          </Field>
          <Field label="Buyer">
            <SelectInput
              value={form.buyerId}
              onChange={(event) => setForm({ ...form, buyerId: event.target.value })}
            >
              <option value="">Choose a buyer</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name} · {buyer.sector}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as "sold" | "in-stock" })
              }
            >
              <option value="sold">Sold</option>
              <option value="in-stock">In stock</option>
            </SelectInput>
          </Field>
          <Field label="Waste transformed (kg)">
            <TextInput
              type="number"
              min="0"
              value={form.wasteKg}
              onChange={(event) => setForm({ ...form, wasteKg: event.target.value })}
              placeholder="940"
            />
          </Field>
          <Field label="Bottles embedded">
            <TextInput
              type="number"
              min="0"
              value={form.bottlesUsed}
              onChange={(event) => setForm({ ...form, bottlesUsed: event.target.value })}
              placeholder="18800"
            />
          </Field>
          <Field label="Description" className="span-2">
            <TextArea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What was made, and from which material stream?"
            />
          </Field>
        </div>
        <div className="modal-note">
          <Leaf size={15} />
          <p>
            Sold products immediately update your revenue, buyer spend, Loopr's fee ledger and the
            network's verified waste diversion.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function formatPercentOf(value: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}
