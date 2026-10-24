function read(key: string, fallback = ""): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value?.trim() || fallback;
}

function readBoolean(key: string, fallback = false): boolean {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export const ENV = {
  appName: read("VITE_APP_NAME", "Loopr"),
  gemini: {
    apiKey: read("VITE_GEMINI_API_KEY"),
    model: read("VITE_GEMINI_MODEL", "gemini-2.5-flash"),
  },
  elevenLabs: {
    apiKey: read("VITE_ELEVENLABS_API_KEY"),
    voiceId: read("VITE_ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"),
    proxyUrl: read("VITE_ELEVENLABS_PROXY_URL"),
  },
  auth: {
    member: {
      name: read("VITE_MEMBER_NAME", "Aarav Mehta"),
      email: read("VITE_MEMBER_EMAIL", "aarav@loopr.earth"),
      password: read("VITE_MEMBER_PASSWORD", "member2026"),
    },
    admin: {
      name: read("VITE_ADMIN_NAME", "Riya Kapoor"),
      email: read("VITE_ADMIN_EMAIL", "admin@loopr.earth"),
      password: read("VITE_ADMIN_PASSWORD", "admin2026"),
    },
    collector: {
      name: read("VITE_COLLECTOR_NAME", "GreenLoop Recovery"),
      email: read("VITE_COLLECTOR_EMAIL", "greenloop@loopr.earth"),
      password: read("VITE_COLLECTOR_PASSWORD", "collector2026"),
      collectorId: read("VITE_COLLECTOR_ID", "c-1"),
    },
  },
  showDemoCredentials: readBoolean("VITE_SHOW_DEMO_CREDENTIALS", false),
} as const;

export function hasEnvGemini(): boolean {
  return Boolean(ENV.gemini.apiKey);
}

export function hasEnvElevenLabs(): boolean {
  return Boolean(ENV.elevenLabs.apiKey || ENV.elevenLabs.proxyUrl);
}
