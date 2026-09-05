import "express-async-errors";
import express, { ErrorRequestHandler } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { authRouter } from "./modules/auth/auth.routes";
import { clientesRouter } from "./modules/clientes/clientes.routes";
import { obrasRouter } from "./modules/obras/obras.routes";
import { equipamentosRouter } from "./modules/equipamentos/equipamentos.routes";
import { contratosRouter } from "./modules/contratos/contratos.routes";
import { entregasRouter } from "./modules/entregas/entregas.routes";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes";

export function criarApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRouter);
  app.use("/clientes", clientesRouter);
  app.use("/obras", obrasRouter);
  app.use("/equipamentos", equipamentosRouter);
  app.use("/contratos", contratosRouter);
  app.use("/entregas", entregasRouter);
  app.use("/usuarios", usuariosRouter);

  const tratarErros: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ erro: "Dados inválidos", detalhes: err.issues });
    }
    console.error(err);
    res.status(500).json({ erro: "Erro interno do servidor" });
  };
  app.use(tratarErros);

  return app;
}
