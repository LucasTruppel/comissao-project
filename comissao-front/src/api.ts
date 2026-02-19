import axios from 'axios';
import type { Localidade, LocalidadeCreate, Agente, AgenteCreate, AgenteWithLocalidade, AgenteUpdateLocalidade, ComissaoResponse } from './types';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors and logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Converter Planilhas
export const converterRemuneracao = async (file: File): Promise<Blob> => {
  const formData = new FormData();
  formData.append('data_file', file);
  
  const response = await api.post('/converter-remuneracao/', formData, {
    responseType: 'blob',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const converterTecd = async (file: File): Promise<Blob> => {
  const formData = new FormData();
  formData.append('data_file', file);
  
  const response = await api.post('/converter-tecd/', formData, {
    responseType: 'blob',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

// Localidades
export const getLocalidades = async (): Promise<Localidade[]> => {
  const response = await api.get('/localidades/');
  return response.data;
};

export const createLocalidade = async (localidade: LocalidadeCreate): Promise<Localidade> => {
  const response = await api.post('/localidades/', localidade);
  return response.data;
};

// Agentes
export const getAgentes = async (): Promise<Agente[]> => {
  const response = await api.get('/agentes/');
  return response.data;
};

export const createAgente = async (agente: AgenteCreate): Promise<Agente> => {
  const response = await api.post('/agentes/', agente);
  return response.data;
};

export const updateAgenteLocalidade = async (update: AgenteUpdateLocalidade): Promise<AgenteWithLocalidade> => {
  const response = await api.post('/agentes/atualizar_localidade', update);
  return response.data;
};

// Comissão
export const calcularComissao = async (
  vendasFile: File,
  parceirosFile: File,
  dataInicio: string,
  dataFim: string
): Promise<ComissaoResponse> => {
  const formData = new FormData();
  formData.append('vendas_file', vendasFile);
  formData.append('parceiros_file', parceirosFile);
  formData.append('data_inicio', dataInicio);
  formData.append('data_fim', dataFim);

  const response = await api.post('/calcular-comissao/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

