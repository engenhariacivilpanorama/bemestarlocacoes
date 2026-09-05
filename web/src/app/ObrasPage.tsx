import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { Cliente, Obra } from "../lib/tipos";

export function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState({ nome: "", endereco: "", clienteId: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    api<Obra[]>("/obras").then(setObras).catch(() => setErro("Não foi possível carregar as obras"));
  }

  useEffect(() => {
    carregar();
    api<Cliente[]>("/clientes").then(setClientes).catch(() => {});
  }, []);

  async function aoCriar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api("/obras", { method: "POST", body: form });
      setForm({ nome: "", endereco: "", clienteId: "" });
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível criar a obra");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h1>Obras</h1>

      <form onSubmit={aoCriar} className="cartao">
        <h2 style={{ marginTop: 0 }}>Nova obra</h2>
        <div className="form-grupo">
          <label>Cliente</label>
          <select
            value={form.clienteId}
            onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
            required
          >
            <option value="">Selecione um cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.usuario.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="form-grupo">
          <label>Nome da obra</label>
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        </div>
        <div className="form-grupo">
          <label>Endereço</label>
          <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} required />
        </div>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Criando…" : "Criar obra"}
        </button>
      </form>

      <div className="cartao">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cliente</th>
              <th>Endereço</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {obras.map((obra) => (
              <tr key={obra.id}>
                <td>{obra.nome}</td>
                <td>{obra.cliente?.usuario.nome}</td>
                <td>{obra.endereco}</td>
                <td>{obra.status}</td>
              </tr>
            ))}
            {obras.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhuma obra cadastrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
