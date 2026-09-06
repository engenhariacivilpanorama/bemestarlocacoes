import request from "supertest";
import bcrypt from "bcryptjs";
import { criarApp } from "../app";
import { prisma } from "../lib/prisma";

jest.mock("../modules/contratos/gerarPdf", () => ({
  gerarPdfContrato: jest.fn().mockResolvedValue("/tmp/contrato-fake.pdf"),
}));

const app = criarApp();

async function criarStaffELogar(papel: "ADMIN" | "FUNCIONARIO" = "ADMIN") {
  const email = `staff-${Date.now()}-${Math.random()}@teste.com`;
  const senhaHash = await bcrypt.hash("senha123", 10);
  const usuario = await prisma.usuario.create({
    data: { nome: "Staff Teste", email, senhaHash, papel },
  });

  const resposta = await request(app).post("/auth/login").send({ email, senha: "senha123" });
  return { token: resposta.body.token as string, id: usuario.id, email };
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
    const { token } = await criarStaffELogar();
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
    const { token } = await criarStaffELogar();

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

  it("cria várias unidades de uma vez quando quantidade > 1, cada uma com patrimônio próprio", async () => {
    const { token } = await criarStaffELogar();
    const base = `PAT-LOTE-${Date.now()}`;

    const resposta = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Martelete", categoria: "Martelete", numeroPatrimonio: base, quantidade: 3 });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toHaveLength(3);
    expect(resposta.body.map((e: { numeroPatrimonio: string }) => e.numeroPatrimonio)).toEqual([
      `${base}-1`,
      `${base}-2`,
      `${base}-3`,
    ]);
  });

  it("permite editar nome, categoria, patrimônio e status de um equipamento existente", async () => {
    const { token } = await criarStaffELogar();

    const criacao = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Serra", categoria: "Serra", numeroPatrimonio: `PAT-EDIT-${Date.now()}` });

    const edicao = await request(app)
      .patch(`/equipamentos/${criacao.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Serra Mármore", categoria: "Serra de mármore", status: "MANUTENCAO" });

    expect(edicao.status).toBe(200);
    expect(edicao.body.nome).toBe("Serra Mármore");
    expect(edicao.body.categoria).toBe("Serra de mármore");
    expect(edicao.body.status).toBe("MANUTENCAO");
  });

  it("rejeita edição de patrimônio para um valor já usado por outro equipamento", async () => {
    const { token } = await criarStaffELogar();
    const patrimonioExistente = `PAT-EXISTENTE-${Date.now()}`;

    await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Container", categoria: "Container", numeroPatrimonio: patrimonioExistente });

    const outro = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Container", categoria: "Container", numeroPatrimonio: `PAT-OUTRO-${Date.now()}` });

    const edicao = await request(app)
      .patch(`/equipamentos/${outro.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ numeroPatrimonio: patrimonioExistente });

    expect(edicao.status).toBe(409);
  });

  it("remove espaços extras de nome e categoria ao cadastrar", async () => {
    const { token } = await criarStaffELogar();

    const resposta = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "  Furadeira  ",
        categoria: " Furadeira ",
        numeroPatrimonio: `PAT-TRIM-${Date.now()}`,
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.nome).toBe("Furadeira");
    expect(resposta.body.categoria).toBe("Furadeira");
  });
});

