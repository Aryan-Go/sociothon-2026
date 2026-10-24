import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Factory,
  Inbox,
  MapPin,
  PackageCheck,
  PackageOpen,
  Recycle,
  Scale,
  Search,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BottleGlyph } from "../../components/BottleGlyph";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  PageHeader,
  SectionHeader,
  SelectInput,
  StatCard,
  StatusBadge,
  TextInput,
  cn,
} from "../../components/ui";
import { BOTTLE_BY_ID } from "../../data/bottles";
import { materialBreakdown } from "../../lib/analytics";
import { formatCurrency, formatKg, formatRelativeTime } from "../../lib/format";
import { useAppStore } from "../../store/AppStore";
import type { SubmissionStatus } from "../../types";

const materialAccent = ["#5c8b42", "#c79b51", "#7e9fc1", "#a98bc4", "#db9278", "#84b9a7"];

export function CollectorIntake() {
  const {
    state,
    currentCollector,
    receiveSubmissions,
    processSubmissions,
    notify,
  } = useAppStore();
  const [filter, setFilter] = useState<"all" | SubmissionStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!state || !currentCollector) return null;

  const own = state.submissions.filter(
    (submission) =>
      submission.collectorId === currentCollector.id &&
      (submission.status === "assigned" || submission.status === "collected"),
  );
  const queue = useMemo(() => {
    const query = search.trim().toLowerCase();
    return own
      .filter((submission) => filter === "all" || submission.status === filter)
      .filter((submission) => {
        const bottle = BOTTLE_BY_ID[submission.bottleTypeId];
        const user = state.users.find((item) => item.id === submission.userId);
        return (
          !query ||
          [submission.id, submission.city, bottle?.name, user?.name]
            .join(" ")
            .toLowerCase()
            .includes(query)
        );
      })
      .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
  }, [own, filter, search, state.users]);

  const atGate = own.filter((submission) => submission.status === "assigned");
  const onFloor = own.filter((submission) => submission.status === "collected");
  const queueWeight = own.reduce((sum, submission) => sum + submission.weightKg, 0);
  const queueValue = queueWeight * currentCollector.ratePerKg;
  const selectedSubmissions = own.filter((submission) => selected.has(submission.id));
  const selectedWeight = selectedSubmissions.reduce((sum, item) => sum + item.weightKg, 0);
  const selectedForReceive = selectedSubmissions.filter(
    (submission) => submission.status === "assigned",
  );
  const selectedForProcess = selectedSubmissions.filter(
    (submission) => submission.status === "collected",
  );
  const oldest = own.length
    ? Math.max(
        ...own.map(
          (submission) => (Date.now() - +new Date(submission.submittedAt)) / 86400000,
        ),
      )
    : 0;
  const allVisibleSelected =
    queue.length > 0 && queue.every((submission) => selected.has(submission.id));
  const materials = materialBreakdown(own);
  const maxMaterial = Math.max(...materials.map((material) => material.weight), 1);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) queue.forEach((submission) => next.delete(submission.id));
      else queue.forEach((submission) => next.add(submission.id));
      return next;
    });
  };

  const receive = (ids: string[]) => {
    if (!ids.length) {
      notify("Select at least one bottle that is waiting at the gate.", "error");
      return;
    }
    receiveSubmissions(ids);
    setSelected(new Set());
  };

  const process = (ids: string[]) => {
    if (!ids.length) {
      notify("Select at least one received bottle to process.", "error");
      return;
    }
    processSubmissions(ids);
    setSelected(new Set());
  };

  return (
    <div className="page collector-intake">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <Inbox size={13} /> Intake operations
          </span>
        }
        title={
          <>
            Receive it. Process it. <span className="serif-accent">Prove it.</span>
          </>
        }
        description="Every bottle assigned to your facility passes through two checkpoints. Keep the queue honest so the impact holds up."
        actions={
          <>
            <Link to="/app/collector/products" className="btn btn--secondary btn--md">
              <PackageOpen size={15} />
              Product ledger
            </Link>
            <Link to="/app/collector/impact" className="btn btn--primary btn--md">
              Impact report
              <ArrowRight size={15} />
            </Link>
          </>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="At the gate"
          value={atGate.length}
          detail={`${formatKg(atGate.reduce((sum, item) => sum + item.weightKg, 0))} awaiting receipt`}
          trend={{ value: "Receive next", direction: "up" }}
          icon={Truck}
          tone="lime"
        />
        <StatCard
          label="On the floor"
          value={onFloor.length}
          detail={`${formatKg(onFloor.reduce((sum, item) => sum + item.weightKg, 0))} in processing`}
          trend={{ value: "Process next", direction: "up" }}
          icon={Factory}
        />
        <StatCard
          label="Open queue value"
          value={formatCurrency(queueValue)}
          detail={`₹${currentCollector.ratePerKg}/kg feedstock`}
          trend={{ value: `${formatKg(queueWeight)} total`, direction: "up" }}
          icon={Wallet}
        />
        <StatCard
          label="Oldest waiting"
          value={`${oldest.toFixed(1)} d`}
          detail={oldest > 5 ? "Past target window" : "Inside target window"}
          trend={{
            value: oldest > 5 ? "Act now" : "Healthy",
            direction: oldest > 5 ? "down" : "up",
            positive: oldest <= 5,
          }}
          icon={Clock3}
        />
      </div>

      <Card className="intake-how">
        <div className="intake-how__steps">
          {[
            {
              number: "01",
              title: "Receive at gate",
              copy: "Confirm the physical bottle matches the assignment and mark it received.",
              icon: ClipboardCheck,
            },
            {
              number: "02",
              title: "Process the material",
              copy: "Sort, wash and convert. Marking processed adds weight to your verified impact.",
              icon: Factory,
            },
            {
              number: "03",
              title: "Log the output",
              copy: "Record the recycled product, buyer and sale value so margin and waste are traceable.",
              icon: PackageOpen,
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div className="intake-step" key={step.number}>
                <span className="intake-step__number">{step.number}</span>
                <span className="intake-step__icon">
                  <Icon size={17} />
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.copy}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="intake-how__callout">
          <Scale size={18} />
          <div>
            <span>Feedstock commitment</span>
            <strong>{formatCurrency(queueValue)}</strong>
            <p>open value at ₹{currentCollector.ratePerKg}/kg</p>
          </div>
        </div>
      </Card>

      <Card className="intake-card">
        <div className="intake-toolbar">
          <div className="segmented" role="group" aria-label="Filter intake status">
            {[
              { value: "all", label: "All queue", count: own.length },
              { value: "assigned", label: "At gate", count: atGate.length },
              { value: "collected", label: "On floor", count: onFloor.length },
            ].map((option) => (
              <button
                key={option.value}
                className={cn("segmented__item", filter === option.value && "is-active")}
                onClick={() => setFilter(option.value as "all" | SubmissionStatus)}
                aria-pressed={filter === option.value}
              >
                {option.label}
                <span className="segmented__count">{option.count}</span>
              </button>
            ))}
          </div>
          <label className="search-field">
            <Search size={15} />
            <TextInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a bottle or member"
              aria-label="Search intake queue"
            />
            {search ? (
              <button className="search-field__clear" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={13} />
              </button>
            ) : null}
          </label>
          <SelectInput
            value={filter}
            onChange={(event) => setFilter(event.target.value as "all" | SubmissionStatus)}
            aria-label="Status filter"
            className="compact-select"
          >
            <option value="all">All statuses</option>
            <option value="assigned">Assigned</option>
            <option value="collected">Collected</option>
          </SelectInput>
        </div>

        {selected.size ? (
          <div className="bulk-bar">
            <div className="bulk-bar__copy">
              <span className="bulk-bar__count">{selected.size}</span>
              <div>
                <strong>bottles selected</strong>
                <span>{formatKg(selectedWeight)} of feedstock</span>
              </div>
            </div>
            <div className="bulk-bar__actions">
              <Button
                variant="secondary"
                size="sm"
                disabled={!selectedForReceive.length}
                onClick={() => receive(selectedForReceive.map((submission) => submission.id))}
              >
                <Check size={14} />
                Receive ({selectedForReceive.length})
              </Button>
              <Button
                variant="dark"
                size="sm"
                disabled={!selectedForProcess.length}
                onClick={() => process(selectedForProcess.map((submission) => submission.id))}
              >
                <Recycle size={14} />
                Process ({selectedForProcess.length})
              </Button>
              <IconButton
                icon={X}
                label="Clear selection"
                size="sm"
                onClick={() => setSelected(new Set())}
              />
            </div>
          </div>
        ) : null}

        {queue.length ? (
          <>
            <div className="table-shell">
              <table className="data-table intake-table">
                <thead>
                  <tr>
                    <th className="col-check">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        aria-label="Select all bottles in this view"
                      />
                    </th>
                    <th>Bottle</th>
                    <th>Member</th>
                    <th>Location</th>
                    <th>Weight</th>
                    <th>Feedstock value</th>
                    <th>Assigned</th>
                    <th>Status</th>
                    <th>Checkpoint</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((submission) => {
                    const bottle = BOTTLE_BY_ID[submission.bottleTypeId];
                    const user = state.users.find((item) => item.id === submission.userId);
                    return (
                      <tr
                        key={submission.id}
                        className={cn(selected.has(submission.id) && "is-selected")}
                      >
                        <td className="col-check">
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={selected.has(submission.id)}
                            onChange={() => toggle(submission.id)}
                            aria-label={`Select ${bottle?.name ?? "bottle"} from ${user?.name ?? "member"}`}
                          />
                        </td>
                        <td>
                          <div className="table-person">
                            <BottleGlyph bottleTypeId={submission.bottleTypeId} size={21} />
                            <div>
                              <strong>{bottle?.name}</strong>
                              <span>{submission.id.slice(-6).toUpperCase()} · {bottle?.material}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="table-person table-person--compact">
                            {user ? <Avatar name={user.name} hue={user.avatarHue} size={26} /> : null}
                            <div>
                              <strong>{user?.name}</strong>
                              <span>{user?.tier}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="table-location">
                            <MapPin size={12} /> {submission.city}
                          </span>
                        </td>
                        <td>{submission.weightKg.toFixed(2)} kg</td>
                        <td>
                          <strong className="point-value">
                            {formatCurrency(submission.weightKg * currentCollector.ratePerKg)}
                          </strong>
                        </td>
                        <td>
                          <span className="table-muted">{formatRelativeTime(submission.submittedAt)}</span>
                        </td>
                        <td>
                          <StatusBadge status={submission.status} />
                        </td>
                        <td>
                          {submission.status === "assigned" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Check}
                              onClick={() => receive([submission.id])}
                            >
                              Mark received
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={Recycle}
                              onClick={() => process([submission.id])}
                            >
                              Mark processed
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                {queue.length} bottles · {formatKg(queue.reduce((sum, item) => sum + item.weightKg, 0))} ·{" "}
                {formatCurrency(
                  queue.reduce((sum, item) => sum + item.weightKg, 0) * currentCollector.ratePerKg,
                )}
              </span>
              <span>Marking processed adds to your verified impact.</span>
            </div>
          </>
        ) : (
          <EmptyState
            icon={PackageCheck}
            title="Nothing in this queue"
            description="Assigned bottles appear here as soon as a Loopr admin routes them to your facility."
            action={
              <Link to="/app/collector" className="btn btn--secondary btn--sm">
                Back to overview
              </Link>
            }
          />
        )}
      </Card>

      <div className="intake-bottom-grid">
        <Card>
          <SectionHeader
            title="Material at your facility"
            subtitle="Open queue weight by bottle type."
            action={<Badge tone="neutral">{formatKg(queueWeight)}</Badge>}
          />
          <div className="intake-material-list">
            {materials.map((material, index) => (
              <div className="intake-material-row" key={material.id}>
                <span className="material-dot" style={{ background: material.color }} />
                <div>
                  <strong>{material.name}</strong>
                  <span>{material.value} bottles</span>
                </div>
                <div className="intake-material-row__bar">
                  <span
                    style={{
                      width: `${(material.weight / maxMaterial) * 100}%`,
                      background: materialAccent[index % materialAccent.length],
                    }}
                  />
                </div>
                <strong>{formatKg(material.weight)}</strong>
              </div>
            ))}
            {!materials.length ? (
              <p className="table-muted">No material in the queue right now.</p>
            ) : null}
          </div>
        </Card>

        <Card className="intake-checklist-card">
          <SectionHeader
            title="Processing checklist"
            subtitle="A clean batch protects the next buyer and your margin."
          />
          <div className="intake-checklist">
            {[
              "Remove caps, pumps and non-recyclable labels where required",
              "Wash and dry PET/HDPE to avoid bale contamination",
              "Keep glass separated and never crush in mixed bins",
              "Photograph and log each output batch before sale",
              "Record the buyer and sale value for every recycled product",
            ].map((item) => (
              <div key={item}>
                <CheckCircle2 size={15} />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="intake-checklist-card__foot">
            <Truck size={15} />
            <p>
              Bottles marked processed are counted as verified impact. You can log the output on the
              product ledger as soon as the batch is ready.
            </p>
          </div>
          <Link to="/app/collector/products" className="btn btn--dark btn--md btn--full">
            Log a recycled product
            <ArrowRight size={15} />
          </Link>
        </Card>
      </div>
    </div>
  );
}
