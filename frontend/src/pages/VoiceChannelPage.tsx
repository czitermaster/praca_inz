import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { channelsOptions } from "../api/channels";
import { VoiceChannel } from "../components/VoiceChannel";

export function VoiceChannelPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const { data: channels = [] } = useQuery({ ...channelsOptions });

  if (!channelId) return <Navigate to="/chat" replace />;

  const channel = channels.find((c) => c.id === channelId);
  const channelName = channel?.name ?? "Voice Channel";

  return <VoiceChannel channelId={channelId} channelName={channelName} />;
}
