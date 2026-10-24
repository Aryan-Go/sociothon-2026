import { BOTTLE_TYPES } from "../data/bottles";
import type { BottleType, ClassifyResult, WorkspaceSettings } from "../types";
import { resolveGemini } from "./integrations";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
];

const BOTTLE_TAXONOMY = BOTTLE_TYPES.map(
  (bottle) =>
    `- ${bottle.id}: ${bottle.name}; material ${bottle.material}; clues: ${bottle.keywords
      .slice(0, 4)
      .join(", ")}`,
).join("\n");

const SYSTEM_PROMPT = `You are Loopr's bottle vision classifier for Indian municipal recycling.

Your only job is to inspect one photo and choose exactly one bottle class from this fixed taxonomy:
${BOTTLE_TAXONOMY}

Rules:
1. Classify the bottle or beverage container itself. Ignore hands, labels, background and people.
2. Choose the single bottleTypeId that best matches the visible material and shape.
3. Distinguish PET from HDPE from PP from glass and aluminium using cap, transparency, stiffness, neck finish and typical packaging.
4. If the image is unclear or not a bottle, choose the closest class and use a confidence below 0.55.
5. Confidence must be a realistic number between 0 and 1.
6. Reason must be under 18 words and describe visual evidence only. Never invent a brand or recycling outcome.
7. Return only valid JSON, never markdown.`;

const USER_PROMPT =
  "Classify the bottle in this photo. Return bottleTypeId, confidence and a short visual reason.";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    bottleTypeId: {
      type: "STRING",
      enum: BOTTLE_TYPES.map((bottle) => bottle.id),
    },
    confidence: { type: "NUMBER" },
    reason: { type: "STRING" },
  },
  required: ["bottleTypeId", "confidence", "reason"],
};

interface GeminiAnswer {
  bottleTypeId: string;
  confidence: number;
  reason: string;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function matchKeywords(label: string): BottleType | undefined {
  const normalized = label.toLowerCase();
  const scored = BOTTLE_TYPES.map((bottle) => {
    const score = bottle.keywords.reduce(
      (sum, keyword) => sum + (normalized.includes(keyword) ? keyword.length : 0),
      0,
    );
    return { bottle, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].bottle : undefined;
}

export function demoClassify(file: File): ClassifyResult {
  const namedMatch = matchKeywords(file.name);
  const hash = hashString(`${file.name}-${file.size}-${file.lastModified}`);
  const bottle = namedMatch ?? BOTTLE_TYPES[hash % BOTTLE_TYPES.length];
  const confidence = Number((0.84 + ((hash % 130) / 1000)).toFixed(2));
  return {
    bottleTypeId: bottle.id,
    confidence: Math.min(0.97, confidence),
    rawLabel: bottle.name,
    source: "demo",
    reason:
      "Demo mode used the filename and image signature. Add a Gemini API key for real visual inference.",
  };
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function cleanJson(text: string): string {
  const withoutFences = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const first = withoutFences.indexOf("{");
  const last = withoutFences.lastIndexOf("}");
  if (first >= 0 && last > first) return withoutFences.slice(first, last + 1);
  return withoutFences;
}

function parseGeminiAnswer(text: string): GeminiAnswer {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleanJson(text)) as Record<string, unknown>;
  } catch {
    const matched = matchKeywords(text);
    if (matched) {
      return {
        bottleTypeId: matched.id,
        confidence: 0.72,
        reason: "Gemini returned a label but not the structured JSON response.",
      };
    }
    throw new Error("Gemini replied, but the response was not valid classification JSON.");
  }

  const requestedId = String(parsed.bottleTypeId ?? "").trim();
  const exact = BOTTLE_TYPES.find((bottle) => bottle.id === requestedId);
  const matched = exact ?? matchKeywords(`${requestedId} ${String(parsed.reason ?? "")}`);
  if (!matched) {
    throw new Error("Gemini returned a bottle class outside Loopr's taxonomy.");
  }

  const rawConfidence = Number(parsed.confidence);
  const confidence = Number.isFinite(rawConfidence)
    ? Math.max(0, Math.min(1, rawConfidence > 1 ? rawConfidence / 100 : rawConfidence))
    : 0.8;
  return {
    bottleTypeId: matched.id,
    confidence,
    reason:
      typeof parsed.reason === "string" && parsed.reason.trim()
        ? parsed.reason.trim()
        : `Gemini identified the container as ${matched.material}.`,
  };
}

async function fileToInlineData(file: File): Promise<{ mime_type: string; data: string }> {
  const dataUrl = await compressImage(file, 1024);
  const comma = dataUrl.indexOf(",");
  const semicolon = dataUrl.indexOf(";");
  if (comma < 0) throw new Error("I could not prepare that image for Gemini.");
  return {
    mime_type: dataUrl.slice(5, semicolon) || "image/jpeg",
    data: dataUrl.slice(comma + 1),
  };
}

async function requestGemini(
  model: string,
  inlineData: { mime_type: string; data: string },
  apiKey: string,
): Promise<GeminiAnswer> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(
      `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [{ inline_data: inlineData }, { text: USER_PROMPT }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.85,
            maxOutputTokens: 400,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(
        `Gemini ${model} returned ${response.status}${message ? `: ${message.slice(0, 100)}` : ""}`,
      );
    }

    const payload: unknown = await response.json();
    const text = extractText(payload);
    if (!text) {
      const blocked = (payload as { promptFeedback?: { blockReason?: string } }).promptFeedback
        ?.blockReason;
      throw new Error(
        blocked
          ? `Gemini blocked this image (${blocked})`
          : `Gemini ${model} returned no classification`,
      );
    }
    return parseGeminiAnswer(text);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Gemini ${model} timed out`);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function classifyBottle(
  file: File,
  settings: WorkspaceSettings,
): Promise<ClassifyResult> {
  const config = resolveGemini(settings);
  if (!config.apiKey) {
    return demoClassify(file);
  }

  const inlineData = await fileToInlineData(file);
  const models = Array.from(new Set([config.model, ...MODEL_FALLBACKS]));
  let lastError = "";

  for (const model of models) {
    try {
      const answer = await requestGemini(model, inlineData, config.apiKey);
      const bottle = BOTTLE_TYPES.find((item) => item.id === answer.bottleTypeId)!;
      return {
        bottleTypeId: bottle.id,
        confidence: answer.confidence,
        rawLabel: bottle.name,
        source: "gemini",
        reason: answer.reason,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Gemini could not respond";
    }
  }

  const demo = demoClassify(file);
  return {
    ...demo,
    warning: `Gemini could not classify this photo (${lastError}). I used the local demo classifier so you can still log the bottle.`,
  };
}

export async function compressImage(file: File, maxSize = 900): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("I could not read that image."));
      element.src = objectUrl;
    });
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is not available.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
