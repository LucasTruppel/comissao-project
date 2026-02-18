import { useMemo, useState } from 'react';
import { calcularComissao } from '../api';
import type { SaleInfo, SellerInfo } from '../types';
import './Comissao.css';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Compute the vendedor's direct sales (not linked to any contador). */
function getDirectSales(seller: SellerInfo): SaleInfo[] {
  const contadorPedidos = new Set<string>();
  for (const c of seller.contadores) {
    for (const v of c.vendas) {
      contadorPedidos.add(v.numero_pedido);
    }
  }
  return seller.vendas.filter((v) => !contadorPedidos.has(v.numero_pedido));
}

export default function Comissao() {
  const [vendasFile, setVendasFile] = useState<File | null>(null);
  const [parceirosFile, setParceirosFile] = useState<File | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SellerInfo[] | null>(null);
  // Generic expand/collapse set – keys are built per node type
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendasFile || !parceirosFile) {
      setError('Por favor, selecione ambos os arquivos.');
      return;
    }
    if (!dataInicio || !dataFim) {
      setError('Por favor, preencha as datas de início e fim.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const formatDate = (d: string) => {
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y}`;
      };

      const data = await calcularComissao(
        vendasFile,
        parceirosFile,
        formatDate(dataInicio),
        formatDate(dataFim)
      );
      setResults(data);
      // Expand only the top-level sellers by default
      setExpandedNodes(new Set(data.map((s) => sellerKey(s))));
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Erro ao calcular comissão. Verifique os arquivos e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // --- key helpers ---
  const sellerKey = (s: SellerInfo) => `seller:${s.cnpj_cpf ?? s.nome}`;
  const directKey = (s: SellerInfo) => `direct:${s.cnpj_cpf ?? s.nome}`;
  const contadorKey = (s: SellerInfo, cDoc: string) =>
    `contador:${s.cnpj_cpf ?? s.nome}:${cDoc}`;

  const toggle = (key: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** Build the full set of expandable keys for "expand all". */
  const allKeys = useMemo(() => {
    if (!results) return new Set<string>();
    const keys = new Set<string>();
    for (const s of results) {
      keys.add(sellerKey(s));
      if (getDirectSales(s).length > 0) keys.add(directKey(s));
      for (const c of s.contadores) {
        keys.add(contadorKey(s, c.cnpj_cpf));
      }
    }
    return keys;
  }, [results]);

  /** Only seller keys – expands vendedores to show contadores/vendas diretas, no leaf sales. */
  const sellerOnlyKeys = useMemo(() => {
    if (!results) return new Set<string>();
    return new Set(results.map((s) => sellerKey(s)));
  }, [results]);

  const expandAll = () => setExpandedNodes(new Set(allKeys));
  const expandVendedores = () => setExpandedNodes(new Set(sellerOnlyKeys));
  const collapseAll = () => setExpandedNodes(new Set());

  // --- render a single sale row ---
  const renderSale = (sale: SaleInfo, sellerComissao?: number) => (
    <div key={sale.numero_pedido} className="tree-node tree-sale">
      <div className="tree-node-header sale-header">
        <div className="tree-node-info">
          <span className="sale-field">
            <span className="sale-field-label">Pedido</span>
            {sale.numero_pedido}
          </span>
          <span className="sale-field">
            <span className="sale-field-label">Protocolo</span>
            {sale.numero_protocolo}
          </span>
        </div>
        <div className="tree-node-totals">
          <div className="total-item">
            <span className="total-label">Valor</span>
            <span className="total-value">{formatCurrency(sale.valor_venda)}</span>
          </div>
          {sellerComissao !== undefined ? (
            <>
              <div className="total-item">
                <span className="total-label">Comissão<br />do Contador</span>
                <span className="total-value total-comissao">
                  {formatCurrency(sale.comissao)}
                </span>
              </div>
              <div className="total-item">
                <span className="total-label">Comissão<br />do Vendedor</span>
                <span className="total-value total-comissao">
                  {formatCurrency(sellerComissao)}
                </span>
              </div>
            </>
          ) : (
            <div className="total-item">
              <span className="total-label">Comissão<br />do Vendedor</span>
              <span className="total-value total-comissao">
                {formatCurrency(sale.comissao)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="comissao-page">
      <h1>Comissão</h1>

      <div className="comissao-form-card">
        <form onSubmit={handleSubmit}>
          <div className="comissao-form-grid">
            <div className="form-group">
              <label htmlFor="vendas-file">Arquivo de Vendas (CSV)</label>
              <div className="file-input-container">
                <input
                  type="file"
                  accept=".csv"
                  id="vendas-file"
                  className="file-input"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setVendasFile(e.target.files[0]);
                      setError(null);
                    }
                  }}
                />
                <label htmlFor="vendas-file" className="file-label">
                  {vendasFile ? vendasFile.name : 'Selecionar arquivo de vendas'}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="parceiros-file">Arquivo de Parceiros (CSV)</label>
              <div className="file-input-container">
                <input
                  type="file"
                  accept=".csv"
                  id="parceiros-file"
                  className="file-input"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setParceirosFile(e.target.files[0]);
                      setError(null);
                    }
                  }}
                />
                <label htmlFor="parceiros-file" className="file-label">
                  {parceirosFile ? parceirosFile.name : 'Selecionar arquivo de parceiros'}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="data-inicio">Data Início</label>
              <input
                type="date"
                id="data-inicio"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="data-fim">Data Fim</label>
              <input
                type="date"
                id="data-fim"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="convert-button"
            disabled={loading || !vendasFile || !parceirosFile || !dataInicio || !dataFim}
          >
            {loading ? 'Calculando...' : 'Calcular Comissão'}
          </button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}

      {results && (
        <div className="comissao-results">
          <div className="results-header">
            <h2>Resultados</h2>
            <div className="results-actions">
              <button className="btn-secondary btn-sm" onClick={expandVendedores}>
                Expandir Vendedores
              </button>
              <button className="btn-secondary btn-sm" onClick={expandAll}>
                Expandir Todos
              </button>
              <button className="btn-secondary btn-sm" onClick={collapseAll}>
                Recolher Todos
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="empty-message">
              Nenhum resultado encontrado para o período selecionado.
            </div>
          ) : (
            <div className="tree">
              {results.map((seller) => {
                const sKey = sellerKey(seller);
                const isSellerExpanded = expandedNodes.has(sKey);
                const directSales = getDirectSales(seller);
                const hasChildren = directSales.length > 0 || seller.contadores.length > 0;

                return (
                  <div key={sKey} className="tree-node tree-seller">
                    {/* ── Seller header ── */}
                    <div
                      className="tree-node-header seller-header"
                      onClick={() => toggle(sKey)}
                    >
                      <span className={`tree-toggle ${isSellerExpanded ? 'expanded' : ''}`}>
                        {hasChildren ? '▶' : '•'}
                      </span>
                      <div className="tree-node-info">
                        <span className="tree-node-name">{seller.nome}</span>
                        {seller.cnpj_cpf && (
                          <span className="tree-node-doc">{seller.cnpj_cpf}</span>
                        )}
                        <span className="tree-node-badge badge-faixa">
                          {seller.faixa_comissao}
                        </span>
                      </div>
                      <div className="tree-node-totals">
                        <div className="total-item">
                          <span className="total-label">Nº Vendas</span>
                          <span className="total-value">{seller.vendas.length}</span>
                        </div>
                        <div className="total-item">
                          <span className="total-label">Total Vendas</span>
                          <span className="total-value">
                            {formatCurrency(seller.total_vendas)}
                          </span>
                        </div>
                        <div className="total-item">
                          <span className="total-label">Comissão</span>
                          <span className="total-value total-comissao">
                            {formatCurrency(seller.total_comissao)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Seller children ── */}
                    {isSellerExpanded && hasChildren && (
                      <div className="tree-children">
                        {/* Direct vendedor sales */}
                        {directSales.length > 0 && (() => {
                          const dKey = directKey(seller);
                          const isDirectExpanded = expandedNodes.has(dKey);
                          const directTotal = directSales.reduce(
                            (acc, s) => acc + s.valor_venda,
                            0
                          );
                          const directComissao = directSales.reduce(
                            (acc, s) => acc + s.comissao,
                            0
                          );

                          return (
                            <div className="tree-node tree-direct">
                              <div
                                className="tree-node-header direct-header"
                                onClick={() => toggle(dKey)}
                              >
                                <span
                                  className={`tree-toggle ${isDirectExpanded ? 'expanded' : ''}`}
                                >
                                  ▶
                                </span>
                                <div className="tree-node-info">
                                  <span className="tree-node-name">
                                    Vendas Diretas
                                  </span>
                                  <span className="tree-node-badge badge-faixa">
                                    {seller.faixa_comissao}
                                  </span>
                                </div>
                                <div className="tree-node-totals">
                                  <div className="total-item">
                                    <span className="total-label">Nº Vendas</span>
                                    <span className="total-value">
                                      {directSales.length}
                                    </span>
                                  </div>
                                  <div className="total-item">
                                    <span className="total-label">Total Vendas</span>
                                    <span className="total-value">
                                      {formatCurrency(directTotal)}
                                    </span>
                                  </div>
                                  <div className="total-item">
                                    <span className="total-label">Comissão</span>
                                    <span className="total-value total-comissao">
                                      {formatCurrency(directComissao)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {isDirectExpanded && (
                                <div className="tree-children tree-sales-list">
                                  {directSales.map((sale) => renderSale(sale))}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Contadores */}
                        {seller.contadores.map((contador) => {
                          const cKey = contadorKey(seller, contador.cnpj_cpf);
                          const isContadorExpanded = expandedNodes.has(cKey);

                          // Seller's commission on this contador's sales
                          const contadorPedidos = new Set(contador.vendas.map((v) => v.numero_pedido));
                          const sellerComissaoOnContador = seller.vendas
                            .filter((v) => contadorPedidos.has(v.numero_pedido))
                            .reduce((acc, v) => acc + v.comissao, 0);

                          return (
                            <div
                              key={contador.cnpj_cpf}
                              className="tree-node tree-contador"
                            >
                              <div
                                className="tree-node-header contador-header"
                                onClick={() => toggle(cKey)}
                              >
                                <span
                                  className={`tree-toggle ${isContadorExpanded ? 'expanded' : ''}`}
                                >
                                  {contador.vendas.length > 0 ? '▶' : '•'}
                                </span>
                                <div className="tree-node-info">
                                  <span className="tree-node-name">{contador.nome}</span>
                                  <span className="tree-node-doc">
                                    {contador.cnpj_cpf}
                                  </span>
                                  <span className="tree-node-badge badge-contador">
                                    Contador
                                  </span>
                                  <span className="tree-node-badge badge-faixa">
                                    {contador.faixa_comissao}
                                  </span>
                                </div>
                                <div className="tree-node-totals">
                                  <div className="total-item">
                                    <span className="total-label">Nº Vendas</span>
                                    <span className="total-value">
                                      {contador.vendas.length}
                                    </span>
                                  </div>
                                  <div className="total-item">
                                    <span className="total-label">Total Vendas</span>
                                    <span className="total-value">
                                      {formatCurrency(contador.total_vendas)}
                                    </span>
                                  </div>
                                  <div className="total-item">
                                    <span className="total-label">Comissão<br />do Contador</span>
                                    <span className="total-value total-comissao">
                                      {formatCurrency(contador.total_comissao)}
                                    </span>
                                  </div>
                                  <div className="total-item">
                                    <span className="total-label">Comissão<br />do Vendedor</span>
                                    <span className="total-value total-comissao">
                                      {formatCurrency(sellerComissaoOnContador)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {isContadorExpanded && contador.vendas.length > 0 && (() => {
                                // Build lookup: pedido -> seller comissao
                                const sellerComissaoMap = new Map<string, number>();
                                for (const sv of seller.vendas) {
                                  sellerComissaoMap.set(sv.numero_pedido, sv.comissao);
                                }
                                return (
                                  <div className="tree-children tree-sales-list">
                                    {contador.vendas.map((sale) =>
                                      renderSale(sale, sellerComissaoMap.get(sale.numero_pedido) ?? 0)
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
