import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { useSimplePage } from "../../hooks/useSimplePage";
import { SimpleLayout } from "../../layout/SimpleLayout";

/**
 * Mirrors OneDev PasswordResetPage.
 * Reference: references/onedev/.../web/page/security/PasswordResetPage.html
 */
export function PasswordResetPage() {
  useSimplePage("PasswordResetPage");
  const { passwordResetCode } = useParams<{ passwordResetCode: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    if (!password || password.length < 6) {
      setErrors(["Password must be at least 6 characters"]);
      return;
    }
    if (password !== confirmPassword) {
      setErrors(["Passwords do not match"]);
      return;
    }
    setSubmitting(true);
    // Stub: simulate reset
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
    }, 800);
  }

  if (success) {
    return (
      <SimpleLayout title="Password Reset" subTitle="Your password has been changed">
        <div className="alert alert-light-success mx-auto" style={{ maxWidth: 420 }}>
          Password reset successfully.{" "}
          <Link to="/~login" className="text-primary font-weight-bold">
            Sign in
          </Link>{" "}
          with your new password.
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="Reset Password" subTitle="Set your new password">
      <div className="content mx-auto text-left" style={{ maxWidth: 420 }}>
        <form method="post" onSubmit={handleSubmit}>
          <FormFeedbackPanel messages={errors} />
          <input type="hidden" value={passwordResetCode ?? ""} />
          <div className="form-group">
            <input
              type="password"
              className="form-control"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              className="form-control"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button
            className="btn btn-primary btn-block mt-3"
            type="submit"
            disabled={submitting}
          >
            Set Password
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/~login" className="text-muted text-hover-primary">
            Back to Sign In
          </Link>
        </div>
      </div>
    </SimpleLayout>
  );
}
