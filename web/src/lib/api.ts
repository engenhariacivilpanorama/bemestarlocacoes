const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
  status: number;
  detalhes?: unknown;

  constructor(status: number, mensagem: string, detalhes?: unknown) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

interface OpcoesRequisicao {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  isFormData?: boolean;
}

export async function api<T>(rota: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
  const token = localStorage.getItem("token");
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
    throw new ApiError(resposta.status, dados.erro ?? "Erro inesperado", dados.detalhes);
  }

  if (resposta.status === 204) return undefined as T;
  return resposta.json();
}

export async function carregarImagemAutenticada(rota: string): Promise<string> {
  const token = localStorage.getItem("token");
  const resposta = await fetch(`${API_URL}${rota}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resposta.ok) throw new ApiError(resposta.status, "Não foi possível carregar a imagem");
  const blob = await resposta.blob();
  return URL.createObjectURL(blob);
}

export async function baixarArquivo(rota: string, nomeArquivo: string): Promise<void> {
  const token = localStorage.getItem("token");
  const resposta = await fetch(`${API_URL}${rota}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => ({}));
    throw new ApiError(resposta.status, dados.erro ?? "Não foi possível baixar o arquivo");
  }

  const blob = await resposta.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
