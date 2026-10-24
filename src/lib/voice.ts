import type { BottleType, DropOffCenter, WorkspaceSettings } from "../types";
import { resolveElevenLabs } from "./integrations";

export function buildNarration(
  bottle: BottleType,
  city: string,
  dropOffs: DropOffCenter[],
): string {
  const nearest = dropOffs.slice(0, 2);
  const dropOffSentence = nearest.length
    ? `Near ${city}, take it to ${nearest
        .map((center) => `${center.name}, ${center.distanceKm.toFixed(1)} kilometres away`)
        .join(", or ")}.`
    : `Search for a local recycling partner in ${city} before placing it in a mixed bin.`;

  const prep = `${bottle.prep.charAt(0).toLowerCase()}${bottle.prep.slice(1)}`;
  return `You scanned a ${bottle.name}, classified as ${bottle.material} with ${bottle.recyclability} percent recyclability. Before dropping it off, ${prep} ${bottle.danger} ${dropOffSentence} This bottle can become ${bottle.reuse} It is worth ${bottle.points} Loopr points, credited to the leaderboard only after a collector verifies recycling.`;
}

export async function synthesizeNarration(
  text: string,
  settings: WorkspaceSettings,
): Promise<string> {
  const config = resolveElevenLabs(settings);
  if (!config.apiKey && !config.proxyUrl) {
    throw new Error("MISSING_KEY");
  }

  if (config.proxyUrl) {
    const response = await fetch(config.proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        text,
        voiceId: config.voiceId,
        modelId: "eleven_multilingual_v2",
      }),
    });
    if (!response.ok) {
      throw new Error(`The ElevenLabs proxy returned ${response.status}.`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  const voiceId = config.voiceId || "21m00Tcm4TlvDq8ikWAM";
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": config.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.78,
          style: 0.22,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs returned ${response.status}${message ? `: ${message.slice(0, 100)}` : ""}.`,
    );
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function speakWithBrowser(
  text: string,
  onEnd?: () => void,
  language: "en-IN" | "hi-IN" = "en-IN",
): void {
  if (!("speechSynthesis" in window)) {
    throw new Error("This browser does not support speech playback.");
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 0.96;
  utterance.pitch = 1.02;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export function stopBrowserSpeech(): void {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
