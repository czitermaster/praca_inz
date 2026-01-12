import type { JWTUser } from "./src/auth.ts";

declare global {
  namespace Express {
    interface Request {
      user?: JWTUser;
    }
  }
}

export {};
