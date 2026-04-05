import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server, type DefaultEventsMap } from "socket.io";
import cors from "cors";
import * as z from "zod";
import path from "path";
import { db } from "./db/index";
import { messages } from "./db/schema";
import {
  registerHandler,
  authMiddleware,
  loginHandler,
  getMeHandler,
  verifyJWT,
  type JWTUser,
} from "./auth";
import {
  socketHandler,
  restHandler,
  UnauthorizedSocketError,
  NotFoundError,
  errorHandler,
  logger,
  idGen,
  type SocketData,
} from "./utils";
import {
  createChannelHandler,
  deleteChannelHandler,
  getChannelType,
  listChannelMessages,
  updateChannelHandler,
  listChannelsHandler,
} from "./channels";
import { upload, uploadHandler } from "../src/upload";

const app = express();
const server = createServer(app);

const io = new Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>(server, {
  cors: { origin: "*" },
});

// ─── Voice room state ──────────────────────────────────────────────────────────
const voiceRooms = new Map<string, Set<string>>();
const socketUsers = new Map<string, JWTUser>();

// ─── Schemas ──────────────────────────────────────────────────────────────────
const SendMessageDataSchema = z
  .object({
    channelId: z.uuid(),
    content: z.string().optional(),
    imageUrl: z.url().optional(),
  })
  .refine((d) => d.content || d.imageUrl, {
    message: "Either content or imageUrl must be provided",
  });

const ChannelParticipationSchema = z.object({
  channelId: z.uuid(),
});

const VoiceSignalSchema = z.object({
  targetSocketId: z.string(),
  channelId: z.uuid(),
  payload: z.unknown(),
});

// ─── Socket auth ──────────────────────────────────────────────────────────────
io.use(async (socket, next) => {
  const token = socket.handshake.query.token;
  if (typeof token !== "string")
    return next(new UnauthorizedSocketError());
  const user = await verifyJWT(token);
  socket.data.user = user;
  return next();
});

// ─── Socket events ────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  const user = socket.data.user;
  if (user) socketUsers.set(socket.id, user);

  socket.on(
    "join_channel",
    socketHandler(socket, async (data: unknown) => {
      const { channelId } =
        ChannelParticipationSchema.parse(data);
      await getChannelType(channelId);
      socket.join(`channel_${channelId}`);
    }),
  );

  socket.on(
    "leave_channel",
    socketHandler(socket, (data: unknown) => {
      const { channelId } =
        ChannelParticipationSchema.parse(data);
      socket.leave(`channel_${channelId}`);
    }),
  );

  socket.on(
    "send_message",
    socketHandler(socket, async (data: unknown) => {
      if (!user) throw new UnauthorizedSocketError();
      const parsed = SendMessageDataSchema.parse(data);
      const [newMessage] = await db
        .insert(messages)
        .values({
          channelId: parsed.channelId,
          userId: user.id,
          content: parsed.content?.trim(),
          imageUrl: parsed.imageUrl,
        })
        .returning();
      io.to(`channel_${parsed.channelId}`).emit(
        "new_message",
        { ...newMessage, user },
      );
    }),
  );

  // Voice
  socket.on(
    "join_voice_channel",
    socketHandler(socket, async (data: unknown) => {
      if (!user) throw new UnauthorizedSocketError();
      const { channelId } =
        ChannelParticipationSchema.parse(data);
      const type = await getChannelType(channelId);
      if (type !== "VOICE")
        throw new Error("Not a voice channel");
      socket.join(`voice_${channelId}`);
      if (!voiceRooms.has(channelId))
        voiceRooms.set(channelId, new Set());
      voiceRooms.get(channelId)!.add(socket.id);
      const roomSocketIds = io.sockets.adapter.rooms.get(
        `voice_${channelId}`,
      );
      const existingPeers = roomSocketIds
        ? [...roomSocketIds]
            .filter((id) => id !== socket.id)
            .map((socketId) => ({
              socketId,
              user: socketUsers.get(socketId) ?? null,
            }))
            .filter((p) => p.user !== null)
        : [];
      socket.emit("voice_room_users", {
        channelId,
        peers: existingPeers,
      });
      socket
        .to(`voice_${channelId}`)
        .emit("voice_user_joined", {
          channelId,
          socketId: socket.id,
          user,
        });
    }),
  );

  socket.on(
    "leave_voice_channel",
    socketHandler(socket, (data: unknown) => {
      const { channelId } =
        ChannelParticipationSchema.parse(data);
      leaveVoiceChannel(socket.id, channelId);
    }),
  );

  socket.on(
    "voice_offer",
    socketHandler(socket, (data: unknown) => {
      const { targetSocketId, channelId, payload } =
        VoiceSignalSchema.parse(data);
      io.to(targetSocketId).emit("voice_offer", {
        fromSocketId: socket.id,
        channelId,
        offer: payload,
        user,
      });
    }),
  );

  socket.on(
    "voice_answer",
    socketHandler(socket, (data: unknown) => {
      const { targetSocketId, channelId, payload } =
        VoiceSignalSchema.parse(data);
      io.to(targetSocketId).emit("voice_answer", {
        fromSocketId: socket.id,
        channelId,
        answer: payload,
      });
    }),
  );

  socket.on(
    "voice_ice_candidate",
    socketHandler(socket, (data: unknown) => {
      const { targetSocketId, channelId, payload } =
        VoiceSignalSchema.parse(data);
      io.to(targetSocketId).emit("voice_ice_candidate", {
        fromSocketId: socket.id,
        channelId,
        candidate: payload,
      });
    }),
  );

  socket.on("disconnect", () => {
    for (const [
      channelId,
      members,
    ] of voiceRooms.entries()) {
      if (members.has(socket.id))
        leaveVoiceChannel(socket.id, channelId);
    }
    socketUsers.delete(socket.id);
  });

  function leaveVoiceChannel(
    socketId: string,
    channelId: string,
  ) {
    socket.leave(`voice_${channelId}`);
    voiceRooms.get(channelId)?.delete(socketId);
    io.to(`voice_${channelId}`).emit("voice_user_left", {
      channelId,
      socketId,
    });
  }
});

// ─── REST ─────────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(idGen);
app.use(logger);

// Serve uploaded files as static
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads")),
);

app.get(
  "/api/health",
  restHandler((_req, res) => res.json({ status: "OK" })),
);

// File upload endpoint
app.post(
  "/api/upload",
  authMiddleware(),
  upload.single("file"),
  restHandler(uploadHandler),
);

app.get(
  "/api/channels",
  authMiddleware(),
  restHandler(listChannelsHandler),
);
app.get(
  "/api/channels/:channelId/messages",
  authMiddleware(),
  restHandler(listChannelMessages),
);
app.post(
  "/api/channels",
  authMiddleware(),
  restHandler(createChannelHandler),
);
app.delete(
  "/api/channels/:channelId",
  authMiddleware(),
  restHandler(deleteChannelHandler),
);
app.put(
  "/api/channels/:channelId",
  authMiddleware(),
  restHandler(updateChannelHandler),
);

app.post(
  "/api/auth/register",
  restHandler(registerHandler),
);
app.post("/api/auth/login", restHandler(loginHandler));
app.get(
  "/api/auth/me",
  authMiddleware(),
  restHandler(getMeHandler),
);

app.use(
  restHandler(() => {
    throw new NotFoundError();
  }),
);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});
