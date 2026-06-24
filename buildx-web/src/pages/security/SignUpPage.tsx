import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fetchSecuritySetting } from "../../api/settings";
import { signUp } from "../../api/users";
import { BeanEditor } from "../../components/onedev/BeanEditor";
import { BeanFormGroup } from "../../components/onedev/BeanFormGroup";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { useAuth } from "../../context/AuthContext";
import { useSimplePage } from "../../hooks/useSimplePage";
import { SimpleLayout } from "../../layout/SimpleLayout";

type FieldErrors = Partial<Record<"name" | "password" | "fullName" | "emailAddress", string>>;

/**
 * Mirrors OneDev SignUpPage (SimplePage + SignUpBean editor).
 * Reference: references/onedev/.../web/page/security/SignUpPage.html
 */
export function SignUpPage() {
  useSimplePage("SignUpPage");

  const { user, login } = useAuth();
  const [enableSelfRegister, setEnableSelfRegister] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSecuritySetting().then((setting) => {
      if (!cancelled) {
        setEnableSelfRegister(setting.enableSelfRegister);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (user && !done) {
    return <Navigate to="/~projects" replace />;
  }

  if (enableSelfRegister === false) {
    return <Navigate to="/~login" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormErrors([]);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        fullName: fullName.trim(),
        email: emailAddress.trim(),
        password,
      });
      await login(name.trim(), password, false);
      setDone(true);
    } catch (err) {
      const message = (err as { message?: string }).message ?? "Sign up failed";
      setFormErrors([message]);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <Navigate to="/~projects" replace />;
  }

  if (enableSelfRegister === null) {
    return null;
  }

  return (
    <SimpleLayout title="Sign Up" subTitle="Enter your details to create your account">
      <form method="post" onSubmit={onSubmit}>
        <FormFeedbackPanel messages={formErrors} />
        <BeanEditor>
          <BeanFormGroup property="name" label="Login Name" required fieldError={fieldErrors.name}>
            <div className="clearable-wrapper">
              <input
                autoComplete="off"
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </BeanFormGroup>
          <BeanFormGroup property="password" label="Password" required fieldError={fieldErrors.password}>
            <div className="clearable-wrapper">
              <input
                autoComplete="new-password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </BeanFormGroup>
          <BeanFormGroup property="fullName" label="Full Name" fieldError={fieldErrors.fullName}>
            <div className="clearable-wrapper">
              <input
                autoComplete="name"
                type="text"
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </BeanFormGroup>
          <BeanFormGroup property="emailAddress" label="Email Address" required fieldError={fieldErrors.emailAddress}>
            <div className="clearable-wrapper">
              <input
                autoComplete="email"
                type="email"
                className="form-control"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                required
              />
            </div>
          </BeanFormGroup>
        </BeanEditor>
        <input
          className="btn btn-primary mr-2"
          type="submit"
          value="Sign Up"
          disabled={submitting}
        />
        <Link to="/~projects" className="btn btn-light-primary">
          Cancel
        </Link>
      </form>
      <div className="foot pt-2 mt-5 border-top font-size-xs text-muted">
        Powered by{" "}
        <a href="https://onedev.io" className="text-muted text-hover-primary">
          OneDev
        </a>
      </div>
    </SimpleLayout>
  );
}
