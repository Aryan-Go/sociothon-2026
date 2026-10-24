import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Check,
  CircleDollarSign,
  Factory,
  Handshake,
  Mail,
  MapPin,
  Plus,
  ReceiptText,
  Scale,
  ShieldCheck,
  Star,
  Truck,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  Field,
  IconButton,
  Modal,
  PageHeader,
  ProgressBar,
  SectionHeader,
  SelectInput,
  StatCard,
  TextInput,
  cn,
} from "../../components/ui";
import { CITIES } from "../../data/bottles";
import { collectorStats } from "../../lib/analytics";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatKg,
  formatNumber,
  formatPercent,
} from "../../lib/format";
import { useAppStore } from "../../store/AppStore";
import type { TransactionType } from "../../types";

const transactionLabels: Record<TransactionType, string> = {
  feedstock_purchase: "Feedstock purchase",
  product_sale: "Product sale",
  platform_fee: "Circularity fee",
  logistics_payout: "Logistics payout",
};

const transactionTone: Record<TransactionType, "green" | "lime" | "amber" | "blue"> = {
  feedstock_purchase: "blue",
  product_sale: "green",
  platform_fee: "lime",
  logistics_payout: "amber",
};

const emptyForm = {
  name: "",
  manager: "",
  email: "",
  phone: "",
  city: "Bengaluru",
  ratePerKg: "38",
  capacityKg: "3000",
  focus: "PET · HDPE",
};

