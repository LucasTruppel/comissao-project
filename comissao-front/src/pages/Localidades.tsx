import { useState, useEffect } from 'react';
import { getLocalidades, createLocalidade } from '../api';
import type { Localidade, LocalidadeCreate } from '../types';
import './Localidades.css';

export default function Localidades() {
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<LocalidadeCreate>({
    codigo_localidade: '',
    nome: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLocalidades();
      const sortedData = data.sort((a, b) => a.nome.localeCompare(b.nome));
      setLocalidades(sortedData);
    } catch (err: any) {
      setError('Erro ao carregar localidades: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocalidade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await createLocalidade(createForm);
      setSuccess('Localidade criada com sucesso!');
      setCreateForm({ codigo_localidade: '', nome: '' });
      setShowCreateForm(false);
      loadData();
    } catch (err: any) {
      setError('Erro ao criar localidade: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="localidades-page">
      <div className="page-header">
        <h1>Localidades de Atendimento</h1>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary">
          {showCreateForm ? 'Cancelar' : 'Nova Localidade'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showCreateForm && (
        <div className="form-card">
          <h2>Criar Nova Localidade</h2>
          <form onSubmit={handleCreateLocalidade}>
            <div className="form-group">
              <label>Código da Localidade:</label>
              <input
                type="text"
                value={createForm.codigo_localidade}
                onChange={(e) => setCreateForm({ ...createForm, codigo_localidade: e.target.value })}
                required
                placeholder="Ex: 001"
              />
            </div>
            <div className="form-group">
              <label>Nome:</label>
              <input
                type="text"
                value={createForm.nome}
                onChange={(e) => setCreateForm({ ...createForm, nome: e.target.value })}
                required
                placeholder="Ex: São Paulo - Centro"
              />
            </div>
            <button type="submit" className="btn-primary">Criar Localidade</button>
          </form>
        </div>
      )}

      <div className="table-card">
        <h2>Lista de Localidades</h2>
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
              </tr>
            </thead>
            <tbody>
              {localidades.length === 0 ? (
                <tr>
                  <td colSpan={2} className="empty-message">
                    Nenhuma localidade cadastrada
                  </td>
                </tr>
              ) : (
                localidades.map((localidade) => (
                  <tr key={localidade.id}>
                    <td>{localidade.codigo_localidade}</td>
                    <td>{localidade.nome}</td>
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

