import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR))
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path
      .extname(file.originalname)
      .toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/zip",
      "video/mp4",
      "video/webm",
    ];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(
          new Error(
            `File type not allowed: ${file.mimetype}`,
          ),
        );
  },
});

export function uploadHandler(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }
  const BASE_URL =
    process.env.BASE_URL ??
    `http://localhost:${process.env.PORT ?? 4000}`;
  res.status(201).json({
    url: `${BASE_URL}/uploads/${req.file.filename}`,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
}
