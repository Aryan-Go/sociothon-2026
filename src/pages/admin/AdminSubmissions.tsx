import {
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Inbox,
  MapPin,
  PackageCheck,
  Recycle,
  Search,
  SlidersHorizontal,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BottleGlyph } from "../../components/BottleGlyph";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Modal,
  PageHeader,
  SelectInput,
  StatusBadge,
  TextInput,
  cn,
} from "../../components/ui";
import { BOTTLE_BY_ID, BOTTLE_TYPES } from "../../data/bottles";
import { formatDateTime, formatKg, formatRelativeTime } from "../../lib/format";
import { useAppStore } from "../../store/AppStore";
import type { Submission, SubmissionStatus } from "../../types";

type SortKey = "newest" | "oldest" | "points" | "weight";
const PAGE_SIZE = 10;

export function AdminSubmissions() {
  const { state, assignSubmissions, notify } = useAppStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | SubmissionStatus>("all");
  const [material, setMaterial] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collectorId, setCollectorId] = useState("");
  const [viewing, setViewing] = useState<Submission | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const defaultCollector = state?.collectors[0]?.id ?? "";
  const activeCollector = collectorId || defaultCollector;

  useEffect(() => {
    setPage(1);
  }, [search, status, material, sort]);

  if (!state) return null;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = state.submissions.filter((submission) => {
      const bottle = BOTTLE_BY_ID[submission.bottleTypeId];
      const user = state.users.find((item) => item.id === submission.userId);
      const collector = state.collectors.find((item) => item.id === submission.collectorId);
      const matchesSearch =
        !query ||
        [
          submission.id,
          submission.city,
          user?.name ?? "",
          bottle?.name ?? "",
          bottle?.material ?? "",
          collector?.name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus = status === "all" || submission.status === status;
      const matchesMaterial = material === "all" || submission.bottleTypeId === material;
      return matchesSearch && matchesStatus && matchesMaterial;
    });

    return matching.sort((a, b) => {
      if (sort === "oldest") return +new Date(a.submittedAt) - +new Date(b.submittedAt);
      if (sort === "points") return b.points - a.points;
      if (sort === "weight") return b.weightKg - a.weightKg;
      return +new Date(b.submittedAt) - +new Date(a.submittedAt);
    });
  }, [state.submissions, state.users, state.collectors, search, status, material, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const visibleAssignable = visible.filter((submission) => submission.status !== "recycled");
  const selectedSubmissions = state.submissions.filter((submission) => selected.has(submission.id));
  const selectedKg = selectedSubmissions.reduce((sum, item) => sum + item.weightKg, 0);
  const allVisibleSelected =
    visibleAssignable.length > 0 &&
    visibleAssignable.every((submission) => selected.has(submission.id));
  const counts = {
    all: state.submissions.length,
    pending: state.submissions.filter((submission) => submission.status === "pending").length,
    assigned: state.submissions.filter((submission) => submission.status === "assigned").length,
    collected: state.submissions.filter((submission) => submission.status === "collected").length,
    recycled: state.submissions.filter((submission) => submission.status === "recycled").length,
  };

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
      if (allVisibleSelected) {
        visibleAssignable.forEach((submission) => next.delete(submission.id));
      } else {
        visibleAssignable.forEach((submission) => next.add(submission.id));
      }
      return next;
    });
  };

  const assignSelected = (ids: string[]) => {
    if (!ids.length || !activeCollector) {
      notify("Select at least one bottle and a collector.", "error");
      return;
    }
    assignSubmissions(ids, activeCollector);
    setSelected(new Set());
    setAssignOpen(false);
    setViewing(null);
  };

  const exportCsv = () => {
    const rows = [
      [
        "ID",
        "Bottle",
        "Material",
        "Member",
        "City",
        "Collector",
        "Status",
        "Weight kg",
        "Points",
        "Submitted",
        "Confidence",
        "Source",
      ],
      ...filtered.map((submission) => {
        const bottle = BOTTLE_BY_ID[submission.bottleTypeId];
        const user = state.users.find((item) => item.id === submission.userId);
        const collector = state.collectors.find((item) => item.id === submission.collectorId);
        return [
          submission.id,
          bottle?.name ?? "",
          bottle?.material ?? "",
          user?.name ?? "",
          submission.city,
          collector?.name ?? "Unassigned",
          submission.status,
          submission.weightKg.toFixed(3),
          String(submission.points),
          new Date(submission.submittedAt).toISOString(),
          String(submission.confidence),
          submission.source,
        ];
      }),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `loopr-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify(`${filtered.length} submissions exported.`);
  };

  const hasFilters = search || status !== "all" || material !== "all" || sort !== "newest";

  return (
    <div className="page admin-submissions">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <Inbox size={13} /> Network inbox
          </span>
        }
        title={
          <>
            Every bottle, <span className="serif-accent">routed well.</span>
          </>
        }
        description="Search, inspect and assign the network's bottle queue. Keep collection partners matched to material and capacity."
        actions={
          <>
            <Button variant="secondary" size="md" icon={Download} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setAssignOpen(true)}
              disabled={!selected.size}
            >
              <Truck size={16} />
              Assign selected{selected.size ? ` (${selected.size})` : ""}
            </Button>
          </>
        }
      />

      <div className="queue-summary">
        <div className="queue-summary__main">
          <span className="queue-summary__icon">
            <Inbox size={18} />
          </span>
          <div>
            <strong>{counts.pending} awaiting assignment</strong>
            <span>
              {formatKg(
                state.submissions
                  .filter((submission) => submission.status === "pending")
                  .reduce((sum, item) => sum + item.weightKg, 0),
              )}{" "}
              of material is currently unclaimed.
            </span>
          </div>
        </div>
        {[
          { key: "pending", label: "Pending", value: counts.pending, tone: "amber" },
          { key: "assigned", label: "Assigned", value: counts.assigned, tone: "blue" },
          { key: "collected", label: "In processing", value: counts.collected, tone: "violet" },
          { key: "recycled", label: "Recycled", value: counts.recycled, tone: "green" },
        ].map((item) => (
          <button
            key={item.key}
            className={cn("queue-summary__stat", status === item.key && "is-active")}
            onClick={() => setStatus(status === item.key ? "all" : (item.key as SubmissionStatus))}
          >
            <span className={cn("queue-summary__dot", `is-${item.tone}`)} />
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <Card className="submissions-card">
        <div className="filter-bar">
          <label className="search-field search-field--wide">
            <Search size={16} />
            <TextInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bottle, member, collector or ID…"
              aria-label="Search submissions"
            />
            {search ? (
              <button
                className="search-field__clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            ) : null}
          </label>
          <div className="filter-group">
            <Filter size={14} />
            <SelectInput
              value={status}
              onChange={(event) => setStatus(event.target.value as "all" | SubmissionStatus)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="collected">Collected</option>
              <option value="recycled">Recycled</option>
            </SelectInput>
          </div>
          <div className="filter-group">
            <SlidersHorizontal size={14} />
            <SelectInput
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              aria-label="Filter by bottle type"
            >
              <option value="all">All bottle types</option>
              {BOTTLE_TYPES.map((bottle) => (
                <option key={bottle.id} value={bottle.id}>
                  {bottle.name}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="filter-group">
            <ArrowDownUp size={14} />
            <SelectInput
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort submissions"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="points">Highest points</option>
              <option value="weight">Heaviest</option>
            </SelectInput>
          </div>
          {hasFilters ? (
            <button
              className="filter-reset"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setMaterial("all");
                setSort("newest");
              }}
            >
              Reset
            </button>
          ) : null}
        </div>

        {selected.size ? (
          <div className="bulk-bar">
            <div className="bulk-bar__copy">
              <span className="bulk-bar__count">{selected.size}</span>
              <div>
                <strong>bottles selected</strong>
                <span>{selectedKg.toFixed(2)} kg of material</span>
              </div>
            </div>
            <div className="bulk-bar__actions">
              <SelectInput
                value={activeCollector}
                onChange={(event) => setCollectorId(event.target.value)}
                aria-label="Collector for selected bottles"
              >
                {state.collectors.map((collector) => (
                  <option value={collector.id} key={collector.id}>
                    {collector.name} · ₹{collector.ratePerKg}/kg
                  </option>
                ))}
              </SelectInput>
              <Button
                variant="dark"
                size="sm"
                onClick={() => assignSelected(Array.from(selected))}
              >
                <Truck size={14} />
                Assign batch
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

        {visible.length ? (
          <>
            <div className="table-shell">
              <table className="data-table submissions-table">
                <thead>
                  <tr>
                    <th className="col-check">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        aria-label="Select all assignable submissions on this page"
                      />
                    </th>
                    <th>Bottle / ID</th>
                    <th>Member</th>
                    <th>Location</th>
                    <th>Weight</th>
                    <th>Submitted</th>
                    <th>Collector</th>
                    <th>Status</th>
                    <th className="num">Points</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((submission) => {
                    const bottle = BOTTLE_BY_ID[submission.bottleTypeId];
                    const user = state.users.find((item) => item.id === submission.userId);
                    const collector = state.collectors.find(
                      (item) => item.id === submission.collectorId,
                    );
                    const selectable = submission.status !== "recycled";
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
                            disabled={!selectable}
                            aria-label={`Select ${bottle?.name ?? "submission"} ${submission.id}`}
                          />
                        </td>
                        <td>
                          <button
                            className="table-bottle"
                            onClick={() => setViewing(submission)}
                          >
                            {submission.image ? (
                              <img
                                src={submission.image}
                                alt=""
                                className="table-bottle__image"
                              />
                            ) : (
                              <BottleGlyph bottleTypeId={submission.bottleTypeId} size={20} />
                            )}
                            <span>
                              <strong>{bottle?.name}</strong>
                              <span>
                                {bottle?.material} · {submission.id.slice(-6).toUpperCase()}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td>
                          <div className="table-person table-person--compact">
                            {user ? (
                              <Avatar
                                name={user.name}
                                hue={user.avatarHue}
                                size={26}
                              />
                            ) : null}
                            <div>
                              <strong>{user?.name ?? "Unknown"}</strong>
                              <span>{user?.tier}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="table-location">
                            <MapPin size={12} />
                            {submission.city}
                          </span>
                        </td>
                        <td>
                          <span className="table-muted">{submission.weightKg.toFixed(2)} kg</span>
                        </td>
                        <td>
                          <div className="table-date">
                            <span>{formatRelativeTime(submission.submittedAt)}</span>
                            <small>{formatDateTime(submission.submittedAt)}</small>
                          </div>
                        </td>
                        <td>
                          {collector ? (
                            <span className="collector-pill">
                              <span
                                className="collector-pill__dot"
                                style={{ background: `hsl(${collector.avatarHue} 45% 48%)` }}
                              />
                              {collector.name}
                            </span>
                          ) : (
                            <span className="table-muted">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={submission.status} />
                        </td>
                        <td className="num">
                          <strong className="point-value">+{submission.points}</strong>
                        </td>
                        <td>
                          <div className="row-actions">
                            <IconButton
                              icon={Eye}
                              label={`Inspect ${submission.id}`}
                              size="sm"
                              onClick={() => setViewing(submission)}
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
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} submissions
              </span>
              <div className="pagination">
                <IconButton
                  icon={ChevronLeft}
                  label="Previous page"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                />
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                  let pageNumber = index + 1;
                  if (totalPages > 5) {
                    pageNumber = Math.min(
                      totalPages,
                      Math.max(1, currentPage - 2) + index,
                    );
                  }
                  return (
                    <button
                      key={pageNumber}
                      className={cn("page-number", pageNumber === currentPage && "is-active")}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <IconButton
                  icon={ChevronRight}
                  label="Next page"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage === totalPages}
                />
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Search}
            title="No submissions match those filters"
            description="Change the bottle type, status, or search term to widen the queue."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                  setMaterial("all");
                  setSort("newest");
                }}
              >
                Clear all filters
              </Button>
            }
          />
        )}
      </Card>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign selected bottles"
        description="The collector buys sorted feedstock from Loopr and owns the next processing step."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => assignSelected(Array.from(selected))}
            >
              <Check size={15} />
              Confirm assignment
            </Button>
          </>
        }
      >
        <div className="assign-modal-summary">
          <div>
            <span>Selected material</span>
            <strong>{selectedKg.toFixed(2)} kg</strong>
          </div>
          <div>
            <span>Bottles</span>
            <strong>{selected.size}</strong>
          </div>
          <div>
            <span>Feedstock value</span>
            <strong>
              ₹
              {Math.round(
                selectedKg *
                  (state.collectors.find((collector) => collector.id === activeCollector)
                    ?.ratePerKg ?? 0),
              ).toLocaleString("en-IN")}
            </strong>
          </div>
        </div>
        <Field label="Assign to collector">
          <SelectInput
            value={activeCollector}
            onChange={(event) => setCollectorId(event.target.value)}
          >
            {state.collectors.map((collector) => (
              <option value={collector.id} key={collector.id}>
                {collector.name} · {collector.city} · ₹{collector.ratePerKg}/kg
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="modal-note">
          <Truck size={15} />
          <p>
            Assignment creates a pickup obligation for the collector. The bottle stays pending
            until they scan it into their intake queue.
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing ? BOTTLE_BY_ID[viewing.bottleTypeId]?.name ?? "Bottle" : "Bottle"}
        description={viewing ? `Submission ${viewing.id.toUpperCase()}` : undefined}
        size="lg"
        footer={
          viewing && viewing.status !== "recycled" ? (
            <>
              <Button variant="ghost" size="md" onClick={() => setViewing(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (viewing) assignSelected([viewing.id]);
                }}
              >
                <Truck size={15} />
                Assign to selected collector
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="md" onClick={() => setViewing(null)}>
              Close
            </Button>
          )
        }
      >
        {viewing ? (
          <div className="submission-detail">
            <div className="submission-detail__top">
              {viewing.image ? (
                <img
                  src={viewing.image}
                  alt={`Submitted ${BOTTLE_BY_ID[viewing.bottleTypeId]?.name}`}
                  className="submission-detail__photo"
                />
              ) : (
                <div className="submission-detail__glyph">
                  <BottleGlyph bottleTypeId={viewing.bottleTypeId} size={62} />
                </div>
              )}
              <div className="submission-detail__summary">
                <StatusBadge status={viewing.status} />
                <h3>{BOTTLE_BY_ID[viewing.bottleTypeId]?.name}</h3>
                <p>
                  {BOTTLE_BY_ID[viewing.bottleTypeId]?.material} ·{" "}
                  {Math.round(viewing.confidence * 100)}% model confidence ·{" "}
                  {viewing.source === "gemini" ? "Gemini vision" : "Demo classifier"}
                </p>
                <div className="submission-detail__chips">
                  <Badge tone="neutral">{viewing.weightKg.toFixed(3)} kg</Badge>
                  <Badge tone="lime">+{viewing.points} points</Badge>
                  <Badge tone="neutral">
                    <MapPin size={11} /> {viewing.city}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="detail-grid">
              <div>
                <span>Member</span>
                <strong>
                  {state.users.find((user) => user.id === viewing.userId)?.name ?? "Unknown"}
                </strong>
              </div>
              <div>
                <span>Collector</span>
                <strong>
                  {state.collectors.find((collector) => collector.id === viewing.collectorId)
                    ?.name ?? "Unassigned"}
                </strong>
              </div>
              <div>
                <span>Submitted</span>
                <strong>{formatDateTime(viewing.submittedAt)}</strong>
              </div>
              <div>
                <span>Age</span>
                <strong>{formatRelativeTime(viewing.submittedAt)}</strong>
              </div>
            </div>

            <div className="detail-timeline">
              {[
                { label: "Logged by member", done: true, icon: Check },
                {
                  label: "Assigned to collector",
                  done: Boolean(viewing.collectorId),
                  icon: Truck,
                },
                {
                  label: "Received at facility",
                  done: viewing.status === "collected" || viewing.status === "recycled",
                  icon: PackageCheck,
                },
                {
                  label: "Verified recycled",
                  done: viewing.status === "recycled",
                  icon: Recycle,
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    className={cn("detail-timeline__step", step.done && "is-done")}
                    key={step.label}
                  >
                    <span>
                      <Icon size={14} />
                    </span>
                    <strong>{step.label}</strong>
                  </div>
                );
              })}
            </div>

            {viewing.note ? (
              <div className="detail-note">
                <span>Member note</span>
                <p>{viewing.note}</p>
              </div>
            ) : null}

            {viewing.status !== "recycled" ? (
              <div className="detail-assign">
                <Field label="Reassign to collector">
                  <SelectInput
                    value={activeCollector}
                    onChange={(event) => setCollectorId(event.target.value)}
                  >
                    {state.collectors.map((collector) => (
                      <option value={collector.id} key={collector.id}>
                        {collector.name} · {collector.city} · ₹{collector.ratePerKg}/kg
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <div className="detail-assign__value">
                  <span>Feedstock value</span>
                  <strong>
                    ₹
                    {Math.round(
                      viewing.weightKg *
                        (state.collectors.find((collector) => collector.id === activeCollector)
                          ?.ratePerKg ?? 0),
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="detail-complete">
                <Check size={16} />
                This bottle completed the loop and is included in verified impact.
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
