import { Request, Response, NextFunction } from "express";
import { verificarToken, TokenPayload } from "../modules/auth/jwt";
import { prisma } from "../lib/prisma";

export interface RequestAutenticado extends Request {
  usuario?: TokenPayload;
}

export async function exigirAutenticacao(
  req: RequestAutenticado,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token não informado" });
  }

  try {
    const token = header.slice("Bearer ".length);
    const payload = verificarToken(token);

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.usuarioId },
      select: { ativo: true },
    });
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: "Conta inexistente ou desativada" });
    }

    req.usuario = payload;
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}

export function exigirPapel(...papeis: Array<"ADMIN" | "FUNCIONARIO" | "CLIENTE">) {
  return (req: RequestAutenticado, res: Response, next: NextFunction) => {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      return res.status(403).json({ erro: "Acesso não permitido para este papel" });
    }
    next();
  };
}

export const PAPEIS_STAFF = ["ADMIN", "FUNCIONARIO"] as const;
