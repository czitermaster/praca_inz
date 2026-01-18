import type { JWTUser } from "./src/auth.ts";
import type { AppError } from "./src/utils.ts";

declare global {
  namespace Express {
    interface Request {
      user?: JWTUser;
      id: string;
    }
    interface Response {
      error?: AppError;
    }
  }
}

export {};
