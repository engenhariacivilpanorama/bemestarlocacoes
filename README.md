# Bem Estar Locações

Aplicativo completo para uma empresa de locação de equipamentos: cadastro de
clientes, obras e equipamentos, contratos de locação preenchidos e assinados
digitalmente pelo cliente, e registro de entregas em campo com foto
georreferenciada.

## Estrutura do projeto

```
backend/   API REST (Node.js + TypeScript + Express + Prisma + SQLite)
web/       Painel da empresa + portal do cliente (React + TypeScript + Vite)
mobile/    App de campo para a equipe de entrega (React Native + Expo)
```

## Como rodar cada parte

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma db push
npx ts-node prisma/seed.ts   # cria o usuário staff inicial (veja o e-mail/senha no terminal)
npm run dev                  # http://localhost:3333
```

Rodar os testes automatizados:

```bash
npm test
```

### Web (painel da empresa + portal do cliente)

```bash
cd web
npm install
cp .env.example .env
npm run dev                  # http://localhost:5173
```

- `/cadastro` — cadastro público de clientes
- `/login` — acesso da equipe (staff) e dos clientes
- `/app/*` — painel da equipe: clientes, obras, equipamentos, contratos
- `/portal/*` — área do cliente: revisar e assinar contratos

### Mobile (app de entrega em campo)

```bash
cd mobile
npm install
npm start
```

Abra no app Expo Go (celular) ou em um emulador. Esse app é usado **apenas
pela equipe de entrega**: login, lista de entregas pendentes, e registro da
entrega com foto da câmera + localização GPS do momento da entrega.

Em um dispositivo físico, edite `mobile/src/lib/api.ts` e troque `localhost`
pelo IP da máquina que roda o backend, na mesma rede Wi-Fi.

## Observações sobre o ambiente de desenvolvimento

- O backend usa **SQLite** em desenvolvimento (arquivo `backend/prisma/dev.db`)
  para não depender de instalar PostgreSQL localmente. Para produção, basta
  trocar o `provider` no `backend/prisma/schema.prisma` para `postgresql` e
  apontar `DATABASE_URL` para o banco real.
- O PDF do contrato é gerado com Puppeteer (Chromium headless), a partir do
  template em `backend/templates/contrato-padrao.html`.
- Fotos de entrega e PDFs de contrato ficam em `backend/uploads/` (fora do
  controle de versão).
