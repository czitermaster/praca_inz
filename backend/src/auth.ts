import { email } from "./../node_modules/zod/src/v4/core/regexes";
import * as z from "zod";
import { Request, Response, NextFunction } from "express";
import { users, type UserSelect } from "./db/schema";
import { db } from "./db";
import { or, eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { jwtVerify, SignJWT } from "jose";
import { JwtPayload } from "jsonwebtoken";
import { ref } from "process";
import {
  UnauthorizedError,
  BadRequest,
  restHandler,
} from "./utils";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET
);

export type JWTUser = Pick<
  UserSelect,
  "email" | "id" | "username" | "avatarUrl"
>;

async function singJWT(
  user: JWTUser,
  type: "refresh" | "access"
): Promise<string> {
  return await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(
      type === "refresh"
        ? process.env.JWT_REFRESH_EXP!
        : process.env.JWT_ACCESS_EXP!
    )
    .sign(secret);
}

export async function verifyJWT(
  token: string
): Promise<JWTUser> {
  const {
    payload: { user },
  } = await jwtVerify<JwtPayload & { user: JWTUser }>(
    token,
    secret
  );

  return user;
}

const RegisterUserSchema = z.object({
  username: z.string(),
  email: z.email(),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[\S]{8,128}$/
    ),
  confirmPassword: z.string(),
  avatarUrl: z.url().optional(),
});

export async function registerHandler(
  req: Request,
  res: Response
) {
  const validatedData = RegisterUserSchema.parse(req.body);

  if (
    validatedData.confirmPassword !== validatedData.password
  ) {
    throw new BadRequest({
      message: "Passwords do not match",
    });
  }

  const existingUsers = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.username, validatedData.username),
        eq(users.email, validatedData.email)
      )
    )
    .limit(1);
  if (existingUsers.length) {
    const existingUser = existingUsers[0];
    let errorMessage: string;
    if (existingUser.username === validatedData.username) {
      errorMessage = `User with username: ${validatedData.username} already exists`;
    } else {
      errorMessage = `User with email: ${validatedData.email} already exists`;
    }
    throw new BadRequest({ message: errorMessage });
  }
  const hashedPassword = await bcrypt.hash(
    validatedData.password,
    10
  );
  const [newUser] = await db
    .insert(users)
    .values({
      ...validatedData,
      password: hashedPassword,
    })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    });

  const jwtUser: JWTUser = {
    ...newUser,
  };

  const accessToken = await singJWT(jwtUser, "access");

  res.status(201).json({
    accessToken,
  });
}

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function loginHandler(
  req: Request,
  res: Response
) {
  const data = LoginSchema.parse(req.body);

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, data.email),
    columns: {
      id: true,
      username: true,
      email: true,
      password: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError();
  }

  const isValid = await bcrypt.compare(
    data.password,
    user.password
  );

  if (!isValid) {
    throw new UnauthorizedError();
  }

  const jwtUser: JWTUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };

  const accessToken = await singJWT(jwtUser, "access");

  return res.json({
    accessToken,
  });
}

export async function getMeHandler(
  req: Request,
  res: Response
) {
  const user = req.user;

  if (!user) {
    throw new UnauthorizedError();
  }
  return res.json({ user });
}

export function authMiddleware() {
  return restHandler(
    async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const header = req.headers.authorization;

      if (!header?.startsWith("Bearer ")) {
        throw new UnauthorizedError();
      }

      const token = header.split(" ")[1];

      const user = await verifyJWT(token);

      req.user = user;
      next();
    }
  );
}
