import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { env } from "../../lib/env";

export interface ItemContratoParaPdf {
  nomeEquipamento: string;
  numeroPatrimonio: string;
  valorDiaria: number;
  dias: number;
}

export interface DadosContratoParaPdf {
  contratoId: string;
  locadoraNome: string;
  locadoraDocumento: string;
  locadoraEndereco: string;
  clienteNome: string;
  clienteDocumento: string;
  clienteTelefone: string;
  clienteEndereco: string;
  obraNome: string;
  obraEndereco: string;
  prorrogacaoAutomatica: boolean;
  itens: ItemContratoParaPdf[];
  assinaturaImagemBase64: string;
  dataAssinatura: Date;
}

const TEMPLATE_PATH = path.resolve(__dirname, "../../../templates/contrato-padrao.html");

function formatarMoeda(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

function montarHtml(dados: DadosContratoParaPdf): string {
  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

  const linhasEquipamentos = dados.itens
    .map((item) => {
      const subtotal = item.valorDiaria * item.dias;
      return `<tr>
        <td>${item.nomeEquipamento}</td>
        <td>${item.numeroPatrimonio}</td>
        <td>${formatarMoeda(item.valorDiaria)}</td>
        <td>${item.dias}</td>
        <td>${formatarMoeda(subtotal)}</td>
      </tr>`;
    })
    .join("\n");

  const valorTotal = dados.itens.reduce(
    (soma, item) => soma + item.valorDiaria * item.dias,
    0
  );

  return template
    .replaceAll("{{locadoraNome}}", dados.locadoraNome)
    .replaceAll("{{locadoraDocumento}}", dados.locadoraDocumento)
    .replaceAll("{{locadoraEndereco}}", dados.locadoraEndereco)
    .replaceAll("{{clienteNome}}", dados.clienteNome)
    .replaceAll("{{clienteDocumento}}", dados.clienteDocumento)
    .replaceAll("{{clienteTelefone}}", dados.clienteTelefone)
    .replaceAll("{{clienteEndereco}}", dados.clienteEndereco)
    .replaceAll("{{obraNome}}", dados.obraNome)
    .replaceAll("{{obraEndereco}}", dados.obraEndereco)
    .replaceAll("{{linhasEquipamentos}}", linhasEquipamentos)
    .replaceAll("{{valorTotal}}", formatarMoeda(valorTotal))
    .replaceAll(
      "{{clausulaProrrogacao}}",
      dados.prorrogacaoAutomatica
        ? "4.6. Este contrato possui PRORROGAÇÃO AUTOMÁTICA autorizada pelo(a) LOCATÁRIO(A): a locação continua em vigor, sendo cobrada por dia adicional de uso, até que a LOCADORA registre o encerramento do contrato no sistema, momento em que a devolução dos equipamentos deverá estar confirmada."
        : "4.6. Este contrato tem prazo fixo, encerrando-se automaticamente ao final do período de dias contratado para cada equipamento."
    )
    .replaceAll("{{assinaturaImagemSrc}}", dados.assinaturaImagemBase64)
    .replaceAll("{{dataAssinatura}}", dados.dataAssinatura.toLocaleString("pt-BR"));
}

export async function gerarPdfContrato(dados: DadosContratoParaPdf): Promise<string> {
  const html = montarHtml(dados);

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pastaDestino = path.join(env.uploadsDir, "contratos");
    fs.mkdirSync(pastaDestino, { recursive: true });
    const caminhoArquivo = path.join(pastaDestino, `${dados.contratoId}.pdf`);

    await page.pdf({ path: caminhoArquivo, format: "A4", printBackground: true });
    return caminhoArquivo;
  } finally {
    await browser.close();
  }
}
