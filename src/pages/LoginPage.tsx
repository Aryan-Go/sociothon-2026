import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Leaf,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRound,
  Volume2,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { BottleGlyph } from "../components/BottleGlyph";
import {
  Badge,
  Button,
  Field,
  Logo,
  TextInput,
  cn,
} from "../components/ui";
import { ENV, hasEnvElevenLabs, hasEnvGemini } from "../lib/env";
import { ROLE_META } from "../navigation";
import { useAppStore } from "../store/AppStore";
import type { Role } from "../types";

const roles: {
  role: Role;
  label: string;
  description: string;
  icon: typeof UserRound;
  feature: string;
}[] = [
  {
    role: "user",
    label: "Member",
    description: "Scan bottles, learn disposal, earn verified points.",
    icon: UserRound,
    feature: "Your circular passport",
  },
  {
    role: "admin",
    label: "Network admin",
    description: "Assign pickups, manage partners, read the network.",
    icon: ShieldCheck,
    feature: "Operations control room",
  },
  {
    role: "collector",
    label: "Collector",
    description: "Receive material, process it and log recycled output.",
    icon: Truck,
    feature: "Partner facility desk",
  },
];

export function LoginPage() {
  const { session, signIn } = useAuth();
  const { state, setRole, setCurrentCollector, setCurrentUser } = useAppStore();
  const navigate = useNavigate();
  const [role, setLoginRole] = useState<Role>("user");
  const [email, setEmail] = useState(ENV.auth.member.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) {
    return <Navigate to={ROLE_META[session.role].dashboard} replace />;
  }

  const credentials =
    role === "admin"
      ? ENV.auth.admin
      : role === "collector"
        ? ENV.auth.collector
        : ENV.auth.member;
  const selectedRole = roles.find((item) => item.role === role)!;
  const SelectedRoleIcon = selectedRole.icon;

  const selectRole = (nextRole: Role) => {
    setLoginRole(nextRole);
    setError("");
    setPassword("");
    setEmail(
      nextRole === "admin"
        ? ENV.auth.admin.email
        : nextRole === "collector"
          ? ENV.auth.collector.email
          : ENV.auth.member.email,
    );
  };

  const fillDemo = () => {
    setEmail(credentials.email);
    setPassword(credentials.password);
    setError("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = signIn(role, email, password);
    if (!result.ok || !result.session) {
      setError(result.error ?? "Sign in failed.");
      setBusy(false);
      return;
    }

    setRole(role);
    if (role === "collector") {
      setCurrentCollector(result.session.collectorId ?? ENV.auth.collector.collectorId);
    }
    if (role === "user" && state) {
      const member =
        state.users.find(
          (user) => user.email.toLowerCase() === result.session!.email.toLowerCase(),
        ) ?? state.users.find((user) => user.id === "u-1");
      if (member) setCurrentUser(member.id);
    }
    navigate(ROLE_META[role].dashboard, { replace: true });
  };

  return (
    <div className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-panel__top">
          <Logo />
          <Badge tone="lime" dot>
            Circular network
          </Badge>
        </div>

        <div className="login-brand-copy">
          <span className="eyebrow">Bottle to next life</span>
          <h1>
            Every bottle has a <em>next life.</em>
          </h1>
          <p>
            Sign in to move bottles through a transparent loop: verified classification,
            community collection, partner processing and measurable impact.
          </p>
        </div>

        <div className="login-orbit" aria-hidden="true">
          <span className="login-orbit__ring login-orbit__ring--a" />
          <span className="login-orbit__ring login-orbit__ring--b" />
          <span className="login-orbit__ring login-orbit__ring--c" />
          <div className="login-orbit__bottle">
            <BottleGlyph bottleTypeId="pet-water" size={94} />
          </div>
          <span className="login-orbit__chip login-orbit__chip--a">
            <ScanLine size={13} /> Gemini vision
          </span>
          <span className="login-orbit__chip login-orbit__chip--b">
            <Volume2 size={13} /> Voice guidance
          </span>
          <span className="login-orbit__chip login-orbit__chip--c">
            <Leaf size={13} /> Verified impact
          </span>
        </div>

        <div className="login-brand-stats">
          <div>
            <strong>{state?.submissions.length ?? 190}</strong>
            <span>bottles in demo ledger</span>
          </div>
          <div>
            <strong>{state?.collectors.length ?? 5}</strong>
            <span>collector partners</span>
          </div>
          <div>
            <strong>{state?.users.length ?? 12}</strong>
            <span>community members</span>
          </div>
        </div>

        <div className="login-brand-footer">
          <span>
            <CheckCircle2 size={13} /> One shared local ledger
          </span>
          <span>Loopr · Sociothon 2026</span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-head">
            <span className="eyebrow">
              <LockKeyhole size={12} /> Secure workspace access
            </span>
            <h2>Welcome back.</h2>
            <p>
              Choose your workspace. Member accounts use the configured demo identity; admin
              and collector credentials are read from your environment file.
            </p>
          </div>

          <div className="login-role-grid" role="radiogroup" aria-label="Choose account type">
            {roles.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.role}
                  type="button"
                  className={cn("login-role", role === item.role && "is-active")}
                  onClick={() => selectRole(item.role)}
                  role="radio"
                  aria-checked={role === item.role}
                >
                  <span className="login-role__icon">
                    <Icon size={17} />
                  </span>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                  {role === item.role ? <span className="login-role__check">Selected</span> : null}
                </button>
              );
            })}
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form__header">
              <div>
                <span className="login-form__context">{selectedRole.feature}</span>
                <h3>Sign in as {selectedRole.label.toLowerCase()}</h3>
              </div>
              <span className="login-form__role-icon">
                <SelectedRoleIcon size={18} />
              </span>
            </div>

            <Field label="Email address">
              <div className="login-input">
                <span className="login-input__icon">@</span>
                <TextInput
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@loopr.earth"
                  autoComplete="username"
                  data-autofocus
                  required
                />
              </div>
            </Field>

            <Field label="Password">
              <div className="login-input">
                <span className="login-input__icon">
                  <KeyRound size={14} />
                </span>
                <TextInput
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-input__reveal"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            {error ? (
              <div className="login-error" role="alert">
                <LockKeyhole size={15} />
                <span>{error}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="login-submit"
              loading={busy}
            >
              Sign in to {selectedRole.label}
              <ArrowRight size={16} />
            </Button>

            {ENV.showDemoCredentials ? (
              <div className="login-demo">
                <div className="login-demo__head">
                  <span>
                    <Sparkles size={13} /> Demo access
                  </span>
                  <button type="button" onClick={fillDemo}>
                    Use these details
                  </button>
                </div>
                <div className="login-demo__credentials">
                  <div>
                    <span>Email</span>
                    <code>{credentials.email}</code>
                  </div>
                  <div>
                    <span>Password</span>
                    <code>{credentials.password}</code>
                  </div>
                </div>
                <p>Demo credentials are configured in `.env` and can be changed before a demo.</p>
              </div>
            ) : null}
          </form>

          <div className="login-integrations">
            <div>
              <span className={cn("login-integration-dot", hasEnvGemini() && "is-ready")} />
              <BrainCircuit size={14} />
              <span>Gemini vision</span>
              <strong>{hasEnvGemini() ? "Ready" : "Demo mode"}</strong>
            </div>
            <div>
              <span className={cn("login-integration-dot", hasEnvElevenLabs() && "is-ready")} />
              <Volume2 size={14} />
              <span>ElevenLabs voice</span>
              <strong>{hasEnvElevenLabs() ? "Ready" : "Browser voice"}</strong>
            </div>
            <div>
              <span className="login-integration-dot is-ready" />
              <Database size={14} />
              <span>Local ledger</span>
              <strong>IndexedDB</strong>
            </div>
          </div>

          <p className="login-legal">
            This demo stores workspace activity in your browser. Credentials live in the Vite
            environment and should be replaced before a public deployment.
          </p>
        </div>
      </section>
    </div>
  );
}
