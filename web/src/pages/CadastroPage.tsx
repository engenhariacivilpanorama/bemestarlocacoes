import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export function CadastroPage() {
  const { registrarCliente } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    documento: "",
    telefone: "",
    endereco: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function atualizarCampo(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await registrarCliente(form);
      navigate("/portal", { replace: true });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível concluir o cadastro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1>Cadastro de cliente</h1>
      <form onSubmit={aoEnviar} className="cartao">
        <div className="form-grupo">
          <label>Nome completo</label>
          <input value={form.nome} onChange={(e) => atualizarCampo("nome", e.target.value)} required />
        </div>
        <div className="form-grupo">
          <label>E-mail</label>
          <input type="email" value={form.email} onChange={(e) => atualizarCampo("email", e.target.value)} required />
        </div>
        <div className="form-grupo">
          <label>Senha</label>
          <input
            type="password"
            minLength={6}
            value={form.senha}
            onChange={(e) => atualizarCampo("senha", e.target.value)}
            required
          />
        </div>
        <div className="form-grupo">
          <label>CPF ou CNPJ</label>
          <input value={form.documento} onChange={(e) => atualizarCampo("documento", e.target.value)} required />
        </div>
        <div className="form-grupo">
          <label>Telefone</label>
          <input value={form.telefone} onChange={(e) => atualizarCampo("telefone", e.target.value)} required />
        </div>
        <div className="form-grupo">
          <label>Endereço</label>
          <input value={form.endereco} onChange={(e) => atualizarCampo("endereco", e.target.value)} required />
        </div>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Enviando…" : "Cadastrar"}
        </button>
      </form>
      <p>
        Já tem cadastro? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}
