import { type FormEvent, useEffect, useState } from "react";
import { fetchSecuritySetting } from "../../api/settings";
import { BeanEditor } from "../../components/onedev/BeanEditor";
import { BeanFormGroup } from "../../components/onedev/BeanFormGroup";
import { BeanSwitch } from "../../components/onedev/BeanSwitch";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev SecuritySettingPage.html.
 * Reference: references/onedev/.../web/page/admin/security/SecuritySettingPage.html
 */
export function SecuritySettingPage() {
  const [loading, setLoading] = useState(true);
  const [enableAnonymousAccess, setEnableAnonymousAccess] = useState(false);
  const [enableSelfRegister, setEnableSelfRegister] = useState(false);
  const [allowedSelfSignUpEmailDomain, setAllowedSelfSignUpEmailDomain] = useState("");
  const [enforcePasswordPolicy, setEnforcePasswordPolicy] = useState(false);
  const [defaultGroup, setDefaultGroup] = useState("");
  const [enableSelfDeregister, setEnableSelfDeregister] = useState(false);
  const [enforce2FA, setEnforce2FA] = useState(false);
  const [corsAllowedOrigins, setCorsAllowedOrigins] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSecuritySetting()
      .then((setting) => {
        if (cancelled) {
          return;
        }
        setEnableAnonymousAccess(setting.enableAnonymousAccess);
        setEnableSelfRegister(setting.enableSelfRegister);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setErrors([(err as { message?: string }).message ?? "Failed to load security settings"]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    <Layout title="Security Settings">
      <div className="m-2 m-sm-5">
        {loading ? null : (
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />
              <BeanEditor>
                <BeanFormGroup
                  property="enableAnonymousAccess"
                  label="Enable Anonymous Access"
                  description="Whether or not to allow anonymous users to access this server"
                >
                  <BeanSwitch checked={enableAnonymousAccess} onChange={setEnableAnonymousAccess} />
                </BeanFormGroup>
                <BeanFormGroup
                  property="enableSelfRegister"
                  label="Enable Account Self Sign-Up"
                  description="User can sign up if this option is enabled"
                >
                  <BeanSwitch checked={enableSelfRegister} onChange={setEnableSelfRegister} />
                </BeanFormGroup>
                <BeanFormGroup
                  property="allowedSelfSignUpEmailDomain"
                  label="Allowed Self Sign-Up Email Domain"
                  description='Optionally specify allowed email domain for self sign-up users. Use "*" or "|" for pattern match'
                >
                  <div className="clearable-wrapper">
                    <input
                      type="text"
                      className="form-control"
                      value={allowedSelfSignUpEmailDomain}
                      onChange={(e) => setAllowedSelfSignUpEmailDomain(e.target.value)}
                      placeholder="Any domain"
                    />
                  </div>
                </BeanFormGroup>
                <BeanFormGroup
                  property="enforcePasswordPolicy"
                  label="Enforce Password Policy"
                  description="Enforce password policy for new users"
                >
                  <BeanSwitch checked={enforcePasswordPolicy} onChange={setEnforcePasswordPolicy} />
                </BeanFormGroup>
                <BeanFormGroup
                  property="defaultGroup"
                  label="Default Group"
                  description="Optionally add new users to specified default group"
                >
                  <select
                    className="form-control"
                    value={defaultGroup}
                    onChange={(e) => setDefaultGroup(e.target.value)}
                  >
                    <option value="">Not specified</option>
                  </select>
                </BeanFormGroup>
                <BeanFormGroup
                  property="enableSelfDeregister"
                  label="Enable Account Self Removal"
                  description="Whether or not user can remove own account"
                >
                  <BeanSwitch checked={enableSelfDeregister} onChange={setEnableSelfDeregister} />
                </BeanFormGroup>
                <BeanFormGroup
                  property="enforce2FA"
                  label="Enforce Two-factor Authentication"
                  description="Check this to enforce two-factor authentication for all users in the system"
                >
                  <BeanSwitch checked={enforce2FA} onChange={setEnforce2FA} />
                </BeanFormGroup>
                <BeanFormGroup
                  property="corsAllowedOrigins"
                  label="CORS Allowed Origins *"
                  description='Optionally specify allowed CORS origins. For a CORS simple or preflight request, if value of request header "Origin" is included here, the response header "Access-Control-Allow-Origin" will be set to the same value'
                >
                  <div className="clearable-wrapper">
                    <input
                      type="text"
                      className="form-control"
                      value={corsAllowedOrigins}
                      onChange={(e) => setCorsAllowedOrigins(e.target.value)}
                      placeholder="Input allowed CORS origin, hit ENTER to add"
                    />
                  </div>
                </BeanFormGroup>
              </BeanEditor>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting}
              >
                <Icon name="check" className="icon mr-1" width={16} height={16} />
                Save
              </button>
            </form>
        )}
      </div>
    </Layout>
  );
}
