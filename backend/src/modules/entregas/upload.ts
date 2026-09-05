import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../../lib/env";

const pastaEntregas = path.join(env.uploadsDir, "entregas");
fs.mkdirSync(pastaEntregas, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pastaEntregas),
  filename: (_req, file, cb) => {
    const extensao = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`);
  },
});

export const uploadFotoEntrega = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Arquivo enviado não é uma imagem"));
    }
    cb(null, true);
  },
});
