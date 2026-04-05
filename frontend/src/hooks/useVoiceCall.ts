import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { getSocket } from "../lib/socket";
import type { User } from "../api/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceParticipant = {
  socketId: string;
  user: Pick<User, "id" | "username" | "avatarUrl">;
  stream: MediaStream | null;
};

// ─── STUN servers (public Google STUN, no TURN needed for LAN) ───────────────

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceCall(channelId: string) {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<
    VoiceParticipant[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  // socketId -> RTCPeerConnection
  const peersRef = useRef<Map<string, RTCPeerConnection>>(
    new Map(),
  );

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const updateParticipantStream = useCallback(
    (socketId: string, stream: MediaStream) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === socketId ? { ...p, stream } : p,
        ),
      );
    },
    [],
  );

  const createPeerConnection = useCallback(
    (targetSocketId: string): RTCPeerConnection => {
      const socket = getSocket();
      const pc = new RTCPeerConnection(RTC_CONFIG);

      // Push local audio tracks into the connection
      localStreamRef.current
        ?.getTracks()
        .forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });

      // Relay ICE candidates through the server
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit("voice_ice_candidate", {
            targetSocketId,
            channelId,
            payload: candidate,
          });
        }
      };

      // When remote audio arrives, attach it to the participant
      pc.ontrack = ({ streams }) => {
        const remoteStream = streams[0];
        if (remoteStream)
          updateParticipantStream(
            targetSocketId,
            remoteStream,
          );
      };

      peersRef.current.set(targetSocketId, pc);
      return pc;
    },
    [channelId, updateParticipantStream],
  );

  const closePeer = useCallback((socketId: string) => {
    peersRef.current.get(socketId)?.close();
    peersRef.current.delete(socketId);
    setParticipants((prev) =>
      prev.filter((p) => p.socketId !== socketId),
    );
  }, []);

  // ── Public actions ────────────────────────────────────────────────────────────

  const joinCall = useCallback(async () => {
    setError(null);
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      localStreamRef.current = stream;
    } catch {
      setError(
        "Microphone access denied. Please allow microphone access and try again.",
      );
      return;
    }

    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("join_voice_channel", { channelId });
    setInCall(true);
  }, [channelId]);

  const leaveCall = useCallback(() => {
    const socket = getSocket();
    socket.emit("leave_voice_channel", { channelId });

    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    localStreamRef.current
      ?.getTracks()
      .forEach((t) => t.stop());
    localStreamRef.current = null;
    setParticipants([]);
    setInCall(false);
    setIsMuted(false);
  }, [channelId]);

  const toggleMute = useCallback(() => {
    const track =
      localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  // ── Socket event listeners ───────────────────────────────────────────────────

  useEffect(() => {
    if (!inCall) return;
    const socket = getSocket();

    // Server tells us who is already in the room → we initiate offers to them
    async function onRoomUsers({
      peers,
    }: {
      peers: Array<{
        socketId: string;
        user: VoiceParticipant["user"];
      }>;
    }) {
      for (const { socketId, user } of peers) {
        setParticipants((prev) => {
          if (prev.find((p) => p.socketId === socketId))
            return prev;
          return [
            ...prev,
            { socketId, user, stream: null },
          ];
        });

        const pc = createPeerConnection(socketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("voice_offer", {
          targetSocketId: socketId,
          channelId,
          payload: offer,
        });
      }
    }

    // A new peer joined → add them to the list; they will send us an offer
    function onUserJoined({
      socketId,
      user,
    }: {
      socketId: string;
      user: VoiceParticipant["user"];
    }) {
      setParticipants((prev) => {
        if (prev.find((p) => p.socketId === socketId))
          return prev;
        return [...prev, { socketId, user, stream: null }];
      });
    }

    // A peer left → clean up
    function onUserLeft({
      socketId,
    }: {
      socketId: string;
    }) {
      closePeer(socketId);
    }

    // Receive an offer → answer it
    async function onOffer({
      fromSocketId,
      offer,
      user,
    }: {
      fromSocketId: string;
      offer: RTCSessionDescriptionInit;
      user: VoiceParticipant["user"];
    }) {
      // Ensure participant exists in list
      setParticipants((prev) => {
        if (prev.find((p) => p.socketId === fromSocketId))
          return prev;
        return [
          ...prev,
          { socketId: fromSocketId, user, stream: null },
        ];
      });

      let pc = peersRef.current.get(fromSocketId);
      if (!pc) pc = createPeerConnection(fromSocketId);

      await pc.setRemoteDescription(
        new RTCSessionDescription(offer),
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice_answer", {
        targetSocketId: fromSocketId,
        channelId,
        payload: answer,
      });
    }

    // Receive an answer → set remote description
    async function onAnswer({
      fromSocketId,
      answer,
    }: {
      fromSocketId: string;
      answer: RTCSessionDescriptionInit;
    }) {
      const pc = peersRef.current.get(fromSocketId);
      if (pc)
        await pc.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
    }

    // Receive an ICE candidate → add it
    async function onIceCandidate({
      fromSocketId,
      candidate,
    }: {
      fromSocketId: string;
      candidate: RTCIceCandidateInit;
    }) {
      const pc = peersRef.current.get(fromSocketId);
      if (pc)
        await pc.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
    }

    socket.on("voice_room_users", onRoomUsers);
    socket.on("voice_user_joined", onUserJoined);
    socket.on("voice_user_left", onUserLeft);
    socket.on("voice_offer", onOffer);
    socket.on("voice_answer", onAnswer);
    socket.on("voice_ice_candidate", onIceCandidate);

    return () => {
      socket.off("voice_room_users", onRoomUsers);
      socket.off("voice_user_joined", onUserJoined);
      socket.off("voice_user_left", onUserLeft);
      socket.off("voice_offer", onOffer);
      socket.off("voice_answer", onAnswer);
      socket.off("voice_ice_candidate", onIceCandidate);
    };
  }, [inCall, channelId, createPeerConnection, closePeer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (inCall) leaveCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    inCall,
    isMuted,
    participants,
    error,
    localStream: localStreamRef.current,
    joinCall,
    leaveCall,
    toggleMute,
  };
}
