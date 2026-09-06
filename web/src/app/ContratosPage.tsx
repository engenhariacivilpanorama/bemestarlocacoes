import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Cliente, Contrato, Equipamento, Obra } from "../lib/tipos";
import { SeletorEquipamentos, type ItemSelecionado } from "../components/SeletorEquipamentos";

function classeBadge(status: Contrato["status"]) {
  return status === "ASSINADO" ? "assinado" : "rascunho";
}

export function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [obraId, setObraId] = useState("");
  const [itens, setItens] = useState<ItemSelecionado[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function carregarContratos() {
    api<Contrato[]>("/contratos")
      .then(setContratos)
      .catch(() => setErro("Não foi possível carregar os contratos"));
  }

  function carregarEquipamentos() {
    api<Equipamento[]>("/equipamentos?status=DISPONIVEL").then(setEquipamentos).catch(() => {});
  }

  useEffect(() => {
    carregarContratos();
    api<Cliente[]>("/clientes").then(setClientes).catch(() => {});
    api<Obra[]>("/obras").then(setObras).catch(() => {});
    carregarEquipamentos();
  }, []);

  const obrasDoCliente = obras.filter((o) => o.clienteId === clienteId);

  async function aoCriar(evento: FormEvent) {
    evento.preventDefault();
    if (itens.length === 0) {
      setErro("Selecione ao menos um equipamento");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await api("/contratos", {
        method: "POST",
        body: { clienteId, obraId, itens },
      });
      setClienteId("");
      setObraId("");
      setItens([]);
      carregarContratos();
      carregarEquipamentos();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível criar o contrato");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h1>Contratos</h1>

      <form onSubmit={aoCriar} className="cartao">
        <h2 style={{ marginTop: 0 }}>Novo contrato</h2>

        <div className="form-grupo">
          <label>Cliente</label>
          <select value={clienteId} onChange={(e) => { setClienteId(e.target.value); setObraId(""); }} required>
            <option value="">Selecione um cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.usuario.nome}</option>
            ))}
          </select>
        </div>

        <div className="form-grupo">
          <label>Obra</label>
          <select value={obraId} onChange={(e) => setObraId(e.target.value)} required disabled={!clienteId}>
            <option value="">Selecione uma obra</option>
            {obrasDoCliente.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
          {clienteId && obrasDoCliente.length === 0 && (
            <span style={{ fontSize: 12, color: "#888" }}>Este cliente ainda não tem obras cadastradas.</span>
          )}
        </div>

        <h3>Equipamentos</h3>
        <SeletorEquipamentos equipamentos={equipamentos} onChange={setItens} />

        {erro && <p className="erro" style={{ marginTop: 12 }}>{erro}</p>}
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={enviando}>
            {enviando ? "Criando…" : "Criar contrato"}
          </button>
        </div>
      </form>

      <div className="cartao">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Obra</th>
              <th>Status</th>
              <th>Criado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((contrato) => (
              <tr key={contrato.id}>
                <td>{contrato.cliente?.usuario.nome}</td>
                <td>{contrato.obra.nome}</td>
                <td><span className={`badge ${classeBadge(contrato.status)}`}>{contrato.status}</span></td>
                <td>{new Date(contrato.criadoEm).toLocaleDateString("pt-BR")}</td>
                <td><Link to={`/app/contratos/${contrato.id}`}>Ver</Link></td>
              </tr>
            ))}
            {contratos.length === 0 && (
              <tr><td colSpan={5}>Nenhum contrato criado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
