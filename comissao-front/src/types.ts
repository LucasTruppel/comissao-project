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

// --- Commission Calculation ---

export interface SaleInfo {
  numero_pedido: string;
  numero_protocolo: string;
  valor_venda: number;
  comissao: number;
  is_renovacao: boolean;
  comissao_renovacao: number;
}

export interface ContadorInfo {
  nome: string;
  cnpj_cpf: string;
  faixa_comissao: string;
  total_vendas: number;
  total_comissao: number;
  total_comissao_renovacao: number;
  vendas: SaleInfo[];
}

export interface SellerInfo {
  nome: string;
  cnpj_cpf: string | null;
  faixa_comissao: string;
  total_vendas: number;
  total_comissao: number;
  total_comissao_renovacao: number;
  contadores: ContadorInfo[];
  vendas: SaleInfo[];
}

export interface RenewalPartnerInfo {
  nome: string;
  cnpj_cpf: string;
  faixa_comissao: string;
  total_vendas: number;
  total_comissao: number;
  sellers: SellerInfo[];
}

export interface ComissaoResponse {
  sellers: SellerInfo[];
  parceiro_renovacao: RenewalPartnerInfo | null;
}

