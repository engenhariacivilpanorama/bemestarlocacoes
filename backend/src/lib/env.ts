import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3333),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  uploadsDir: path.resolve(process.env.UPLOADS_DIR ?? "./uploads"),
  locadora: {
    nome: process.env.LOCADORA_NOME ?? "Bem Estar Locações",
    documento: process.env.LOCADORA_DOCUMENTO ?? "00.000.000/0001-00",
    endereco: process.env.LOCADORA_ENDERECO ?? "Endereço da locadora não configurado",
  },
};
