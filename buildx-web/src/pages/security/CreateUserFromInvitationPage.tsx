import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { useSimplePage } from "../../hooks/useSimplePage";
import { SimpleLayout } from "../../layout/SimpleLayout";

/**
 * Mirrors OneDev CreateUserFromInvitationPage (SimplePage).
 * Reference: references/onedev/.../web/page/security/CreateUserFromInvitationPage.html
 */
export function CreateUserFromInvitationPage() {
  useSimplePage("CreateUserFromInvitationPage");

  const { emailAddress } = useParams<{
    emailAddress: string;
    invitationCode: string;
  }>();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);

    if (!fullName.trim()) {
      setErrors(["Full name is required."]);
      return;
    }
    if (password.length < 6) {
      setErrors(["Password must be at least 6 characters."]);
      return;
    }
    if (password !== confirmPassword) {
      setErrors(["Passwords do not match."]);
      return;
    }

    setSubmitting(true);
    try {
      // TODO: call actual invitation accept API
      // await fetch(`/~api/invitations/${invitationCode}/accept`, {
      //   method: "POST",
      //   body: JSON.stringify({ fullName, password }),
      // });
      navigate("/~login", { replace: true });
    } catch (err) {
      setErrors([
        (err as { message?: string }).message ?? "Failed to create account.",
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SimpleLayout
      title="Create Your Account"
      subTitle="You have been invited to join this OneDev server"
    >
      <form method="post" onSubmit={handleSubmit}>
        <FormFeedbackPanel messages={errors} />
        <div className="form-group">
          <input
            type="email"
            className="form-control"
            value={decodeURIComponent(emailAddress ?? "")}
            readOnly
            disabled
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            className="form-control"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            className="form-control"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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
          />
        </div>
        <button
          className="btn btn-primary font-weight-bold"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Creating..." : "Create Account"}
        </button>
      </form>
      <div className="mt-3 text-muted font-size-sm">
        <Link to="/~login" className="text-muted text-hover-primary">
          Back to Sign In
        </Link>
      </div>
    </SimpleLayout>
  );
}
