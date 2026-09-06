import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { STATUS_EQUIPAMENTO, type Equipamento } from "../lib/tipos";
import { FotoAutenticada } from "../components/FotoAutenticada";

function classeBadge(status: Equipamento["status"]) {
  return { DISPONIVEL: "disponivel", LOCADO: "locado", MANUTENCAO: "manutencao" }[status];
}

interface FormEdicao {
  nome: string;
  categoria: string;
  numeroPatrimonio: string;
  status: Equipamento["status"];
}

export function EquipamentosPage() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [form, setForm] = useState({ nome: "", categoria: "", numeroPatrimonio: "", quantidade: "1" });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formEdicao, setFormEdicao] = useState<FormEdicao | null>(null);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const inputFotoEdicaoRef = useRef<HTMLInputElement>(null);

  const [abaAtiva, setAbaAtiva] = useState<string | null>(null);

  async function carregar() {
    try {
      const dados = await api<Equipamento[]>("/equipamentos");
      setEquipamentos(dados);
      return dados;
    } catch {
      setErro("Não foi possível carregar os equipamentos");
      return [];
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const categorias = useMemo(() => {
    const unicas = Array.from(new Set(equipamentos.map((e) => e.categoria)));
    return unicas.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [equipamentos]);

  useEffect(() => {
    if (abaAtiva && !categorias.includes(abaAtiva)) {
      setAbaAtiva(null);
    }
    if (!abaAtiva && categorias.length > 0) {
      setAbaAtiva(categorias[0]);
    }
  }, [categorias, abaAtiva]);

  const equipamentosDaAba = equipamentos.filter((e) => e.categoria === abaAtiva);

  async function aoCriar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("nome", form.nome);
      formData.append("categoria", form.categoria);
      formData.append("numeroPatrimonio", form.numeroPatrimonio);
      formData.append("quantidade", form.quantidade || "1");
      const arquivo = inputFotoRef.current?.files?.[0];
      if (arquivo) formData.append("foto", arquivo);

      await api("/equipamentos", { method: "POST", body: formData, isFormData: true });
      const categoriaCriada = form.categoria;
      setForm({ nome: "", categoria: "", numeroPatrimonio: "", quantidade: "1" });
      if (inputFotoRef.current) inputFotoRef.current.value = "";
      await carregar();
      setAbaAtiva(categoriaCriada);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível cadastrar o equipamento");
    } finally {
      setEnviando(false);
    }
  }

  function iniciarEdicao(equipamento: Equipamento) {
    setEditandoId(equipamento.id);
    setErroEdicao(null);
    setFormEdicao({
      nome: equipamento.nome,
      categoria: equipamento.categoria,
      numeroPatrimonio: equipamento.numeroPatrimonio,
      status: equipamento.status,
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setFormEdicao(null);
    setErroEdicao(null);
  }

  async function salvarEdicao(evento: FormEvent) {
    evento.preventDefault();
    if (!editandoId || !formEdicao) return;
    setErroEdicao(null);
    setSalvandoEdicao(true);
    try {
      const formData = new FormData();
      formData.append("nome", formEdicao.nome);
      formData.append("categoria", formEdicao.categoria);
      formData.append("numeroPatrimonio", formEdicao.numeroPatrimonio);
      formData.append("status", formEdicao.status);
      const arquivo = inputFotoEdicaoRef.current?.files?.[0];
      if (arquivo) formData.append("foto", arquivo);

      await api(`/equipamentos/${editandoId}`, { method: "PATCH", body: formData, isFormData: true });
      const categoriaEditada = formEdicao.categoria;
      cancelarEdicao();
      await carregar();
      setAbaAtiva(categoriaEditada);
    } catch (e) {
      setErroEdicao(e instanceof ApiError ? e.message : "Não foi possível salvar as alterações");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  return (
    <div>
      <h1>Equipamentos</h1>

      <form onSubmit={aoCriar} className="cartao">
        <h2 style={{ marginTop: 0 }}>Novo equipamento</h2>
        <div className="form-grupo">
          <label>Nome</label>
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        </div>
        <div className="form-grupo">
          <label>Categoria</label>
          <input
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            list="categorias-existentes"
            required
          />
          <datalist id="categorias-existentes">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="form-grupo">
          <label>Número de patrimônio {Number(form.quantidade) > 1 && "(usado como prefixo: ex. PAT-1, PAT-2...)"}</label>
          <input
            value={form.numeroPatrimonio}
            onChange={(e) => setForm({ ...form, numeroPatrimonio: e.target.value })}
            required
          />
        </div>
        <div className="form-grupo">
          <label>Quantidade de unidades iguais</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={form.quantidade}
            onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
          />
        </div>
        <div className="form-grupo">
          <label>Foto (opcional{Number(form.quantidade) > 1 && " — usada em todas as unidades"})</label>
          <input type="file" accept="image/*" ref={inputFotoRef} />
        </div>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Cadastrando…" : "Cadastrar equipamento"}
        </button>
      </form>

      {editandoId && formEdicao && (
        <form onSubmit={salvarEdicao} className="cartao">
          <h2 style={{ marginTop: 0 }}>Editar equipamento</h2>
          <div className="form-grupo">
            <label>Nome</label>
            <input
              value={formEdicao.nome}
              onChange={(e) => setFormEdicao({ ...formEdicao, nome: e.target.value })}
              required
            />
          </div>
          <div className="form-grupo">
            <label>Categoria</label>
            <input
              value={formEdicao.categoria}
              onChange={(e) => setFormEdicao({ ...formEdicao, categoria: e.target.value })}
              list="categorias-existentes"
              required
            />
          </div>
          <div className="form-grupo">
            <label>Número de patrimônio</label>
            <input
              value={formEdicao.numeroPatrimonio}
              onChange={(e) => setFormEdicao({ ...formEdicao, numeroPatrimonio: e.target.value })}
              required
            />
          </div>
          <div className="form-grupo">
            <label>Status</label>
            <select
              value={formEdicao.status}
              onChange={(e) => setFormEdicao({ ...formEdicao, status: e.target.value as Equipamento["status"] })}
            >
              {STATUS_EQUIPAMENTO.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="form-grupo">
            <label>Trocar foto (opcional)</label>
            <input type="file" accept="image/*" ref={inputFotoEdicaoRef} />
          </div>
          {erroEdicao && <p className="erro">{erroEdicao}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={salvandoEdicao}>
              {salvandoEdicao ? "Salvando…" : "Salvar alterações"}
            </button>
            <button type="button" className="secundario" onClick={cancelarEdicao}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {erro && !editandoId && categorias.length === 0 && <p className="erro">{erro}</p>}

      {categorias.length > 0 && (
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
            const quantidadeNaCategoria = equipamentos.filter((e) => e.categoria === categoria).length;
            const ativa = categoria === abaAtiva;
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
                {categoria} ({quantidadeNaCategoria})
              </button>
            );
          })}
        </div>
      )}

      <div className="cartao">
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Nome</th>
              <th>Patrimônio</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {equipamentosDaAba.map((equipamento) => (
              <tr key={equipamento.id}>
                <td>
                  {equipamento.fotoPath && (
                    <FotoAutenticada rota={`/equipamentos/${equipamento.id}/foto`} alt={equipamento.nome} />
                  )}
                </td>
                <td>{equipamento.nome}</td>
                <td>{equipamento.numeroPatrimonio}</td>
                <td>
                  <span className={`badge ${classeBadge(equipamento.status)}`}>{equipamento.status}</span>
                </td>
                <td>
                  <button type="button" className="secundario" onClick={() => iniciarEdicao(equipamento)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {categorias.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum equipamento cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
