export interface Cliente {
  id: string;
  documento: string;
  telefone: string;
  endereco: string;
  usuario: { id: string; nome: string; email: string };
}

export interface Obra {
  id: string;
  nome: string;
  endereco: string;
  status: string;
  clienteId: string;
  cliente?: { usuario: { nome: string } };
}

export interface Equipamento {
  id: string;
  nome: string;
  categoria: string;
  numeroPatrimonio: string;
  status: "DISPONIVEL" | "LOCADO" | "MANUTENCAO";
  fotoPath?: string | null;
}

export const STATUS_EQUIPAMENTO = ["DISPONIVEL", "LOCADO", "MANUTENCAO"] as const;

export interface ItemContrato {
  id: string;
  valorDiaria: number;
  dias: number;
  equipamento: Equipamento;
  entrega?: Entrega | null;
}

export interface Contrato {
  id: string;
  status: "RASCUNHO" | "ASSINADO";
  criadoEm: string;
  assinadoEm?: string | null;
  obra: Obra;
  cliente?: Cliente;
  itens: ItemContrato[];
}

export interface Entrega {
  id: string;
  dataHora: string;
  latitude: number;
  longitude: number;
  observacoes?: string | null;
}
