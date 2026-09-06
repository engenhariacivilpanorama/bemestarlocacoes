import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, baixarArquivo, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Contrato } from "../lib/tipos";

export function ContratoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);

  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [salvandoPrecos, setSalvandoPrecos] = useState(false);
  const [erroPrecos, setErroPrecos] = useState<string | null>(null);

  function carregar() {
    if (!id) return;
    api<Contrato>(`/contratos/${id}`)
      .then((dados) => {
        setContrato(dados);
        setPrecos(Object.fromEntries(dados.itens.map((item) => [item.id, String(item.valorDiaria || "")])));
      })
      .catch(() => setErro("Não foi possível carregar o contrato"));
  }

  useEffect(carregar, [id]);

  async function aoBaixarPdf() {
    if (!id) return;
    setBaixando(true);
    setErro(null);
    try {
      await baixarArquivo(`/contratos/${id}/pdf`, `contrato-${id}.pdf`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível baixar o PDF");
    } finally {
      setBaixando(false);
    }
  }

  async function salvarPrecos() {
    if (!id || !contrato) return;
    setErroPrecos(null);
    setSalvandoPrecos(true);
    try {
      await api(`/contratos/${id}/precos`, {
        method: "PATCH",
        body: {
          itens: contrato.itens.map((item) => ({
            contratoEquipamentoId: item.id,
            valorDiaria: Number(precos[item.id] || 0),
          })),
        },
      });
      carregar();
    } catch (e) {
      setErroPrecos(e instanceof ApiError ? e.message : "Não foi possível salvar os valores");
    } finally {
      setSalvandoPrecos(false);
    }
  }

  async function aoEncerrar() {
    if (!id) return;
    if (!window.confirm("Encerrar este contrato? Os equipamentos entregues voltarão a ficar disponíveis.")) return;
    setEncerrando(true);
    setErro(null);
    try {
      const atualizado = await api<Contrato>(`/contratos/${id}/encerrar`, { method: "POST" });
      setContrato(atualizado);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível encerrar o contrato");
    } finally {
      setEncerrando(false);
    }
  }

  if (erro) return <p className="erro">{erro}</p>;
  if (!contrato) return <p>Carregando…</p>;

  const precisaDePreco = contrato.itens.some((item) => item.valorDiaria <= 0);
  const podeDefinirPreco = usuario?.papel === "ADMIN";

  return (
    <div>
      <h1>Contrato — {contrato.obra.nome}</h1>
      <div className="cartao">
        <p><strong>Cliente:</strong> {contrato.cliente?.usuario.nome}</p>
        <p><strong>Obra:</strong> {contrato.obra.nome} — {contrato.obra.endereco}</p>
        <p><strong>Status:</strong> {contrato.status}</p>
        <p>
          <strong>Prorrogação automática:</strong>{" "}
          {contrato.prorrogacaoAutomatica
            ? "Sim — permanece ativo até ser encerrado por um administrador"
            : "Não — prazo fixo por equipamento"}
        </p>
        {contrato.encerradoEm && (
          <p><strong>Encerrado em:</strong> {new Date(contrato.encerradoEm).toLocaleString("pt-BR")}</p>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {contrato.status === "ASSINADO" && (
            <button onClick={aoBaixarPdf} disabled={baixando}>
              {baixando ? "Baixando…" : "Baixar PDF do contrato"}
            </button>
          )}
          {contrato.status === "ASSINADO" && podeDefinirPreco && (
            <button className="secundario" onClick={aoEncerrar} disabled={encerrando}>
              {encerrando ? "Encerrando…" : "Encerrar contrato"}
            </button>
          )}
        </div>
      </div>

      {contrato.status === "RASCUNHO" && precisaDePreco && podeDefinirPreco && (
        <div className="cartao">
          <h2 style={{ marginTop: 0 }}>Definir valores da diária</h2>
          <p style={{ fontSize: 13, color: "#555" }}>
            Este contrato foi montado por um funcionário e ainda não tem preços. Defina o valor da diária de cada
            equipamento antes que o cliente possa assiná-lo.
          </p>
          {contrato.itens.map((item) => (
            <div key={item.id} className="form-grupo">
              <label>{item.equipamento.nome} ({item.equipamento.numeroPatrimonio}) — {item.dias} dia(s)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={precos[item.id] ?? ""}
                onChange={(e) => setPrecos({ ...precos, [item.id]: e.target.value })}
              />
            </div>
          ))}
          {erroPrecos && <p className="erro">{erroPrecos}</p>}
          <button onClick={salvarPrecos} disabled={salvandoPrecos}>
            {salvandoPrecos ? "Salvando…" : "Salvar valores"}
          </button>
        </div>
      )}
      {contrato.status === "RASCUNHO" && precisaDePreco && !podeDefinirPreco && (
        <div className="cartao">
          <p className="erro" style={{ margin: 0 }}>
            Este contrato ainda está aguardando um administrador definir o valor da diária.
          </p>
        </div>
      )}

      <div className="cartao">
        <h2 style={{ marginTop: 0 }}>Equipamentos</h2>
        <table>
          <thead>
            <tr>
              <th>Equipamento</th>
              <th>Patrimônio</th>
              <th>Valor diária</th>
              <th>Dias</th>
              <th>Entrega</th>
            </tr>
          </thead>
          <tbody>
            {contrato.itens.map((item) => (
              <tr key={item.id}>
                <td>{item.equipamento.nome}</td>
                <td>{item.equipamento.numeroPatrimonio}</td>
                <td>{item.valorDiaria > 0 ? `R$ ${item.valorDiaria.toFixed(2)}` : "Pendente"}</td>
                <td>{item.dias}</td>
                <td>
                  {item.entrega
                    ? `Entregue em ${new Date(item.entrega.dataHora).toLocaleString("pt-BR")}`
                    : "Pendente"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
