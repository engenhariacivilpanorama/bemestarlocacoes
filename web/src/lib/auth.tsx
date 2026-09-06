import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: "ADMIN" | "FUNCIONARIO" | "CLIENTE";
}

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  registrarCliente: (dados: RegistroClienteInput) => Promise<void>;
  logout: () => void;
}

export interface RegistroClienteInput {
  nome: string;
  email: string;
  senha: string;
  documento: string;
  telefone: string;
  endereco: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const dados = localStorage.getItem("usuario");
    if (dados) setUsuario(JSON.parse(dados));
    setCarregando(false);
  }, []);

  function salvarSessao(token: string, usuarioLogado: Usuario) {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuarioLogado));
    setUsuario(usuarioLogado);
  }

  async function login(email: string, senha: string) {
    const resposta = await api<{ token: string; usuario: Usuario }>("/auth/login", {
      method: "POST",
      body: { email, senha },
    });
    salvarSessao(resposta.token, resposta.usuario);
  }

  async function registrarCliente(dados: RegistroClienteInput) {
    const resposta = await api<{ token: string; usuario: Omit<Usuario, "papel"> }>(
      "/auth/registro-cliente",
      { method: "POST", body: dados }
    );
    salvarSessao(resposta.token, { ...resposta.usuario, papel: "CLIENTE" });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, registrarCliente, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return contexto;
}
