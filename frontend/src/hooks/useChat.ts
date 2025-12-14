import { useEffect, useState } from "react";
import { socket } from "../lib/socket";
import { useQuery } from "@tanstack/react-query";
import { qc } from "../main";

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
// GET message
const fetchMessages = async (
  channelId: string
): Promise<ChatMessage[]> => {
  const response = await fetch(
    `http://localhost:4000/api/channels/${channelId}/messages`
  );
  if (!response.ok) {
    throw new Error("Could not retrieve messages");
  }
  return response.json();
};

export function useChat(userId: string, channelId: string) {
  const [connected, setConnected] = useState(false);

  const { data: messages } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: () => fetchMessages(channelId),
    initialData: [],
  });

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
      console.log("connected");
      socket.emit("authenticate", { userId });
      socket.emit("join_channel", { channelId });
    });

    socket.on("new_message", (raw: string) => {
      const message: ChatMessage = JSON.parse(raw);
      qc.setQueryData<ChatMessage[]>(
        ["messages", channelId],
        (oldMessages = []) => {
          const messageExists = oldMessages.some(
            (msg) => msg.id === message.id
          );
          if (messageExists) return oldMessages;
          return [message, ...oldMessages];
        }
      );
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });

    return () => {
      socket.off("new_message");
      socket.disconnect();
    };
  }, [userId, channelId]);

  const sendMessage = (content: string) => {
    if (!content.trim()) return;

    socket.emit("send_message", {
      userId,
      channelId,
      content,
    });
  };

  return {
    messages,
    sendMessage,
    connected,
  };
}
