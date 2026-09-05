import { Request, Response, NextFunction } from "express";
import { verificarToken, TokenPayload } from "../modules/auth/jwt";

export interface RequestAutenticado extends Request {
  usuario?: TokenPayload;
}

export function exigirAutenticacao(
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
    req.usuario = verificarToken(token);
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}

export function exigirPapel(...papeis: Array<"STAFF" | "CLIENTE">) {
  return (req: RequestAutenticado, res: Response, next: NextFunction) => {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      return res.status(403).json({ erro: "Acesso não permitido para este papel" });
    }
    next();
  };
}
