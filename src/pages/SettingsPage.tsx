import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  Database,
  Download,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Play,
  RefreshCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Volume2,
  Waves,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Modal,
  PageHeader,
  SectionHeader,
  SegmentedControl,
  SelectInput,
  TextInput,
  cn,
} from "../components/ui";
import { CITIES } from "../data/bottles";
import { ENV, hasEnvElevenLabs, hasEnvGemini } from "../lib/env";
import { formatNumber } from "../lib/format";
import {
  isElevenLabsReady,
  isGeminiReady,
  resolveGemini,
} from "../lib/integrations";
import {
  speakWithBrowser,
  stopBrowserSpeech,
  synthesizeNarration,
} from "../lib/voice";
import { useAppStore } from "../store/AppStore";

type Tab = "profile" | "integrations" | "data";

const sampleNarration =
  "Hi, this is your Loopr circularity guide. Add an ElevenLabs key to turn bottle disposal into a calm, useful voice briefing.";

export function SettingsPage() {
  const {
    state,
    currentUser,
    currentCollector,
    updateSettings,
    updateCurrentUser,
    resetDemo,
    notify,
  } = useAppStore();
  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState(currentUser?.name ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [city, setCity] = useState(currentUser?.city ?? "Bengaluru");
  const [geminiKey, setGeminiKey] = useState(state?.settings.geminiApiKey ?? "");
  const [geminiModel, setGeminiModel] = useState(
    state?.settings.geminiModel ?? ENV.gemini.model,
  );
  const [elevenKey, setElevenKey] = useState(state?.settings.elevenLabsApiKey ?? "");
  const [voiceId, setVoiceId] = useState(
    state?.settings.elevenLabsVoiceId ?? ENV.elevenLabs.voiceId,
  );
  const [proxyUrl, setProxyUrl] = useState(state?.settings.elevenLabsProxyUrl ?? "");
  const [reducedMotion, setReducedMotion] = useState(
    state?.settings.reducedMotion ?? false,
  );
  const [emailDigest, setEmailDigest] = useState(state?.settings.emailDigest ?? true);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showElevenKey, setShowElevenKey] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!state || !currentUser) return;
    setName(currentUser.name);
    setEmail(currentUser.email);
    setCity(currentUser.city);
    setGeminiKey(state.settings.geminiApiKey);
    setGeminiModel(state.settings.geminiModel || ENV.gemini.model);
    setElevenKey(state.settings.elevenLabsApiKey);
    setVoiceId(state.settings.elevenLabsVoiceId);
    setProxyUrl(state.settings.elevenLabsProxyUrl);
    setReducedMotion(state.settings.reducedMotion);
    setEmailDigest(state.settings.emailDigest);
  }, [
    state?.currentUserId,
    state?.currentRole,
    state?.currentCollectorId,
    state?.settings,
    currentUser?.name,
    currentUser?.email,
    currentUser?.city,
  ]);

  useEffect(() => {
    return () => {
      stopBrowserSpeech();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  if (!state || !currentUser || !currentCollector) return null;
  const role = state.currentRole;
  const roleName =
    role === "admin"
      ? ENV.auth.admin.name
      : role === "collector"
        ? currentCollector.manager
        : currentUser.name;
  const geminiReady = isGeminiReady(state.settings) || Boolean(geminiKey.trim());
  const geminiConfig = resolveGemini({
    ...state.settings,
    geminiApiKey: geminiKey,
    geminiModel,
  });
  const elevenReady = isElevenLabsReady(state.settings) || Boolean(elevenKey.trim() || proxyUrl.trim());
  const roleSubtitle =
    role === "admin"
      ? "Network lead · Loopr India"
      : role === "collector"
        ? `${currentCollector.name} · ${currentCollector.city}`
        : `${currentUser.city} · ${currentUser.tier}`;

  const saveAll = () => {
    updateSettings({
      geminiApiKey: geminiKey.trim(),
      geminiModel: geminiModel.trim() || ENV.gemini.model,
      elevenLabsApiKey: elevenKey.trim(),
      elevenLabsVoiceId: voiceId.trim(),
      elevenLabsProxyUrl: proxyUrl.trim(),
      reducedMotion,
      emailDigest,
    });
    if (role === "user") {
      updateCurrentUser({
        name: name.trim() || currentUser.name,
        email: email.trim() || currentUser.email,
        city,
      });
    }
    setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }));
  };

  const testVoice = async () => {
    setTestingVoice(true);
    stopBrowserSpeech();
    if (audioRef.current) audioRef.current.pause();
    const settings = {
      ...state.settings,
      elevenLabsApiKey: elevenKey.trim(),
      elevenLabsVoiceId: voiceId.trim(),
      elevenLabsProxyUrl: proxyUrl.trim(),
    };
    try {
      const url = await synthesizeNarration(sampleNarration, settings);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
      notify("ElevenLabs test voice is playing.");
    } catch (error) {
      if (error instanceof Error && error.message === "MISSING_KEY") {
        speakWithBrowser(sampleNarration);
        notify(
          "No ElevenLabs key yet, so the browser voice is previewing instead. Add a key for studio audio.",
          "info",
        );
      } else {
        try {
          speakWithBrowser(sampleNarration);
          notify(
            error instanceof Error
              ? `ElevenLabs test failed: ${error.message}. Browser voice preview is playing.`
              : "ElevenLabs failed. Browser voice preview is playing.",
            "error",
          );
        } catch {
          notify("Audio playback is not available in this browser.", "error");
        }
      }
    } finally {
      setTestingVoice(false);
    }
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `loopr-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Workspace backup exported as JSON.");
  };

  const confirmReset = async () => {
    setResetOpen(false);
    await resetDemo();
  };

  const storageSize = (() => {
    const json = JSON.stringify(state);
    const bytes = new Blob([json]).size;
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  })();

  return (
    <div className="page settings-page">
      <PageHeader
        eyebrow={
          <span className="eyebrow-row">
            <Settings2 size={13} /> Workspace settings
          </span>
        }
        title={
          <>
            Make Loopr <span className="serif-accent">yours.</span>
          </>
        }
        description="Connect the models that power classification and narration, tune your workspace, and own all of your local data."
        actions={
          <>
            {savedAt ? (
              <span className="saved-indicator">
                <Check size={14} /> Saved at {savedAt}
              </span>
            ) : null}
            <Button variant="primary" size="md" icon={Save} onClick={saveAll}>
              Save changes
            </Button>
          </>
        }
      />

      <div className="settings-layout">
        <aside className="settings-side">
          <Card className="settings-profile">
            <Avatar
              name={roleName}
              hue={
                role === "collector"
                  ? currentCollector.avatarHue
                  : role === "admin"
                    ? 150
                    : currentUser.avatarHue
              }
              size={58}
              square
            />
            <h2>{roleName}</h2>
            <p>{roleSubtitle}</p>
            <Badge tone={role === "admin" ? "dark" : "lime"} dot>
              {role === "admin" ? "Network admin" : role === "collector" ? "Verified collector" : "Loopr member"}
            </Badge>
            <div className="settings-profile__meta">
              <span>
                <Mail size={13} />
                {role === "collector" ? currentCollector.email : role === "admin" ? ENV.auth.admin.email : currentUser.email}
              </span>
              <span>
                <MapPin size={13} />
                {role === "collector" ? currentCollector.city : role === "admin" ? "Bengaluru" : currentUser.city}
              </span>
            </div>
          </Card>

          <nav className="settings-nav" aria-label="Settings sections">
            {[
              { value: "profile", label: "Profile & workspace", icon: UserRound },
              { value: "integrations", label: "Model integrations", icon: BrainCircuit },
              { value: "data", label: "Data & privacy", icon: Database },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  className={cn("settings-nav__item", tab === item.value && "is-active")}
                  onClick={() => setTab(item.value as Tab)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  <ArrowRight size={14} />
                </button>
              );
            })}
          </nav>

          <Card className="settings-help">
            <span className="settings-help__icon">
              <Leaf size={17} />
            </span>
            <h3>All data stays local</h3>
            <p>
              Loopr stores this demo workspace in IndexedDB on this browser. Nothing is sent to a
              server except the images you choose to classify and the narration text sent to your
              configured voice API.
            </p>
          </Card>
        </aside>

        <div className="settings-main">
          {tab === "profile" ? (
            <>
              <Card>
                <SectionHeader
                  title="Identity"
                  subtitle={
                    role === "user"
                      ? "This is how you appear on the leaderboard and drop-off history."
                      : "Workspace identities are managed from the network admin."
                  }
                  action={<Badge tone="neutral">{role === "user" ? "Editable" : "Read only"}</Badge>}
                />
                <div className="form-grid form-grid--two">
                  <Field label="Full name">
                    <TextInput
                      value={role === "user" ? name : roleName}
                      onChange={(event) => setName(event.target.value)}
                      disabled={role !== "user"}
                    />
                  </Field>
                  <Field label="Email">
                    <TextInput
                      type="email"
                      value={role === "user" ? email : role === "collector" ? currentCollector.email : ENV.auth.admin.email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={role !== "user"}
                    />
                  </Field>
                  <Field
                    label="Home city"
                    hint="Used to surface local drop-off points and community guidance."
                  >
                    <SelectInput
                      value={role === "user" ? city : role === "collector" ? currentCollector.city : "Bengaluru"}
                      onChange={(event) => setCity(event.target.value)}
                      disabled={role !== "user"}
                    >
                      {CITIES.map((cityName) => (
                        <option key={cityName} value={cityName}>
                          {cityName}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Point balance">
                    <TextInput
                      value={
                        role === "user"
                          ? `${formatNumber(currentUser.points)} points`
                          : role === "collector"
                            ? currentCollector.focus
                            : "Network control"
                      }
                      disabled
                    />
                  </Field>
                </div>
                {role === "user" ? (
                  <div className="settings-profile-note">
                    <UserRound size={15} />
                    <p>
                      Your city determines the nearest verified drop-offs shown after every scan.
                      Changing it does not rewrite past submission locations.
                    </p>
                  </div>
                ) : (
                  <div className="settings-profile-note">
                    <ShieldCheck size={15} />
                    <p>
                      {role === "admin"
                        ? "Admin identity is provisioned by the network. Use the topbar workspace switcher to inspect the member or collector view."
                        : "Collector details and rates are managed by the network admin in the partner desk."}
                    </p>
                  </div>
                )}
              </Card>

              <Card>
                <SectionHeader
                  title="Preferences"
                  subtitle="Control the pace and feedback of your workspace."
                />
                <div className="preference-list">
                  <div className="preference-row">
                    <div>
                      <strong>Reduce motion</strong>
                      <p>Remove entrance and hover motion while keeping state changes clear.</p>
                    </div>
                    <button
                      className={cn("switch", reducedMotion && "is-on")}
                      role="switch"
                      aria-checked={reducedMotion}
                      onClick={() => setReducedMotion((current) => !current)}
                    >
                      <span />
                    </button>
                  </div>
                  <div className="preference-row">
                    <div>
                      <strong>Weekly impact digest</strong>
                      <p>Show a summary email prompt each Monday with your bottle count and rank.</p>
                    </div>
                    <button
                      className={cn("switch", emailDigest && "is-on")}
                      role="switch"
                      aria-checked={emailDigest}
                      onClick={() => setEmailDigest((current) => !current)}
                    >
                      <span />
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="settings-role-card">
                <div>
                  <span className="eyebrow">Demo workspace</span>
                  <h3>Three views, one circular network.</h3>
                  <p>
                    Switch between member, admin and collector from the topbar. Every action updates
                    the same local data, so assignments made as admin appear instantly in the
                    collector intake queue.
                  </p>
                </div>
                <div className="settings-role-card__actions">
                  <Link to="/app/user" className="btn btn--secondary btn--sm">
                    Member view
                  </Link>
                  <Link to="/app/admin" className="btn btn--secondary btn--sm">
                    Admin view
                  </Link>
                  <Link to="/app/collector" className="btn btn--secondary btn--sm">
                    Collector view
                  </Link>
                </div>
              </Card>
            </>
          ) : null}

          {tab === "integrations" ? (
            <>
              <Card className="integration-card">
                <div className="integration-card__head">
                  <span className="integration-card__icon">
                    <BrainCircuit size={20} />
                  </span>
                  <div>
                    <div className="integration-card__title">
                      <h2>Gemini vision classifier</h2>
                      <Badge tone={geminiReady ? "green" : "amber"} dot>
                        {geminiReady
                          ? hasEnvGemini() && !geminiKey.trim()
                            ? "Env key connected"
                            : "Vision connected"
                          : "Demo classifier"}
                      </Badge>
                    </div>
                    <p>
                      Google Gemini reads each bottle photo and returns a strict bottle class,
                      confidence and visual reason. The prompt is built in code and mapped onto
                      Loopr's seven-material taxonomy.
                    </p>
                  </div>
                </div>
                <div className="form-grid form-grid--two">
                  <Field
                    label="Gemini API key override"
                    hint={
                      hasEnvGemini()
                        ? "VITE_GEMINI_API_KEY is loaded from .env. Leave blank to keep using it, or enter a workspace override."
                        : "Add VITE_GEMINI_API_KEY to .env or paste a key here."
                    }
                  >
                    <div className="secret-field">
                      <KeyRound size={15} />
                      <TextInput
                        type={showGeminiKey ? "text" : "password"}
                        value={geminiKey}
                        onChange={(event) => setGeminiKey(event.target.value)}
                        placeholder={hasEnvGemini() ? "Using .env key" : "AIza…"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey((current) => !current)}
                        aria-label={showGeminiKey ? "Hide Gemini key" : "Show Gemini key"}
                      >
                        {showGeminiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Field>
                  <Field
                    label="Gemini model"
                    hint="Use a vision-capable model available to your API key."
                  >
                    <TextInput
                      value={geminiModel}
                      onChange={(event) => setGeminiModel(event.target.value)}
                      placeholder={ENV.gemini.model}
                    />
                  </Field>
                  <Field
                    label="Model response contract"
                    hint="The classifier retries mapping if Gemini slips outside the schema."
                    className="span-2"
                  >
                    <div className="code-block">
                      <code>{`{ "bottleTypeId": "pet-water", "confidence": 0.94, "reason": "Clear PET body…" }`}</code>
                    </div>
                  </Field>
                </div>
                <div className="integration-tips">
                  <AlertTriangle size={15} />
                  <div>
                    <strong>Gemini runs from this browser using your environment key.</strong>
                    <p>
                      Enable image generation access on the key and choose a vision model. For a
                      public deployment, route the request through a server and keep the key out of
                      the client bundle. Without a key, the local demo classifier keeps the full flow
                      testable.
                    </p>
                  </div>
                  <Link to="/app/scan" className="text-link">
                    Test in scanner <ArrowRight size={14} />
                  </Link>
                </div>
              </Card>

              <Card className="integration-card">
                <div className="integration-card__head">
                  <span className="integration-card__icon">
                    <Waves size={20} />
                  </span>
                  <div>
                    <div className="integration-card__title">
                      <h2>ElevenLabs narration</h2>
                      <Badge tone={elevenReady ? "green" : "amber"} dot>
                        {elevenReady ? "Voice connected" : "Browser preview"}
                      </Badge>
                    </div>
                    <p>
                      After a scan, Loopr writes a bottle-specific disposal briefing and asks
                      ElevenLabs to narrate it. Without a key, the browser's speech engine keeps the
                      experience complete.
                    </p>
                  </div>
                </div>
                <div className="form-grid form-grid--two">
                  <Field
                    label="ElevenLabs API key override"
                    hint={
                      hasEnvElevenLabs()
                        ? "VITE_ELEVENLABS_API_KEY is loaded from .env. Leave blank to use it."
                        : "Add VITE_ELEVENLABS_API_KEY to .env or paste a workspace key here."
                    }
                  >
                    <div className="secret-field">
                      <KeyRound size={15} />
                      <TextInput
                        type={showElevenKey ? "text" : "password"}
                        value={elevenKey}
                        onChange={(event) => setElevenKey(event.target.value)}
                        placeholder="sk_…"
                      />
                      <button
                        type="button"
                        onClick={() => setShowElevenKey((current) => !current)}
                        aria-label={showElevenKey ? "Hide ElevenLabs key" : "Show ElevenLabs key"}
                      >
                        {showElevenKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Field>
                  <Field
                    label="Voice ID"
                    hint={
                      hasEnvElevenLabs()
                        ? "Inherited from VITE_ELEVENLABS_VOICE_ID unless overridden here."
                        : "Default is Rachel (21m00Tcm4TlvDq8ikWAM)."
                    }
                  >
                    <TextInput
                      value={voiceId}
                      onChange={(event) => setVoiceId(event.target.value)}
                      placeholder="21m00Tcm4TlvDq8ikWAM"
                    />
                  </Field>
                  <Field
                    label="Voice proxy URL (optional)"
                    hint="Use a small server if your browser blocks direct ElevenLabs requests."
                    className="span-2"
                  >
                    <TextInput
                      type="url"
                      value={proxyUrl}
                      onChange={(event) => setProxyUrl(event.target.value)}
                      placeholder="https://your-proxy.example.com/tts"
                    />
                  </Field>
                </div>
                <div className="voice-test">
                  <div>
                    <span className="eyebrow">Voice check</span>
                    <p>
                      “{sampleNarration}”
                    </p>
                  </div>
                  <Button
                    variant="dark"
                    size="md"
                    onClick={testVoice}
                    loading={testingVoice}
                  >
                    {testingVoice ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}
                    {testingVoice ? "Generating…" : "Play test voice"}
                  </Button>
                </div>
                <div className="integration-tips">
                  <LockKeyhole size={15} />
                  <div>
                    <strong>Use a proxy before production.</strong>
                    <p>
                      Browser-exposed API keys are visible to anyone with access to this build. For
                      a public deployment, move ElevenLabs and Gemini calls behind a small server and
                      set the proxy URL above.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="integration-status-card">
                <SectionHeader
                  title="Connection status"
                  subtitle="What is currently powering the experience."
                  action={<Badge tone="neutral">Local demo</Badge>}
                />
                <div className="connection-grid">
                  <div>
                    <span className="connection-icon is-green">
                      <Check size={15} />
                    </span>
                    <div>
                      <strong>Impact ledger</strong>
                      <span>IndexedDB · connected</span>
                    </div>
                    <Badge tone="green" dot>Active</Badge>
                  </div>
                  <div>
                    <span className={cn("connection-icon", geminiReady ? "is-green" : "is-amber")}>
                      <BrainCircuit size={15} />
                    </span>
                    <div>
                      <strong>Gemini vision</strong>
                      <span>
                        {geminiReady
                          ? `${geminiConfig.model} · image classification`
                          : "Falling back to demo model"}
                      </span>
                    </div>
                    <Badge tone={geminiReady ? "green" : "amber"} dot>
                      {geminiReady ? "Connected" : "Demo"}
                    </Badge>
                  </div>
                  <div>
                    <span className={cn("connection-icon", elevenReady ? "is-green" : "is-amber")}>
                      <Volume2 size={15} />
                    </span>
                    <div>
                      <strong>ElevenLabs voice</strong>
                      <span>
                        {elevenReady
                          ? "Multilingual narration enabled"
                          : "Browser speech preview"}
                      </span>
                    </div>
                    <Badge tone={elevenReady ? "green" : "amber"} dot>
                      {elevenReady ? "Connected" : "Preview"}
                    </Badge>
                  </div>
                </div>
              </Card>
            </>
          ) : null}

          {tab === "data" ? (
            <>
              <Card className="storage-card">
                <div className="storage-card__head">
                  <span className="storage-card__icon">
                    <HardDrive size={22} />
                  </span>
                  <div>
                    <span className="eyebrow">Browser storage</span>
                    <h2>Your workspace lives on this device.</h2>
                    <p>
                      Loopr uses IndexedDB so the demo works without Postgres, a backend, or an
                      account. Clearing your browser data will remove this workspace.
                    </p>
                  </div>
                  <Badge tone="green" dot>
                    {storageSize}
                  </Badge>
                </div>
                <div className="storage-grid">
                  <div>
                    <span>Bottle submissions</span>
                    <strong>{formatNumber(state.submissions.length)}</strong>
                  </div>
                  <div>
                    <span>Members</span>
                    <strong>{formatNumber(state.users.length)}</strong>
                  </div>
                  <div>
                    <span>Collector partners</span>
                    <strong>{formatNumber(state.collectors.length)}</strong>
                  </div>
                  <div>
                    <span>Recycled products</span>
                    <strong>{formatNumber(state.products.length)}</strong>
                  </div>
                  <div>
                    <span>Ledger entries</span>
                    <strong>{formatNumber(state.transactions.length)}</strong>
                  </div>
                  <div>
                    <span>Storage engine</span>
                    <strong>IndexedDB</strong>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHeader
                  title="Backup & reset"
                  subtitle="Take the workspace with you, or return to the seeded demo."
                />
                <div className="data-actions">
                  <div className="data-action">
                    <span className="data-action__icon">
                      <Download size={18} />
                    </span>
                    <div>
                      <strong>Export workspace</strong>
                      <p>Download every member, submission, product and ledger entry as JSON.</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={exportBackup}>
                      Export
                    </Button>
                  </div>
                  <div className="data-action data-action--danger">
                    <span className="data-action__icon">
                      <RefreshCcw size={18} />
                    </span>
                    <div>
                      <strong>Reset demo data</strong>
                      <p>Restore the original seeded network. Your local changes will be erased.</p>
                    </div>
                    <Button variant="danger" size="sm" icon={Trash2} onClick={() => setResetOpen(true)}>
                      Reset
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="privacy-card">
                <div className="privacy-card__icon">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <span className="eyebrow">Privacy by default</span>
                  <h3>What leaves your browser?</h3>
                  <p>
                    Only the bottle photo you explicitly send to the Gemini API, and the narration
                    text sent to ElevenLabs or your proxy. Demo classification and browser speech
                    stay entirely local. This build has no analytics, no tracking pixel and no
                    remote database.
                  </p>
                </div>
                <Link to="/app/scan" className="btn btn--dark btn--md">
                  Try a local scan
                  <ArrowRight size={15} />
                </Link>
              </Card>
            </>
          ) : null}

          <div className="settings-save-bar">
            <div>
              <Sparkles size={15} />
              <span>Changes are stored in this browser only.</span>
            </div>
            <Button variant="primary" size="md" icon={Save} onClick={saveAll}>
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset the demo workspace?"
        description="This cannot be undone from inside the app."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setResetOpen(false)}>
              Keep my data
            </Button>
            <Button variant="danger" size="md" icon={Trash2} onClick={confirmReset}>
              Reset everything
            </Button>
          </>
        }
      >
        <div className="modal-note modal-note--danger">
          <AlertTriangle size={16} />
          <p>
            All submissions, assignments, products, points changes and settings will return to the
            original seed. This is useful before a fresh demo or screenshot.
          </p>
        </div>
      </Modal>
    </div>
  );
}
