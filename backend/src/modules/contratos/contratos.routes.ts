import { Router } from "express";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { env } from "../../lib/env";
import { exigirAutenticacao, exigirPapel, RequestAutenticado, PAPEIS_STAFF } from "../../middleware/auth";
import { gerarPdfContrato } from "./gerarPdf";

export const contratosRouter = Router();

contratosRouter.use(exigirAutenticacao);

const criarContratoSchema = z.object({
  clienteId: z.string().uuid(),
  obraId: z.string().uuid(),
  itens: z
    .array(
      z.object({
        equipamentoId: z.string().uuid(),
        valorDiaria: z.number().positive(),
        dias: z.number().int().positive(),
      })
    )
    .min(1),
});

contratosRouter.post("/", exigirPapel(...PAPEIS_STAFF), async (req, res) => {
  const dados = criarContratoSchema.parse(req.body);

  const contrato = await prisma.contrato.create({
    data: {
      clienteId: dados.clienteId,
      obraId: dados.obraId,
      itens: {
        create: dados.itens.map((item) => ({
          equipamentoId: item.equipamentoId,
          valorDiaria: item.valorDiaria,
          dias: item.dias,
        })),
      },
    },
    include: { itens: { include: { equipamento: true } } },
  });

  res.status(201).json(contrato);
});

async function buscarContratoCompleto(id: string) {
  return prisma.contrato.findUnique({
    where: { id },
    include: {
      cliente: { include: { usuario: { select: { nome: true, email: true } } } },
      obra: true,
      itens: { include: { equipamento: true, entrega: true } },
    },
  });
}

async function podeAcessarContrato(req: RequestAutenticado, contrato: NonNullable<Awaited<ReturnType<typeof buscarContratoCompleto>>>) {
  if (req.usuario && (PAPEIS_STAFF as readonly string[]).includes(req.usuario.papel)) return true;
  const cliente = await prisma.cliente.findUnique({
    where: { usuarioId: req.usuario!.usuarioId },
  });
  return cliente?.id === contrato.clienteId;
}

contratosRouter.get("/", async (req: RequestAutenticado, res) => {
  if (req.usuario?.papel === "CLIENTE") {
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.usuario.usuarioId },
    });
    const contratos = await prisma.contrato.findMany({
      where: { clienteId: cliente?.id },
      include: { obra: true, itens: { include: { equipamento: true } } },
      orderBy: { criadoEm: "desc" },
    });
    return res.json(contratos);
  }

  const contratos = await prisma.contrato.findMany({
    include: {
      cliente: { include: { usuario: { select: { nome: true } } } },
      obra: true,
    },
    orderBy: { criadoEm: "desc" },
  });
  res.json(contratos);
});

contratosRouter.get("/:id", async (req: RequestAutenticado, res) => {
  const contrato = await buscarContratoCompleto(req.params.id);
  if (!contrato) return res.status(404).json({ erro: "Contrato não encontrado" });

  if (!(await podeAcessarContrato(req, contrato))) {
    return res.status(403).json({ erro: "Acesso não permitido a este contrato" });
  }

  res.json(contrato);
});

const assinarContratoSchema = z.object({
  dadosPreenchidos: z.record(z.string(), z.any()),
  assinaturaImagemBase64: z.string().startsWith("data:image/"),
});

contratosRouter.post("/:id/assinar", exigirPapel("CLIENTE"), async (req: RequestAutenticado, res) => {
  const { dadosPreenchidos, assinaturaImagemBase64 } = assinarContratoSchema.parse(req.body);

  const contrato = await buscarContratoCompleto(req.params.id);
  if (!contrato) return res.status(404).json({ erro: "Contrato não encontrado" });
  if (!(await podeAcessarContrato(req, contrato))) {
    return res.status(403).json({ erro: "Acesso não permitido a este contrato" });
  }
  if (contrato.status === "ASSINADO") {
    return res.status(409).json({ erro: "Contrato já foi assinado" });
  }

  const dataAssinatura = new Date();

  const pdfPath = await gerarPdfContrato({
    contratoId: contrato.id,
    locadoraNome: env.locadora.nome,
    locadoraDocumento: env.locadora.documento,
    locadoraEndereco: env.locadora.endereco,
    clienteNome: contrato.cliente.usuario.nome,
    clienteDocumento: contrato.cliente.documento,
    clienteTelefone: contrato.cliente.telefone,
    clienteEndereco: contrato.cliente.endereco,
    obraNome: contrato.obra.nome,
    obraEndereco: contrato.obra.endereco,
    itens: contrato.itens.map((item) => ({
      nomeEquipamento: item.equipamento.nome,
      numeroPatrimonio: item.equipamento.numeroPatrimonio,
      valorDiaria: item.valorDiaria,
      dias: item.dias,
    })),
    assinaturaImagemBase64,
    dataAssinatura,
  });

  const contratoAtualizado = await prisma.contrato.update({
    where: { id: contrato.id },
    data: {
      status: "ASSINADO",
      dadosPreenchidos: JSON.stringify(dadosPreenchidos),
      assinaturaImagem: assinaturaImagemBase64,
      pdfPath,
      assinadoEm: dataAssinatura,
    },
    include: {
      cliente: { include: { usuario: { select: { nome: true, email: true } } } },
      obra: true,
      itens: { include: { equipamento: true, entrega: true } },
    },
  });

  res.json(contratoAtualizado);
});

contratosRouter.get("/:id/pdf", async (req: RequestAutenticado, res) => {
  const contrato = await buscarContratoCompleto(req.params.id);
  if (!contrato) return res.status(404).json({ erro: "Contrato não encontrado" });
  if (!(await podeAcessarContrato(req, contrato))) {
    return res.status(403).json({ erro: "Acesso não permitido a este contrato" });
  }
  if (!contrato.pdfPath || !fs.existsSync(contrato.pdfPath)) {
    return res.status(404).json({ erro: "PDF do contrato ainda não foi gerado" });
  }

  res.sendFile(contrato.pdfPath);
});
