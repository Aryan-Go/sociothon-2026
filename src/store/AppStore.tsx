import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BOTTLE_BY_ID } from "../data/bottles";
import { createInitialState } from "../data/seed";
import { clearWorkspace, loadWorkspace, saveWorkspace } from "../lib/db";
import { formatKg } from "../lib/format";
import type {
  AppState,
  Collector,
  Product,
  Submission,
  User,
  VerificationSource,
  WorkspaceSettings,
} from "../types";

type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  tone: ToastTone;
}

interface SubmitBottleInput {
  bottleTypeId: string;
  confidence: number;
  source: VerificationSource;
  image?: string;
  note?: string;
}

interface AddProductInput {
  collectorId: string;
  name: string;
  category: string;
  units: number;
  unitLabel: string;
  revenue: number;
  cost: number;
  buyerId: string;
  description: string;
  wasteKg: number;
  bottlesUsed: number;
  status?: "sold" | "in-stock";
}

interface NewCollectorInput {
  name: string;
  manager: string;
  email: string;
  phone: string;
  city: string;
  ratePerKg: number;
  capacityKg: number;
  focus: string;
}

interface AppStoreValue {
  state: AppState | null;
  hydrated: boolean;
  currentUser: User | null;
  currentCollector: Collector | null;
  toasts: ToastMessage[];
  notify: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
  submitBottle: (input: SubmitBottleInput) => Submission | null;
  assignSubmissions: (ids: string[], collectorId: string) => number;
  receiveSubmissions: (ids: string[]) => number;
  processSubmissions: (ids: string[]) => number;
  addCollector: (input: NewCollectorInput) => void;
  settleCollector: (collectorId: string, amount: number) => void;
  verifyCollector: (collectorId: string) => void;
  addProduct: (input: AddProductInput) => void;
  updateUser: (userId: string, patch: Partial<User>) => void;
  toggleUserStatus: (userId: string) => void;
  updateSettings: (patch: Partial<WorkspaceSettings>) => void;
  updateCurrentUser: (patch: Partial<Pick<User, "name" | "city" | "email">>) => void;
  setRole: (role: AppState["currentRole"]) => void;
  setCurrentUser: (userId: string) => void;
  setCurrentCollector: (collectorId: string) => void;
  resetDemo: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutRefs = useRef<Record<string, number>>({});
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabSourceRef = useRef(uid("tab"));
  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadWorkspace().then((loaded) => {
      if (!active) return;
      setState(loaded);
      setHydrated(true);
    });
    return () => {
      active = false;
      Object.values(timeoutRefs.current).forEach((timeout) => window.clearTimeout(timeout));
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const applyRemote = (loaded: AppState) => {
      applyingRemoteRef.current = true;
      setState((current) =>
        current
          ? {
              ...loaded,
              currentRole: current.currentRole,
              currentUserId: current.currentUserId,
              currentCollectorId: current.currentCollectorId,
            }
          : loaded,
      );
    };
    if (typeof BroadcastChannel === "undefined") {
      const refresh = () => {
        loadWorkspace().then(applyRemote);
      };
      window.addEventListener("focus", refresh);
      return () => window.removeEventListener("focus", refresh);
    }
    const channel = new BroadcastChannel("loopr:workspace-updates");
    channel.onmessage = (event) => {
      if (event.data?.source === tabSourceRef.current) return;
      loadWorkspace().then(applyRemote);
    };
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !state) return;
    const timeout = window.setTimeout(() => {
      if (applyingRemoteRef.current) {
        applyingRemoteRef.current = false;
        return;
      }
      void saveWorkspace(state).then(() => {
        channelRef.current?.postMessage({
          type: "workspace-updated",
          source: tabSourceRef.current,
        });
      });
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [state, hydrated]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      Boolean(state?.settings.reducedMotion),
    );
  }, [state?.settings.reducedMotion]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    if (timeoutRefs.current[id]) {
      window.clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = uid("toast");
      setToasts((current) => [...current, { id, message, tone }].slice(-4));
      timeoutRefs.current[id] = window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  const updateState = useCallback((updater: (current: AppState) => AppState) => {
    setState((current) => (current ? updater(current) : current));
  }, []);

  const currentUser = useMemo(() => {
    if (!state) return null;
    return state.users.find((user) => user.id === state.currentUserId) ?? state.users[0] ?? null;
  }, [state]);

  const currentCollector = useMemo(() => {
    if (!state) return null;
    return (
      state.collectors.find((collector) => collector.id === state.currentCollectorId) ??
      state.collectors[0] ??
      null
    );
  }, [state]);

  const submitBottle = useCallback(
    (input: SubmitBottleInput): Submission | null => {
      if (!state || !currentUser) return null;
      const bottle = BOTTLE_BY_ID[input.bottleTypeId];
      if (!bottle) return null;
      const submission: Submission = {
        id: uid("s"),
        userId: currentUser.id,
        bottleTypeId: bottle.id,
        status: "pending",
        points: bottle.points,
        weightKg: bottle.weightKg,
        submittedAt: new Date().toISOString(),
        city: currentUser.city,
        confidence: input.confidence,
        source: input.source,
        image: input.image,
        note: input.note,
      };

      updateState((current) => ({
        ...current,
        submissions: [submission, ...current.submissions],
      }));
      notify(
        `Bottle logged · +${bottle.points} points unlock after a collector verifies recycling.`,
      );
      return submission;
    },
    [state, currentUser, updateState, notify],
  );

  const assignSubmissions = useCallback(
    (ids: string[], collectorId: string): number => {
      if (!state) return 0;
      const collector = state.collectors.find((item) => item.id === collectorId);
      const valid = state.submissions.filter(
        (submission) => ids.includes(submission.id) && submission.status !== "recycled",
      );
      updateState((current) => ({
        ...current,
        submissions: current.submissions.map((submission) =>
          ids.includes(submission.id) && submission.status !== "recycled"
            ? { ...submission, status: "assigned", collectorId }
            : submission,
        ),
      }));
      if (valid.length && collector) {
        notify(
          `${valid.length} ${valid.length === 1 ? "bottle" : "bottles"} assigned to ${collector.name}.`,
        );
      }
      return valid.length;
    },
    [state, updateState, notify],
  );

  const receiveSubmissions = useCallback(
    (ids: string[]): number => {
      if (!state) return 0;
      const valid = state.submissions.filter(
        (submission) => ids.includes(submission.id) && submission.status === "assigned",
      );
      updateState((current) => ({
        ...current,
        submissions: current.submissions.map((submission) =>
          ids.includes(submission.id) && submission.status === "assigned"
            ? { ...submission, status: "collected" }
            : submission,
        ),
      }));
      if (valid.length) {
        notify(`${valid.length} ${valid.length === 1 ? "batch" : "batches"} marked as received.`);
      }
      return valid.length;
    },
    [state, updateState, notify],
  );

  const processSubmissions = useCallback(
    (ids: string[]): number => {
      if (!state) return 0;
      const valid = state.submissions.filter(
        (submission) =>
          ids.includes(submission.id) &&
          (submission.status === "assigned" || submission.status === "collected") &&
          submission.collectorId,
      );
      if (!valid.length) return 0;
      const weightDelta = valid.reduce((sum, submission) => sum + submission.weightKg, 0);
      const collectorIds = new Set(valid.map((submission) => submission.collectorId));
      const awards = new Map<string, { points: number; bottles: number; weightKg: number }>();
      valid.forEach((submission) => {
        const currentAward = awards.get(submission.userId) ?? {
          points: 0,
          bottles: 0,
          weightKg: 0,
        };
        currentAward.points += submission.points;
        currentAward.bottles += 1;
        currentAward.weightKg += submission.weightKg;
        awards.set(submission.userId, currentAward);
      });
      const pointsAwarded = Array.from(awards.values()).reduce(
        (sum, award) => sum + award.points,
        0,
      );
      updateState((current) => ({
        ...current,
        submissions: current.submissions.map((submission) =>
          ids.includes(submission.id) &&
          (submission.status === "assigned" || submission.status === "collected")
            ? { ...submission, status: "recycled" }
            : submission,
        ),
        collectors: current.collectors.map((collector) =>
          collectorIds.has(collector.id)
            ? {
                ...collector,
                processedKg: Math.round(collector.processedKg + weightDelta),
                wasteDivertedKg: Math.round(collector.wasteDivertedKg + weightDelta),
              }
            : collector,
        ),
        users: current.users.map((user) => {
          const award = awards.get(user.id);
          if (!award) return user;
          return {
            ...user,
            points: user.points + award.points,
            bottleCount: user.bottleCount + award.bottles,
            kgDiverted: Number((user.kgDiverted + award.weightKg).toFixed(3)),
          };
        }),
      }));
      notify(
        `${valid.length} ${valid.length === 1 ? "batch" : "batches"} verified recycled · ${formatKg(weightDelta)} diverted · ${pointsAwarded} leaderboard points awarded.`,
      );
      return valid.length;
    },
    [state, updateState, notify],
  );

  const addCollector = useCallback(
    (input: NewCollectorInput) => {
      const collector: Collector = {
        id: uid("c"),
        name: input.name,
        manager: input.manager,
        email: input.email,
        phone: input.phone,
        city: input.city,
        ratePerKg: input.ratePerKg,
        capacityKg: input.capacityKg,
        processedKg: 0,
        wasteDivertedKg: 0,
        revenue: 0,
        profit: 0,
        rating: 4.5,
        status: "review",
        joinedAt: new Date().toISOString(),
        focus: input.focus,
        avatarHue: Math.floor(Math.random() * 360),
        paidToNetwork: 0,
      };
      updateState((current) => ({
        ...current,
        collectors: [collector, ...current.collectors],
      }));
      notify(`${collector.name} added to the partner network.`);
    },
    [updateState, notify],
  );

  const settleCollector = useCallback(
    (collectorId: string, amount: number) => {
      if (!state) return;
      const collector = state.collectors.find((item) => item.id === collectorId);
      if (!collector) return;
      const transaction = {
        id: uid("t"),
        collectorId,
        type: "feedstock_purchase" as const,
        description: `Feedstock settlement · ${collector.city}`,
        amount,
        direction: "in" as const,
        status: "settled" as const,
        createdAt: new Date().toISOString(),
      };
      updateState((current) => ({
        ...current,
        transactions: [transaction, ...current.transactions],
        collectors: current.collectors.map((item) =>
          item.id === collectorId
            ? { ...item, paidToNetwork: item.paidToNetwork + amount }
            : item,
        ),
      }));
      notify(`Settlement of ₹${amount.toLocaleString("en-IN")} recorded for ${collector.name}.`);
    },
    [state, updateState, notify],
  );

  const verifyCollector = useCallback(
    (collectorId: string) => {
      updateState((current) => ({
        ...current,
        collectors: current.collectors.map((collector) =>
          collector.id === collectorId ? { ...collector, status: "verified" } : collector,
        ),
      }));
      notify("Partner verification approved.");
    },
    [updateState, notify],
  );

  const addProduct = useCallback(
    (input: AddProductInput) => {
      const status = input.status ?? "sold";
      const product: Product = {
        id: uid("p"),
        collectorId: input.collectorId,
        name: input.name,
        category: input.category,
        units: input.units,
        unitLabel: input.unitLabel,
        revenue: input.revenue,
        cost: input.cost,
        buyerId: input.buyerId,
        status,
        createdAt: new Date().toISOString(),
        description: input.description,
        wasteKg: input.wasteKg,
        bottlesUsed: input.bottlesUsed,
      };
      const transactions = [] as AppState["transactions"];
      if (status === "sold" && input.revenue > 0) {
        transactions.push({
          id: uid("t"),
          collectorId: input.collectorId,
          type: "product_sale",
          description: `${input.name} · buyer settlement`,
          amount: input.revenue,
          direction: "in",
          status: "settled",
          createdAt: new Date().toISOString(),
        });
        transactions.push({
          id: uid("t"),
          collectorId: input.collectorId,
          type: "platform_fee",
          description: `Circularity fee · ${input.name}`,
          amount: Math.round(input.revenue * 0.06),
          direction: "in",
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
      updateState((current) => ({
        ...current,
        products: [product, ...current.products],
        transactions: [...transactions, ...current.transactions],
        collectors: current.collectors.map((collector) =>
          collector.id === input.collectorId && status === "sold"
            ? {
                ...collector,
                revenue: collector.revenue + input.revenue,
                profit: collector.profit + Math.max(0, input.revenue - input.cost),
              }
            : collector,
        ),
        buyers: current.buyers.map((buyer) =>
          buyer.id === input.buyerId && status === "sold"
            ? { ...buyer, spend: buyer.spend + input.revenue }
            : buyer,
        ),
      }));
      notify(
        status === "sold"
          ? `${product.name} logged · ₹${input.revenue.toLocaleString("en-IN")} sale recorded.`
          : `${product.name} added to recycled product inventory.`,
      );
    },
    [updateState, notify],
  );

  const updateUser = useCallback(
    (userId: string, patch: Partial<User>) => {
      updateState((current) => ({
        ...current,
        users: current.users.map((user) => (user.id === userId ? { ...user, ...patch } : user)),
      }));
    },
    [updateState],
  );

  const toggleUserStatus = useCallback(
    (userId: string) => {
      if (!state) return;
      const user = state.users.find((item) => item.id === userId);
      if (!user) return;
      const nextStatus: User["status"] = user.status === "active" ? "paused" : "active";
      updateState((current) => ({
        ...current,
        users: current.users.map((item) =>
          item.id === userId ? { ...item, status: nextStatus } : item,
        ),
      }));
      notify(`Member account ${nextStatus === "active" ? "reactivated" : "paused"}.`);
    },
    [state, updateState, notify],
  );

  const updateSettings = useCallback(
    (patch: Partial<WorkspaceSettings>) => {
      updateState((current) => ({
        ...current,
        settings: { ...current.settings, ...patch },
      }));
      notify("Workspace settings saved.");
    },
    [updateState, notify],
  );

  const updateCurrentUser = useCallback(
    (patch: Partial<Pick<User, "name" | "city" | "email">>) => {
      if (!currentUser) return;
      updateState((current) => ({
        ...current,
        users: current.users.map((user) =>
          user.id === currentUser.id ? { ...user, ...patch } : user,
        ),
      }));
      notify("Profile updated.");
    },
    [currentUser, updateState, notify],
  );

  const setRole = useCallback((role: AppState["currentRole"]) => {
    updateState((current) => ({ ...current, currentRole: role }));
  }, [updateState]);

  const setCurrentUser = useCallback((userId: string) => {
    updateState((current) => ({ ...current, currentUserId: userId }));
  }, [updateState]);

  const setCurrentCollector = useCallback((collectorId: string) => {
    updateState((current) => ({ ...current, currentCollectorId: collectorId }));
  }, [updateState]);

  const resetDemo = useCallback(async () => {
    await clearWorkspace();
    setState(createInitialState());
    notify("Demo workspace restored to its original data.");
  }, [notify]);

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      hydrated,
      currentUser,
      currentCollector,
      toasts,
      notify,
      dismissToast,
      submitBottle,
      assignSubmissions,
      receiveSubmissions,
      processSubmissions,
      addCollector,
      settleCollector,
      verifyCollector,
      addProduct,
      updateUser,
      toggleUserStatus,
      updateSettings,
      updateCurrentUser,
      setRole,
      setCurrentUser,
      setCurrentCollector,
      resetDemo,
    }),
    [
      state,
      hydrated,
      currentUser,
      currentCollector,
      toasts,
      notify,
      dismissToast,
      submitBottle,
      assignSubmissions,
      receiveSubmissions,
      processSubmissions,
      addCollector,
      settleCollector,
      verifyCollector,
      addProduct,
      updateUser,
      toggleUserStatus,
      updateSettings,
      updateCurrentUser,
      setRole,
      setCurrentUser,
      setCurrentCollector,
      resetDemo,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error("useAppStore must be used inside AppStoreProvider.");
  return context;
}
