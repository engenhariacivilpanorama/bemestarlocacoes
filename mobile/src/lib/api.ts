import AsyncStorage from "@react-native-async-storage/async-storage";

// Em um dispositivo físico, troque "localhost" pelo IP da máquina rodando o backend na mesma rede Wi-Fi.
export const API_URL = "http://localhost:3333";

export class ApiError extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

interface OpcoesRequisicao {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  isFormData?: boolean;
}

export async function api<T>(rota: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
  const token = await AsyncStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opcoes.body !== undefined) {
    if (opcoes.isFormData) {
      body = opcoes.body as FormData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opcoes.body);
    }
  }

  const resposta = await fetch(`${API_URL}${rota}`, {
    method: opcoes.method ?? "GET",
    headers,
    body,
  });

  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => ({}));
    throw new ApiError(resposta.status, dados.erro ?? "Erro inesperado");
  }

  if (resposta.status === 204) return undefined as T;
  return resposta.json();
}
