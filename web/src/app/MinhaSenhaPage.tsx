import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";

export function MinhaSenhaPage() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(false);
    setEnviando(true);
    try {
      await api("/usuarios/me/senha", { method: "PATCH", body: { senhaAtual, novaSenha } });
      setSucesso(true);
      setSenhaAtual("");
      setNovaSenha("");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível trocar a senha");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h1>Minha senha</h1>
      <form onSubmit={aoEnviar} className="cartao" style={{ maxWidth: 360 }}>
        <div className="form-grupo">
          <label>Senha atual</label>
          <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
        </div>
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
        {erro && <p className="erro">{erro}</p>}
        {sucesso && <p className="sucesso">Senha alterada com sucesso.</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Trocar senha"}
        </button>
      </form>
    </div>
  );
}
