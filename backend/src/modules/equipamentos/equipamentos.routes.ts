import { Router } from "express";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { exigirAutenticacao, exigirPapel } from "../../middleware/auth";
import { uploadFotoEquipamento } from "./upload";

export const equipamentosRouter = Router();

equipamentosRouter.use(exigirAutenticacao);

const criarEquipamentoSchema = z.object({
  nome: z.string().min(1),
  categoria: z.string().min(1),
  numeroPatrimonio: z.string().min(1),
});

equipamentosRouter.post(
  "/",
  exigirPapel("STAFF"),
  uploadFotoEquipamento.single("foto"),
  async (req, res) => {
    const dados = criarEquipamentoSchema.parse(req.body);

    const existente = await prisma.equipamento.findUnique({
      where: { numeroPatrimonio: dados.numeroPatrimonio },
    });
    if (existente) {
      return res.status(409).json({ erro: "Número de patrimônio já cadastrado" });
    }

    const equipamento = await prisma.equipamento.create({
      data: { ...dados, fotoPath: req.file?.path },
    });
    res.status(201).json(equipamento);
  }
);

equipamentosRouter.get("/", async (req, res) => {
  const { status } = req.query;
  const equipamentos = await prisma.equipamento.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { nome: "asc" },
  });
  res.json(equipamentos);
});

equipamentosRouter.get("/:id", async (req, res) => {
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: req.params.id },
  });
  if (!equipamento) return res.status(404).json({ erro: "Equipamento não encontrado" });
  res.json(equipamento);
});

equipamentosRouter.get("/:id/foto", async (req, res) => {
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: req.params.id },
  });
  if (!equipamento?.fotoPath || !fs.existsSync(equipamento.fotoPath)) {
    return res.status(404).json({ erro: "Foto não encontrada" });
  }
  res.sendFile(equipamento.fotoPath);
});

equipamentosRouter.patch("/:id/status", exigirPapel("STAFF"), async (req, res) => {
  const schema = z.object({
    status: z.enum(["DISPONIVEL", "LOCADO", "MANUTENCAO"]),
  });
  const { status } = schema.parse(req.body);

  const equipamento = await prisma.equipamento.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(equipamento);
});
