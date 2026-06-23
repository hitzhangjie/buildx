import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SimpleLayout } from "../layout/SimpleLayout";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/~projects";

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(userName.trim(), password);
      if (rememberMe) {
        localStorage.setItem("buildx-remember-user", userName.trim());
      }
      navigate(from, { replace: true });
    } catch (err) {
      const message = (err as { message?: string }).message ?? "Invalid credentials";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SimpleLayout
      title="Sign In"
      subTitle="Enter your details to login to your account"
    >
      <div className="content mx-auto text-left" style={{ maxWidth: 400 }}>
        {error && <div className="alert alert-light-danger mb-4">{error}</div>}
        <form onSubmit={onSubmit}>
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
          <button
            className="btn btn-primary font-weight-bold"
            type="submit"
            disabled={submitting}
          >
            Sign in
          </button>
        </form>
        <div className="signup mt-4">
          <span className="opacity-50 mr-3">Don&apos;t have an account yet?</span>
          <Link to="/~signup" className="text-muted text-hover-primary font-weight-bold">
            Sign Up!
          </Link>
        </div>
      </div>
      <div className="foot pt-2 mt-5 border-top font-size-xs text-muted">
        Powered by BuildX
      </div>
    </SimpleLayout>
  );
}
