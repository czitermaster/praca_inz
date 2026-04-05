import { io, type Socket } from "socket.io-client";
import { tokenStorage } from "../auth/token";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ??
  import.meta.env.VITE_API_URL?.replace("/api", "") ??
  "http://localhost:4000";

let _socket: Socket | null = null;

/**
 * Returns a singleton socket, creating it fresh with the current token
 * if it doesn't exist yet. This ensures we always have the right auth
 * token even after login/logout cycles.
 */
export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      autoConnect: false,
      query: { token: tokenStorage.get() },
    });
  }
  return _socket;
}

/**
 * Tear down the current socket instance (e.g. on logout).
 * Next call to getSocket() will create a fresh one with the new token.
 */
export function resetSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
