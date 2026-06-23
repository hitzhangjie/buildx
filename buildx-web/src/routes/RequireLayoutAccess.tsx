import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSecuritySetting } from "../hooks/useSecuritySetting";
import { isLayoutPagePermitted } from "./layoutAccess";

type RequireLayoutAccessProps = {
  children: ReactNode;
};

/**
 * Mirrors OneDev LayoutPage access: redirect anonymous users to LoginPage
 * (RestartResponseAtInterceptPageException) unless anonymous access is enabled.
 */
export function RequireLayoutAccess({ children }: RequireLayoutAccessProps) {
  const { user, loading } = useAuth();
  const { enableAnonymousAccess, loading: settingLoading } = useSecuritySetting();
  const location = useLocation();

  if (loading || settingLoading) {
    return null;
  }

  if (!isLayoutPagePermitted(user, enableAnonymousAccess)) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/~login" state={{ from }} replace />;
  }

  return <>{children}</>;
}