export function AdminCollectors() {
  const { state, addCollector, settleCollector, verifyCollector, notify } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [settlement, setSettlement] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState<"all" | TransactionType>("all");

  if (!state) return null;

  const partners = collectorStats(state.collectors, state.submissions);
  const detail = partners.find((collector) => collector.id === detailId);
  const totalCapacity = state.collectors.reduce((sum, collector) => sum + collector.capacityKg, 0);
  const totalProcessed = state.collectors.reduce((sum, collector) => sum + collector.processedKg, 0);
  const totalRevenue = state.collectors.reduce((sum, collector) => sum + collector.revenue, 0);
  const totalProfit = state.collectors.reduce((sum, collector) => sum + collector.profit, 0);
  const totalFees = state.transactions
    .filter((transaction) => transaction.type === "platform_fee")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalLogistics = state.transactions
    .filter((transaction) => transaction.type === "logistics_payout")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const feedstockFlow = state.transactions
    .filter((transaction) => transaction.type === "feedstock_purchase")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const openQueueWeight = partners.reduce((sum, partner) => sum + partner.queueWeight, 0);
  const openQueueValue = partners.reduce((sum, partner) => sum + partner.purchaseValue, 0);

  const chartData = partners.map((partner) => ({
    name: partner.name.split(" ")[0],
    revenue: Math.round(partner.revenue / 1000),
    profit: Math.round(partner.profit / 1000),
    processed: partner.processedKg,
  }));

  const ledger = useMemo(
    () =>
      state.transactions
        .filter(
          (transaction) => ledgerFilter === "all" || transaction.type === ledgerFilter,
        )
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 12),
    [state.transactions, ledgerFilter],
  );

  const submitPartner = () => {
    if (!form.name.trim() || !form.manager.trim() || !form.city.trim()) {
      notify("Add the partner name, manager and city before saving.", "error");
      return;
    }
    if (Number(form.ratePerKg) <= 0 || Number(form.capacityKg) <= 0) {
      notify("Set a positive feedstock rate and monthly capacity.", "error");
      return;
    }
    addCollector({
      name: form.name.trim(),
      manager: form.manager.trim(),
      email: form.email.trim() || "partner@loopr.earth",
      phone: form.phone.trim() || "+91 00000 00000",
      city: form.city,
      ratePerKg: Number(form.ratePerKg),
      capacityKg: Number(form.capacityKg),
      focus: form.focus,
    });
    setForm(emptyForm);
    setAddOpen(false);
  };

  const recordSettlement = () => {
    if (!detail) return;
    const amount = Number(settlement);
    if (!amount || amount <= 0) {
      notify("Enter a settlement amount above zero.", "error");
      return;
    }
    settleCollector(detail.id, amount);
    setSettlement("");
  };

  return (
    <div className="page admin-collectors">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <Handshake size={13} /> Partner network
          </span>
        }
        title={
          <>
            The people who make <span className="serif-accent">circular real.</span>
          </>
        }
        description="Choose collectors by material fit, rate and capacity. Track their feedstock, processing and recycled product economics in one partner desk."
        actions={
          <>
            <Badge tone="neutral" icon={MapPin}>
              {new Set(state.collectors.map((collector) => collector.city)).size} cities
            </Badge>
            <Button variant="primary" size="md" icon={Plus} onClick={() => setAddOpen(true)}>
              Add partner
            </Button>
          </>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Verified partners"
          value={formatNumber(state.collectors.filter((item) => item.status === "verified").length)}
          detail={`of ${state.collectors.length} collectors`}
          trend={{ value: "Network", direction: "up" }}
          icon={ShieldCheck}
          tone="lime"
        />
        <StatCard
          label="Material processed"
          value={formatKg(totalProcessed)}
          detail={`${formatPercent((totalProcessed / Math.max(1, totalCapacity)) * 100)} of capacity`}
          trend={{ value: "This cycle", direction: "up" }}
          icon={Factory}
        />
        <StatCard
          label="Partner revenue"
          value={formatCompactCurrency(totalRevenue)}
          detail={`${formatCompactCurrency(totalProfit)} retained profit`}
          trend={{ value: "Verified sales", direction: "up" }}
          icon={Banknote}
        />
        <StatCard
          label="Open feedstock value"
          value={formatCompactCurrency(openQueueValue)}
          detail={`${formatKg(openQueueWeight)} in collector queues`}
          trend={{ value: "Awaiting pickup", direction: "up" }}
          icon={Scale}
        />
      </div>

      <Card dark className="economics-hero">
        <div className="economics-hero__copy">
          <Badge tone="lime" icon={CircleDollarSign}>
            Network economics
          </Badge>
          <h2>
            {formatCompactCurrency(totalRevenue)} recycled output.
            <br />
            <span className="serif-accent">{formatCompactCurrency(totalFees)}</span> back into the loop.
          </h2>
          <p>
            Collectors buy sorted feedstock from Loopr, process it into verified products, and sell
            to vetted buyers. Loopr keeps a 6% circularity fee on partner sales and reinvests it in
            pickup logistics.
          </p>
          <LinkToAnalytics />
        </div>
        <div className="economics-hero__stats">
          <div>
            <span>Feedstock flow</span>
            <strong>{formatCompactCurrency(feedstockFlow)}</strong>
            <small>paid by partners</small>
          </div>
          <div>
            <span>Circularity fees</span>
            <strong>{formatCompactCurrency(totalFees)}</strong>
            <small>platform revenue</small>
          </div>
          <div>
            <span>Logistics reinvested</span>
            <strong>{formatCompactCurrency(totalLogistics)}</strong>
            <small>collection crews</small>
          </div>
          <div>
            <span>Partner margin</span>
            <strong>
              {formatPercent((totalProfit / Math.max(1, totalRevenue)) * 100, 1)}
            </strong>
            <small>on recycled sales</small>
          </div>
        </div>
      </Card>

      <div className="collectors-section-head">
        <SectionHeader
          title="Collector partners"
          subtitle="Every partner is matched to a material stream and a serviceable city."
          action={<Badge tone="green" dot>Live capacity</Badge>}
        />
      </div>

      <div className="partner-grid">
        {partners.map((partner) => (
          <Card className="partner-card" key={partner.id}>
            <div className="partner-card__head">
              <Avatar
                name={partner.name}
                hue={partner.avatarHue}
                size={48}
                square
              />
              <div className="partner-card__identity">
                <div>
                  <strong>{partner.name}</strong>
                  {partner.status === "verified" ? (
                    <BadgeCheck size={15} className="verified-icon" />
                  ) : null}
                </div>
                <span>
                  <MapPin size={11} /> {partner.city} · {partner.manager}
                </span>
              </div>
              <Badge tone={partner.status === "verified" ? "green" : "amber"} dot>
                {partner.status === "verified" ? "Verified" : "Review"}
              </Badge>
            </div>
            <div className="partner-card__focus">
              <span>{partner.focus}</span>
              <span className="partner-card__rating">
                <Star size={12} fill="currentColor" /> {partner.rating}
              </span>
            </div>
            <div className="partner-card__capacity">
              <div>
                <span>Capacity used</span>
                <strong>
                  {formatKg(partner.processedKg)} / {formatKg(partner.capacityKg)}
                </strong>
              </div>
              <ProgressBar
                value={partner.utilisation}
                tone={partner.utilisation > 85 ? "amber" : "forest"}
              />
            </div>
            <div className="partner-card__metrics">
              <div>
                <span>Queue</span>
                <strong>{formatKg(partner.queueWeight)}</strong>
              </div>
              <div>
                <span>Feedstock rate</span>
                <strong>₹{partner.ratePerKg}/kg</strong>
              </div>
              <div>
                <span>Waste removed</span>
                <strong>{formatKg(partner.wasteDivertedKg)}</strong>
              </div>
            </div>
            <div className="partner-card__footer">
              <span>
                <ReceiptText size={13} /> {formatCompactCurrency(partner.revenue)} revenue
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDetailId(partner.id);
                  setSettlement("");
                }}
              >
                Open desk <ArrowUpRight size={14} />
              </Button>
            </div>
          </Card>
        ))}
        <button className="add-partner-card" onClick={() => setAddOpen(true)}>
          <span className="add-partner-card__icon">
            <Plus size={22} />
          </span>
          <strong>Add a collector</strong>
          <p>Expand the network into a new city or material stream.</p>
          <span className="add-partner-card__link">
            Start partner review <ArrowRight size={14} />
          </span>
        </button>
      </div>

      <div className="collector-analytics-grid">
        <Card>
          <SectionHeader
            title="Partner economics"
            subtitle="Revenue and retained profit by collector, in ₹ thousands."
            action={<Badge tone="neutral">Verified sales</Badge>}
          />
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(16,37,27,.08)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#66736a", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#838b82", fontSize: 10 }}
                  width={34}
                />
                <Tooltip
                  cursor={{ fill: "rgba(16,37,27,.035)" }}
                  content={
                    <ChartTooltip valueFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}k`} />
                  }
                />
                <Bar dataKey="revenue" name="Revenue" fill="#5c8b42" radius={[5, 5, 0, 0]} maxBarSize={28} />
                <Bar dataKey="profit" name="Profit" fill="#d8ba84" radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>
              <span className="legend-dot" style={{ background: "#5c8b42" }} /> Revenue
            </span>
            <span>
              <span className="legend-dot" style={{ background: "#d8ba84" }} /> Profit
            </span>
            <span className="chart-foot__note">₹ thousands</span>
          </div>
        </Card>

        <Card className="partner-ranking-card">
          <SectionHeader
            title="Processing leaders"
            subtitle="Verified kilograms moved through partner facilities."
          />
          <div className="partner-ranking">
            {[...partners]
              .sort((a, b) => b.processedKg - a.processedKg)
              .map((partner, index) => (
                <div className="partner-ranking__row" key={partner.id}>
                  <span className={cn("partner-ranking__rank", index < 3 && "is-top")}>
                    {index + 1}
                  </span>
                  <Avatar name={partner.name} hue={partner.avatarHue} size={30} />
                  <div>
                    <strong>{partner.name}</strong>
                    <span>{partner.city}</span>
                  </div>
                  <div className="partner-ranking__bar">
                    <span style={{ width: `${(partner.processedKg / Math.max(1, totalProcessed)) * 100}%` }} />
                  </div>
                  <strong>{formatKg(partner.processedKg)}</strong>
                </div>
              ))}
          </div>
          <div className="partner-ranking__note">
            <Truck size={15} />
            <p>
              {formatKg(openQueueWeight)} is currently assigned across the network. The highest
              open exposure belongs to{" "}
              <strong>
                {[...partners].sort((a, b) => b.queueWeight - a.queueWeight)[0]?.name}
              </strong>
              .
            </p>
          </div>
        </Card>
      </div>

      <Card className="ledger-card">
        <div className="ledger-head">
          <SectionHeader
            title="Settlement ledger"
            subtitle="Every feedstock, sale and fee movement across the network."
          />
          <SelectInput
            value={ledgerFilter}
            onChange={(event) => setLedgerFilter(event.target.value as "all" | TransactionType)}
            aria-label="Filter ledger by type"
          >
            <option value="all">All movements</option>
            <option value="feedstock_purchase">Feedstock purchases</option>
            <option value="product_sale">Product sales</option>
            <option value="platform_fee">Circularity fees</option>
            <option value="logistics_payout">Logistics payouts</option>
          </SelectInput>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Reference</th>
                <th>Collector</th>
                <th>Date</th>
                <th>Status</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((transaction) => {
                const collector = state.collectors.find(
                  (item) => item.id === transaction.collectorId,
                );
                return (
                  <tr key={transaction.id}>
                    <td>
                      <Badge tone={transactionTone[transaction.type]} dot>
                        {transactionLabels[transaction.type]}
                      </Badge>
                    </td>
                    <td>
                      <span className="table-muted">{transaction.description}</span>
                    </td>
                    <td>{collector?.name ?? "Network"}</td>
                    <td>
                      <span className="table-muted">{formatDate(transaction.createdAt)}</span>
                    </td>
                    <td>
                      <Badge tone={transaction.status === "settled" ? "green" : "amber"} dot>
                        {transaction.status === "settled" ? "Settled" : "Pending"}
                      </Badge>
                    </td>
                    <td className={cn("num", "ledger-amount", transaction.direction === "out" && "is-out")}>
                      {transaction.direction === "out" ? "−" : "+"}
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a collector partner"
        description="New partners begin in review. You can verify them from their partner desk."
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={submitPartner}>
              <Plus size={15} />
              Add to partner review
            </Button>
          </>
        }
      >
        <div className="form-grid form-grid--two">
          <Field label="Business name">
            <TextInput
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Circular Works"
              data-autofocus
            />
          </Field>
          <Field label="Partner manager">
            <TextInput
              value={form.manager}
              onChange={(event) => setForm({ ...form, manager: event.target.value })}
              placeholder="Full name"
            />
          </Field>
          <Field label="City">
            <SelectInput
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="partner@company.com"
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="+91…"
            />
          </Field>
          <Field label="Material focus">
            <TextInput
              value={form.focus}
              onChange={(event) => setForm({ ...form, focus: event.target.value })}
              placeholder="e.g. rPET · fibre fill"
            />
          </Field>
          <Field label="Feedstock rate (₹ / kg)" hint="What the collector pays Loopr for sorted bottles.">
            <TextInput
              type="number"
              min="1"
              value={form.ratePerKg}
              onChange={(event) => setForm({ ...form, ratePerKg: event.target.value })}
            />
          </Field>
          <Field label="Monthly capacity (kg)" hint="Verified processing capacity per month.">
            <TextInput
              type="number"
              min="1"
              value={form.capacityKg}
              onChange={(event) => setForm({ ...form, capacityKg: event.target.value })}
            />
          </Field>
        </div>
        <div className="modal-note">
          <ShieldCheck size={15} />
          <p>
            Partners stay in review until their facility certificate and material acceptance terms
            are verified. They can still be assigned material manually.
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.name ?? "Partner desk"}
        description={detail ? `${detail.city} · ${detail.focus}` : undefined}
        size="lg"
        footer={
          detail ? (
            <>
              {detail.status === "review" ? (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => verifyCollector(detail.id)}
                >
                  <ShieldCheck size={15} />
                  Approve partner
                </Button>
              ) : null}
              <Button variant="ghost" size="md" onClick={() => setDetailId(null)}>
                Close
              </Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="partner-detail">
            <div className="partner-detail__hero">
              <Avatar name={detail.name} hue={detail.avatarHue} size={64} square />
              <div>
                <div className="partner-detail__name">
                  <h3>{detail.name}</h3>
                  {detail.status === "verified" ? <BadgeCheck size={18} /> : null}
                </div>
                <p>
                  <MapPin size={13} /> {detail.city} · managed by {detail.manager}
                </p>
                <div className="partner-detail__contact">
                  <span>
                    <Mail size={12} /> {detail.email}
                  </span>
                  <span>
                    <Star size={12} fill="currentColor" /> {detail.rating} rating
                  </span>
                </div>
              </div>
              <Badge tone={detail.status === "verified" ? "green" : "amber"} dot>
                {detail.status === "verified" ? "Verified partner" : "Awaiting review"}
              </Badge>
            </div>

            <div className="partner-detail__metrics">
              <div>
                <span>Processed</span>
                <strong>{formatKg(detail.processedKg)}</strong>
              </div>
              <div>
                <span>In queue</span>
                <strong>{formatKg(detail.queueWeight)}</strong>
              </div>
              <div>
                <span>Waste removed</span>
                <strong>{formatKg(detail.wasteDivertedKg)}</strong>
              </div>
              <div>
                <span>Revenue</span>
                <strong>{formatCompactCurrency(detail.revenue)}</strong>
              </div>
              <div>
                <span>Feedstock rate</span>
                <strong>₹{detail.ratePerKg}/kg</strong>
              </div>
              <div>
                <span>Paid to Loopr</span>
                <strong>{formatCompactCurrency(detail.paidToNetwork)}</strong>
              </div>
            </div>

            <div className="partner-detail__capacity">
              <div>
                <span>Monthly capacity</span>
                <strong>
                  {formatKg(detail.processedKg)} of {formatKg(detail.capacityKg)} ·{" "}
                  {formatPercent(detail.utilisation, 1)}
                </strong>
              </div>
              <ProgressBar value={detail.utilisation} />
            </div>

            <div className="partner-detail__settle">
              <Field
                label="Record feedstock settlement"
                hint="Use this when the partner pays Loopr for a sorted feedstock batch."
              >
                <div className="settle-row">
                  <TextInput
                    type="number"
                    min="1"
                    value={settlement}
                    onChange={(event) => setSettlement(event.target.value)}
                    placeholder={`e.g. ₹${Math.round(detail.queueWeight * detail.ratePerKg).toLocaleString("en-IN")}`}
                  />
                  <Button
                    variant="dark"
                    size="md"
                    icon={Wallet}
                    onClick={recordSettlement}
                    disabled={!settlement}
                  >
                    Record
                  </Button>
                </div>
              </Field>
              <div className="settle-summary">
                <span>Open queue value</span>
                <strong>{formatCurrency(detail.purchaseValue)}</strong>
              </div>
            </div>

            <div className="partner-detail__recent">
              <div className="partner-detail__recent-head">
                <span>Recent partner settlements</span>
                <Badge tone="neutral">Ledger</Badge>
              </div>
              {state.transactions
                .filter((transaction) => transaction.collectorId === detail.id)
                .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
                .slice(0, 4)
                .map((transaction) => (
                  <div className="partner-detail__tx" key={transaction.id}>
                    <span className="tx-icon">
                      {transaction.type === "product_sale" ? (
                        <Banknote size={14} />
                      ) : transaction.type === "platform_fee" ? (
                        <CircleDollarSign size={14} />
                      ) : transaction.type === "logistics_payout" ? (
                        <Truck size={14} />
                      ) : (
                        <ReceiptText size={14} />
                      )}
                    </span>
                    <div>
                      <strong>{transaction.description}</strong>
                      <span>
                        {formatDate(transaction.createdAt)} ·{" "}
                        {transactionLabels[transaction.type]}
                      </span>
                    </div>
                    <strong className={cn(transaction.direction === "out" && "is-out")}>
                      {transaction.direction === "out" ? "−" : "+"}
                      {formatCurrency(transaction.amount)}
                    </strong>
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function LinkToAnalytics() {
  return (
    <Link to="/app/admin/analytics" className="btn btn--lime-ghost btn--md">
      Open network analytics
      <ArrowUpRight size={15} />
    </Link>
  );
}
