import { apiFetch } from "./http";
import type {
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";

export const authKeyFactory = {
  all: ["auth"] as const,
  login: () => [...authKeyFactory.all, "login"],
  register: () => [...authKeyFactory.all, "register"],
  me: () => [...authKeyFactory.all, "me"],
};

type LoginMutationArguments = {
  email: string;
  password: string;
};

type TokenResponse = {
  accessToken: string;
};

type RegisterMutationArguments = {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
};

export type User = {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
};

export const loginOptions: UseMutationOptions<
  TokenResponse,
  Error,
  LoginMutationArguments
> = {
  mutationFn: async (data) =>
    await apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    }),
  mutationKey: authKeyFactory.login(),
};

export const registerOptions: UseMutationOptions<
  TokenResponse,
  Error,
  RegisterMutationArguments
> = {
  mutationKey: authKeyFactory.register(),
  mutationFn: (data) =>
    apiFetch<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    }),
};

export const getMeOptions: UseQueryOptions<User, Error> = {
  queryKey: authKeyFactory.me(),
  queryFn: async () => apiFetch<User>("/auth/me"),
  retry: 0,
};
