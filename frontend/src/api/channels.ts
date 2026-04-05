import { apiFetch } from "./http";
import type { UseQueryOptions } from "@tanstack/react-query";

export const channelsKeyFactory = {
  all: ["channels"] as const,
  details: () => [channelsKeyFactory.all, "channels"],
};

export type Channel = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  type: "TEXT" | "VOICE";
  position: number | null;
  createdById: string;
};

export const channelsOptions: UseQueryOptions<
  Channel[],
  Error
> = {
  queryKey: channelsKeyFactory.details(),
  queryFn: async () => apiFetch<Channel[]>("/channels"),
  retry: 0,
};
