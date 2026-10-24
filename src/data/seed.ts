import type {
  AppState,
  Buyer,
  Collector,
  Product,
  Submission,
  SubmissionStatus,
  Transaction,
  User,
} from "../types";
import { BOTTLE_TYPES } from "./bottles";
import { ENV } from "../lib/env";

const now = new Date();

function daysAgo(days: number, hour = 10): string {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hour, Math.floor((days * 17) % 60), 0, 0);
  if (date.getTime() > now.getTime()) {
    const minutesBack = ((days * 17 + hour * 7) % 180) + 5;
    date.setTime(now.getTime() - minutesBack * 60000);
  }
  return date.toISOString();
}

function mulberry32(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261024);

export const CURRENT_USER_ID = "u-1";
export const CURRENT_COLLECTOR_ID = "c-1";

const users: User[] = [
  {
    id: "u-1",
    name: "Aarav Mehta",
    email: "aarav@loopr.earth",
    city: "Bengaluru",
    joinedAt: "2025-08-12T09:30:00.000Z",
    points: 2480,
    bottleCount: 96,
    kgDiverted: 5.8,
    status: "active",
    avatarHue: 88,
    tier: "Loop 3",
  },
  {
    id: "u-2",
    name: "Meera Nair",
    email: "meera.n@example.com",
    city: "Mumbai",
    joinedAt: "2025-04-03T11:10:00.000Z",
    points: 3120,
    bottleCount: 124,
    kgDiverted: 7.4,
    status: "active",
    avatarHue: 24,
    tier: "Loop 4",
  },
  {
    id: "u-3",
    name: "Kabir Shah",
    email: "kabir.s@example.com",
    city: "Bengaluru",
    joinedAt: "2025-06-18T08:15:00.000Z",
    points: 2840,
    bottleCount: 108,
    kgDiverted: 6.2,
    status: "active",
    avatarHue: 194,
    tier: "Loop 4",
  },
  {
    id: "u-4",
    name: "Ananya Rao",
    email: "ananya.r@example.com",
    city: "Bengaluru",
    joinedAt: "2025-09-01T14:40:00.000Z",
    points: 2610,
    bottleCount: 102,
    kgDiverted: 5.9,
    status: "active",
    avatarHue: 320,
    tier: "Loop 3",
  },
  {
    id: "u-5",
    name: "Rohan Iyer",
    email: "rohan.i@example.com",
    city: "Chennai",
    joinedAt: "2025-07-21T06:55:00.000Z",
    points: 2380,
    bottleCount: 89,
    kgDiverted: 5.1,
    status: "active",
    avatarHue: 42,
    tier: "Loop 3",
  },
  {
    id: "u-6",
    name: "Diya Patel",
    email: "diya.p@example.com",
    city: "Ahmedabad",
    joinedAt: "2025-03-15T17:20:00.000Z",
    points: 2205,
    bottleCount: 84,
    kgDiverted: 4.8,
    status: "active",
    avatarHue: 12,
    tier: "Loop 3",
  },
  {
    id: "u-7",
    name: "Vihaan Gupta",
    email: "vihaan.g@example.com",
    city: "Delhi",
    joinedAt: "2025-10-02T10:05:00.000Z",
    points: 2080,
    bottleCount: 78,
    kgDiverted: 4.4,
    status: "active",
    avatarHue: 212,
    tier: "Loop 2",
  },
  {
    id: "u-8",
    name: "Isha Menon",
    email: "isha.m@example.com",
    city: "Kochi",
    joinedAt: "2025-05-27T12:00:00.000Z",
    points: 1950,
    bottleCount: 72,
    kgDiverted: 4.0,
    status: "active",
    avatarHue: 160,
    tier: "Loop 2",
  },
  {
    id: "u-9",
    name: "Arjun Singh",
    email: "arjun.s@example.com",
    city: "Jaipur",
    joinedAt: "2025-11-08T07:35:00.000Z",
    points: 1810,
    bottleCount: 67,
    kgDiverted: 3.7,
    status: "active",
    avatarHue: 278,
    tier: "Loop 2",
  },
  {
    id: "u-10",
    name: "Saanvi Joshi",
    email: "saanvi.j@example.com",
    city: "Pune",
    joinedAt: "2026-01-19T16:25:00.000Z",
    points: 1680,
    bottleCount: 61,
    kgDiverted: 3.4,
    status: "active",
    avatarHue: 336,
    tier: "Loop 2",
  },
  {
    id: "u-11",
    name: "Neel Verma",
    email: "neel.v@example.com",
    city: "Hyderabad",
    joinedAt: "2025-12-11T09:45:00.000Z",
    points: 1520,
    bottleCount: 55,
    kgDiverted: 3.0,
    status: "active",
    avatarHue: 56,
    tier: "Loop 2",
  },
  {
    id: "u-12",
    name: "Tara Bose",
    email: "tara.b@example.com",
    city: "Kolkata",
    joinedAt: "2026-02-06T13:10:00.000Z",
    points: 1380,
    bottleCount: 49,
    kgDiverted: 2.7,
    status: "active",
    avatarHue: 240,
    tier: "Loop 1",
  },
];

