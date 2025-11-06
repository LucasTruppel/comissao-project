export interface Localidade {
  id: number;
  codigo_localidade: string;
  nome: string;
}

export interface LocalidadeCreate {
  codigo_localidade: string;
  nome: string;
}

export interface Agente {
  id: number;
  nome: string;
  cpf: string;
  localidade_id: number;
}

export interface AgenteCreate {
  nome: string;
  cpf: string;
  localidade_id: number | null;
}

export interface AgenteWithLocalidade extends Agente {
  localidade: Localidade;
}

export interface AgenteUpdateLocalidade {
  cpf: string;
  localidade_codigo: string;
}

