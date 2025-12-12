import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { db } from "./db/index";
import { messages, users } from "./db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

const app = express();
const server = createServer(app);

const io = new Server(server, {
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

const JoinChannelDataSchema = z.object({
  channelId: z.uuid(),
});

// Socket.io event handlers
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a specific channel
  socket.on("join_channel", (data: unknown) => {
    const parsedData = JoinChannelDataSchema.parse(data);

    socket.join(`channel_${parsedData.channelId}`);
    console.log(
      `User joined channel: ${parsedData.channelId}`
    );
  });

  // Send message via WebSocket
  socket.on("send_message", async (data: unknown) => {
    try {
      const parsedData = SendMessageDataSchema.parse(data);
      // Save to database
      const [newMessage] = await db
        .insert(messages)
        .values({
          channelId: parsedData.channelId,
          userId: parsedData.userId,
          content: parsedData.content?.trim(),
          imageUrl: parsedData.imageUrl,
        })
        .returning();

      // Get user data
      const user = await db.query.users.findFirst({
        where: eq(users.id, parsedData.userId),
        columns: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      });

      const messageWithUser = {
        ...newMessage,
        user: user || {
          id: parsedData.userId,
          username: "Unknown",
          displayName: "Unknown User",
          avatarUrl: null,
        },
      };

      // Broadcast to everyone in the channel
      io.to(`channel_${parsedData.channelId}`).emit(
        "new_message",
        messageWithUser
      );
    } catch (error) {
      console.error("WebSocket message error:", error);
      if (error instanceof z.ZodError) {
        error.issues;
      }
      socket.emit("error", {
        message: "Failed to send message",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
  });
});

// Get messages for a specific channel
app.get(
  "/api/channels/:channelId/messages",
  async (req, res) => {
    try {
      const { channelId } = req.params;
      const limit =
        parseInt(req.query.limit as string) || 50;

      const channelMessages = await db
        .select({
          id: messages.id,
          content: messages.content,
          imageUrl: messages.imageUrl,
          createdAt: messages.createdAt,
          user: {
            id: users.id,
            username: users.username,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(messages)
        .where(eq(messages.channelId, channelId))
        .leftJoin(users, eq(messages.userId, users.id))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      res.json(channelMessages.reverse());
    } catch (error) {
      console.error("Error fetching messages:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch messages" });
    }
  }
);

// Post a new message to a specific channel
app.post("/api/messages", async (req, res) => {
  try {
    const { channelId, userId, content, imageUrl } =
      req.body;

    if (!channelId || !userId || !content?.trim()) {
      return res
        .status(400)
        .json({ error: "Missing required fields" });
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        channelId,
        userId,
        content: content.trim(),
        imageUrl,
      })
      .returning();

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    const messageWithUser = {
      ...newMessage,
      user: user || {
        id: userId,
        username: "Unknown",
        displayName: "Unknown User",
        avatarUrl: null,
      },
    };

    res.status(201).json(messageWithUser);
  } catch (error) {
    console.error("Error creating message:", error);
    res
      .status(500)
      .json({ error: "Failed to create message" });
  }
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
  console.log("WebSocket ready at ws://localhost:" + PORT);
});
