import "socket.io";
import type { JWTUser } from "./src/auth.ts";

declare module "socket.io" {
  interface SocketData {
    user?: JWTUser;
  }
}

export {};
