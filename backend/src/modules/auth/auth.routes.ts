import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { assinarToken } from "./jwt";

export const authRouter = Router();

const registroClienteSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
  documento: z.string().min(1),
  telefone: z.string().min(1),
  endereco: z.string().min(1),
});

authRouter.post("/registro-cliente", async (req, res) => {
  const dados = registroClienteSchema.parse(req.body);

  const emailExistente = await prisma.usuario.findUnique({
    where: { email: dados.email },
  });
  if (emailExistente) {
    return res.status(409).json({ erro: "E-mail já cadastrado" });
  }

  const senhaHash = await bcrypt.hash(dados.senha, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nome: dados.nome,
      email: dados.email,
      senhaHash,
      papel: "CLIENTE",
      cliente: {
        create: {
          documento: dados.documento,
          telefone: dados.telefone,
          endereco: dados.endereco,
        },
      },
    },
    include: { cliente: true },
  });

  const token = assinarToken({ usuarioId: usuario.id, papel: "CLIENTE" });
  res.status(201).json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const dados = loginSchema.parse(req.body);

  const usuario = await prisma.usuario.findUnique({
    where: { email: dados.email },
  });
  if (!usuario) {
    return res.status(401).json({ erro: "Credenciais inválidas" });
  }

  const senhaCorreta = await bcrypt.compare(dados.senha, usuario.senhaHash);
  if (!senhaCorreta) {
    return res.status(401).json({ erro: "Credenciais inválidas" });
  }

  const papel = usuario.papel as "STAFF" | "CLIENTE";
  const token = assinarToken({ usuarioId: usuario.id, papel });
  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel },
  });
});
