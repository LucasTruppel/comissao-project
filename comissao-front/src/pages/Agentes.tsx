import { useState, useEffect } from 'react';
import { getAgentes, createAgente, updateAgenteLocalidade, getLocalidades } from '../api';
import type { Agente, AgenteCreate, Localidade, AgenteUpdateLocalidade } from '../types';
import './Agentes.css';

export default function Agentes() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<AgenteCreate>({
    nome: '',
    cpf: '',
    localidade_id: null,
  });

  // Update localidade form state
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateForm, setUpdateForm] = useState<AgenteUpdateLocalidade>({
    cpf: '',
    localidade_codigo: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentesData, localidadesData] = await Promise.all([
        getAgentes(),
        getLocalidades(),
      ]);

      const sortedAgentes = agentesData.sort((a, b) => 
        a.nome.localeCompare(b.nome)
      );

      const sortedLocalidades = localidadesData.sort((a, b) => 
        a.nome.localeCompare(b.nome)
      );

      setAgentes(sortedAgentes);
      setLocalidades(sortedLocalidades);

    } catch (err: any) {
      setError('Erro ao carregar dados: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgente = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await createAgente(createForm);
      setSuccess('Agente criado com sucesso!');
      setCreateForm({ nome: '', cpf: '', localidade_id: null });
      setShowCreateForm(false);
      loadData();
    } catch (err: any) {
      setError('Erro ao criar agente: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateLocalidade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await updateAgenteLocalidade(updateForm);
      setSuccess('Localidade do agente atualizada com sucesso!');
      setUpdateForm({ cpf: '', localidade_codigo: '' });
      setShowUpdateForm(false);
      loadData();
    } catch (err: any) {
      setError('Erro ao atualizar localidade: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getLocalidadeNome = (localidadeId: number) => {
    const localidade = localidades.find(l => l.id === localidadeId);
    return localidade ? `${localidade.codigo_localidade} - ${localidade.nome}` : 'Não especificada';
  };

  return (
    <div className="agentes-page">
      <div className="page-header">
        <h1>Agentes</h1>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary">
          {showCreateForm ? 'Cancelar' : 'Novo Agente'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showCreateForm && (
        <div className="form-card">
          <h2>Criar Novo Agente</h2>
          <form onSubmit={handleCreateAgente}>
            <div className="form-group">
              <label>Nome:</label>
              <input
                type="text"
                value={createForm.nome}
                onChange={(e) => setCreateForm({ ...createForm, nome: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>CPF:</label>
              <input
                type="text"
                value={createForm.cpf}
                onChange={(e) => setCreateForm({ ...createForm, cpf: e.target.value })}
                required
                placeholder="00000000000"
              />
            </div>
            <div className="form-group">
              <label>Localidade:</label>
              <select
                value={createForm.localidade_id || ''}
                onChange={(e) => setCreateForm({ ...createForm, localidade_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Selecione uma localidade</option>
                {localidades.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.codigo_localidade} - {loc.nome}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">Criar Agente</button>
          </form>
        </div>
      )}

      <div className="page-header">
        <h2>Atualizar Localidade de Agente</h2>
        <button onClick={() => setShowUpdateForm(!showUpdateForm)} className="btn-secondary">
          {showUpdateForm ? 'Cancelar' : 'Atualizar Localidade'}
        </button>
      </div>

      {showUpdateForm && (
        <div className="form-card">
          <h2>Atualizar Localidade</h2>
          <form onSubmit={handleUpdateLocalidade}>
            <div className="form-group">
              <label>CPF do Agente:</label>
              <input
                type="text"
                value={updateForm.cpf}
                onChange={(e) => setUpdateForm({ ...updateForm, cpf: e.target.value })}
                required
                placeholder="00000000000"
              />
            </div>
            <div className="form-group">
              <label>Código da Localidade:</label>
              <input
                type="text"
                value={updateForm.localidade_codigo}
                onChange={(e) => setUpdateForm({ ...updateForm, localidade_codigo: e.target.value })}
                required
                placeholder="Ex: 001"
              />
            </div>
            <button type="submit" className="btn-primary">Atualizar Localidade</button>
          </form>
        </div>
      )}

      <div className="table-card">
        <h2>Lista de Agentes</h2>
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Localidade</th>
              </tr>
            </thead>
            <tbody>
              {agentes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty-message">
                    Nenhum agente cadastrado
                  </td>
                </tr>
              ) : (
                agentes.map((agente) => (
                  <tr key={agente.id}>
                    <td>{agente.nome}</td>
                    <td>{agente.cpf}</td>
                    <td>{getLocalidadeNome(agente.localidade_id)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

