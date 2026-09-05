export interface ContratoEquipamentoPendente {
  id: string;
  valorDiaria: number;
  dias: number;
  equipamento: {
    id: string;
    nome: string;
    numeroPatrimonio: string;
  };
  contrato: {
    obra: {
      nome: string;
      endereco: string;
    };
    cliente: {
      usuario: { nome: string };
    };
  };
}

export type RotasStack = {
  EntregasPendentes: undefined;
  RegistrarEntrega: { item: ContratoEquipamentoPendente };
};
