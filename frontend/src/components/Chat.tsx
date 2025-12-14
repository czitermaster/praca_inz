import { useState } from "react";
import { useChat } from "../hooks/useChat";

interface Props {
  userId: string;
  channelId: string;
}

export function Chat({ userId, channelId }: Props) {
  const { messages, sendMessage, connected } = useChat(
    userId,
    channelId
  );
  const [input, setInput] = useState("");

  const formatDate = (date: Date) =>
    date.toLocaleString("en-UK", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-semibold">Channel</h1>
        <p className="text-sm text-gray-400">
          Status:{" "}
          {connected ? "Connected" : "Connecting..."}
        </p>
      </div>

      {/* Messages */}
      <div className="flex flex-col-reverse flex-1 overflow-y-auto p-4 gap-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
              {msg.user.username[0].toUpperCase()}
            </div>

            <div>
              <div className="text-sm font-medium">
                {msg.user.username}{" "}
                <span className="text-gray-600">
                  {formatDate(new Date(msg.createdAt))}
                </span>
              </div>
              <div className="text-gray-300">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 flex gap-2">
        <input
          className="flex-1 rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage(input);
              setInput("");
            }
          }}
        />
        <button
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm"
          onClick={() => {
            sendMessage(input);
            setInput("");
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