describe("Usuários (admin)", () => {
  it("admin pode cadastrar um funcionário, que consegue logar e usar rotas de staff", async () => {
    const { token: tokenAdmin } = await criarStaffELogar("ADMIN");
    const email = `funcionario-${Date.now()}@teste.com`;

    const criacao = await request(app)
      .post("/usuarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ nome: "Funcionário Teste", email, senha: "senha123", papel: "FUNCIONARIO" });
    expect(criacao.status).toBe(201);
    expect(criacao.body.senhaHash).toBeUndefined();

    const login = await request(app).post("/auth/login").send({ email, senha: "senha123" });
    expect(login.status).toBe(200);
    expect(login.body.usuario.papel).toBe("FUNCIONARIO");

    const listaEquipamentos = await request(app)
      .get("/equipamentos")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(listaEquipamentos.status).toBe(200);
  });

  it("funcionário comum não pode cadastrar outros usuários", async () => {
    const { token: tokenAdmin } = await criarStaffELogar("ADMIN");
    const email = `funcionario2-${Date.now()}@teste.com`;
    await request(app)
      .post("/usuarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ nome: "Funcionário 2", email, senha: "senha123", papel: "FUNCIONARIO" });

    const loginFuncionario = await request(app).post("/auth/login").send({ email, senha: "senha123" });

    const tentativa = await request(app)
      .post("/usuarios")
      .set("Authorization", `Bearer ${loginFuncionario.body.token}`)
      .send({ nome: "Outro", email: `outro-${Date.now()}@teste.com`, senha: "senha123", papel: "FUNCIONARIO" });

    expect(tentativa.status).toBe(403);
  });

  it("admin pode desativar um funcionário, que perde o acesso imediatamente", async () => {
    const { token: tokenAdmin } = await criarStaffELogar("ADMIN");
    const email = `funcionario3-${Date.now()}@teste.com`;
    const criacao = await request(app)
      .post("/usuarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ nome: "Funcionário 3", email, senha: "senha123", papel: "FUNCIONARIO" });

    const login = await request(app).post("/auth/login").send({ email, senha: "senha123" });
    const tokenFuncionario = login.body.token;

    const desativacao = await request(app)
      .patch(`/usuarios/${criacao.body.id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ativo: false });
    expect(desativacao.status).toBe(200);
    expect(desativacao.body.ativo).toBe(false);

    const acessoAposDesativar = await request(app)
      .get("/equipamentos")
      .set("Authorization", `Bearer ${tokenFuncionario}`);
    expect(acessoAposDesativar.status).toBe(401);

    const loginAposDesativar = await request(app).post("/auth/login").send({ email, senha: "senha123" });
    expect(loginAposDesativar.status).toBe(401);
  });

  it("admin não pode desativar a própria conta", async () => {
    const { token: tokenAdmin, id: idAdmin } = await criarStaffELogar("ADMIN");

    const resposta = await request(app)
      .patch(`/usuarios/${idAdmin}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ ativo: false });

    expect(resposta.status).toBe(400);
  });

  it("qualquer funcionário pode trocar a própria senha informando a senha atual", async () => {
    const { token, email } = await criarStaffELogar("FUNCIONARIO");

    const troca = await request(app)
      .patch("/usuarios/me/senha")
      .set("Authorization", `Bearer ${token}`)
      .send({ senhaAtual: "senha123", novaSenha: "novaSenha456" });
    expect(troca.status).toBe(204);

    const loginComNovaSenha = await request(app)
      .post("/auth/login")
      .send({ email, senha: "novaSenha456" });
    expect(loginComNovaSenha.status).toBe(200);
  });

  it("admin pode redefinir a senha de um funcionário sem saber a senha atual", async () => {
    const { token: tokenAdmin } = await criarStaffELogar("ADMIN");
    const email = `funcionario4-${Date.now()}@teste.com`;
    const criacao = await request(app)
      .post("/usuarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ nome: "Funcionário 4", email, senha: "senha123", papel: "FUNCIONARIO" });

    const redefinicao = await request(app)
      .patch(`/usuarios/${criacao.body.id}/senha`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ novaSenha: "senhaRedefinida789" });
    expect(redefinicao.status).toBe(204);

    const login = await request(app)
      .post("/auth/login")
      .send({ email, senha: "senhaRedefinida789" });
    expect(login.status).toBe(200);
  });
});

describe("Preço da diária restrito ao admin e encerramento de contrato", () => {
  async function prepararClienteObraEquipamento(tokenStaff: string) {
    const respostaCliente = await registrarCliente();
    const clientePrisma = await prisma.cliente.findUnique({
      where: { usuarioId: respostaCliente.body.usuario.id },
    });
    const respostaObra = await request(app)
      .post("/obras")
      .set("Authorization", `Bearer ${tokenStaff}`)
      .send({ nome: "Obra Preço", endereco: "Rua X", clienteId: clientePrisma!.id });
    const respostaEquipamento = await request(app)
      .post("/equipamentos")
      .set("Authorization", `Bearer ${tokenStaff}`)
      .send({ nome: "Andaime", categoria: "Andaime", numeroPatrimonio: `PAT-PRECO-${Date.now()}-${Math.random()}` });
    return {
      tokenCliente: respostaCliente.body.token as string,
      clienteId: clientePrisma!.id as string,
      obraId: respostaObra.body.id as string,
      equipamentoId: respostaEquipamento.body.id as string,
    };
  }

  it("ignora o valor da diária enviado por um funcionário, criando o item com preço zerado", async () => {
    const { token: tokenAdmin } = await criarStaffELogar("ADMIN");
    const { token: tokenFuncionario } = await criarStaffELogar("FUNCIONARIO");
    const { clienteId, obraId, equipamentoId } = await prepararClienteObraEquipamento(tokenAdmin);

    const resposta = await request(app)
      .post("/contratos")
      .set("Authorization", `Bearer ${tokenFuncionario}`)
      .send({ clienteId, obraId, itens: [{ equipamentoId, valorDiaria: 999, dias: 5 }] });

    expect(resposta.status).toBe(201);
    expect(resposta.body.itens[0].valorDiaria).toBe(0);
  });

  it("não permite o cliente assinar enquanto o preço estiver pendente, e permite depois que o admin definir", async () => {
    const { token: tokenAdmin } = await criarStaffELogar("ADMIN");
    const { token: tokenFuncionario } = await criarStaffELogar("FUNCIONARIO");
    const { tokenCliente, clienteId, obraId, equipamentoId } = await prepararClienteObraEquipamento(tokenAdmin);

    const contrato = await request(app)
      .post("/contratos")
      .set("Authorization", `Bearer ${tokenFuncionario}`)
      .send({ clienteId, obraId, itens: [{ equipamentoId, valorDiaria: 0, dias: 5 }] });

    const tentativaAssinatura = await request(app)
      .post(`/contratos/${contrato.body.id}/assinar`)
      .set("Authorization", `Bearer ${tokenCliente}`)
      .send({ dadosPreenchidos: {}, assinaturaImagemBase64: "data:image/png;base64,AAAA" });
    expect(tentativaAssinatura.status).toBe(400);

    const definicaoPorFuncionario = await request(app)
      .patch(`/contratos/${contrato.body.id}/precos`)
      .set("Authorization", `Bearer ${tokenFuncionario}`)
      .send({ itens: [{ contratoEquipamentoId: contrato.body.itens[0].id, valorDiaria: 60 }] });
    expect(definicaoPorFuncionario.status).toBe(403);

    const definicaoPorAdmin = await request(app)
      .patch(`/contratos/${contrato.body.id}/precos`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ itens: [{ contratoEquipamentoId: contrato.body.itens[0].id, valorDiaria: 60 }] });
    expect(definicaoPorAdmin.status).toBe(200);

    const assinaturaFinal = await request(app)
      .post(`/contratos/${contrato.body.id}/assinar`)
      .set("Authorization", `Bearer ${tokenCliente}`)
      .send({ dadosPreenchidos: {}, assinaturaImagemBase64: "data:image/png;base64,AAAA" });
    expect(assinaturaFinal.status).toBe(200);
  });

  it("só admin encerra o contrato, o que libera os equipamentos entregues", async () => {
    const { token: tokenAdmin } = await criarStaffELogar("ADMIN");
    const { token: tokenFuncionario } = await criarStaffELogar("FUNCIONARIO");
    const { tokenCliente, clienteId, obraId, equipamentoId } = await prepararClienteObraEquipamento(tokenAdmin);

    const contrato = await request(app)
      .post("/contratos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ clienteId, obraId, prorrogacaoAutomatica: true, itens: [{ equipamentoId, valorDiaria: 40, dias: 3 }] });

    await request(app)
      .post(`/contratos/${contrato.body.id}/assinar`)
      .set("Authorization", `Bearer ${tokenCliente}`)
      .send({ dadosPreenchidos: {}, assinaturaImagemBase64: "data:image/png;base64,AAAA" });

    await request(app)
      .post(`/entregas/${contrato.body.itens[0].id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .field("latitude", "-23.5")
      .field("longitude", "-46.6")
      .attach("foto", Buffer.from("fake"), "foto.jpg");

    const tentativaFuncionario = await request(app)
      .post(`/contratos/${contrato.body.id}/encerrar`)
      .set("Authorization", `Bearer ${tokenFuncionario}`);
    expect(tentativaFuncionario.status).toBe(403);

    const encerramento = await request(app)
      .post(`/contratos/${contrato.body.id}/encerrar`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(encerramento.status).toBe(200);
    expect(encerramento.body.status).toBe("ENCERRADO");

    const equipamentoAtualizado = await prisma.equipamento.findUnique({ where: { id: equipamentoId } });
    expect(equipamentoAtualizado?.status).toBe("DISPONIVEL");
  });
});

describe("Fluxo completo de contrato e entrega", () => {
  it("cria contrato, cliente assina, staff registra a entrega e o equipamento fica LOCADO", async () => {
    const { token: tokenStaff } = await criarStaffELogar();

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
    const { token: tokenStaff } = await criarStaffELogar();
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
