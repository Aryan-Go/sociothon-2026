import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileImage,
  Leaf,
  LoaderCircle,
  MapPin,
  Pause,
  Play,
  Recycle,
  RotateCcw,
  ScanLine,
  Settings2,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  Volume2,
  Waves,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BottleGlyph } from "../../components/BottleGlyph";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  ProgressBar,
  SectionHeader,
  TextArea,
  cn,
} from "../../components/ui";
import { BOTTLE_BY_ID, BOTTLE_TYPES, dropOffsForCity } from "../../data/bottles";
import { classifyBottle, compressImage, demoClassify } from "../../lib/classifier";
import { formatDate } from "../../lib/format";
import {
  isElevenLabsReady,
  isGeminiReady,
  resolveGemini,
} from "../../lib/integrations";
import {
  buildNarration,
  speakWithBrowser,
  stopBrowserSpeech,
  synthesizeNarration,
} from "../../lib/voice";
import { useAppStore } from "../../store/AppStore";
import type { ClassifyResult, Submission } from "../../types";

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something interrupted the scan. Try another photo.";
}

export function ScanPage() {
  const { state, currentUser, submitBottle, notify } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [error, setError] = useState("");
  const [logged, setLogged] = useState<Submission | null>(null);
  const [logging, setLogging] = useState(false);
  const [note, setNote] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "loading" | "playing">("idle");
  const [voiceError, setVoiceError] = useState("");
  const [voiceProvider, setVoiceProvider] = useState<"elevenlabs" | "browser" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  if (!state || !currentUser) return null;

  const bottle = result ? BOTTLE_BY_ID[result.bottleTypeId] : null;
  const dropOffs = dropOffsForCity(currentUser.city);
  const narrationText = bottle
    ? buildNarration(bottle, currentUser.city, dropOffs)
    : "";
  const geminiReady = isGeminiReady(state.settings);
  const geminiConfig = resolveGemini(state.settings);
  const elevenReady = isElevenLabsReady(state.settings);

  const cleanupAudio = () => {
    stopBrowserSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setVoiceState("idle");
  };

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setVoiceError("");
    setVoiceProvider(null);
    cleanupAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.bottleTypeId]);

  const acceptFile = (nextFile: File | undefined) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      setError("That file is not an image. Use a JPG, PNG, WebP or HEIC photo.");
      return;
    }
    if (nextFile.size > 12 * 1024 * 1024) {
      setError("That photo is over 12 MB. Try a smaller image so the scan stays quick.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(nextFile));
    setFile(nextFile);
    setResult(null);
    setLogged(null);
    setError("");
    setNote("");
  };

  const resetScan = () => {
    cleanupAudio();
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setFile(null);
    setResult(null);
    setLogged(null);
    setError("");
    setNote("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError("");
    setLogged(null);
    setResult(null);
    cleanupAudio();
    try {
      const [classification] = await Promise.all([
        classifyBottle(file, state.settings),
        delay(850),
      ]);
      setResult(classification);
      if (classification.source === "demo") {
        notify(
          geminiReady
            ? "Gemini was unavailable, so the demo classifier completed the scan. You can still log the bottle."
            : "Demo classifier used. Add VITE_GEMINI_API_KEY to .env for live Gemini vision.",
          "info",
        );
      }
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setAnalyzing(false);
    }
  };

  const useDemo = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError("");
    await delay(500);
    setResult(demoClassify(file));
    setAnalyzing(false);
    notify("Demo classifier completed. Add a Gemini key to retry live vision.", "info");
  };

  const logBottle = async () => {
    if (!result || !bottle || !file) return;
    setLogging(true);
    try {
      const image = await compressImage(file).catch(() => undefined);
      const submission = submitBottle({
        bottleTypeId: bottle.id,
        confidence: result.confidence,
        source: result.source,
        image,
        note: note.trim() || undefined,
      });
      if (submission) {
        setLogged(submission);
        cleanupAudio();
      }
    } finally {
      setLogging(false);
    }
  };

  const voiceLabel =
    voiceState === "loading"
      ? "Preparing narration…"
      : voiceState === "playing"
        ? "Pause narration"
        : "Listen to the disposal guide";

  const playNarration = async () => {
    if (!narrationText) return;
    if (voiceState === "playing") {
      cleanupAudio();
      return;
    }
    setVoiceState("loading");
    setVoiceError("");
    try {
      const url = await synthesizeNarration(narrationText, state.settings);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        cleanupAudio();
      };
      await audio.play();
      setVoiceProvider("elevenlabs");
      setVoiceState("playing");
    } catch (voiceFailure) {
      const message = getErrorMessage(voiceFailure);
      if (message !== "MISSING_KEY") {
        setVoiceError(
          message.includes("Failed to fetch")
            ? "The browser could not reach ElevenLabs. Check the key or use a proxy URL in Settings."
            : message,
        );
      }
      try {
        speakWithBrowser(narrationText, () => cleanupAudio());
        setVoiceProvider("browser");
        setVoiceState("playing");
        notify(
          message === "MISSING_KEY"
            ? "Playing a browser voice preview. Add an ElevenLabs key in Settings for studio narration."
            : "ElevenLabs was unavailable, so this preview is using your browser voice.",
          "info",
        );
      } catch {
        setVoiceState("idle");
        setVoiceError("Audio playback is not available in this browser.");
      }
    }
  };


  return (
    <div className="page scan-page">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <ScanLine size={13} /> Bottle intelligence
          </span>
        }
        title={
          <>
            Scan it. Understand it. <span className="serif-accent">Return it.</span>
          </>
        }
        description="Upload a bottle photo. Loopr identifies the material, values the impact, and narrates exactly where it should go next."
        actions={
          <Link to="/app/settings" className="btn btn--secondary btn--md">
            <Settings2 size={15} />
            Model settings
          </Link>
        }
      />

      <div className="scan-steps" aria-label="Scan process">
        {[
          { label: "Photograph", icon: Camera, state: file ? "done" : "active" },
          { label: "Classify", icon: BrainCircuit, state: result ? "done" : file ? "active" : "todo" },
          { label: "Learn", icon: Volume2, state: result ? "active" : "todo" },
          { label: "Log impact", icon: Leaf, state: logged ? "done" : "todo" },
        ].map((step, index) => {
          const Icon = step.icon;
          return (
            <div className={cn("scan-step", `is-${step.state}`)} key={step.label}>
              <span className="scan-step__index">{step.state === "done" ? <Check size={13} /> : `0${index + 1}`}</span>
              <Icon size={15} />
              <span>{step.label}</span>
              {index < 3 ? <ChevronRight size={14} className="scan-step__arrow" /> : null}
            </div>
          );
        })}
      </div>

      <div className="scan-workspace">
        <Card className="scan-capture">
          <div className="scan-capture__head">
            <div>
              <span className="eyebrow">01 · Capture</span>
              <h2>Add a bottle photo</h2>
              <p>One bottle per photo. Natural light and a clean background work best.</p>
            </div>
            {preview ? (
              <Badge tone="green" dot>
                Photo ready
              </Badge>
            ) : (
              <Badge tone="neutral">JPG · PNG · WebP</Badge>
            )}
          </div>

          <input
            ref={inputRef}
            id="bottle-photo"
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => {
              acceptFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />

          <div
            className={cn(
              "dropzone",
              dragActive && "is-dragging",
              preview && "has-image",
              analyzing && "is-analyzing",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              acceptFile(event.dataTransfer.files?.[0]);
            }}
          >
            {preview ? (
              <div className="scan-preview">
                <img src={preview} alt="The bottle you are about to classify" />
                <div className="scan-preview__shade" />
                <div className="scan-preview__grid" aria-hidden="true" />
                {analyzing ? (
                  <>
                    <div className="scan-beam" aria-hidden="true" />
                    <div className="scan-preview__status">
                      <LoaderCircle className="spin" size={17} />
                      Reading shape, material and recyclability…
                    </div>
                  </>
                ) : (
                  <div className="scan-preview__actions">
                    <label htmlFor="bottle-photo" className="btn btn--secondary btn--sm">
                      <RotateCcw size={14} />
                      Replace photo
                    </label>
                    <button className="btn btn--dark btn--sm" onClick={resetScan} type="button">
                      Remove
                    </button>
                  </div>
                )}
                <span className="scan-corner scan-corner--tl" />
                <span className="scan-corner scan-corner--tr" />
                <span className="scan-corner scan-corner--bl" />
                <span className="scan-corner scan-corner--br" />
              </div>
            ) : (
              <label htmlFor="bottle-photo" className="dropzone__empty">
                <span className="dropzone__icon">
                  <UploadCloud size={26} />
                </span>
                <strong>Drop a bottle photo here</strong>
                <span>or choose a file from your device</span>
                <span className="btn btn--secondary btn--sm dropzone__button">
                  <FileImage size={15} />
                  Choose photo
                </span>
                <small>Up to 12 MB. The model sees only this single image.</small>
              </label>
            )}
          </div>

          {error ? (
            <div className="inline-alert inline-alert--error" role="alert">
              <AlertTriangle size={17} />
              <div>
                <strong>That scan did not complete.</strong>
                <p>{error}</p>
                {file ? (
                  <button className="inline-alert__action" onClick={useDemo} type="button">
                    Continue with the demo classifier
                    <ArrowRight size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="scan-capture__footer">
            <div className="scan-capture__tip">
              <CircleHelp size={15} />
              <span>
                {geminiReady
                  ? `Gemini ${geminiConfig.model} is connected. Photos are classified by the model prompt.`
                  : "Demo mode runs locally. Add VITE_GEMINI_API_KEY in .env for live vision."}{" "}
                <Link to="/app/settings">Open settings</Link>.
              </span>
            </div>
            <div className="scan-capture__controls">
              {file ? (
                <Button variant="ghost" size="md" onClick={resetScan} type="button">
                  Start over
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="md"
                onClick={analyze}
                disabled={!file || analyzing}
                loading={analyzing}
              >
                <ScanLine size={16} />
                {analyzing ? "Reading bottle…" : result ? "Scan again" : "Analyze bottle"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="scan-side">
          <Card className="model-card">
            <div className="model-card__top">
              <span className="model-card__icon">
                <BrainCircuit size={18} />
              </span>
              <Badge tone={geminiReady ? "green" : "amber"} dot>
                {geminiReady ? "Gemini connected" : "Demo mode"}
              </Badge>
            </div>
            <h3>{geminiReady ? "Gemini vision" : "Local bottle classifier"}</h3>
            <p>
              {geminiReady
                ? `${geminiConfig.model} reads each image with a structured bottle-material prompt. The result is validated against Loopr's seven-class taxonomy.`
                : "No Gemini key is configured, so the demo model classifies by filename and image signature. Add VITE_GEMINI_API_KEY to .env for live visual inference."}
            </p>
            <div className="model-card__meta">
              <span>
                <span className="status-pulse" /> {geminiReady ? "Awaiting image" : "Ready"}
              </span>
              <span>7 bottle classes</span>
            </div>
            <Link to="/app/settings" className="model-card__link">
              {geminiReady ? "Manage Gemini connection" : "Connect Gemini vision"}
              <ArrowRight size={14} />
            </Link>
          </Card>

          <Card className="streams-card">
            <SectionHeader
              title="What the model knows"
              subtitle="Point values reward harder-to-recover streams."
            />
            <div className="streams-list">
              {BOTTLE_TYPES.slice(0, 5).map((type) => (
                <div className="stream-line" key={type.id}>
                  <BottleGlyph bottleTypeId={type.id} size={18} />
                  <div>
                    <strong>{type.name}</strong>
                    <span>
                      {type.code} · {type.recyclability}% recyclable
                    </span>
                  </div>
                  <Badge tone="lime">+{type.points}</Badge>
                </div>
              ))}
            </div>
            <p className="streams-card__note">
              Low-confidence scans can still be logged; an admin can verify the material later.
            </p>
          </Card>
        </div>
      </div>

      {result && bottle ? (
        <section className="scan-result" aria-live="polite">
          {result.warning ? (
            <div className="inline-alert inline-alert--warning" role="status">
              <AlertTriangle size={17} />
              <div>
                <strong>Gemini hit a temporary issue.</strong>
                <p>{result.warning}</p>
              </div>
            </div>
          ) : null}
          <Card className="result-summary">
            <div className="result-summary__glyph">
              <BottleGlyph bottleTypeId={bottle.id} size={58} />
              <span className="result-summary__verified">
                <Check size={13} />
              </span>
            </div>
            <div className="result-summary__copy">
              <div className="result-summary__eyebrow">
                <Badge tone={result.source === "gemini" ? "green" : "amber"} dot>
                  {result.source === "gemini" ? "Gemini prediction" : "Demo prediction"}
                </Badge>
                <span>Identified just now</span>
              </div>
              <h2>{bottle.name}</h2>
              <p>
                {bottle.material} · {bottle.recyclability}% recyclable · {bottle.weightKg * 1000}g
                average
              </p>
              <div className="confidence">
                <div>
                  <span>Model confidence</span>
                  <strong>{Math.round(result.confidence * 100)}%</strong>
                </div>
                <ProgressBar value={result.confidence * 100} tone="forest" />
              </div>
              {result.reason ? (
                <p className="confidence__reason">
                  <Sparkles size={13} />
                  {result.reason}
                </p>
              ) : null}
            </div>
            <div className="result-summary__score">
              <span>On verification</span>
              <strong>+{bottle.points}</strong>
              <small>Loop points</small>
            </div>
            <div className="result-summary__impacts">
              <div>
                <Recycle size={15} />
                <span>{(bottle.co2Kg).toFixed(2)} kg</span>
                <small>CO₂ avoided</small>
              </div>
              <div>
                <Leaf size={15} />
                <span>{bottle.weightKg.toFixed(2)} kg</span>
                <small>Waste diverted</small>
              </div>
              <div>
                <Clock3 size={15} />
                <span>60 days</span>
                <small>Back in use</small>
              </div>
            </div>
          </Card>

          <div className="result-grid">
            <Card className="result-brief">
              <div className="result-brief__head">
                <span className="eyebrow">02 · Route it right</span>
                <Badge tone="green">Recyclable</Badge>
              </div>
              <h3>Disposal brief</h3>
              <div className="brief-section">
                <span className="brief-section__num">01</span>
                <div>
                  <h4>Before you drop it</h4>
                  <p>{bottle.prep}</p>
                </div>
              </div>
              <div className="brief-section">
                <span className="brief-section__num">02</span>
                <div>
                  <h4>Why it matters</h4>
                  <p>{bottle.danger}</p>
                </div>
              </div>
              <div className="brief-section">
                <span className="brief-section__num">03</span>
                <div>
                  <h4>Its next life</h4>
                  <p>{bottle.reuse}</p>
                </div>
              </div>
              <div className="brief-warning">
                <ShieldAlert size={17} />
                <p>
                  Never burn or crush glass at home. If this bottle held chemicals or medicine,
                  check the take-back note before using a community bin.
                </p>
              </div>
            </Card>

            <div className="result-side">
              <Card className="voice-card">
                <div className="voice-card__head">
                  <div>
                    <span className="eyebrow">03 · Listen</span>
                    <h3>Disposal, narrated</h3>
                  </div>
                  <Badge tone="dark" icon={Waves}>
                    {voiceProvider === "browser" || !elevenReady
                      ? "Browser voice"
                      : "ElevenLabs"}
                  </Badge>
                </div>
                <div className={cn("voice-player", voiceState === "playing" && "is-playing")}>
                  <button
                    className="voice-player__play"
                    onClick={playNarration}
                    disabled={voiceState === "loading"}
                    aria-label={voiceLabel}
                  >
                    {voiceState === "loading" ? (
                      <LoaderCircle className="spin" size={20} />
                    ) : voiceState === "playing" ? (
                      <Pause size={20} />
                    ) : (
                      <Play size={20} />
                    )}
                  </button>
                  <div className="voice-player__wave" aria-hidden="true">
                    {Array.from({ length: 32 }).map((_, index) => (
                      <span
                        key={index}
                        style={{
                          height: `${16 + ((index * 13) % 28)}%`,
                          animationDelay: `${index * 38}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="voice-player__duration">{voiceState === "playing" ? "Playing" : "0:38"}</span>
                </div>
                <p className="voice-player__label">
                  {voiceState === "loading"
                    ? "Generating your bottle-specific narration…"
                    : voiceState === "playing"
                      ? voiceProvider === "browser"
                        ? "Browser preview is speaking. Add an ElevenLabs key for the studio voice."
                        : "ElevenLabs is narrating safe disposal and your nearest drop-offs."
                      : "Hear how to dispose of it safely and where to take it near you."}
                </p>
                {voiceError ? (
                  <p className="voice-player__error">
                    <AlertTriangle size={14} /> {voiceError}
                  </p>
                ) : null}
                <details className="voice-transcript">
                  <summary>Read the narration script</summary>
                  <p>{narrationText}</p>
                </details>
                <Link to="/app/settings" className="voice-card__settings">
                  <Settings2 size={13} />
                  {elevenReady ? "Manage ElevenLabs voice" : "Add ElevenLabs voice key"}
                </Link>
              </Card>

              <Card className="dropoff-result">
                <div className="dropoff-result__head">
                  <div>
                    <span className="eyebrow">04 · Return</span>
                    <h3>Closest community drop-offs</h3>
                  </div>
                  <Badge tone="neutral">
                    <MapPin size={12} />
                    {currentUser.city}
                  </Badge>
                </div>
                <div className="dropoff-result__map" aria-hidden="true">
                  <span className="map-road map-road--one" />
                  <span className="map-road map-road--two" />
                  <span className="map-road map-road--three" />
                  <span className="map-road map-road--four" />
                  <span className="map-you">You</span>
                  {dropOffs.slice(0, 3).map((center, index) => (
                    <span key={center.id} className={cn("map-pin", `map-pin--${index + 1}`)}>
                      {index + 1}
                    </span>
                  ))}
                </div>
                <div className="dropoff-result__list">
                  {dropOffs.slice(0, 3).map((center, index) => (
                    <div className="dropoff-result__item" key={center.id}>
                      <span className={cn("dropoff-result__index", `is-${index + 1}`)}>
                        {index + 1}
                      </span>
                      <div>
                        <strong>{center.name}</strong>
                        <span>{center.address}</span>
                        <small>{center.accepts} · {center.hours}</small>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${center.name} ${center.address} ${center.city}`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="icon-link"
                        aria-label={`Directions to ${center.name}`}
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  ))}
                </div>
                <p className="dropoff-result__note">
                  <ShieldAlert size={14} />
                  Distances are approximate. Call ahead for medical or chemical containers.
                </p>
              </Card>
            </div>
          </div>

          <Card className={cn("log-bar", logged && "is-logged")}>
            {logged ? (
              <div className="log-bar__success">
                <span className="log-bar__check">
                  <Check size={22} />
                </span>
                <div>
                  <span className="eyebrow">Bottle logged · pending verification</span>
                  <h3>
                    {bottle.name} is in the loop. +{logged.points} points unlock after recycling.
                  </h3>
                  <p>
                    Logged {formatDate(logged.submittedAt)} · {currentUser.city} · Status{" "}
                    <strong>Pending pickup</strong>. The leaderboard will update only after a
                    collector marks it recycled.
                  </p>
                </div>
                <div className="log-bar__success-actions">
                  <Link to="/app/leaderboard" className="btn btn--secondary btn--md">
                    See leaderboard
                    <ArrowRight size={15} />
                  </Link>
                  <button className="btn btn--primary btn--md" onClick={resetScan} type="button">
                    <ScanLine size={16} />
                    Scan another
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="log-bar__copy">
                  <span className="eyebrow">05 · Close the loop</span>
                  <h3>Log this bottle for verification.</h3>
                  <p>
                    +{bottle.points} points are reserved for you, but they reach the leaderboard only
                    after a collector processes the bottle. It enters the admin pickup queue now.
                  </p>
                  <TextArea
                    rows={2}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional note for the collector (e.g. left at reception)"
                    aria-label="Optional note for the collector"
                  />
                </div>
                <div className="log-bar__action">
                  <div className="log-bar__score">
                    <span>On recycle</span>
                    <strong>+{bottle.points}</strong>
                    <small>Loop points</small>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={logBottle}
                    loading={logging}
                  >
                    <Sparkles size={17} />
                    {logging ? "Logging bottle…" : "Log for verification"}
                  </Button>
                  <span className="log-bar__fine">
                    One photo, one bottle. Impact verified by the collector.
                  </span>
                </div>
              </>
            )}
          </Card>
        </section>
      ) : null}

      {!result ? (
        <div className="scan-note-strip">
          <div>
            <Sparkles size={17} />
            <p>
              <strong>Why scan instead of guessing?</strong> Material mix-ups contaminate whole
              recycling batches. A 10-second scan keeps the chain clean.
            </p>
          </div>
          <Link to="/app/activity" className="text-link">
            See your previous scans <ArrowRight size={14} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
