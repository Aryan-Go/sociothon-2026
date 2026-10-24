export type Role = "user" | "admin" | "collector";

export type SubmissionStatus = "pending" | "assigned" | "collected" | "recycled";

export type VerificationSource = "gemini" | "demo";

export type UserStatus = "active" | "paused";

export interface User {
  id: string;
  name: string;
  email: string;
  city: string;
  joinedAt: string;
  points: number;
  bottleCount: number;
  kgDiverted: number;
  status: UserStatus;
  avatarHue: number;
  tier: string;
}

export interface Collector {
  id: string;
  name: string;
  manager: string;
  email: string;
  phone: string;
  city: string;
  ratePerKg: number;
  capacityKg: number;
  processedKg: number;
  wasteDivertedKg: number;
  revenue: number;
  profit: number;
  rating: number;
  status: "verified" | "review";
  joinedAt: string;
  focus: string;
  avatarHue: number;
  paidToNetwork: number;
}

export interface Submission {
  id: string;
  userId: string;
  bottleTypeId: string;
  status: SubmissionStatus;
  collectorId?: string;
  points: number;
  weightKg: number;
  submittedAt: string;
  city: string;
  confidence: number;
  source: VerificationSource;
  image?: string;
  note?: string;
}

export interface Product {
  id: string;
  collectorId: string;
  name: string;
  category: string;
  units: number;
  unitLabel: string;
  revenue: number;
  cost: number;
  buyerId: string;
  status: "sold" | "in-stock";
  createdAt: string;
  description: string;
  wasteKg: number;
  bottlesUsed: number;
}

export interface Buyer {
  id: string;
  name: string;
  sector: string;
  city: string;
  since: string;
  spend: number;
  status: "active" | "paused";
}

export type TransactionType =
  | "feedstock_purchase"
  | "product_sale"
  | "platform_fee"
  | "logistics_payout";

export interface Transaction {
  id: string;
  collectorId?: string;
  type: TransactionType;
  description: string;
  amount: number;
  direction: "in" | "out";
  status: "settled" | "pending";
  createdAt: string;
}

export interface WorkspaceSettings {
  geminiApiKey: string;
  geminiModel: string;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  elevenLabsProxyUrl: string;
  reducedMotion: boolean;
  emailDigest: boolean;
}

export interface AppState {
  users: User[];
  collectors: Collector[];
  submissions: Submission[];
  products: Product[];
  buyers: Buyer[];
  transactions: Transaction[];
  settings: WorkspaceSettings;
  currentRole: Role;
  currentUserId: string;
  currentCollectorId: string;
}

export interface BottleType {
  id: string;
  name: string;
  material: string;
  code: string;
  points: number;
  weightKg: number;
  co2Kg: number;
  recyclability: number;
  color: string;
  softColor: string;
  prep: string;
  danger: string;
  reuse: string;
  keywords: string[];
}

export interface DropOffCenter {
  id: string;
  city: string;
  name: string;
  address: string;
  distanceKm: number;
  hours: string;
  accepts: string;
  type: "Recycling hub" | "Community bin" | "Partner store";
}

export interface ClassifyResult {
  bottleTypeId: string;
  confidence: number;
  rawLabel: string;
  source: VerificationSource;
  reason?: string;
  warning?: string;
}
