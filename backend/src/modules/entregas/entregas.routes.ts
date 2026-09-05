import { Router } from "express";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { exigirAutenticacao, exigirPapel, RequestAutenticado } from "../../middleware/auth";
import { uploadFotoEntrega } from "./upload";

export const entregasRouter = Router();

entregasRouter.use(exigirAutenticacao, exigirPapel("STAFF"));

entregasRouter.get("/pendentes", async (_req, res) => {
  const pendentes = await prisma.contratoEquipamento.findMany({
    where: {
      contrato: { status: "ASSINADO" },
      entrega: null,
    },
    include: {
      equipamento: true,
      contrato: {
        include: {
          obra: true,
          cliente: { include: { usuario: { select: { nome: true } } } },
        },
      },
    },
  });
  res.json(pendentes);
});

const registrarEntregaSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  observacoes: z.string().optional(),
});

entregasRouter.post(
  "/:contratoEquipamentoId",
  uploadFotoEntrega.single("foto"),
  async (req: RequestAutenticado, res) => {
    if (!req.file) {
      return res.status(400).json({ erro: "Foto da entrega é obrigatória" });
    }

    const dados = registrarEntregaSchema.parse(req.body);

    const contratoEquipamento = await prisma.contratoEquipamento.findUnique({
      where: { id: req.params.contratoEquipamentoId },
      include: { contrato: true, entrega: true },
    });

    if (!contratoEquipamento) {
      return res.status(404).json({ erro: "Item de contrato não encontrado" });
    }
    if (contratoEquipamento.contrato.status !== "ASSINADO") {
      return res.status(409).json({ erro: "Contrato ainda não foi assinado pelo cliente" });
    }
    if (contratoEquipamento.entrega) {
      return res.status(409).json({ erro: "Entrega já registrada para este item" });
    }

    const entrega = await prisma.$transaction(async (tx) => {
      const novaEntrega = await tx.entrega.create({
        data: {
          contratoEquipamentoId: contratoEquipamento.id,
          entreguePorUsuarioId: req.usuario!.usuarioId,
          latitude: dados.latitude,
          longitude: dados.longitude,
          observacoes: dados.observacoes,
          fotoPath: req.file!.path,
        },
      });

      await tx.equipamento.update({
        where: { id: contratoEquipamento.equipamentoId },
        data: { status: "LOCADO" },
      });

      return novaEntrega;
    });

    res.status(201).json(entrega);
  }
);

entregasRouter.get("/:id/foto", async (req, res) => {
  const entrega = await prisma.entrega.findUnique({ where: { id: req.params.id } });
  if (!entrega || !fs.existsSync(entrega.fotoPath)) {
    return res.status(404).json({ erro: "Foto não encontrada" });
  }
  res.sendFile(entrega.fotoPath);
});
