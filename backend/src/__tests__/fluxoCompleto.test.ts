import request from "supertest";
import bcrypt from "bcryptjs";
import { criarApp } from "../app";
import { prisma } from "../lib/prisma";

jest.mock("../modules/contratos/gerarPdf", () => ({
  gerarPdfContrato: jest.fn().mockResolvedValue("/tmp/contrato-fake.pdf"),
}));

const app = criarApp();

async function criarStaffELogar() {
  const email = `staff-${Date.now()}-${Math.random()}@teste.com`;
  const senhaHash = await bcrypt.hash("senha123", 10);
  await prisma.usuario.create({
    data: { nome: "Staff Teste", email, senhaHash, papel: "STAFF" },
  });

  const resposta = await request(app).post("/auth/login").send({ email, senha: "senha123" });
  return resposta.body.token as string;
}

async function registrarCliente() {
  const email = `cliente-${Date.now()}-${Math.random()}@teste.com`;
  const resposta = await request(app).post("/auth/registro-cliente").send({
    nome: "Cliente Teste",
    email,
    senha: "senha123",
    documento: "123.456.789-00",
    telefone: "11999999999",
    endereco: "Rua do Cliente, 1",
  });
  return resposta;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Autenticação", () => {
  it("registra um cliente e permite login", async () => {
    const respostaRegistro = await registrarCliente();
    expect(respostaRegistro.status).toBe(201);
    expect(respostaRegistro.body.token).toBeDefined();
  });

  it("rejeita login com senha incorreta", async () => {
    const respostaRegistro = await registrarCliente();
    const email = respostaRegistro.body.usuario.email;

    const respostaLogin = await request(app)
      .post("/auth/login")
      .send({ email, senha: "senha-errada" });

    expect(respostaLogin.status).toBe(401);
  });
});

describe("Equipamentos", () => {
  it("staff pode cadastrar equipamento, e patrimônio duplicado é rejeitado", async () => {
    const token = await criarStaffELogar();
    const patrimonio = `PAT-${Date.now()}`;

    const primeiraCriacao = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Betoneira 400L", categoria: "Betoneira", numeroPatrimonio: patrimonio });
    expect(primeiraCriacao.status).toBe(201);

    const duplicada = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Betoneira 400L", categoria: "Betoneira", numeroPatrimonio: patrimonio });
    expect(duplicada.status).toBe(409);
  });

  it("cliente autenticado não pode cadastrar equipamento", async () => {
    const respostaRegistro = await registrarCliente();
    const tokenCliente = respostaRegistro.body.token;

    const resposta = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${tokenCliente}`)
      .send({ nome: "Betoneira 400L", categoria: "Betoneira", numeroPatrimonio: `PAT-${Date.now()}` });

    expect(resposta.status).toBe(403);
  });

  it("aceita uma foto opcional e a disponibiliza para download autenticado", async () => {
    const token = await criarStaffELogar();

    const criacao = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${token}`)
      .field("nome", "Andaime")
      .field("categoria", "Andaime")
      .field("numeroPatrimonio", `PAT-${Date.now()}-${Math.random()}`)
      .attach("foto", Buffer.from("conteudo-fake-de-imagem"), "andaime.jpg");

    expect(criacao.status).toBe(201);
    expect(criacao.body.fotoPath).toBeTruthy();

    const foto = await request(app)
      .get(`/equipamentos/${criacao.body.id}/foto`)
      .set("Authorization", `Bearer ${token}`);
    expect(foto.status).toBe(200);
  });
});

