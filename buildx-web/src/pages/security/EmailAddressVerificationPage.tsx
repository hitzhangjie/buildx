import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSimplePage } from "../../hooks/useSimplePage";
import { SimpleLayout } from "../../layout/SimpleLayout";

type Status = "loading" | "success" | "failure";

/**
 * Mirrors OneDev EmailAddressVerificationPage (SimplePage).
 * Reference: references/onedev/.../web/page/security/EmailAddressVerificationPage.html
 */
export function EmailAddressVerificationPage() {
  useSimplePage("EmailAddressVerificationPage");

  const { emailAddress, verificationCode } = useParams<{
    emailAddress: string;
    verificationCode: string;
  }>();

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      try {
        // TODO: call actual email verification API
        // await fetch(`/~api/email-verifications/${emailAddress}/verify/${verificationCode}`, { method: "POST" });
        if (!cancelled) {
          setStatus("success");
          setMessage("Your email address has been successfully verified.");
        }
      } catch {
        if (!cancelled) {
          setStatus("failure");
          setMessage(
            "We could not verify your email address. The link may be invalid or expired.",
          );
        }
      }
    }
    void verify();
    return () => {
      cancelled = true;
    };
  }, [emailAddress, verificationCode]);

  const title = "Verify Email Address";

  let content;
  if (status === "loading") {
    content = (
      <div className="text-center py-4">
        <div className="spinner spinner-lg text-primary">Loading...</div>
        <div className="text-muted mt-3">Verifying your email address...</div>
      </div>
    );
  } else if (status === "success") {
    content = (
      <div className="text-center py-4">
        <div className="text-success font-size-lg mb-3">{message}</div>
        <Link to="/~login" className="btn btn-primary font-weight-bold">
          Sign In
        </Link>
      </div>
    );
  } else {
    content = (
      <div className="text-center py-4">
        <div className="text-danger font-size-lg mb-3">{message}</div>
        <Link to="/~login" className="btn btn-primary font-weight-bold">
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <SimpleLayout title={title} subTitle="Confirm your email address to continue">
      {content}
    </SimpleLayout>
  );
}
