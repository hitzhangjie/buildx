import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev MyTwoFactorAuthenticationPage.html.
 * Reference: references/onedev/.../web/page/my/MyTwoFactorAuthenticationPage.html
 */
export function MyTwoFactorAuthenticationPage() {
  const [enabled, setEnabled] = useState(false);
  const [recoveryCodes] = useState<string[]>([
    "ABCD-EFGH-IJKL-MNOP",
    "QRST-UVWX-YZ12-3456",
    "7890-ABCD-EFGH-IJKL",
    "MNOP-QRST-UVWX-YZ12",
    "3456-7890-ABCD-EFGH",
  ]);
  const [setupCode, setSetupCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [step, setStep] = useState<"intro" | "verify" | "done">("intro");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleEnable(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API — fetch QR code secret
      setSetupCode("OTPAUTH://TOTP/SECRET?secret=JBSWY3DPEHPK3PXP");
      setStep("verify");
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to start setup"]);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API — verify code and enable 2FA
      setEnabled(true);
      setStep("done");
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Verification failed"]);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
      setEnabled(false);
      setStep("intro");
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to disable 2FA"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Two-factor Authentication">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Two-factor Authentication</h5>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            {!enabled && step === "intro" && (
              <div>
                <p>
                  Two-factor authentication adds an extra layer of security to your account.
                  You will need to enter a code from your authenticator app in addition to your
                  password.
                </p>
                <form method="post" onSubmit={handleEnable}>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={submitting}
                  >
                    <Icon name="lock" className="icon mr-1" width={16} height={16} />
                    Enable Two-factor Authentication
                  </button>
                </form>
              </div>
            )}

            {!enabled && step === "verify" && (
              <div>
                <p>Scan this QR code with your authenticator app:</p>
                <div
                  className="border rounded p-4 mb-3 d-inline-block"
                  style={{ width: 200, height: 200, background: "#eee" }}
                >
                  <div className="d-flex justify-content-center align-items-center h-100 text-muted">
                    QR Code
                  </div>
                </div>
                <p className="text-muted small">
                  Or enter this key manually: <code>{setupCode}</code>
                </p>
                <form method="post" onSubmit={handleVerify}>
                  <div className="form-group">
                    <label className="control-label">Verification Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="Enter the 6-digit code"
                      required
                      maxLength={6}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={submitting}
                  >
                    <Icon name="check" className="icon mr-1" width={16} height={16} />
                    Verify & Enable
                  </button>
                  <button
                    className="btn btn-light ml-2"
                    type="button"
                    onClick={() => setStep("intro")}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}

            {enabled && (
              <div>
                <div className="alert alert-info">
                  <Icon name="info" className="icon mr-1" width={16} height={16} />
                  Two-factor authentication is currently enabled.
                </div>

                <h6 className="mt-4">Recovery Codes</h6>
                <p className="text-muted small">
                  Save these recovery codes in a secure location. You can use them to regain
                  access if you lose your authenticator device.
                </p>
                <div className="border rounded p-3 mb-3" style={{ fontFamily: "monospace" }}>
                  {recoveryCodes.map((code) => (
                    <div key={code}>{code}</div>
                  ))}
                </div>

                <form method="post" onSubmit={handleDisable}>
                  <button
                    className="btn btn-danger"
                    type="submit"
                    disabled={submitting}
                  >
                    <Icon name="trash" className="icon mr-1" width={16} height={16} />
                    Disable Two-factor Authentication
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
