import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const channelTypeEnum = pgEnum("channel_type", [
  "TEXT",
  "VOICE",
]);

const ID = uuid("id").primaryKey().defaultRandom();

export const users = pgTable("users", {
  id: ID,
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(
  users,
  ({ many }) => ({
    channels: many(channels),
    messages: many(messages),
  })
);

export const channels = pgTable("channels", {
  id: ID,
  name: text("name").notNull(),
  type: channelTypeEnum("type").default("TEXT").notNull(),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdById: uuid("created_by_id").notNull(),
});

export const channelsRelations = relations(
  channels,
  ({ one, many }) => ({
    createdBy: one(users, {
      fields: [channels.createdById],
      references: [users.id],
    }),
    messages: many(messages),
  })
);

export const messages = pgTable("messages", {
  id: ID,
  content: text("content"),
  imageUrl: text("image_url"),
  channelId: uuid("channel_id").notNull(),
  userId: uuid("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messagesRelations = relations(
  messages,
  ({ one }) => ({
    channel: one(channels, {
      fields: [messages.channelId],
      references: [channels.id],
    }),
    user: one(users, {
      fields: [messages.userId],
      references: [users.id],
    }),
  })
);
