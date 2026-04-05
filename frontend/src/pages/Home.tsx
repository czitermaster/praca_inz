import { Navigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { APIError } from "../api/error";

export function HomePage() {
  const { user, error, loading } = useAuth();

  // TODO: make loading better
  if (loading) return <div>Loading ...</div>;

  // TODO: make error page better
  if (
    error &&
    error instanceof APIError &&
    error.code !== 403
  )
    return <div>Error</div>;

  if (user) return <Navigate to="/chat" />;

  return <Navigate to="/login" />;
}