const collectors: Collector[] = [
  {
    id: "c-1",
    name: "GreenLoop Recovery",
    manager: "Kabir Rao",
    email: "kabir@greenloop.co",
    phone: "+91 98860 44210",
    city: "Bengaluru",
    ratePerKg: 42,
    capacityKg: 5400,
    processedKg: 4200,
    wasteDivertedKg: 3600,
    revenue: 546000,
    profit: 187000,
    rating: 4.9,
    status: "verified",
    joinedAt: "2025-03-02T09:00:00.000Z",
    focus: "rPET flake · fibre fill",
    avatarHue: 90,
    paidToNetwork: 182000,
  },
  {
    id: "c-2",
    name: "EcoNest Materials",
    manager: "Naina Bhat",
    email: "naina@econest.in",
    phone: "+91 98110 32870",
    city: "Delhi",
    ratePerKg: 38,
    capacityKg: 4500,
    processedKg: 3600,
    wasteDivertedKg: 3350,
    revenue: 328000,
    profit: 100000,
    rating: 4.7,
    status: "verified",
    joinedAt: "2025-06-14T09:00:00.000Z",
    focus: "HDPE · mixed rigid",
    avatarHue: 205,
    paidToNetwork: 128000,
  },
  {
    id: "c-3",
    name: "ReFiber Works",
    manager: "Aditi Sen",
    email: "aditi@refiber.works",
    phone: "+91 98203 77541",
    city: "Mumbai",
    ratePerKg: 45,
    capacityKg: 5000,
    processedKg: 3850,
    wasteDivertedKg: 3120,
    revenue: 332000,
    profit: 132000,
    rating: 4.8,
    status: "verified",
    joinedAt: "2025-02-09T09:00:00.000Z",
    focus: "Textile fibre · strapping",
    avatarHue: 315,
    paidToNetwork: 234000,
  },
  {
    id: "c-4",
    name: "BlueBin Circular",
    manager: "Dev Malhotra",
    email: "dev@bluebin.co",
    phone: "+91 98220 56119",
    city: "Pune",
    ratePerKg: 34,
    capacityKg: 2800,
    processedKg: 1900,
    wasteDivertedKg: 1550,
    revenue: 123000,
    profit: 45000,
    rating: 4.5,
    status: "review",
    joinedAt: "2025-11-23T09:00:00.000Z",
    focus: "Glass · construction aggregate",
    avatarHue: 150,
    paidToNetwork: 52000,
  },
  {
    id: "c-5",
    name: "NorthStar Polymers",
    manager: "Zoya Khan",
    email: "zoya@northstar.eco",
    phone: "+91 99490 81022",
    city: "Hyderabad",
    ratePerKg: 40,
    capacityKg: 3200,
    processedKg: 2300,
    wasteDivertedKg: 2100,
    revenue: 272000,
    profit: 93000,
    rating: 4.6,
    status: "verified",
    joinedAt: "2025-08-30T09:00:00.000Z",
    focus: "PP · automotive compounds",
    avatarHue: 30,
    paidToNetwork: 118000,
  },
];

