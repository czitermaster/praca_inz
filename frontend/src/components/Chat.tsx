import { useState, useRef } from "react";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../auth/AuthContext";
import { uploadFile } from "../api/upload";

interface Props {
  channelId: string;
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
}

export function Chat({ channelId }: Props) {
  const { user } = useAuth();
  const { messages, sendMessage, connected } = useChat(
    user?.id ?? "",
    channelId,
  );
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{
    file: File;
    localUrl: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return <div>Please log in</div>;

  const formatDate = (date: Date) =>
    date.toLocaleString("en-UK", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview({
      file,
      localUrl: URL.createObjectURL(file),
    });
    e.target.value = "";
  }

  function cancelPreview() {
    if (preview) URL.revokeObjectURL(preview.localUrl);
    setPreview(null);
  }

  async function handleSend() {
    if (!input.trim() && !preview) return;
    setUploading(true);
    try {
      if (preview) {
        const { url } = await uploadFile(preview.file);
        sendMessage(input.trim(), url);
        cancelPreview();
      } else {
        sendMessage(input.trim());
      }
      setInput("");
    } finally {
      setUploading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-semibold">Channel</h1>
        <p className="text-xs text-gray-400">
          {connected ? "🟢 Connected" : "🔴 Connecting..."}
        </p>
      </div>

      {/* Messages */}
      <div className="flex flex-col-reverse flex-1 overflow-y-auto p-4 gap-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3 group">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm shrink-0">
              {msg.user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">
                  {msg.user.username}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(new Date(msg.createdAt))}
                </span>
              </div>

              {/* Text */}
              {msg.content && (
                <p className="text-gray-300 text-sm break-words">
                  {msg.content}
                </p>
              )}

              {/* Attachment */}
              {msg.imageUrl && (
                <div className="mt-1">
                  {isImage(msg.imageUrl) ? (
                    <img
                      src={msg.imageUrl}
                      alt="attachment"
                      className="max-w-xs max-h-64 rounded-lg object-contain bg-gray-800 cursor-pointer"
                      onClick={() =>
                        window.open(msg.imageUrl!, "_blank")
                      }
                    />
                  ) : (
                    <a
                      href={msg.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded px-3 py-2 text-sm text-indigo-400 w-fit transition-colors"
                    >
                      📎 {msg.imageUrl.split("/").pop()}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* File preview bar */}
      {preview && (
        <div className="px-4 py-2 border-t border-gray-700 bg-gray-800 flex items-center gap-3">
          {isImage(preview.file.name) ? (
            <img
              src={preview.localUrl}
              alt="preview"
              className="h-16 w-16 object-cover rounded"
            />
          ) : (
            <div className="h-16 w-16 bg-gray-700 rounded flex items-center justify-center text-2xl">
              📎
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 truncate">
              {preview.file.name}
            </p>
            <p className="text-xs text-gray-400">
              {(preview.file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={cancelPreview}
            className="text-gray-400 hover:text-red-400 text-lg transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-700 flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,text/plain,application/zip,video/mp4,video/webm"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-400 hover:text-white text-xl transition-colors shrink-0"
          title="Attach file"
          disabled={uploading}
        >
          📎
        </button>
        <input
          className="flex-1 rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder={
            preview
              ? "Add a message (optional)"
              : "Type a message..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={uploading}
        />
        <button
          onClick={handleSend}
          disabled={
            uploading || (!input.trim() && !preview)
          }
          className="px-4 py-2 rounded text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {uploading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
