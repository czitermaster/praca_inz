import type { Socket, DefaultEventsMap } from "socket.io";
import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { randomUUID } from "crypto";
import * as z from "zod";
import { type JWTUser } from "./auth";

export type SocketData = {
  user?: JWTUser;
};

/**
 * SocketError is a class for all application errors in socket.io
 * service, all application errors should inherit from it
 */
class SocketError extends Error {
  type: string = "Unknown";

  constructor(m: string) {
    super(m);
  }

  emit(socket: Socket) {
    socket.emit("error", {
      message: this.message,
      type: this.type,
    });
  }
}

export class UnauthorizedSocketError extends SocketError {
  type = "Unauthorized";
  constructor() {
    super("Unauthorized access");
  }
}

/**
 * AppError is a class for all application errors in main rest service,
 * all rest application errors that will be handled in global error handler should
 * inherit from this class
 */
export class AppError extends Error {
  code = 500;
  message = "Internal server error";
  cause?: Error;

  constructor(args?: { message?: string; cause?: Error }) {
    super(args?.message ?? "Internal server error");
    this.cause = args?.cause;
  }

  /**
   * Returns an object that should be returnd as api response to the client
   */
  json() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export class InternalServerError extends AppError {}

export class UnauthorizedError extends AppError {
  code = 403;
  message = "Unauthorized";
}

export class NotFoundError extends AppError {
  code = 404;
  message = "Not Found";
}

export class BadRequest extends AppError {
  code = 400;
  issues: z.core.$ZodIssue[] = [];

  constructor(zodError?: z.ZodError) {
    super({
      message: zodError?.message ?? "Bad Request",
      cause: zodError,
    });
    this.issues = zodError?.issues ?? [];
  }

  json() {
    return {
      message: this.message,
      code: this.code,
      issues: this.issues,
    };
  }
}

class Logger {
  request(
    req: Request,
    statusCode: number,
    duration: number,
    timestamp: string
  ) {
    console.log(
      `(${timestamp}) [${req.id}] ${req.method} ${req.url} ${statusCode} - ${duration}ms`
    );
  }

  error(err: AppError, req: Request) {
    console.error(`[${req.id}] ERROR: ${err.message}`, {
      name: err.name,
      stack: err.stack,
      cause: err.cause?.message,
      causeName: err.cause?.name,
      causeStack: err.cause?.stack,
      method: req.method,
      url: req.url,
      body: req.body,
    });
  }
}

const log = new Logger();

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _: NextFunction
) {
  let finalError: AppError;
  if (err instanceof AppError) {
    finalError = err;
  } else if (err instanceof z.ZodError) {
    const badRequest = new BadRequest(err);
    finalError = badRequest;
  } else {
    const internal = new InternalServerError({
      cause: err,
    });
    finalError = internal;
  }
  log.error(finalError, req);

  res.status(finalError.code).json(finalError.json());
}

export function restHandler(
  callback: RequestHandler
): RequestHandler {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await callback(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function socketHandler<T extends any[]>(
  socket: Socket<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    SocketData
  >,
  callback: (...args: T) => Promise<void> | void
) {
  return async (...args: T) => {
    try {
      return await callback(...args);
    } catch (error) {
      console.error(`Error in socket ${error}`);
      if (error instanceof z.ZodError) {
        socket.emit("error", {
          issues: error.issues,
        });
      }

      if (error instanceof SocketError) {
        error.emit(socket);
      }

      socket.emit("Unhandled Error");
    }
  };
}

export function idGen(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.id = randomUUID();
  next();
}

export function logger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const timestamp = new Date().toISOString();
  const start = Date.now();

  // Capture response
  res.on("finish", () => {
    const duration = Date.now() - start;
    log.request(req, res.statusCode, duration, timestamp);
  });

  next();
}