const buyers: Buyer[] = [
  {
    id: "b-1",
    name: "EcoWeave Textiles",
    sector: "Textiles",
    city: "Coimbatore",
    since: "2025-04-18T00:00:00.000Z",
    spend: 428000,
    status: "active",
  },
  {
    id: "b-2",
    name: "Terra Form Labs",
    sector: "Construction",
    city: "Pune",
    since: "2025-07-02T00:00:00.000Z",
    spend: 186000,
    status: "active",
  },
  {
    id: "b-3",
    name: "Northline Packaging",
    sector: "Packaging",
    city: "Delhi",
    since: "2025-09-11T00:00:00.000Z",
    spend: 264000,
    status: "active",
  },
  {
    id: "b-4",
    name: "Kora Living",
    sector: "Consumer goods",
    city: "Mumbai",
    since: "2026-01-08T00:00:00.000Z",
    spend: 142000,
    status: "active",
  },
  {
    id: "b-5",
    name: "Urban Threads",
    sector: "Apparel",
    city: "Bengaluru",
    since: "2025-05-22T00:00:00.000Z",
    spend: 318000,
    status: "active",
  },
  {
    id: "b-6",
    name: "Verdant Retail",
    sector: "Retail",
    city: "Chennai",
    since: "2026-02-01T00:00:00.000Z",
    spend: 98000,
    status: "active",
  },
];

function statusForAge(age: number): SubmissionStatus {
  const roll = rand();
  if (age > 28) {
    if (roll < 0.86) return "recycled";
    if (roll < 0.94) return "collected";
    return "assigned";
  }
  if (age > 10) {
    if (roll < 0.58) return "recycled";
    if (roll < 0.8) return "collected";
    if (roll < 0.94) return "assigned";
    return "pending";
  }
  if (roll < 0.36) return "pending";
  if (roll < 0.67) return "assigned";
  if (roll < 0.86) return "collected";
  return "recycled";
}

const submissions: Submission[] = [];
const currentUserCities = users.reduce<Record<string, string>>((acc, user) => {
  acc[user.id] = user.city;
  return acc;
}, {});

for (let index = 0; index < 190; index += 1) {
  let user = users[Math.floor(rand() * users.length)];
  if (index < 22) {
    user = users[0];
  } else if (index % 9 === 0) {
    user = users[1 + (index % 10)];
  }

  const bottle = BOTTLE_TYPES[Math.floor(rand() * BOTTLE_TYPES.length)];
  const age = Math.floor(rand() * 84);
  const status = statusForAge(age);
  const collector = collectors[Math.floor(rand() * collectors.length)];
  const weightKg = bottle.weightKg * (0.88 + rand() * 0.28);

  submissions.push({
    id: `s-${String(index + 1).padStart(3, "0")}`,
    userId: user.id,
    bottleTypeId: bottle.id,
    status,
    collectorId: status === "pending" ? undefined : collector.id,
    points: bottle.points,
    weightKg: Number(weightKg.toFixed(3)),
    submittedAt: daysAgo(age, 7 + Math.floor(rand() * 14)),
    city: currentUserCities[user.id],
    confidence: Number((0.86 + rand() * 0.13).toFixed(2)),
    source: rand() > 0.22 ? "gemini" : "demo",
    note: index % 17 === 0 ? "Dropped at a community collection point." : undefined,
  });
}

