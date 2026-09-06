import { useEffect, useMemo, useState } from "react";
import type { Equipamento } from "../lib/tipos";
import { FotoAutenticada } from "./FotoAutenticada";

export interface ItemSelecionado {
  equipamentoId: string;
  valorDiaria: number;
  dias: number;
}

interface Tipo {
  chave: string;
  nome: string;
  categoria: string;
  fotoId: string | null;
  ids: string[];
}

interface SelecaoTipo {
  quantidade: number;
  valorDiaria: string;
  dias: string;
}

export function SeletorEquipamentos({
  equipamentos,
  onChange,
}: {
  equipamentos: Equipamento[];
  onChange: (itens: ItemSelecionado[]) => void;
}) {
  const tipos = useMemo<Tipo[]>(() => {
    const mapa = new Map<string, Tipo>();
    for (const eq of equipamentos) {
      const chave = `${eq.nome}::${eq.categoria}`;
      const existente = mapa.get(chave);
      if (existente) {
        existente.ids.push(eq.id);
      } else {
        mapa.set(chave, {
          chave,
          nome: eq.nome,
          categoria: eq.categoria,
          fotoId: eq.fotoPath ? eq.id : null,
          ids: [eq.id],
        });
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [equipamentos]);

  const categorias = useMemo(() => {
    const unicas = Array.from(new Set(tipos.map((t) => t.categoria)));
    return unicas.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [tipos]);

  const [abaAtiva, setAbaAtiva] = useState<string | null>(null);
  useEffect(() => {
    if (!abaAtiva && categorias.length > 0) setAbaAtiva(categorias[0]);
    if (abaAtiva && !categorias.includes(abaAtiva)) setAbaAtiva(categorias[0] ?? null);
  }, [categorias, abaAtiva]);

  const [selecoes, setSelecoes] = useState<Record<string, SelecaoTipo>>({});

  useEffect(() => {
    const itens: ItemSelecionado[] = [];
    for (const tipo of tipos) {
      const selecao = selecoes[tipo.chave];
      if (!selecao || selecao.quantidade <= 0) continue;
      const valorDiaria = Number(selecao.valorDiaria);
      const dias = Number(selecao.dias);
      if (!valorDiaria || !dias) continue;
      const idsEscolhidos = tipo.ids.slice(0, selecao.quantidade);
      for (const id of idsEscolhidos) {
        itens.push({ equipamentoId: id, valorDiaria, dias });
      }
    }
    onChange(itens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecoes, tipos]);

  function alterarQuantidade(tipo: Tipo, delta: number) {
    setSelecoes((atual) => {
      const atualDoTipo = atual[tipo.chave] ?? { quantidade: 0, valorDiaria: "", dias: "1" };
      const novaQuantidade = Math.max(0, Math.min(tipo.ids.length, atualDoTipo.quantidade + delta));
      return { ...atual, [tipo.chave]: { ...atualDoTipo, quantidade: novaQuantidade } };
    });
  }

  function alterarCampo(tipo: Tipo, campo: "valorDiaria" | "dias", valor: string) {
    setSelecoes((atual) => {
      const atualDoTipo = atual[tipo.chave] ?? { quantidade: 0, valorDiaria: "", dias: "1" };
      return { ...atual, [tipo.chave]: { ...atualDoTipo, [campo]: valor } };
    });
  }

  const tiposDaAba = tipos.filter((t) => t.categoria === abaAtiva);
  const totalSelecionado = Object.values(selecoes).reduce((soma, s) => soma + (s?.quantidade ?? 0), 0);

  if (tipos.length === 0) {
    return <p style={{ color: "#888" }}>Nenhum equipamento disponível no momento.</p>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          overflowX: "auto",
          borderBottom: "1px solid var(--cor-borda)",
          marginBottom: 12,
        }}
      >
        {categorias.map((categoria) => {
          const ativa = categoria === abaAtiva;
          const quantidadeSelecionadaNaCategoria = tipos
            .filter((t) => t.categoria === categoria)
            .reduce((soma, t) => soma + (selecoes[t.chave]?.quantidade ?? 0), 0);
          return (
            <button
              key={categoria}
              type="button"
              onClick={() => setAbaAtiva(categoria)}
              style={{
                background: "transparent",
                color: ativa ? "var(--cor-primaria)" : "#555",
                borderRadius: 0,
                borderBottom: ativa ? "2px solid var(--cor-primaria)" : "2px solid transparent",
                padding: "8px 14px",
                fontWeight: ativa ? 700 : 500,
                whiteSpace: "nowrap",
              }}
            >
              {categoria}
              {quantidadeSelecionadaNaCategoria > 0 && ` · ${quantidadeSelecionadaNaCategoria} sel.`}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {tiposDaAba.map((tipo) => {
          const selecao = selecoes[tipo.chave];
          const quantidade = selecao?.quantidade ?? 0;
          const selecionado = quantidade > 0;
          return (
            <div
              key={tipo.chave}
              className="cartao"
              style={{
                margin: 0,
                border: selecionado ? "2px solid var(--cor-primaria)" : "1px solid var(--cor-borda)",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {tipo.fotoId && (
                  <FotoAutenticada rota={`/equipamentos/${tipo.fotoId}/foto`} alt={tipo.nome} tamanho={56} />
                )}
                <div>
                  <strong>{tipo.nome}</strong>
                  <div style={{ fontSize: 12, color: "#666" }}>{tipo.ids.length} disponível(is)</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="secundario"
                  onClick={() => alterarQuantidade(tipo, -1)}
                  disabled={quantidade === 0}
                  style={{ padding: "4px 12px" }}
                >
                  −
                </button>
                <strong style={{ minWidth: 20, textAlign: "center" }}>{quantidade}</strong>
                <button
                  type="button"
                  className="secundario"
                  onClick={() => alterarQuantidade(tipo, 1)}
                  disabled={quantidade >= tipo.ids.length}
                  style={{ padding: "4px 12px" }}
                >
                  +
                </button>
              </div>

              {selecionado && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <div className="form-grupo" style={{ flex: 1, marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Valor diária (R$)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={selecao?.valorDiaria ?? ""}
                      onChange={(e) => alterarCampo(tipo, "valorDiaria", e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-grupo" style={{ flex: 1, marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Dias</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={selecao?.dias ?? "1"}
                      onChange={(e) => alterarCampo(tipo, "dias", e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 12, fontSize: 13, color: "#555" }}>
        {totalSelecionado === 0
          ? "Nenhum equipamento selecionado ainda."
          : `${totalSelecionado} unidade(s) selecionada(s) no total.`}
      </p>
    </div>
  );
}
