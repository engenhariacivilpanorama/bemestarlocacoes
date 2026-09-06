import { criarApp } from "./app";
import { env } from "./lib/env";

const app = criarApp();

app.listen(env.port, () => {
  console.log(`Backend rodando em http://localhost:${env.port}`);
});
