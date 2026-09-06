import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

interface UsuarioStaff {
  id: string;
  nome: string;
  email: string;
  papel: "STAFF" | "CLIENTE";
}

interface AuthContextValue {
  usuario: UsuarioStaff | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioStaff | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("usuario").then((dados) => {
      if (dados) setUsuario(JSON.parse(dados));
      setCarregando(false);
    });
  }, []);

  async function login(email: string, senha: string) {
    const resposta = await api<{ token: string; usuario: UsuarioStaff }>("/auth/login", {
      method: "POST",
      body: { email, senha },
    });

    if (resposta.usuario.papel !== "STAFF") {
      throw new Error("Este aplicativo é apenas para a equipe de entrega.");
    }

    await AsyncStorage.setItem("token", resposta.token);
    await AsyncStorage.setItem("usuario", JSON.stringify(resposta.usuario));
    setUsuario(resposta.usuario);
  }

  async function logout() {
    await AsyncStorage.multiRemove(["token", "usuario"]);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return contexto;
}
