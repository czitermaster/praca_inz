import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../api/http";
import { channelsKeyFactory, type Channel } from "../../api/channels";

interface Props {
  defaultType?: "TEXT" | "VOICE";
  onClose: () => void;
}

export function CreateChannelModal({ defaultType = "TEXT", onClose }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"TEXT" | "VOICE">(defaultType);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      apiFetch<{ channel: Channel }>("/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: channelsKeyFactory.details() });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    mutate();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg p-6 w-80 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-lg font-semibold">Create Channel</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">
              Channel Name
            </label>
            <input
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. general"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">
              Channel Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("TEXT")}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                  type === "TEXT"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                }`}
              >
                # Text
              </button>
              <button
                type="button"
                onClick={() => setType("VOICE")}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                  type === "VOICE"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                }`}
              >
                🔊 Voice
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="flex-1 py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold transition-colors"
            >
              {isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
