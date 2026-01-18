import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server, type DefaultEventsMap } from "socket.io";
import { eq, asc } from "drizzle-orm";
import cors from "cors";
import * as z from "zod";
import { db } from "./db/index";
import { messages, users } from "./db/schema";
import {
  registerHandler,
  authMiddleware,
  loginHandler,
  getMeHandler,
  verifyJWT,
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
} from "./channels";

const app = express();
const server = createServer(app);

const io = new Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>(server, {
  cors: {
    origin: "*",
  },
});

// Validation schema
const SendMessageDataSchema = z
  .object({
    channelId: z.uuid(),
    userId: z.uuid(),
    content: z.string().optional(),
    imageUrl: z.url().optional(),
  })
  .refine((data) => data.content || data.imageUrl, {
    message: "Either content or imageUrl must be provided",
  });

const ChannelParticipationSchema = z.object({
  channelId: z.uuid(),
});

io.use(async (socket, next) => {
  const token = socket.handshake.query.token;

  if (typeof token !== "string") {
    return next(new UnauthorizedSocketError());
  }
  const user = await verifyJWT(token);
  socket.data.user = user;
  return next();
});

// Socket.io event handlers
io.on("connection", (socket) => {
  // Join a specific channel
  socket.on(
    "join_channel",
    socketHandler(socket, async (data: unknown) => {
      const parsedData =
        ChannelParticipationSchema.parse(data);
      const _ = await getChannelType(parsedData.channelId);
      socket.join(`channel_${parsedData.channelId}`);
      console.log(
        `User joined channel: ${parsedData.channelId}`
      );
    })
  );

  socket.on(
    "leave_channel",
    socketHandler(socket, (data: unknown) => {
      const parsedData =
        ChannelParticipationSchema.parse(data);
      socket.leave(`chanel_${parsedData.channelId}`);
    })
  );

  // Send message via WebSocket
  socket.on(
    "send_message",
    socketHandler(socket, async (data: unknown) => {
      const user = socket.data.user;
      if (!user) {
        throw new UnauthorizedSocketError();
      }
      const parsedData = SendMessageDataSchema.parse(data);
      // Save to database
      const [newMessage] = await db
        .insert(messages)
        .values({
          channelId: parsedData.channelId,
          userId: user.id,
          content: parsedData.content?.trim(),
          imageUrl: parsedData.imageUrl,
        })
        .returning();

      const messageWithUser = {
        ...newMessage,
        user,
      };

      io.to(`channel_${parsedData.channelId}`).emit(
        "new_message",
        messageWithUser
      );
    })
  );

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(idGen);
app.use(logger);

app.get(
  "/api/health",
  restHandler((req, res) => {
    res.json({
      status: "OK",
      message: "Server is running",
    });
  })
);

app.get(
  "/api/channels/:channelId/messages",
  authMiddleware(),
  restHandler(listChannelMessages)
);

app.post(
  "/api/channels",
  authMiddleware(),
  restHandler(createChannelHandler)
);

app.delete(
  "/api/channels/:channelId",
  authMiddleware(),
  restHandler(deleteChannelHandler)
);

app.put(
  "/api/channels/:channelId",
  authMiddleware(),
  restHandler(updateChannelHandler)
);

app.post(
  "/api/auth/register",
  restHandler(registerHandler)
);
app.post("/api/auth/login", restHandler(loginHandler));
app.get(
  "/api/auth/me",
  authMiddleware(),
  restHandler(getMeHandler)
);

app.use(
  restHandler((req, res) => {
    throw new NotFoundError();
  })
);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
  console.log("WebSocket ready at ws://localhost:" + PORT);
});