const products: Product[] = [
  {
    id: "p-1",
    collectorId: "c-1",
    name: "rPET clear flake",
    category: "Raw material",
    units: 820,
    unitLabel: "kg",
    revenue: 168000,
    cost: 112000,
    buyerId: "b-1",
    status: "sold",
    createdAt: daysAgo(12, 11),
    description: "Food-grade clear flake from colour-sorted PET water and soda bottles.",
    wasteKg: 940,
    bottlesUsed: 18800,
  },
  {
    id: "p-2",
    collectorId: "c-1",
    name: "Recycled fleece fill",
    category: "Textile",
    units: 380,
    unitLabel: "kg",
    revenue: 96000,
    cost: 59000,
    buyerId: "b-5",
    status: "sold",
    createdAt: daysAgo(8, 15),
    description: "Soft fill for jackets and cushions, spun from local rPET fibre.",
    wasteKg: 512,
    bottlesUsed: 10240,
  },
  {
    id: "p-3",
    collectorId: "c-1",
    name: "Loop tote · bottle fibre",
    category: "Consumer goods",
    units: 640,
    unitLabel: "units",
    revenue: 84000,
    cost: 51000,
    buyerId: "b-4",
    status: "sold",
    createdAt: daysAgo(3, 9),
    description: "Heavy-duty tote woven from recycled bottle yarn, made in Bengaluru.",
    wasteKg: 286,
    bottlesUsed: 5720,
  },
  {
    id: "p-4",
    collectorId: "c-1",
    name: "HDPE planter · Forest",
    category: "Consumer goods",
    units: 220,
    unitLabel: "units",
    revenue: 66000,
    cost: 39000,
    buyerId: "b-6",
    status: "in-stock",
    createdAt: daysAgo(1, 8),
    description: "Injection-moulded planters made from 100% post-consumer HDPE.",
    wasteKg: 148,
    bottlesUsed: 2460,
  },
  {
    id: "p-5",
    collectorId: "c-1",
    name: "rPET strapping",
    category: "Industrial",
    units: 1500,
    unitLabel: "kg",
    revenue: 132000,
    cost: 98000,
    buyerId: "b-3",
    status: "sold",
    createdAt: daysAgo(20, 13),
    description: "High-tensile strapping for logistics, diverted from mixed PET.",
    wasteKg: 1650,
    bottlesUsed: 33000,
  },
  {
    id: "p-6",
    collectorId: "c-2",
    name: "HDPE crates",
    category: "Industrial",
    units: 540,
    unitLabel: "units",
    revenue: 124000,
    cost: 88000,
    buyerId: "b-3",
    status: "sold",
    createdAt: daysAgo(16, 12),
    description: "Stackable crates moulded from post-consumer milk jugs.",
    wasteKg: 760,
    bottlesUsed: 12660,
  },
  {
    id: "p-7",
    collectorId: "c-2",
    name: "Mixed rigid pellets",
    category: "Raw material",
    units: 1120,
    unitLabel: "kg",
    revenue: 96000,
    cost: 71000,
    buyerId: "b-2",
    status: "in-stock",
    createdAt: daysAgo(4, 10),
    description: "Washed and pelletised HDPE/PP blend for non-food applications.",
    wasteKg: 1380,
    bottlesUsed: 27600,
  },
  {
    id: "p-8",
    collectorId: "c-3",
    name: "Recycled denim yarn",
    category: "Textile",
    units: 930,
    unitLabel: "kg",
    revenue: 214000,
    cost: 136000,
    buyerId: "b-5",
    status: "sold",
    createdAt: daysAgo(7, 14),
    description: "Blended cotton and bottle fibre yarn for low-water denim.",
    wasteKg: 1160,
    bottlesUsed: 23200,
  },
  {
    id: "p-9",
    collectorId: "c-3",
    name: "Cushion fill · cloud",
    category: "Consumer goods",
    units: 410,
    unitLabel: "units",
    revenue: 118000,
    cost: 64000,
    buyerId: "b-4",
    status: "sold",
    createdAt: daysAgo(2, 11),
    description: "Cushion inserts filled with sanitised recycled PET fibre.",
    wasteKg: 320,
    bottlesUsed: 6400,
  },
  {
    id: "p-10",
    collectorId: "c-4",
    name: "Glass aggregate",
    category: "Construction",
    units: 860,
    unitLabel: "kg",
    revenue: 52000,
    cost: 34000,
    buyerId: "b-2",
    status: "sold",
    createdAt: daysAgo(11, 9),
    description: "Tumbled recycled glass aggregate for exposed concrete surfaces.",
    wasteKg: 940,
    bottlesUsed: 2690,
  },
  {
    id: "p-11",
    collectorId: "c-4",
    name: "Terrazzo tile blanks",
    category: "Construction",
    units: 190,
    unitLabel: "sq ft",
    revenue: 71000,
    cost: 44000,
    buyerId: "b-2",
    status: "in-stock",
    createdAt: daysAgo(5, 16),
    description: "Coloured glass tiles pressed with low-carbon binder.",
    wasteKg: 510,
    bottlesUsed: 1460,
  },
  {
    id: "p-12",
    collectorId: "c-5",
    name: "PP automotive compound",
    category: "Industrial",
    units: 1380,
    unitLabel: "kg",
    revenue: 188000,
    cost: 128000,
    buyerId: "b-3",
    status: "sold",
    createdAt: daysAgo(9, 13),
    description: "Impact-modified PP compound for non-visible automotive parts.",
    wasteKg: 1620,
    bottlesUsed: 40500,
  },
  {
    id: "p-13",
    collectorId: "c-5",
    name: "Recycled storage boxes",
    category: "Consumer goods",
    units: 360,
    unitLabel: "units",
    revenue: 84000,
    cost: 51000,
    buyerId: "b-6",
    status: "sold",
    createdAt: daysAgo(6, 10),
    description: "Durable home storage boxes from 85% post-consumer PP.",
    wasteKg: 410,
    bottlesUsed: 10250,
  },
  {
    id: "p-14",
    collectorId: "c-2",
    name: "Recycled drainage pipe",
    category: "Construction",
    units: 720,
    unitLabel: "m",
    revenue: 108000,
    cost: 69000,
    buyerId: "b-2",
    status: "sold",
    createdAt: daysAgo(24, 12),
    description: "Corrugated HDPE drainage pipe for civic landscaping projects.",
    wasteKg: 1180,
    bottlesUsed: 19660,
  },
];

