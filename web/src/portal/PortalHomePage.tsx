import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Contrato } from "../lib/tipos";

export function PortalHomePage() {
  const [contratos, setContratos] = useState<Contrato[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api<Contrato[]>("/contratos")
      .then(setContratos)
      .catch(() => setErro("Não foi possível carregar seus contratos"));
  }, []);

  return (
    <div>
      <h1>Meus contratos</h1>
      {erro && <p className="erro">{erro}</p>}
      {!contratos && !erro && <p>Carregando…</p>}
      {contratos?.length === 0 && (
        <p>Você ainda não tem contratos. Assim que a equipe criar um contrato para você, ele aparecerá aqui.</p>
      )}
      {contratos?.map((contrato) => (
        <div key={contrato.id} className="cartao">
          <p><strong>Obra:</strong> {contrato.obra.nome}</p>
          <p>
            <strong>Status:</strong>{" "}
            <span
              className={`badge ${
                contrato.status === "ASSINADO" ? "assinado" : contrato.status === "ENCERRADO" ? "manutencao" : "rascunho"
              }`}
            >
              {contrato.status === "ASSINADO"
                ? "Assinado"
                : contrato.status === "ENCERRADO"
                  ? "Encerrado"
                  : "Aguardando assinatura"}
            </span>
          </p>
          <p>{contrato.itens.length} equipamento(s)</p>
          {contrato.status === "RASCUNHO" ? (
            <Link to={`/portal/contratos/${contrato.id}`}>
              <button>Revisar e assinar</button>
            </Link>
          ) : (
            <Link to={`/portal/contratos/${contrato.id}`}>Ver contrato</Link>
          )}
        </div>
      ))}
    </div>
  );
}
