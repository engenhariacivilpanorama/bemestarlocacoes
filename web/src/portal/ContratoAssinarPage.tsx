import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, baixarArquivo, ApiError } from "../lib/api";
import type { Contrato } from "../lib/tipos";
import { AssinaturaCanvas } from "../components/AssinaturaCanvas";

export function ContratoAssinarPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [observacao, setObservacao] = useState("");
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<Contrato>(`/contratos/${id}`)
      .then(setContrato)
      .catch(() => setErro("Não foi possível carregar o contrato"));
  }, [id]);

  const valorTotal = contrato?.itens?.reduce((soma, item) => soma + item.valorDiaria * item.dias, 0) ?? 0;

  async function aoConfirmar() {
    if (!id) return;
    if (!assinatura) {
      setErro("Desenhe sua assinatura antes de confirmar");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const atualizado = await api<Contrato>(`/contratos/${id}/assinar`, {
        method: "POST",
        body: {
          dadosPreenchidos: { observacao },
          assinaturaImagemBase64: assinatura,
        },
      });
      setContrato(atualizado);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível assinar o contrato");
    } finally {
      setEnviando(false);
    }
  }

  async function aoBaixarPdf() {
    if (!id) return;
    setBaixando(true);
    try {
      await baixarArquivo(`/contratos/${id}/pdf`, `contrato-${id}.pdf`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível baixar o PDF");
    } finally {
      setBaixando(false);
    }
  }

  if (erro && !contrato) return <p className="erro">{erro}</p>;
  if (!contrato) return <p>Carregando…</p>;

  if (contrato.status === "ASSINADO" || contrato.status === "ENCERRADO") {
    return (
      <div className="cartao">
        <h1>{contrato.status === "ENCERRADO" ? "Contrato encerrado" : "Contrato assinado"}</h1>
        <p>
          Seu contrato para a obra <strong>{contrato.obra.nome}</strong>{" "}
          {contrato.status === "ENCERRADO" ? "foi encerrado pela locadora." : "já foi assinado."}
        </p>
        <button onClick={aoBaixarPdf} disabled={baixando}>
          {baixando ? "Baixando…" : "Baixar PDF do contrato"}
        </button>
        <div style={{ marginTop: 12 }}>
          <button className="secundario" onClick={() => navigate("/portal")}>Voltar</button>
        </div>
      </div>
    );
  }

  const precisaDePreco = contrato.itens.some((item) => item.valorDiaria <= 0);
  if (precisaDePreco) {
    return (
      <div className="cartao">
        <h1>Aguardando definição de valores</h1>
        <p>
          Este contrato para a obra <strong>{contrato.obra.nome}</strong> ainda está sendo preparado pela nossa
          equipe. Assim que os valores forem definidos, você poderá revisá-lo e assiná-lo aqui.
        </p>
        <button className="secundario" onClick={() => navigate("/portal")}>Voltar</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Revisar e assinar contrato</h1>
      <div className="cartao">
        <h2 style={{ marginTop: 0 }}>Obra: {contrato.obra.nome}</h2>
        <p>{contrato.obra.endereco}</p>

        <table>
          <thead>
            <tr>
              <th>Equipamento</th>
              <th>Valor diária</th>
              <th>Dias</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {contrato.itens.map((item) => (
              <tr key={item.id}>
                <td>{item.equipamento.nome}</td>
                <td>R$ {item.valorDiaria.toFixed(2)}</td>
                <td>{item.dias}</td>
                <td>R$ {(item.valorDiaria * item.dias).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p><strong>Valor total: R$ {valorTotal.toFixed(2)}</strong></p>
        <p style={{ fontSize: 13, color: "#555" }}>
          {contrato.prorrogacaoAutomatica
            ? "Este contrato tem prorrogação automática: ele continua ativo, sendo cobrado por dia adicional de uso, até que a locadora registre o encerramento no sistema."
            : "Este contrato tem prazo fixo, encerrando-se ao final do período de dias contratado para cada equipamento."}
        </p>
      </div>

      <div className="cartao">
        <h2 style={{ marginTop: 0 }}>Observações (opcional)</h2>
        <textarea
          rows={3}
          style={{ width: "100%" }}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>

      <div className="cartao">
        <h2 style={{ marginTop: 0 }}>Assinatura</h2>
        <p style={{ fontSize: 13, color: "#555" }}>Desenhe sua assinatura no campo abaixo com o mouse ou o dedo.</p>
        <AssinaturaCanvas onAssinaturaChange={setAssinatura} />
      </div>

      {erro && <p className="erro">{erro}</p>}
      <button onClick={aoConfirmar} disabled={enviando}>
        {enviando ? "Enviando…" : "Confirmar e assinar contrato"}
      </button>
    </div>
  );
}
