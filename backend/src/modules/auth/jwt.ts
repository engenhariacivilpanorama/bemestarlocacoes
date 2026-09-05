import jwt from "jsonwebtoken";
import { env } from "../../lib/env";

export interface TokenPayload {
  usuarioId: string;
  papel: "STAFF" | "CLIENTE";
}

export function assinarToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}
