import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { UsuarioStaff } from "../lib/tipos";
import { useAuth } from "../lib/auth";

export function UsuariosPage() {
  const { usuario: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioStaff[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({ nome: "", email: "", senha: "", papel: "FUNCIONARIO" as "ADMIN" | "FUNCIONARIO" });
  const [enviando, setEnviando] = useState(false);

  const [redefinindoId, setRedefinindoId] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState<string | null>(null);

  function carregar() {
    api<UsuarioStaff[]>("/usuarios")
      .then(setUsuarios)
      .catch(() => setErro("Não foi possível carregar os funcionários"));
  }

  useEffect(carregar, []);

  async function aoCriar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api("/usuarios", { method: "POST", body: form });
      setForm({ nome: "", email: "", senha: "", papel: "FUNCIONARIO" });
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível cadastrar o funcionário");
    } finally {
      setEnviando(false);
    }
  }

  async function alternarAtivo(alvo: UsuarioStaff) {
    setErro(null);
    try {
      await api(`/usuarios/${alvo.id}`, { method: "PATCH", body: { ativo: !alvo.ativo } });
      carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível alterar o status");
    }
  }

  function iniciarRedefinicao(id: string) {
    setRedefinindoId(id);
    setNovaSenha("");
    setErroSenha(null);
    setSucessoSenha(null);
  }

  async function redefinirSenha(evento: FormEvent) {
    evento.preventDefault();
    if (!redefinindoId) return;
    setErroSenha(null);
    setSucessoSenha(null);
    try {
      await api(`/usuarios/${redefinindoId}/senha`, { method: "PATCH", body: { novaSenha } });
      setSucessoSenha("Senha redefinida com sucesso.");
      setNovaSenha("");
    } catch (e) {
      setErroSenha(e instanceof ApiError ? e.message : "Não foi possível redefinir a senha");
    }
  }

  return (
    <div>
      <h1>Funcionários</h1>

      <form onSubmit={aoCriar} className="cartao">
        <h2 style={{ marginTop: 0 }}>Novo funcionário</h2>
        <div className="form-grupo">
          <label>Nome</label>
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        </div>
        <div className="form-grupo">
          <label>E-mail</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="form-grupo">
          <label>Senha provisória</label>
          <input
            type="password"
            minLength={6}
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            required
          />
        </div>
        <div className="form-grupo">
          <label>Papel</label>
          <select value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value as "ADMIN" | "FUNCIONARIO" })}>
            <option value="FUNCIONARIO">Funcionário</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Cadastrando…" : "Cadastrar funcionário"}
        </button>
      </form>

      {redefinindoId && (
        <form onSubmit={redefinirSenha} className="cartao">
          <h2 style={{ marginTop: 0 }}>Redefinir senha</h2>
          <div className="form-grupo">
            <label>Nova senha</label>
            <input
              type="password"
              minLength={6}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
          </div>
          {erroSenha && <p className="erro">{erroSenha}</p>}
          {sucessoSenha && <p className="sucesso">{sucessoSenha}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit">Salvar nova senha</button>
            <button type="button" className="secundario" onClick={() => setRedefinindoId(null)}>Fechar</button>
          </div>
        </form>
      )}

      <div className="cartao">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{u.papel === "ADMIN" ? "Administrador" : "Funcionário"}</td>
                <td>
                  <span className={`badge ${u.ativo ? "disponivel" : "manutencao"}`}>
                    {u.ativo ? "Ativo" : "Desativado"}
                  </span>
                </td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="secundario" onClick={() => iniciarRedefinicao(u.id)}>
                    Redefinir senha
                  </button>
                  {u.id !== usuarioLogado?.id && (
                    <button type="button" className="secundario" onClick={() => alternarAtivo(u)}>
                      {u.ativo ? "Desativar" : "Reativar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum funcionário cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
