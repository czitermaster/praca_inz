import { Outlet, Navigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

export function UnauthorizedGuardLayout() {
  const { user, loading } = useAuth();

  // TODO: better loading
  if (loading) return <div>Loading...</div>;

  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
