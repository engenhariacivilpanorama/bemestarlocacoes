import { Router } from "express";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { exigirAutenticacao, exigirPapel, PAPEIS_STAFF } from "../../middleware/auth";
import { uploadFotoEquipamento } from "./upload";

export const equipamentosRouter = Router();

equipamentosRouter.use(exigirAutenticacao);

const criarEquipamentoSchema = z.object({
  nome: z.string().min(1),
  categoria: z.string().min(1),
  numeroPatrimonio: z.string().min(1),
  quantidade: z.coerce.number().int().min(1).max(100).default(1),
});

equipamentosRouter.post(
  "/",
  exigirPapel(...PAPEIS_STAFF),
  uploadFotoEquipamento.single("foto"),
  async (req, res) => {
    const dados = criarEquipamentoSchema.parse(req.body);

    const codigosDesejados =
      dados.quantidade === 1
        ? [dados.numeroPatrimonio]
        : Array.from({ length: dados.quantidade }, (_, i) => `${dados.numeroPatrimonio}-${i + 1}`);

    const existentes = await prisma.equipamento.findMany({
      where: { numeroPatrimonio: { in: codigosDesejados } },
      select: { numeroPatrimonio: true },
    });
    if (existentes.length > 0) {
      return res.status(409).json({
        erro: `Número(s) de patrimônio já cadastrado(s): ${existentes.map((e) => e.numeroPatrimonio).join(", ")}`,
      });
    }

    const criados = await prisma.$transaction(
      codigosDesejados.map((numeroPatrimonio) =>
        prisma.equipamento.create({
          data: {
            nome: dados.nome,
            categoria: dados.categoria,
            numeroPatrimonio,
            fotoPath: req.file?.path,
          },
        })
      )
    );

    res.status(201).json(dados.quantidade === 1 ? criados[0] : criados);
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

const editarEquipamentoSchema = z.object({
  nome: z.string().min(1).optional(),
  categoria: z.string().min(1).optional(),
  numeroPatrimonio: z.string().min(1).optional(),
  status: z.enum(["DISPONIVEL", "LOCADO", "MANUTENCAO"]).optional(),
});

equipamentosRouter.patch(
  "/:id",
  exigirPapel(...PAPEIS_STAFF),
  uploadFotoEquipamento.single("foto"),
  async (req, res) => {
    const dados = editarEquipamentoSchema.parse(req.body);

    const equipamentoAtual = await prisma.equipamento.findUnique({ where: { id: req.params.id } });
    if (!equipamentoAtual) return res.status(404).json({ erro: "Equipamento não encontrado" });

    if (dados.numeroPatrimonio && dados.numeroPatrimonio !== equipamentoAtual.numeroPatrimonio) {
      const existente = await prisma.equipamento.findUnique({
        where: { numeroPatrimonio: dados.numeroPatrimonio },
      });
      if (existente) {
        return res.status(409).json({ erro: "Número de patrimônio já cadastrado" });
      }
    }

    const fotoAnterior = equipamentoAtual.fotoPath;
    const equipamento = await prisma.equipamento.update({
      where: { id: req.params.id },
      data: { ...dados, ...(req.file ? { fotoPath: req.file.path } : {}) },
    });

    if (req.file && fotoAnterior && fs.existsSync(fotoAnterior)) {
      fs.unlink(fotoAnterior, () => {});
    }

    res.json(equipamento);
  }
);

equipamentosRouter.patch("/:id/status", exigirPapel(...PAPEIS_STAFF), async (req, res) => {
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
