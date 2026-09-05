import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { exigirAutenticacao, exigirPapel, PAPEIS_STAFF } from "../../middleware/auth";

export const clientesRouter = Router();

clientesRouter.use(exigirAutenticacao, exigirPapel(...PAPEIS_STAFF));

clientesRouter.get("/", async (_req, res) => {
  const clientes = await prisma.cliente.findMany({
    include: { usuario: { select: { id: true, nome: true, email: true } } },
    orderBy: { usuario: { nome: "asc" } },
  });
  res.json(clientes);
});

clientesRouter.get("/:id", async (req, res) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: req.params.id },
    include: {
      usuario: { select: { id: true, nome: true, email: true } },
      obras: true,
      contratos: true,
    },
  });
  if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" });
  res.json(cliente);
});
