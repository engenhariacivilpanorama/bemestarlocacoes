import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { exigirAutenticacao, exigirPapel, PAPEIS_STAFF, RequestAutenticado } from "../../middleware/auth";

export const usuariosRouter = Router();

usuariosRouter.use(exigirAutenticacao, exigirPapel(...PAPEIS_STAFF));

const SELECT_PUBLICO = { id: true, nome: true, email: true, papel: true, ativo: true, criadoEm: true } as const;

// Troca da própria senha — qualquer funcionário ou admin autenticado.
// Registrado antes de "/:id" para não ser interpretado como um id.
const trocarMinhaSenhaSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(6),
});

usuariosRouter.patch("/me/senha", async (req: RequestAutenticado, res) => {
  const { senhaAtual, novaSenha } = trocarMinhaSenhaSchema.parse(req.body);

  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.usuarioId } });
  if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado" });

  const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senhaHash);
  if (!senhaCorreta) {
    return res.status(401).json({ erro: "Senha atual incorreta" });
  }

  const senhaHash = await bcrypt.hash(novaSenha, 10);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash } });
  res.status(204).send();
});

usuariosRouter.get("/", exigirPapel("ADMIN"), async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    where: { papel: { in: ["ADMIN", "FUNCIONARIO"] } },
    select: SELECT_PUBLICO,
    orderBy: { nome: "asc" },
  });
  res.json(usuarios);
});

const criarUsuarioSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
  papel: z.enum(["ADMIN", "FUNCIONARIO"]),
});

usuariosRouter.post("/", exigirPapel("ADMIN"), async (req, res) => {
  const dados = criarUsuarioSchema.parse(req.body);

  const existente = await prisma.usuario.findUnique({ where: { email: dados.email } });
  if (existente) {
    return res.status(409).json({ erro: "E-mail já cadastrado" });
  }

  const senhaHash = await bcrypt.hash(dados.senha, 10);
  const usuario = await prisma.usuario.create({
    data: { nome: dados.nome, email: dados.email, senhaHash, papel: dados.papel },
    select: SELECT_PUBLICO,
  });

  res.status(201).json(usuario);
});

const editarUsuarioSchema = z.object({
  nome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  papel: z.enum(["ADMIN", "FUNCIONARIO"]).optional(),
  ativo: z.boolean().optional(),
});

usuariosRouter.patch("/:id", exigirPapel("ADMIN"), async (req: RequestAutenticado, res) => {
  const dados = editarUsuarioSchema.parse(req.body);

  const usuarioAlvo = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!usuarioAlvo || !["ADMIN", "FUNCIONARIO"].includes(usuarioAlvo.papel)) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  if (dados.ativo === false && usuarioAlvo.id === req.usuario!.usuarioId) {
    return res.status(400).json({ erro: "Você não pode desativar a própria conta" });
  }

  if (dados.email && dados.email !== usuarioAlvo.email) {
    const existente = await prisma.usuario.findUnique({ where: { email: dados.email } });
    if (existente) return res.status(409).json({ erro: "E-mail já cadastrado" });
  }

  const usuario = await prisma.usuario.update({
    where: { id: req.params.id },
    data: dados,
    select: SELECT_PUBLICO,
  });

  res.json(usuario);
});

const redefinirSenhaSchema = z.object({
  novaSenha: z.string().min(6),
});

usuariosRouter.patch("/:id/senha", exigirPapel("ADMIN"), async (req, res) => {
  const { novaSenha } = redefinirSenhaSchema.parse(req.body);

  const usuarioAlvo = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!usuarioAlvo || !["ADMIN", "FUNCIONARIO"].includes(usuarioAlvo.papel)) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  const senhaHash = await bcrypt.hash(novaSenha, 10);
  await prisma.usuario.update({ where: { id: req.params.id }, data: { senhaHash } });
  res.status(204).send();
});
