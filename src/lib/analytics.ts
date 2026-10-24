import { BOTTLE_BY_ID, BOTTLE_TYPES } from "../data/bottles";
import type { Collector, Submission, User } from "../types";

export interface DayPoint {
  date: string;
  label: string;
  submitted: number;
  recycled: number;
  assigned: number;
}

export interface MaterialPoint {
  id: string;
  name: string;
  material: string;
  value: number;
  weight: number;
  color: string;
}

export interface StatusPoint {
  status: string;
  label: string;
  value: number;
  color: string;
}

export const STATUS_COLORS: Record<string, string> = {
  pending: "#e4ad54",
  assigned: "#76a9d8",
  collected: "#a68adf",
  recycled: "#4c9b70",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  assigned: "Assigned",
  collected: "Collected",
  recycled: "Recycled",
};

export function submissionsByDay(submissions: Submission[], days = 30): DayPoint[] {
  const points: DayPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const inDay = submissions.filter((submission) => {
      const submitted = new Date(submission.submittedAt);
      return submitted >= date && submitted < next;
    });
    points.push({
      date: date.toISOString(),
      label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date),
      submitted: inDay.length,
      recycled: inDay.filter((item) => item.status === "recycled").length,
      assigned: inDay.filter((item) => item.status === "assigned" || item.status === "collected")
        .length,
    });
  }

  return points;
}

export function submissionsByWeek(submissions: Submission[], weeks = 10): DayPoint[] {
  const points: DayPoint[] = [];
  const today = new Date();
  for (let offset = weeks - 1; offset >= 0; offset -= 1) {
    const end = new Date(today);
    end.setDate(end.getDate() - offset * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const inWeek = submissions.filter((submission) => {
      const submitted = new Date(submission.submittedAt);
      return submitted >= start && submitted < end;
    });
    points.push({
      date: start.toISOString(),
      label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(start),
      submitted: inWeek.length,
      recycled: inWeek.filter((item) => item.status === "recycled").length,
      assigned: inWeek.filter((item) => item.status === "assigned" || item.status === "collected")
        .length,
    });
  }
  return points;
}

export function materialBreakdown(submissions: Submission[]): MaterialPoint[] {
  return BOTTLE_TYPES.map((bottle) => {
    const matches = submissions.filter((submission) => submission.bottleTypeId === bottle.id);
    return {
      id: bottle.id,
      name: bottle.name,
      material: bottle.material,
      value: matches.length,
      weight: matches.reduce((sum, item) => sum + item.weightKg, 0),
      color: bottle.color,
    };
  }).filter((item) => item.value > 0);
}

export function statusBreakdown(submissions: Submission[]): StatusPoint[] {
  return ["pending", "assigned", "collected", "recycled"].map((status) => ({
    status,
    label: STATUS_LABELS[status],
    value: submissions.filter((submission) => submission.status === status).length,
    color: STATUS_COLORS[status],
  }));
}

export function collectorName(submissions: Submission[], collectorId?: string): string {
  if (!collectorId) return "Unassigned";
  return collectorId;
}

export function bottleName(bottleTypeId: string): string {
  return BOTTLE_BY_ID[bottleTypeId]?.name ?? "Unknown bottle";
}

export function recycledRate(submissions: Submission[]): number {
  if (!submissions.length) return 0;
  return (submissions.filter((item) => item.status === "recycled").length / submissions.length) * 100;
}

export function totalWeight(submissions: Submission[]): number {
  return submissions.reduce((sum, item) => sum + item.weightKg, 0);
}

export function totalPoints(submissions: Submission[]): number {
  return submissions.reduce((sum, item) => sum + item.points, 0);
}

export function userSubmissions(submissions: Submission[], userId: string): Submission[] {
  return submissions
    .filter((submission) => submission.userId === userId)
    .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
}

export function rankUsers(users: User[], submissions: Submission[], period: "all" | "month" = "all") {
  if (period === "all") {
    return [...users].sort((a, b) => b.points - a.points);
  }

  return [...users].sort((a, b) => {
    const score = (user: User) =>
      submissions
        .filter(
          (submission) =>
            submission.userId === user.id &&
            submission.status === "recycled" &&
            new Date(submission.submittedAt).getMonth() === new Date().getMonth() &&
            new Date(submission.submittedAt).getFullYear() === new Date().getFullYear(),
        )
        .reduce((sum, item) => sum + item.points, 0);
    return score(b) - score(a);
  });
}

export function userMonthlyPoints(submissions: Submission[], userId: string): number {
  const now = new Date();
  return submissions
    .filter((submission) => {
      const date = new Date(submission.submittedAt);
      return (
        submission.userId === userId &&
        submission.status === "recycled" &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, item) => sum + item.points, 0);
}

export function userMonthlyBottles(submissions: Submission[], userId: string): number {
  const now = new Date();
  return submissions.filter((submission) => {
    const date = new Date(submission.submittedAt);
    return (
      submission.userId === userId &&
      submission.status === "recycled" &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }).length;
}

export function userPendingBottles(submissions: Submission[], userId: string): number {
  return submissions.filter(
    (submission) =>
      submission.userId === userId &&
      (submission.status === "pending" ||
        submission.status === "assigned" ||
        submission.status === "collected"),
  ).length;
}

export function collectorStats(collectors: Collector[], submissions: Submission[]) {
  return collectors.map((collector) => {
    const own = submissions.filter((submission) => submission.collectorId === collector.id);
    const inQueue = own.filter(
      (submission) => submission.status === "assigned" || submission.status === "collected",
    );
    const recycled = own.filter((submission) => submission.status === "recycled");
    const queueWeight = inQueue.reduce((sum, item) => sum + item.weightKg, 0);
    return {
      ...collector,
      queueCount: inQueue.length,
      queueWeight,
      recycledCount: recycled.length,
      recycledWeight: recycled.reduce((sum, item) => sum + item.weightKg, 0),
      utilisation: Math.min(100, (collector.processedKg / collector.capacityKg) * 100),
      purchaseValue: queueWeight * collector.ratePerKg,
    };
  });
}

export function trendDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function monthSeries(submissions: Submission[], months = 6) {
  const result: { label: string; recycled: number; pending: number; weight: number }[] = [];
  const now = new Date();
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    const inMonth = submissions.filter((submission) => {
      const submitted = new Date(submission.submittedAt);
      return submitted >= date && submitted < next;
    });
    result.push({
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      recycled: inMonth.filter((item) => item.status === "recycled").length,
      pending: inMonth.filter((item) => item.status !== "recycled").length,
      weight: inMonth.reduce((sum, item) => sum + item.weightKg, 0),
    });
  }
  return result;
}

export function topMaterialsByWeight(submissions: Submission[]) {
  const values = BOTTLE_TYPES.map((bottle) => {
    const matching = submissions.filter((submission) => submission.bottleTypeId === bottle.id);
    return {
      name: bottle.name.replace(" bottle", ""),
      material: bottle.code,
      weight: matching.reduce((sum, item) => sum + item.weightKg, 0),
      count: matching.length,
      color: bottle.color,
    };
  }).sort((a, b) => b.weight - a.weight);
  return values;
}
