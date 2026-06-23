import { type FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { signUp } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { SimpleLayout } from "../layout/SimpleLayout";
import { setFlashMessage } from "../util/flash";

type InitStep = "admin" | "finish";

export function ServerInitPage() {
  const { user, loading, login } = useAuth();
  const [step, setStep] = useState<InitStep>("admin");
  const [name, setName] = useState("admin");
  const [fullName, setFullName] = useState("Administrator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      setStep("finish");
      setReady(true);
    }
  }, [loading, user]);

  if (ready && user) {
    return <Navigate to="/~projects" replace />;
  }

  async function onCreateAdmin(e: FormEvent) {
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
      setFlashMessage("Server initialized successfully");
      setStep("finish");
      setReady(true);
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to create administrator");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SimpleLayout title="Server Initialization" subTitle="Complete setup to start using BuildX">
      <div className="main server-init text-left mx-auto" style={{ maxWidth: 520 }}>
        <div className="card card-custom">
          <div className="card-body">
            {step === "admin" && (
              <>
                <h5 className="font-weight-bold mb-4">Create Administrator Account</h5>
                {error && <div className="alert alert-light-danger">{error}</div>}
                <form onSubmit={onCreateAdmin}>
                  <div className="form-group">
                    <label className="font-weight-bold font-size-sm">Login Name</label>
                    <input
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="font-weight-bold font-size-sm">Full Name</label>
                    <input
                      className="form-control"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="font-weight-bold font-size-sm">Email Address</label>
                    <input
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
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    Continue
                  </button>
                </form>
              </>
            )}
            {step === "finish" && !user && (
              <div className="text-center py-5 text-muted">Initializing…</div>
            )}
          </div>
        </div>
      </div>
    </SimpleLayout>
  );
}
