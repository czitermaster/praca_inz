import { useEffect, useRef } from "react";
import { useVoiceCall, type VoiceParticipant } from "../hooks/useVoiceCall";
import { useAuth } from "../auth/AuthContext";

interface Props {
  channelId: string;
  channelName: string;
}

export function VoiceChannel({ channelId, channelName }: Props) {
  const { user } = useAuth();
  const { inCall, isMuted, participants, error, joinCall, leaveCall, toggleMute } =
    useVoiceCall(channelId);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center gap-2">
        <span className="text-gray-400 text-xl">🔊</span>
        <div>
          <h1 className="text-lg font-semibold">{channelName}</h1>
          <p className="text-sm text-gray-400">
            {inCall
              ? `${participants.length + 1} participant${participants.length !== 0 ? "s" : ""} in call`
              : "Voice Channel"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300 max-w-sm text-center">
            {error}
          </div>
        )}

        {!inCall ? (
          /* ── Not in call ── */
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-4xl">
              🔊
            </div>
            <p className="text-gray-400 text-sm">No one is in this channel yet</p>
            <button
              onClick={joinCall}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-lg text-base font-semibold transition-colors"
            >
              Join Voice Call
            </button>
          </div>
        ) : (
          /* ── In call ── */
          <>
            {/* Participants grid */}
            <div className="flex flex-wrap justify-center gap-6">
              {/* Local user (self) */}
              <ParticipantTile
                name={user?.username ?? "You"}
                avatarUrl={user?.avatarUrl}
                isMuted={isMuted}
                isSelf
              />

              {/* Remote participants */}
              {participants.map((p) => (
                <RemoteParticipantTile key={p.socketId} participant={p} />
              ))}
            </div>

            {/* Controls */}
            <div className="flex gap-3 mt-2">
              <button
                onClick={toggleMute}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                  isMuted
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {isMuted ? "🔇 Unmute" : "🎙️ Mute"}
              </button>

              <button
                onClick={leaveCall}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                📞 Leave
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Local participant tile ────────────────────────────────────────────────────

function ParticipantTile({
  name,
  avatarUrl,
  isMuted,
  isSelf,
}: {
  name: string;
  avatarUrl?: string | null;
  isMuted?: boolean;
  isSelf?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold ring-2 ring-indigo-400">
            {name[0].toUpperCase()}
          </div>
        )}
        {isMuted && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs">
            🔇
          </span>
        )}
      </div>
      <span className="text-sm text-gray-300">
        {isSelf ? `${name} (you)` : name}
      </span>
    </div>
  );
}

// ─── Remote participant tile (with audio element) ─────────────────────────────

function RemoteParticipantTile({ participant }: { participant: VoiceParticipant }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && participant.stream) {
      audioRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Hidden audio element that plays the remote stream */}
      <audio ref={audioRef} autoPlay />

      <ParticipantTile
        name={participant.user.username}
        avatarUrl={participant.user.avatarUrl}
        isMuted={!participant.stream}
      />
    </div>
  );
}
