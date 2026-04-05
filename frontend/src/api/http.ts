import { tokenStorage } from "../auth/token";
import { APIErrorSchema, APIError } from "./error";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export async function apiFetch<T = void>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStorage.get();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${url}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json();
    const validated = APIErrorSchema.safeParse(error);
    if (validated.success) throw APIError.fromDTO(validated.data);
    throw new Error("Unknown api error");
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as T;

  return res.json();
}
