import { useParams, Navigate } from "react-router-dom";
import { Chat } from "./Chat";
import { useAuth } from "../auth/AuthContext";

export function ChatPage() {
  const { user, loading } = useAuth();
  const { channelId } = useParams<{ channelId: string }>();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="login" replace />;

  if (!channelId)
    throw new Error("Cannot go to chat page without id");

  return <Chat channelId={channelId} />;
}
