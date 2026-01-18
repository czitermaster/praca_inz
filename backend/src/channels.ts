import * as z from "zod";
import { eq, asc } from "drizzle-orm";
import type { Request, Response } from "express";
import {
  channelTypeEnum,
  channels,
  users,
  messages,
} from "./db/schema";
import { db } from "./db";
import { NotFoundError, UnauthorizedError } from "./utils";

const CreateChannelSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(channelTypeEnum.enumValues),
});

const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

export async function createChannelHandler(
  req: Request,
  res: Response
) {
  const user = req.user!;
  const data = CreateChannelSchema.parse(req.body);
  const lastChannel = await db.query.channels.findFirst({
    orderBy: (channels, { desc }) => [
      desc(channels.position),
    ],
    columns: { position: true },
  });
  const position = lastChannel?.position
    ? lastChannel.position + 1
    : 0;

  const [channel] = await db
    .insert(channels)
    .values({
      name: data.name,
      type: data.type,
      position,
      createdById: user.id,
    })
    .returning();
  res.status(201).json({ channel });
}

export async function listChannelMessages(
  req: Request,
  res: Response
) {
  const { channelId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

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
    .orderBy(asc(messages.createdAt))
    .limit(limit);

  res.json(channelMessages.reverse());
}

export async function deleteChannelHandler(
  req: Request,
  res: Response
) {
  const user = req.user!;
  const { channelId } = req.params;
  const channel = await db.query.channels.findFirst({
    where: eq(channels.id, channelId),
  });

  if (!channel) {
    throw new NotFoundError();
  }
  // Permission chceck
  if (channel.createdById !== user.id) {
    throw new UnauthorizedError();
  }
  await db
    .delete(channels)
    .where(eq(channels.id, channelId));

  res.status(204).json({ message: "DELETED" });
}

export async function updateChannelHandler(
  req: Request,
  res: Response
) {
  const user = req.user!;
  const channelId = req.params.channelId;
  const { name } = UpdateChannelSchema.parse(req.body);
  const channel = await db.query.channels.findFirst({
    where: eq(channels.id, channelId),
  });
  if (!channel) {
    throw new NotFoundError();
  }
  if (channel.createdById !== user.id) {
    throw new UnauthorizedError();
  }
  const [updatedChannel] = await db
    .update(channels)
    .set({ name, updatedAt: new Date() })
    .where(eq(channels.id, channelId))
    .returning();
  res.json(updatedChannel);
}

export async function listChannelsHandler(
  req: Request,
  res: Response
) {
  const channelsList = await db.query.channels.findMany({
    orderBy: (channels, { asc }) => [
      asc(channels.position),
    ],
  });
  res.json(channelsList);
}

export async function getChannelType(channelId: string) {
  const channel = await db.query.channels.findFirst({
    where: eq(channels.id, channelId),
    columns: { type: true },
  });

  if (!channel) {
    throw new Error("Channel not found");
  }

  return channel.type;
}
