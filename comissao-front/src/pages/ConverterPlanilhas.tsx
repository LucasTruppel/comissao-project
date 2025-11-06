import { useState } from 'react';
import { converterRemuneracao, converterTecd } from '../api';
import './ConverterPlanilhas.css';

export default function ConverterPlanilhas() {
  const [fileRemuneracao, setFileRemuneracao] = useState<File | null>(null);
  const [fileTecd, setFileTecd] = useState<File | null>(null);
  const [loadingRemuneracao, setLoadingRemuneracao] = useState(false);
  const [loadingTecd, setLoadingTecd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChangeRemuneracao = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileRemuneracao(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleFileChangeTecd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileTecd(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleConverterRemuneracao = async () => {
    if (!fileRemuneracao) {
      setError('Por favor, selecione um arquivo.');
      return;
    }

    setLoadingRemuneracao(true);
    setError(null);
    setSuccess(null);

    try {
      const blob = await converterRemuneracao(fileRemuneracao);
      downloadFile(blob, 'Remuneracao-Convertida.xlsx');
      setSuccess('Planilha de remuneração convertida com sucesso!');
      setFileRemuneracao(null);
    } catch (err: any) {
      if (err.response?.data) {
        // Try to parse the error message from the response
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            setError(errorData.detail || 'Erro ao converter planilha');
          } catch {
            setError('Erro ao converter planilha');
          }
        };
        reader.readAsText(err.response.data);
      } else {
        setError('Erro ao converter planilha. Verifique se o arquivo está no formato correto.');
      }
    } finally {
      setLoadingRemuneracao(false);
    }
  };

  const handleConverterTecd = async () => {
    if (!fileTecd) {
      setError('Por favor, selecione um arquivo.');
      return;
    }

    setLoadingTecd(true);
    setError(null);
    setSuccess(null);

    try {
      const blob = await converterTecd(fileTecd);
      downloadFile(blob, 'TECD-Convertida.xlsx');
      setSuccess('Planilha TEC-D convertida com sucesso!');
      setFileTecd(null);
    } catch (err: any) {
      if (err.response?.data) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            setError(errorData.detail || 'Erro ao converter planilha');
          } catch {
            setError('Erro ao converter planilha');
          }
        };
        reader.readAsText(err.response.data);
      } else {
        setError('Erro ao converter planilha. Verifique se o arquivo está no formato correto.');
      }
    } finally {
      setLoadingTecd(false);
    }
  };

  return (
    <div className="converter-page">
      <h1>Converter Planilhas Valid</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="converter-sections">
        <div className="converter-section">
          <h2>Converter Planilha Remuneração</h2>
          <div className="file-input-container">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChangeRemuneracao}
              className="file-input"
              id="file-remuneracao"
            />
            <label htmlFor="file-remuneracao" className="file-label">
              {fileRemuneracao ? fileRemuneracao.name : 'Selecionar arquivo'}
            </label>
          </div>
          <button
            onClick={handleConverterRemuneracao}
            disabled={loadingRemuneracao || !fileRemuneracao}
            className="convert-button"
          >
            {loadingRemuneracao ? 'Convertendo...' : 'Converter Planilha Remuneração'}
          </button>
        </div>

        <div className="converter-section">
          <h2>Converter Planilha TEC-D</h2>
          <div className="file-input-container">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChangeTecd}
              className="file-input"
              id="file-tecd"
            />
            <label htmlFor="file-tecd" className="file-label">
              {fileTecd ? fileTecd.name : 'Selecionar arquivo'}
            </label>
          </div>
          <button
            onClick={handleConverterTecd}
            disabled={loadingTecd || !fileTecd}
            className="convert-button"
          >
            {loadingTecd ? 'Convertendo...' : 'Converter Planilha TEC-D'}
          </button>
        </div>
      </div>
    </div>
  );
}

