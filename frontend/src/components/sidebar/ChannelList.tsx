import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { channelsOptions, channelsKeyFactory } from "../../api/channels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateChannelModal } from "./CreateChannelModal";
import { apiFetch } from "../../api/http";

export function ChannelList() {
  const { isLoading, data, error } = useQuery({ ...channelsOptions });
  const { channelId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [defaultType, setDefaultType] = useState<"TEXT" | "VOICE">("TEXT");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { mutate: deleteChannel } = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/channels/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: channelsKeyFactory.details() });
      // If we deleted the channel we're currently viewing, go back
      if (channelId === id) navigate("/chat");
      setConfirmDelete(null);
    },
  });

  function openModal(type: "TEXT" | "VOICE") {
    setDefaultType(type);
    setShowModal(true);
  }

  if (isLoading) return <div className="px-3 py-2 text-sm text-gray-400 animate-pulse">Loading channels...</div>;
  if (error) return <div className="px-3 py-2 text-sm text-red-400">Failed to load channels</div>;

  const textChannels = data?.filter((c) => c.type === "TEXT") ?? [];
  const voiceChannels = data?.filter((c) => c.type === "VOICE") ?? [];

  function ChannelRow({ c, to }: { c: { id: string; name: string }; to: string }) {
    return (
      <div className={`flex items-center gap-1 rounded group ${channelId === c.id ? "bg-gray-700" : "hover:bg-gray-700"}`}>
        <Link
          to={to}
          className={`flex-1 flex items-center gap-2 px-2 py-1.5 text-sm transition-colors ${
            channelId === c.id ? "text-white" : "text-gray-400 group-hover:text-gray-200"
          }`}
        >
          <span className="text-gray-500">{to.startsWith("/voice") ? "🔊" : "#"}</span>
          {c.name}
        </Link>
        <button
          onClick={() => setConfirmDelete(c.id)}
          className="opacity-0 group-hover:opacity-100 pr-2 text-gray-500 hover:text-red-400 transition-all text-sm"
          title="Delete channel"
        >
          🗑️
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="px-2 space-y-4">
        {/* Text channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <p className="text-xs font-semibold uppercase text-gray-400">Text Channels</p>
            <button onClick={() => openModal("TEXT")} className="text-gray-400 hover:text-white text-lg leading-none">+</button>
          </div>
          {textChannels.length === 0 && <p className="text-xs text-gray-600 px-2">No text channels yet</p>}
          {textChannels.map((c) => <ChannelRow key={c.id} c={c} to={`/chat/${c.id}`} />)}
        </div>

        {/* Voice channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <p className="text-xs font-semibold uppercase text-gray-400">Voice Channels</p>
            <button onClick={() => openModal("VOICE")} className="text-gray-400 hover:text-white text-lg leading-none">+</button>
          </div>
          {voiceChannels.length === 0 && <p className="text-xs text-gray-600 px-2">No voice channels yet</p>}
          {voiceChannels.map((c) => <ChannelRow key={c.id} c={c} to={`/voice/${c.id}`} />)}
        </div>
      </div>

      {/* Create modal */}
      {showModal && <CreateChannelModal defaultType={defaultType} onClose={() => setShowModal(false)} />}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-gray-800 rounded-lg p-6 w-72 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-semibold text-lg">Delete Channel</h2>
            <p className="text-gray-400 text-sm">
              Are you sure? This will delete the channel and all its messages permanently.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteChannel(confirmDelete)}
                className="flex-1 py-2 rounded bg-red-600 hover:bg-red-700 text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
