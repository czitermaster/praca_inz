import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "../api/http";

export type ChatMessage = {
  id: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
};

export function useChat(userId: string, channelId: string) {
  const [connected, setConnected] = useState(false);
  const qc = useQueryClient();

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["messages", channelId],
    queryFn: () =>
      apiFetch<ChatMessage[]>(
        `/channels/${channelId}/messages`,
      ),
    initialData: [],
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function onConnect() {
      setConnected(true);
      socket.emit("join_channel", { channelId });
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onNewMessage(message: ChatMessage) {
      qc.setQueryData<ChatMessage[]>(
        ["messages", channelId],
        (old = []) => {
          if (old.some((m) => m.id === message.id))
            return old;
          return [message, ...old];
        },
      );
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new_message", onNewMessage);
    socket.on("error", console.error);

    if (socket.connected) {
      setConnected(true);
      socket.emit("join_channel", { channelId });
    }

    return () => {
      socket.emit("leave_channel", { channelId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new_message", onNewMessage);
      socket.off("error", console.error);
    };
  }, [userId, channelId, qc]);

  // imageUrl is optional — used when sending a file attachment
  function sendMessage(content: string, imageUrl?: string) {
    if (!content.trim() && !imageUrl) return;
    const socket = getSocket();
    socket.emit("send_message", {
      channelId,
      ...(content.trim() ? { content } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    });
  }

  return { messages, sendMessage, connected };
}
