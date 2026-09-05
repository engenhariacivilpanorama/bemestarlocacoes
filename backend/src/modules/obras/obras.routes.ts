import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { exigirAutenticacao, exigirPapel, RequestAutenticado } from "../../middleware/auth";

export const obrasRouter = Router();

obrasRouter.use(exigirAutenticacao);

const criarObraSchema = z.object({
  nome: z.string().min(1),
  endereco: z.string().min(1),
  clienteId: z.string().uuid(),
});

obrasRouter.post("/", exigirPapel("STAFF"), async (req, res) => {
  const dados = criarObraSchema.parse(req.body);
  const obra = await prisma.obra.create({ data: dados });
  res.status(201).json(obra);
});

obrasRouter.get("/", async (req: RequestAutenticado, res) => {
  if (req.usuario?.papel === "CLIENTE") {
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.usuario.usuarioId },
    });
    const obras = await prisma.obra.findMany({
      where: { clienteId: cliente?.id },
    });
    return res.json(obras);
  }

  const obras = await prisma.obra.findMany({
    include: { cliente: { include: { usuario: { select: { nome: true } } } } },
    orderBy: { criadoEm: "desc" },
  });
  res.json(obras);
});

obrasRouter.get("/:id", async (req, res) => {
  const obra = await prisma.obra.findUnique({ where: { id: req.params.id } });
  if (!obra) return res.status(404).json({ erro: "Obra não encontrada" });
  res.json(obra);
});
