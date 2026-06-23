import { type FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signUp } from "../api/users";
import { SimpleLayout } from "../layout/SimpleLayout";

export function SignUpPage() {
  const { user, login } = useAuth();
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (user && !done) {
    return <Navigate to="/~projects" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      await login(name.trim(), password);
      setDone(true);
    } catch (err) {
      setError((err as { message?: string }).message ?? "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <Navigate to="/~projects" replace />;
  }

  return (
    <SimpleLayout
      title="Sign Up"
      subTitle="Enter your details to create your account"
    >
      <div className="content mx-auto text-left" style={{ maxWidth: 400 }}>
        {error && <div className="alert alert-light-danger mb-4">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="font-weight-bold font-size-sm">Login Name</label>
            <input
              autoComplete="username"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="font-weight-bold font-size-sm">Full Name</label>
            <input
              autoComplete="name"
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="font-weight-bold font-size-sm">Email Address</label>
            <input
              autoComplete="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="font-weight-bold font-size-sm">Password</label>
            <input
              autoComplete="new-password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary mr-2" type="submit" disabled={submitting}>
            Sign Up
          </button>
          <Link to="/~projects" className="btn btn-light-primary">
            Cancel
          </Link>
        </form>
        <div className="signup mt-4">
          <span className="opacity-50 mr-3">Already have an account?</span>
          <Link to="/~login" className="text-muted text-hover-primary font-weight-bold">
            Sign In
          </Link>
        </div>
      </div>
      <div className="foot pt-2 mt-5 border-top font-size-xs text-muted">
        Powered by BuildX
      </div>
    </SimpleLayout>
  );
}
