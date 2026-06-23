import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";

export default function ServiceDeskSettingPage() {
  const { projectPath } = useProject();

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "info" | "danger";
    message: string;
  } | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({
      type: "info",
      message: emailEnabled
        ? "Service desk email settings saved."
        : "Service desk disabled.",
    });
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Service Desk">
      <div className="card">
        <div className="card-body">
          <FormFeedbackPanel messages={feedback ? [feedback.message] : []} />
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between">
                <span>Enable Service Desk (Email)</span>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                  />
                </div>
              </div>
              <div className="form-text">
                When enabled, users can create issues by sending email to the configured address.
              </div>
            </div>

            {emailEnabled && (
              <>
                <div className="mb-3">
                  <label className="form-label" htmlFor="service-email">
                    Service Email Address
                  </label>
                  <input
                    id="service-email"
                    className="form-control"
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="issues@yourdomain.com"
                  />
                </div>
                <hr className="my-4" />
                <h6 className="mb-3">IMAP Settings</h6>
                <div className="mb-3">
                  <label className="form-label" htmlFor="imap-host">
                    IMAP Host
                  </label>
                  <input
                    id="imap-host"
                    className="form-control"
                    type="text"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.yourdomain.com"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="imap-port">
                    IMAP Port
                  </label>
                  <input
                    id="imap-port"
                    className="form-control"
                    type="text"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="imap-username">
                    IMAP Username
                  </label>
                  <input
                    id="imap-username"
                    className="form-control"
                    type="text"
                    value={imapUsername}
                    onChange={(e) => setImapUsername(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="imap-password">
                    IMAP Password
                  </label>
                  <input
                    id="imap-password"
                    className="form-control"
                    type="password"
                    value={imapPassword}
                    onChange={(e) => setImapPassword(e.target.value)}
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary">
              <Icon name="save" className="me-1" />
              Save
            </button>
          </form>
        </div>
      </div>
    </SettingsLayout>
  );
}
