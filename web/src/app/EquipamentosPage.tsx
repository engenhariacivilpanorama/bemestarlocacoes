import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { Equipamento } from "../lib/tipos";
import { FotoAutenticada } from "../components/FotoAutenticada";

function classeBadge(status: Equipamento["status"]) {
  return { DISPONIVEL: "disponivel", LOCADO: "locado", MANUTENCAO: "manutencao" }[status];
}

export function EquipamentosPage() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [form, setForm] = useState({ nome: "", categoria: "", numeroPatrimonio: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  function carregar() {
    api<Equipamento[]>("/equipamentos")
      .then(setEquipamentos)
      .catch(() => setErro("Não foi possível carregar os equipamentos"));
  }

  useEffect(carregar, []);

  async function aoCriar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("nome", form.nome);
      formData.append("categoria", form.categoria);
      formData.append("numeroPatrimonio", form.numeroPatrimonio);
      const arquivo = inputFotoRef.current?.files?.[0];
      if (arquivo) formData.append("foto", arquivo);

      await api("/equipamentos", { method: "POST", body: formData, isFormData: true });
      setForm({ nome: "", categoria: "", numeroPatrimonio: "" });
      if (inputFotoRef.current) inputFotoRef.current.value = "";
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível cadastrar o equipamento");
    } finally {
      setEnviando(false);
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
          <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required />
        </div>
        <div className="form-grupo">
          <label>Número de patrimônio</label>
          <input
            value={form.numeroPatrimonio}
            onChange={(e) => setForm({ ...form, numeroPatrimonio: e.target.value })}
            required
          />
        </div>
        <div className="form-grupo">
          <label>Foto (opcional)</label>
          <input type="file" accept="image/*" ref={inputFotoRef} />
        </div>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Cadastrando…" : "Cadastrar equipamento"}
        </button>
      </form>

      <div className="cartao">
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Patrimônio</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {equipamentos.map((equipamento) => (
              <tr key={equipamento.id}>
                <td>
                  {equipamento.fotoPath && (
                    <FotoAutenticada rota={`/equipamentos/${equipamento.id}/foto`} alt={equipamento.nome} />
                  )}
                </td>
                <td>{equipamento.nome}</td>
                <td>{equipamento.categoria}</td>
                <td>{equipamento.numeroPatrimonio}</td>
                <td>
                  <span className={`badge ${classeBadge(equipamento.status)}`}>{equipamento.status}</span>
                </td>
              </tr>
            ))}
            {equipamentos.length === 0 && (
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
