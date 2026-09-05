import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const raizProjeto = path.resolve(__dirname, "../..");
const pastaDestino = path.resolve(__dirname, "../uploads/equipamentos");
fs.mkdirSync(pastaDestino, { recursive: true });

interface EquipamentoSeed {
  arquivo: string;
  nome: string;
  categoria: string;
  numeroPatrimonio: string;
}

const equipamentos: EquipamentoSeed[] = [
  { arquivo: "Andaimes.JPG", nome: "Andaime", categoria: "Andaime", numeroPatrimonio: "EQ-001" },
  { arquivo: "Betoneira400l.JPG", nome: "Betoneira 400L", categoria: "Betoneira", numeroPatrimonio: "EQ-002" },
  { arquivo: "Plataforma.JPG", nome: "Plataforma elevatória", categoria: "Plataforma", numeroPatrimonio: "EQ-003" },
  { arquivo: "banheiro.JPG", nome: "Banheiro químico", categoria: "Banheiro", numeroPatrimonio: "EQ-004" },
  { arquivo: "carretinha.JPG", nome: "Carretinha", categoria: "Carretinha", numeroPatrimonio: "EQ-005" },
  { arquivo: "compactador de solo.JPG", nome: "Compactador de solo", categoria: "Compactador", numeroPatrimonio: "EQ-006" },
  { arquivo: "containers.JPG", nome: "Container", categoria: "Container", numeroPatrimonio: "EQ-007" },
  { arquivo: "esmirilhadeira 9 polegadas.JPG", nome: "Esmerilhadeira 9 polegadas", categoria: "Esmerilhadeira", numeroPatrimonio: "EQ-008" },
  { arquivo: "martelete 11kg.JPG", nome: "Martelete 11kg", categoria: "Martelete", numeroPatrimonio: "EQ-009" },
  { arquivo: "serra marmore.JPG", nome: "Serra mármore", categoria: "Serra", numeroPatrimonio: "EQ-010" },
  { arquivo: "teorre de pintura.JPG", nome: "Torre de pintura", categoria: "Torre", numeroPatrimonio: "EQ-011" },
];

async function main() {
  for (const item of equipamentos) {
    const origem = path.join(raizProjeto, item.arquivo);
    if (!fs.existsSync(origem)) {
      console.warn(`Arquivo não encontrado, pulando: ${item.arquivo}`);
      continue;
    }

    const existente = await prisma.equipamento.findUnique({
      where: { numeroPatrimonio: item.numeroPatrimonio },
    });
    if (existente) {
      console.log(`Já cadastrado, pulando: ${item.nome}`);
      continue;
    }

    const nomeArquivoDestino = `${item.numeroPatrimonio}${path.extname(origem)}`;
    const destino = path.join(pastaDestino, nomeArquivoDestino);
    fs.copyFileSync(origem, destino);

    await prisma.equipamento.create({
      data: {
        nome: item.nome,
        categoria: item.categoria,
        numeroPatrimonio: item.numeroPatrimonio,
        fotoPath: destino,
      },
    });
    console.log(`Cadastrado: ${item.nome} (${item.numeroPatrimonio})`);
  }

  console.log("\nObs.: os números de patrimônio (EQ-001, EQ-002...) são provisórios.");
  console.log("Edite-os no banco ou recadastre com os números reais quando definidos.");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
