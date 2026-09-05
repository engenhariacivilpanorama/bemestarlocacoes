import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, baixarArquivo, ApiError } from "../lib/api";
import type { Contrato } from "../lib/tipos";

export function ContratoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<Contrato>(`/contratos/${id}`)
      .then(setContrato)
      .catch(() => setErro("Não foi possível carregar o contrato"));
  }, [id]);

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

  if (erro) return <p className="erro">{erro}</p>;
  if (!contrato) return <p>Carregando…</p>;

  return (
    <div>
      <h1>Contrato — {contrato.obra.nome}</h1>
      <div className="cartao">
        <p><strong>Cliente:</strong> {contrato.cliente?.usuario.nome}</p>
        <p><strong>Obra:</strong> {contrato.obra.nome} — {contrato.obra.endereco}</p>
        <p><strong>Status:</strong> {contrato.status}</p>
        {contrato.status === "ASSINADO" && (
          <button onClick={aoBaixarPdf} disabled={baixando}>
            {baixando ? "Baixando…" : "Baixar PDF do contrato"}
          </button>
        )}
      </div>

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
                <td>R$ {item.valorDiaria.toFixed(2)}</td>
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