describe("Fluxo completo de contrato e entrega", () => {
  it("cria contrato, cliente assina, staff registra a entrega e o equipamento fica LOCADO", async () => {
    const tokenStaff = await criarStaffELogar();

    const respostaCliente = await registrarCliente();
    const tokenCliente = respostaCliente.body.token;
    const clientePrisma = await prisma.cliente.findUnique({
      where: { usuarioId: respostaCliente.body.usuario.id },
    });

    const respostaObra = await request(app)
      .post("/obras")
      .set("Authorization", `Bearer ${tokenStaff}`)
      .send({ nome: "Obra Teste", endereco: "Rua da Obra, 1", clienteId: clientePrisma!.id });
    expect(respostaObra.status).toBe(201);

    const respostaEquipamento = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${tokenStaff}`)
      .send({
        nome: "Andaime",
        categoria: "Andaime",
        numeroPatrimonio: `PAT-${Date.now()}-${Math.random()}`,
      });
    expect(respostaEquipamento.status).toBe(201);

    const respostaContrato = await request(app)
      .post("/contratos")
      .set("Authorization", `Bearer ${tokenStaff}`)
      .send({
        clienteId: clientePrisma!.id,
        obraId: respostaObra.body.id,
        itens: [
          {
            equipamentoId: respostaEquipamento.body.id,
            valorDiaria: 50,
            dias: 10,
          },
        ],
      });
    expect(respostaContrato.status).toBe(201);
    expect(respostaContrato.body.status).toBe("RASCUNHO");

    const contratoEquipamentoId = respostaContrato.body.itens[0].id;

    const respostaAssinatura = await request(app)
      .post(`/contratos/${respostaContrato.body.id}/assinar`)
      .set("Authorization", `Bearer ${tokenCliente}`)
      .send({
        dadosPreenchidos: { observacao: "Sem observações" },
        assinaturaImagemBase64: "data:image/png;base64,AAAA",
      });
    expect(respostaAssinatura.status).toBe(200);
    expect(respostaAssinatura.body.status).toBe("ASSINADO");

    const respostaEntrega = await request(app)
      .post(`/entregas/${contratoEquipamentoId}`)
      .set("Authorization", `Bearer ${tokenStaff}`)
      .field("latitude", "-23.55052")
      .field("longitude", "-46.633308")
      .attach("foto", Buffer.from("conteudo-fake-de-imagem"), "entrega.jpg");

    expect(respostaEntrega.status).toBe(201);

    const equipamentoAtualizado = await prisma.equipamento.findUnique({
      where: { id: respostaEquipamento.body.id },
    });
    expect(equipamentoAtualizado?.status).toBe("LOCADO");

    const segundaEntrega = await request(app)
      .post(`/entregas/${contratoEquipamentoId}`)
      .set("Authorization", `Bearer ${tokenStaff}`)
      .field("latitude", "-23.55052")
      .field("longitude", "-46.633308")
      .attach("foto", Buffer.from("conteudo-fake-de-imagem"), "entrega2.jpg");

    expect(segundaEntrega.status).toBe(409);
  });

  it("não permite registrar entrega antes do contrato ser assinado", async () => {
    const tokenStaff = await criarStaffELogar();
    const respostaCliente = await registrarCliente();
    const clientePrisma = await prisma.cliente.findUnique({
      where: { usuarioId: respostaCliente.body.usuario.id },
    });

    const respostaObra = await request(app)
      .post("/obras")
      .set("Authorization", `Bearer ${tokenStaff}`)
      .send({ nome: "Obra 2", endereco: "Rua 2", clienteId: clientePrisma!.id });

    const respostaEquipamento = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${tokenStaff}`)
      .send({
        nome: "Compactador",
        categoria: "Compactador",
        numeroPatrimonio: `PAT-${Date.now()}-${Math.random()}`,
      });

    const respostaContrato = await request(app)
      .post("/contratos")
      .set("Authorization", `Bearer ${tokenStaff}`)
      .send({
        clienteId: clientePrisma!.id,
        obraId: respostaObra.body.id,
        itens: [{ equipamentoId: respostaEquipamento.body.id, valorDiaria: 30, dias: 5 }],
      });

    const contratoEquipamentoId = respostaContrato.body.itens[0].id;

    const respostaEntrega = await request(app)
      .post(`/entregas/${contratoEquipamentoId}`)
      .set("Authorization", `Bearer ${tokenStaff}`)
      .field("latitude", "-23.5")
      .field("longitude", "-46.6")
      .attach("foto", Buffer.from("conteudo-fake"), "entrega.jpg");

    expect(respostaEntrega.status).toBe(409);
  });
});
