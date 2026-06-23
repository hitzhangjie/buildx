import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { setFlashMessage } from "../util/flash";

export function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    setFlashMessage("You've been logged out");
  }, [logout]);

  return <Navigate to="/~projects" replace />;
}
