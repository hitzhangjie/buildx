import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSimplePage } from "../../hooks/useSimplePage";
import { SimpleLayout } from "../../layout/SimpleLayout";

type Status = "loading" | "success" | "failure";

/**
 * Mirrors OneDev OAuthCallbackPage (SimplePage).
 * Reference: references/onedev/.../web/page/security/OAuthCallbackPage.html
 */
export function OAuthCallbackPage() {
  useSimplePage("OAuthCallbackPage");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  useEffect(() => {
    let cancelled = false;
    async function process() {
      if (!code || !state) {
        if (!cancelled) {
          setStatus("failure");
          setMessage("Invalid OAuth callback: missing code or state parameter.");
        }
        return;
      }
      try {
        // TODO: call actual OAuth callback API
        // const resp = await fetch(
        //   `/~api/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        // );
        // const data = await resp.json();
        if (!cancelled) {
          setStatus("success");
          // state typically encodes the return URL or a session token
          setTimeout(() => navigate("/~projects", { replace: true }), 1500);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("failure");
          setMessage(
            (err as { message?: string }).message ??
              "OAuth authentication failed.",
          );
        }
      }
    }
    void process();
    return () => {
      cancelled = true;
    };
  }, [code, state, navigate]);

  const title = "OAuth Authentication";

  let content;
  if (status === "loading") {
    content = (
      <div className="text-center py-4">
        <div className="spinner spinner-lg text-primary">Loading...</div>
        <div className="text-muted mt-3">
          Completing OAuth authentication...
        </div>
      </div>
    );
  } else if (status === "success") {
    content = (
      <div className="text-center py-4">
        <div className="text-success font-size-lg mb-3">
          Authentication successful. Redirecting...
        </div>
      </div>
    );
  } else {
    content = (
      <div className="text-center py-4">
        <div className="text-danger font-size-lg mb-3">{message}</div>
        <a href="/~login" className="btn btn-primary font-weight-bold">
          Back to Sign In
        </a>
      </div>
    );
  }

  return <SimpleLayout title={title}>{content}</SimpleLayout>;
}
