import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const emailStaff = "admin@bemestarlocacoes.com.br";

  const existente = await prisma.usuario.findUnique({ where: { email: emailStaff } });
  if (existente) {
    console.log("Usuário staff de exemplo já existe:", emailStaff);
    return;
  }

  const senhaHash = await bcrypt.hash("mude-esta-senha", 10);
  await prisma.usuario.create({
    data: {
      nome: "Administrador",
      email: emailStaff,
      senhaHash,
      papel: "ADMIN",
    },
  });

  console.log("Usuário staff criado:");
  console.log("  email: admin@bemestarlocacoes.com.br");
  console.log("  senha: mude-esta-senha");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
