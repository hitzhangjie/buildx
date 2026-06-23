import { useParams } from "react-router-dom";
import { useSimplePage } from "../../hooks/useSimplePage";
import { SimpleLayout } from "../../layout/SimpleLayout";

/**
 * Mirrors OneDev SsoProcessPage (SimplePage).
 * Reference: references/onedev/.../web/page/security/SsoProcessPage.html
 */
export function SsoProcessPage() {
  useSimplePage("SsoProcessPage");

  const { stage, provider } = useParams<{
    stage: string;
    provider: string;
  }>();

  const providerName = provider ? decodeURIComponent(provider) : "SSO";
  const title = `Authenticating with ${providerName}`;

  return (
    <SimpleLayout title={title} subTitle="Please wait while we process your authentication">
      <div className="text-center py-4">
        <div className="spinner spinner-lg text-primary">Loading...</div>
        <div className="text-muted mt-3">
          {stage === "init"
            ? "Redirecting to the identity provider..."
            : "Completing authentication..."}
        </div>
      </div>
    </SimpleLayout>
  );
}
