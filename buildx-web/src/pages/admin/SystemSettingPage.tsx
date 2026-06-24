import { type FormEvent, useState } from "react";
import { BeanEditor } from "../../components/onedev/BeanEditor";
import { BeanFormGroup } from "../../components/onedev/BeanFormGroup";
import { BeanSwitch } from "../../components/onedev/BeanSwitch";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev SystemSettingPage.html.
 * Reference: references/onedev/.../web/page/admin/system/SystemSettingPage.html
 */
export function SystemSettingPage() {
  const [serverUrl, setServerUrl] = useState("http://localhost:6610");
  const [sshRootUrl, setSshRootUrl] = useState("ssh://localhost:6611");
  const [sessionTimeout, setSessionTimeout] = useState("Never expire");
  const [disableAutoUpdateCheck, setDisableAutoUpdateCheck] = useState(false);
  const [useAvatarService, setUseAvatarService] = useState(false);
  const [defaultForkRoot, setDefaultForkRoot] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to save settings"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="System Settings">
      <div className="m-2 m-sm-5">
        <div className="card">
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />
              <BeanEditor>
                <BeanFormGroup
                  property="serverUrl"
                  label="Server URL"
                  required
                  description="Specify root URL to access this server"
                >
                  <div className="clearable-wrapper">
                    <input
                      type="url"
                      className="form-control"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                    />
                  </div>
                </BeanFormGroup>
                <BeanFormGroup
                  property="sshRootUrl"
                  label="SSH Root URL"
                  description="Optionally specify SSH root URL, which will be used to construct project clone url via SSH protocol. Leave empty to derive from server url"
                >
                  <div className="clearable-wrapper">
                    <input
                      type="text"
                      className="form-control"
                      value={sshRootUrl}
                      onChange={(e) => setSshRootUrl(e.target.value)}
                    />
                  </div>
                </BeanFormGroup>
                <BeanFormGroup
                  property="sessionTimeout"
                  label="Session Timeout"
                  description="Specify web UI session timeout in minutes. Leave empty to never expire when browser is open. Existing sessions will not be affected of changing this value"
                >
                  <div className="clearable-wrapper">
                    <input
                      type="text"
                      className="form-control"
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                    />
                  </div>
                </BeanFormGroup>
                <BeanFormGroup
                  property="disableAutoUpdateCheck"
                  label="Disable Auto Update Check"
                  description="Auto update check is performed by requesting an image in your browser from onedev.io indicating new version availability with color indicating severity of the update. It works the same way as how gravatar requests avatar images. If disabled, you are highly recommended to check update manually from time to time (can be done via help menu on left bottom of the screen) to see if there is any security/critical fixes"
                >
                  <BeanSwitch
                    checked={disableAutoUpdateCheck}
                    onChange={setDisableAutoUpdateCheck}
                  />
                </BeanFormGroup>
                <BeanFormGroup
                  property="useAvatarService"
                  label="Use Avatar Service"
                  description="Whether or not to use user avatar from a public service"
                >
                  <BeanSwitch checked={useAvatarService} onChange={setUseAvatarService} />
                </BeanFormGroup>
                <BeanFormGroup
                  property="defaultForkRoot"
                  label="Default Fork Root"
                  description="When forking from the UI, the default target project will be created as &lt;default fork root&gt;/&lt;account name&gt;/&lt;project name&gt; if specified (users forking need permission to create child projects under the fork root), or &lt;account name&gt;/&lt;project name&gt; otherwise (need permission to create root projects)"
                >
                  <select
                    className="form-control"
                    value={defaultForkRoot}
                    onChange={(e) => setDefaultForkRoot(e.target.value)}
                  >
                    <option value="">No default fork root</option>
                    <option value="root/team-a">root/team-a</option>
                    <option value="root/team-b">root/team-b</option>
                  </select>
                </BeanFormGroup>
              </BeanEditor>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                Save Settings
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
