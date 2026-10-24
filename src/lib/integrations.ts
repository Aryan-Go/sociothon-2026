import type { WorkspaceSettings } from "../types";
import { ENV, hasEnvElevenLabs, hasEnvGemini } from "./env";

export interface GeminiConfig {
  apiKey: string;
  model: string;
  source: "env" | "workspace" | "none";
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  proxyUrl: string;
  source: "env" | "workspace" | "none";
}

export function resolveGemini(settings: WorkspaceSettings): GeminiConfig {
  const override = settings.geminiApiKey.trim();
  if (override) {
    return {
      apiKey: override,
      model: settings.geminiModel.trim() || ENV.gemini.model,
      source: "workspace",
    };
  }
  if (ENV.gemini.apiKey) {
    return {
      apiKey: ENV.gemini.apiKey,
      model: settings.geminiModel.trim() || ENV.gemini.model,
      source: "env",
    };
  }
  return {
    apiKey: "",
    model: settings.geminiModel.trim() || ENV.gemini.model,
    source: "none",
  };
}

export function resolveElevenLabs(settings: WorkspaceSettings): ElevenLabsConfig {
  const key = settings.elevenLabsApiKey.trim();
  const proxy = settings.elevenLabsProxyUrl.trim();
  if (key || proxy) {
    return {
      apiKey: key,
      voiceId: settings.elevenLabsVoiceId.trim() || ENV.elevenLabs.voiceId,
      proxyUrl: proxy,
      source: "workspace",
    };
  }
  if (hasEnvElevenLabs()) {
    return {
      apiKey: ENV.elevenLabs.apiKey,
      voiceId: settings.elevenLabsVoiceId.trim() || ENV.elevenLabs.voiceId,
      proxyUrl: ENV.elevenLabs.proxyUrl,
      source: "env",
    };
  }
  return {
    apiKey: "",
    voiceId: settings.elevenLabsVoiceId.trim() || ENV.elevenLabs.voiceId,
    proxyUrl: "",
    source: "none",
  };
}

export function isGeminiReady(settings: WorkspaceSettings): boolean {
  return Boolean(resolveGemini(settings).apiKey);
}

export function isElevenLabsReady(settings: WorkspaceSettings): boolean {
  const config = resolveElevenLabs(settings);
  return Boolean(config.apiKey || config.proxyUrl);
}

export function envIntegrationSummary() {
  return {
    gemini: hasEnvGemini(),
    elevenLabs: hasEnvElevenLabs(),
  };
}