const transactions: Transaction[] = [];

collectors.forEach((collector, index) => {
  const baseDay = index + 1;
  transactions.push({
    id: `t-${index}-1`,
    collectorId: collector.id,
    type: "feedstock_purchase",
    description: `Sorted feedstock · ${collector.city} batch`,
    amount: Math.round(collector.processedKg * collector.ratePerKg * 0.62),
    direction: "in",
    status: "settled",
    createdAt: daysAgo(baseDay + 2, 10),
  });
  transactions.push({
    id: `t-${index}-2`,
    collectorId: collector.id,
    type: "platform_fee",
    description: "Circularity fee · 6% of verified sales",
    amount: Math.round(collector.revenue * 0.06),
    direction: "in",
    status: index === 3 ? "pending" : "settled",
    createdAt: daysAgo(baseDay + 4, 15),
  });
  transactions.push({
    id: `t-${index}-3`,
    collectorId: collector.id,
    type: "product_sale",
    description: "Recycled product settlement to buyer",
    amount: Math.round(collector.revenue * 0.44),
    direction: "in",
    status: "settled",
    createdAt: daysAgo(baseDay + 6, 12),
  });
  transactions.push({
    id: `t-${index}-4`,
    collectorId: collector.id,
    type: "logistics_payout",
    description: `Last-mile collection crew · ${collector.city}`,
    amount: 18000 + index * 4200,
    direction: "out",
    status: "settled",
    createdAt: daysAgo(baseDay + 8, 9),
  });
});

// A couple of fresher settlements for the current collector.
transactions.push(
  {
    id: "t-live-1",
    collectorId: "c-1",
    type: "product_sale",
    description: "Loop tote settlement · Kora Living",
    amount: 84000,
    direction: "in",
    status: "settled",
    createdAt: daysAgo(1, 16),
  },
  {
    id: "t-live-2",
    collectorId: "c-1",
    type: "platform_fee",
    description: "Circularity fee · Loop tote batch",
    amount: 5040,
    direction: "in",
    status: "pending",
    createdAt: daysAgo(1, 16),
  },
);

export function createInitialState(): AppState {
  return {
    users,
    collectors,
    submissions,
    products,
    buyers,
    transactions,
    settings: {
      geminiApiKey: "",
      geminiModel: ENV.gemini.model,
      elevenLabsApiKey: "",
      elevenLabsVoiceId: ENV.elevenLabs.voiceId,
      elevenLabsProxyUrl: "",
      reducedMotion: false,
      emailDigest: true,
    },
    currentRole: "user",
    currentUserId: CURRENT_USER_ID,
    currentCollectorId: CURRENT_COLLECTOR_ID,
  };
}
