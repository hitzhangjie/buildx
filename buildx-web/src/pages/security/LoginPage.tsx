import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { fetchBrandingSetting } from "../../api/branding";
import { fetchSecuritySetting } from "../../api/settings";
import { fetchSsoProviders, type SsoProvider } from "../../api/sso";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { useAuth } from "../../context/AuthContext";
import { useSimplePage } from "../../hooks/useSimplePage";
import { SimpleLayout } from "../../layout/SimpleLayout";

type LoginPhase = "password" | "passcode" | "recovery";

const SUBTITLE_PASSWORD = "Enter your details to login to your account";
const SUBTITLE_PASSCODE =
  "Two-factor authentication is enabled. Please input passcode displayed on your TOTP authenticator. If you encounter problems, make sure time of OneDev server and your device running TOTP authenticator is in sync";
const SUBTITLE_RECOVERY =
  "Please input one of your recovery codes saved when enable two-factor authentication";

/** Mirrors LoginPage.html passwordCheckFrag */
function PasswordCheckFrag({
  enableSelfRegister,
  ssoProviders,
  onSubmit,
  submitting,
  errors,
}: {
  enableSelfRegister: boolean;
  ssoProviders: SsoProvider[];
  onSubmit: (userName: string, password: string, rememberMe: boolean) => void;
  submitting: boolean;
  errors: string[];
}) {
  const [userName, setUserName] = useState(() => localStorage.getItem("buildx-remember-user") ?? "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(userName.trim(), password, rememberMe);
  }

  return (
    <>
      <form method="post" onSubmit={handleSubmit}>
        <FormFeedbackPanel messages={errors} />
        <div className="form-group">
          <input
            autoComplete="username"
            type="text"
            className="form-control"
            placeholder="Login name or email address"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <input
            autoComplete="current-password"
            type="password"
            className="form-control"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group d-flex flex-wrap justify-content-between">
          <div className="checkbox-inline">
            <label className="checkbox text-muted">
              <input
                id="rememberMe"
                type="checkbox"
                className="form-check-input"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember Me
            </label>
          </div>
          <Link to="/~reset-password/stub" className="text-muted text-hover-primary">
            Forgot Password?
          </Link>
        </div>
        <button className="btn btn-primary font-weight-bold" type="submit" disabled={submitting}>
          Sign in
        </button>
      </form>
      {enableSelfRegister && (
        <div className="signup">
          <span className="opacity-50 mr-3">Don&apos;t have an account yet?</span>{" "}
          <Link to="/~signup" className="text-muted text-hover-primary font-weight-bold">
            Sign Up!
          </Link>
        </div>
      )}
      {ssoProviders.length > 0 && (
        <div className="sso">
          {ssoProviders.map((provider) => (
            <a
              key={provider.name}
              href={provider.loginUrl}
              className="btn btn-light btn-block mb-3"
            >
              <img src={provider.buttonImageUrl} alt="" className="mr-3" width={24} height={24} />
              <span>Login with {provider.name}</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

/** Mirrors LoginPage.html passcodeVerifyFrag */
function PasscodeVerifyFrag({
  errors,
  submitting,
  onSubmit,
  onVerifyRecoveryCode,
}: {
  errors: string[];
  submitting: boolean;
  onSubmit: (passcode: string) => void;
  onVerifyRecoveryCode: () => void;
}) {
  const [passcode, setPasscode] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(passcode.trim());
  }

  return (
    <>
      <form method="post" onSubmit={handleSubmit}>
        <FormFeedbackPanel messages={errors} />
        <div className="form-group">
          <input
            autoComplete="one-time-code"
            type="text"
            className="form-control"
            placeholder="6-digits passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary font-weight-bold" type="submit" disabled={submitting}>
          Verify
        </button>
      </form>
      <div className="mt-5 font-size-sm text-muted">
        <button
          type="button"
          className="btn btn-link p-0 align-baseline text-muted"
          onClick={onVerifyRecoveryCode}
        >
          Verify by recovery code
        </button>{" "}
        if you cannot access your TOTP authenticator
      </div>
    </>
  );
}

/** Mirrors LoginPage.html recoveryCodeVerifyFrag */
function RecoveryCodeVerifyFrag({
  errors,
  submitting,
  onSubmit,
}: {
  errors: string[];
  submitting: boolean;
  onSubmit: (recoveryCode: string) => void;
}) {
  const [recoveryCode, setRecoveryCode] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(recoveryCode.trim());
  }

  return (
    <form method="post" onSubmit={handleSubmit}>
      <FormFeedbackPanel messages={errors} />
      <div className="form-group">
        <input
          type="text"
          className="form-control"
          placeholder="Recovery code"
          value={recoveryCode}
          onChange={(e) => setRecoveryCode(e.target.value)}
          required
        />
      </div>
      <button className="btn btn-primary font-weight-bold" type="submit" disabled={submitting}>
        Verify
      </button>
    </form>
  );
}

/**
 * Mirrors OneDev LoginPage (SimplePage + LoginPage.html).
 * Reference: references/onedev/.../web/page/security/LoginPage.html
 */
export function LoginPage() {
  useSimplePage("LoginPage");

  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [brandName, setBrandName] = useState("BuildX");
  const [enableSelfRegister, setEnableSelfRegister] = useState(false);
  const [ssoProviders, setSsoProviders] = useState<SsoProvider[]>([]);
  const [phase, setPhase] = useState<LoginPhase>("password");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const subTitle = useMemo(() => {
    if (phase === "passcode") {
      return SUBTITLE_PASSCODE;
    }
    if (phase === "recovery") {
      return SUBTITLE_RECOVERY;
    }
    return SUBTITLE_PASSWORD;
  }, [phase]);

  const from = (location.state as { from?: string } | null)?.from ?? "/~projects";
  const initialError = (location.state as { error?: string } | null)?.error;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [branding, security, sso] = await Promise.all([
        fetchBrandingSetting(),
        fetchSecuritySetting(),
        fetchSsoProviders(),
      ]);
      if (cancelled) {
        return;
      }
      setBrandName(branding.name);
      setEnableSelfRegister(security.enableSelfRegister);
      setSsoProviders(sso);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialError) {
      setErrors([initialError]);
    }
  }, [initialError]);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const title = `Sign In To ${brandName}`;

  async function handlePasswordLogin(userName: string, password: string, rememberMe: boolean) {
    setErrors([]);
    setSubmitting(true);
    try {
      await login(userName, password, rememberMe);
      if (rememberMe) {
        localStorage.setItem("buildx-remember-user", userName);
      }
      navigate(from, { replace: true });
    } catch (err) {
      const message = (err as { message?: string }).message ?? "Invalid credentials";
      setErrors([message === "Unauthorized" ? "Invalid credentials" : message]);
    } finally {
      setSubmitting(false);
    }
  }

  function handlePasscodeVerify(_passcode: string) {
    setErrors(["Passcode verification failed"]);
  }

  function handleRecoveryVerify(_recoveryCode: string) {
    setErrors(["Recovery code verification failed"]);
  }

  function showRecoveryPhase() {
    setPhase("recovery");
    setErrors([]);
  }

  let content;
  if (phase === "password") {
    content = (
      <PasswordCheckFrag
        enableSelfRegister={enableSelfRegister}
        ssoProviders={ssoProviders}
        onSubmit={handlePasswordLogin}
        submitting={submitting}
        errors={errors}
      />
    );
  } else if (phase === "passcode") {
    content = (
      <PasscodeVerifyFrag
        errors={errors}
        submitting={submitting}
        onSubmit={handlePasscodeVerify}
        onVerifyRecoveryCode={showRecoveryPhase}
      />
    );
  } else {
    content = (
      <RecoveryCodeVerifyFrag
        errors={errors}
        submitting={submitting}
        onSubmit={handleRecoveryVerify}
      />
    );
  }

  return (
    <SimpleLayout title={title} subTitle={subTitle}>
      <div>{content}</div>
      <div className="foot pt-2 mt-5 border-top font-size-xs text-muted">
        Powered by{" "}
        <a href="https://onedev.io" className="text-muted text-hover-primary">
          OneDev
        </a>
      </div>
    </SimpleLayout>
  );
}