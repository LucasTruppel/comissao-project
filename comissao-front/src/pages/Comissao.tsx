import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { calcularComissao } from '../api';
import type { SaleInfo, SellerInfo, ContadorInfo, RenewalPartnerInfo, ComissaoResponse } from '../types';
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

/** Build sales rows for XLSX export from main sellers (all sales). */
function buildSalesRows(sellers: SellerInfo[]): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];
  const headers = [
    'Vendedor',
    'Contador / Vendas Diretas',
    'Nº Pedido',
    'Nº Protocolo',
    'Produto',
    'Renovação',
    'Valor Venda',
    'Comissão do Vendedor',
    'Comissão do Contador',
    'Comissão de Renovação',
  ];

  for (const seller of sellers) {
    const sellerComissaoMap = new Map<string, number>();
    for (const v of seller.vendas) {
      sellerComissaoMap.set(v.numero_pedido, v.comissao);
    }

    const directSales = getDirectSales(seller);
    for (const sale of directSales) {
      rows.push({
        [headers[0]]: seller.nome,
        [headers[1]]: 'Vendas Diretas',
        [headers[2]]: sale.numero_pedido,
        [headers[3]]: sale.numero_protocolo,
        [headers[4]]: sale.produto ?? '',
        [headers[5]]: sale.is_renovacao ? 'Sim' : 'Não',
        [headers[6]]: sale.valor_venda,
        [headers[7]]: sellerComissaoMap.get(sale.numero_pedido) ?? 0,
        [headers[8]]: '',
        [headers[9]]: sale.comissao_renovacao ?? 0,
      });
    }

    for (const contador of seller.contadores) {
      for (const sale of contador.vendas) {
        const sellerComissao = sellerComissaoMap.get(sale.numero_pedido) ?? 0;
        rows.push({
          [headers[0]]: seller.nome,
          [headers[1]]: contador.nome,
          [headers[2]]: sale.numero_pedido,
          [headers[3]]: sale.numero_protocolo,
          [headers[4]]: sale.produto ?? '',
          [headers[5]]: sale.is_renovacao ? 'Sim' : 'Não',
          [headers[6]]: sale.valor_venda,
          [headers[7]]: sellerComissao,
          [headers[8]]: sale.comissao,
          [headers[9]]: sale.comissao_renovacao ?? 0,
        });
      }
    }
  }
  return rows;
}

/** Build summary rows for XLSX export. */
function buildSummaryRows(sellers: SellerInfo[], parceiroRenovacao: RenewalPartnerInfo | null): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];
  const summaryHeaders = ['Nome', 'Tipo', 'Vendedor', 'Nº Vendas', 'Total Vendas', 'Comissão do Vendedor', 'Comissão do Contador', 'Comissão de Renovação'];

  if (parceiroRenovacao) {
    const totalVendas = parceiroRenovacao.sellers.reduce(
      (acc, s) => acc + s.vendas.length + s.contadores.reduce((ca, c) => ca + c.vendas.length, 0),
      0
    );
    rows.push({
      [summaryHeaders[0]]: parceiroRenovacao.nome,
      [summaryHeaders[1]]: 'Parceiro de Renovação',
      [summaryHeaders[2]]: '',
      [summaryHeaders[3]]: totalVendas,
      [summaryHeaders[4]]: parceiroRenovacao.total_vendas,
      [summaryHeaders[5]]: '',
      [summaryHeaders[6]]: '',
      [summaryHeaders[7]]: parceiroRenovacao.total_comissao,
    });
  }

  for (const seller of [...sellers].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))) {
    rows.push({
      [summaryHeaders[0]]: seller.nome,
      [summaryHeaders[1]]: 'Vendedor',
      [summaryHeaders[2]]: '',
      [summaryHeaders[3]]: seller.vendas.length,
      [summaryHeaders[4]]: seller.total_vendas,
      [summaryHeaders[5]]: seller.total_comissao,
      [summaryHeaders[6]]: '',
      [summaryHeaders[7]]: seller.total_comissao_renovacao ?? 0,
    });

    for (const contador of seller.contadores) {
      const contadorPedidos = new Set(contador.vendas.map((v) => v.numero_pedido));
      const sellerComissaoOnContador = seller.vendas
        .filter((v) => contadorPedidos.has(v.numero_pedido))
        .reduce((acc, v) => acc + v.comissao, 0);

      rows.push({
        [summaryHeaders[0]]: contador.nome,
        [summaryHeaders[1]]: 'Contador',
        [summaryHeaders[2]]: seller.nome,
        [summaryHeaders[3]]: contador.vendas.length,
        [summaryHeaders[4]]: contador.total_vendas,
        [summaryHeaders[5]]: sellerComissaoOnContador,
        [summaryHeaders[6]]: contador.total_comissao,
        [summaryHeaders[7]]: contador.total_comissao_renovacao ?? 0,
      });
    }
  }
  return rows;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '').replace(/\s+/g, '-').slice(0, 50);
}

function autoSizeColumns(ws: XLSX.WorkSheet): void {
  if (!ws || !ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const colWidths: { wch: number }[] = [];
  for (let C = range.s.c; C <= range.e.c; C++) {
    let maxLen = 10;
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v != null) {
        const s = typeof cell.v === 'number' ? String(cell.v) : String(cell.v);
        maxLen = Math.max(maxLen, Math.min(s.length + 1, 60));
      }
    }
    colWidths.push({ wch: maxLen });
  }
  ws['!cols'] = colWidths;
}

function downloadAsXlsx(response: ComissaoResponse): void {
  const wb = XLSX.utils.book_new();
  const sellers = response.sellers ?? [];
  const parceiroRenovacao = response.parceiro_renovacao ?? null;

  const salesRows = buildSalesRows(sellers);
  const wsSales = XLSX.utils.json_to_sheet(salesRows);
  autoSizeColumns(wsSales);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Vendas');

  const summaryRows = buildSummaryRows(sellers, parceiroRenovacao);
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  autoSizeColumns(wsSummary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  const fileName = `comissao-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function downloadSellerXlsx(seller: SellerInfo, _showRenewalComissao = false): void {
  const wb = XLSX.utils.book_new();
  const salesRows = buildSalesRows([seller]);
  const wsSales = XLSX.utils.json_to_sheet(salesRows);
  autoSizeColumns(wsSales);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Vendas');
  const summaryRows = buildSummaryRows([seller], null);
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  autoSizeColumns(wsSummary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');
  const fileName = `comissao-vendedor-${sanitizeFileName(seller.nome)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function downloadContadorXlsx(seller: SellerInfo, contador: ContadorInfo, _showRenewalComissao = false): void {
  const wb = XLSX.utils.book_new();
  const headers = [
    'Vendedor',
    'Contador / Vendas Diretas',
    'Nº Pedido',
    'Nº Protocolo',
    'Produto',
    'Renovação',
    'Valor Venda',
    'Comissão do Contador',
  ];
  const salesRows = contador.vendas.map((sale: SaleInfo) => ({
    [headers[0]]: seller.nome,
    [headers[1]]: contador.nome,
    [headers[2]]: sale.numero_pedido,
    [headers[3]]: sale.numero_protocolo,
    [headers[4]]: sale.produto ?? '',
    [headers[5]]: sale.is_renovacao ? 'Sim' : 'Não',
    [headers[6]]: sale.valor_venda,
    [headers[7]]: sale.comissao,
  }));
  const wsSales = XLSX.utils.json_to_sheet(salesRows);
  autoSizeColumns(wsSales);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Vendas');
  const summaryHeaders = ['Nome', 'Tipo', 'Vendedor', 'Nº Vendas', 'Total Vendas', 'Comissão do Contador'];
  const summaryRows = [
    {
      [summaryHeaders[0]]: contador.nome,
      [summaryHeaders[1]]: 'Contador',
      [summaryHeaders[2]]: seller.nome,
      [summaryHeaders[3]]: contador.vendas.length,
      [summaryHeaders[4]]: contador.total_vendas,
      [summaryHeaders[5]]: contador.total_comissao,
    },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  autoSizeColumns(wsSummary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');
  const fileName = `comissao-contador-${sanitizeFileName(contador.nome)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function downloadRenewalPartnerXlsx(rp: RenewalPartnerInfo): void {
  const wb = XLSX.utils.book_new();
  const salesRows = buildSalesRows(rp.sellers);
  const wsSales = XLSX.utils.json_to_sheet(salesRows);
  autoSizeColumns(wsSales);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Vendas');
  const summaryRows = buildSummaryRows(rp.sellers, rp);
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  autoSizeColumns(wsSummary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');
  const fileName = `comissao-parceiro-renovacao-${sanitizeFileName(rp.nome)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export default function Comissao() {
  const [vendasFile, setVendasFile] = useState<File | null>(null);
  const [parceirosFile, setParceirosFile] = useState<File | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ComissaoResponse | null>(null);
  // Generic expand/collapse set – keys are built per node type
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const results = response?.sellers ?? null;
  const parceiroRenovacao = response?.parceiro_renovacao ?? null;

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
    setResponse(null);

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
      setResponse(data);
      // Expand only the top-level sellers by default + renewal partner
      const initialExpanded = new Set(data.sellers.map((s) => sellerKey(s)));
      if (data.parceiro_renovacao) {
        initialExpanded.add(renewalPartnerKey);
      }
      setExpandedNodes(initialExpanded);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Erro ao calcular comissão. Verifique os arquivos e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // --- key helpers ---
  const renewalPartnerKey = 'renewal-partner';
  const sellerKey = (s: SellerInfo) => `seller:${s.cnpj_cpf ?? s.nome}`;
  const directKey = (s: SellerInfo) => `direct:${s.cnpj_cpf ?? s.nome}`;
  const contadorKey = (s: SellerInfo, cDoc: string) =>
    `contador:${s.cnpj_cpf ?? s.nome}:${cDoc}`;
  // Keys for renewal partner inner tree
  const rpSellerKey = (s: SellerInfo) => `rp-seller:${s.cnpj_cpf ?? s.nome}`;
  const rpDirectKey = (s: SellerInfo) => `rp-direct:${s.cnpj_cpf ?? s.nome}`;
  const rpContadorKey = (s: SellerInfo, cDoc: string) =>
    `rp-contador:${s.cnpj_cpf ?? s.nome}:${cDoc}`;

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
    // Renewal partner keys
    if (parceiroRenovacao) {
      keys.add(renewalPartnerKey);
      for (const s of parceiroRenovacao.sellers) {
        keys.add(rpSellerKey(s));
        if (getDirectSales(s).length > 0) keys.add(rpDirectKey(s));
        for (const c of s.contadores) {
          keys.add(rpContadorKey(s, c.cnpj_cpf));
        }
      }
    }
    return keys;
  }, [results, parceiroRenovacao]);

  /** Only seller keys – expands vendedores to show contadores/vendas diretas, no leaf sales. */
  const sellerOnlyKeys = useMemo(() => {
    if (!results) return new Set<string>();
    const keys = new Set(results.map((s) => sellerKey(s)));
    if (parceiroRenovacao) {
      keys.add(renewalPartnerKey);
      for (const s of parceiroRenovacao.sellers) {
        keys.add(rpSellerKey(s));
      }
    }
    return keys;
  }, [results, parceiroRenovacao]);

  const expandAll = () => setExpandedNodes(new Set(allKeys));
  const expandVendedores = () => setExpandedNodes(new Set(sellerOnlyKeys));
  const collapseAll = () => setExpandedNodes(new Set());

  // --- render a single sale row ---
  const renderSale = (sale: SaleInfo, sellerComissao?: number, showRenewalComissao?: boolean) => (
    <div key={sale.numero_pedido} className="tree-node tree-sale">
      <div className="tree-node-header sale-header">
        <div className="tree-node-info sale-node-info">
          <div className="sale-line sale-line-1">
            <span className="sale-field">
              <span className="sale-field-label">Pedido</span>
              {sale.numero_pedido}
            </span>
            <span className="sale-field">
              <span className="sale-field-label">Protocolo</span>
              {sale.numero_protocolo}
            </span>
            <span className="sale-field">
              <span className="sale-field-label">Produto</span>
              {sale.produto || '-'}
            </span>
          </div>
          <div className="sale-line sale-line-2">
            <span className="sale-field">
              <span className="sale-field-label">Cliente</span>
              {sale.cliente || '-'}
            </span>
            <span className="sale-field">
              <span className="sale-field-label">Doc. Cliente</span>
              {sale.doc_cliente || '-'}
            </span>
          </div>
          {sale.is_renovacao && (
            <span className="tree-node-badge badge-renovacao">Renovação</span>
          )}
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
          {showRenewalComissao && sale.is_renovacao && sale.comissao_renovacao > 0 && (
            <div className="total-item">
              <span className="total-label">Comissão<br />de Renovação</span>
              <span className="total-value total-comissao-renovacao">
                {formatCurrency(sale.comissao_renovacao)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /** Render a seller node (reused for main tree and renewal partner inner tree). */
  const renderSellerNode = (
    seller: SellerInfo,
    sKey: string,
    dKey: string,
    cKeyFn: (s: SellerInfo, cDoc: string) => string,
    showRenewalComissao: boolean
  ) => {
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
              <span className="total-label">Comissão<br />do Vendedor</span>
              <span className="total-value total-comissao">
                {formatCurrency(seller.total_comissao)}
              </span>
            </div>
            {showRenewalComissao && seller.total_comissao_renovacao > 0 && (
              <div className="total-item">
                <span className="total-label">Comissão<br />de Renovação</span>
                <span className="total-value total-comissao-renovacao">
                  {formatCurrency(seller.total_comissao_renovacao)}
                </span>
              </div>
            )}
            <button
              type="button"
              className="btn-download-xlsx"
              onClick={(e) => {
                e.stopPropagation();
                downloadSellerXlsx(seller, showRenewalComissao);
              }}
              title="Baixar XLSX"
            >
              XLSX
            </button>
          </div>
        </div>

        {/* ── Seller children ── */}
        {isSellerExpanded && hasChildren && (
          <div className="tree-children">
            {/* Direct vendedor sales */}
            {directSales.length > 0 && (() => {
              const isDirectExpanded = expandedNodes.has(dKey);
              const directTotal = directSales.reduce(
                (acc, s) => acc + s.valor_venda,
                0
              );
              const directComissao = directSales.reduce(
                (acc, s) => acc + s.comissao,
                0
              );
              const directComissaoRenovacao = directSales.reduce(
                (acc, s) => acc + (s.is_renovacao ? s.comissao_renovacao : 0),
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
                        <span className="total-label">Comissão<br />do Vendedor</span>
                        <span className="total-value total-comissao">
                          {formatCurrency(directComissao)}
                        </span>
                      </div>
                      {showRenewalComissao && directComissaoRenovacao > 0 && (
                        <div className="total-item">
                          <span className="total-label">Comissão<br />de Renovação</span>
                          <span className="total-value total-comissao-renovacao">
                            {formatCurrency(directComissaoRenovacao)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isDirectExpanded && (
                    <div className="tree-children tree-sales-list">
                      {directSales.map((sale) => renderSale(sale, undefined, showRenewalComissao))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Contadores */}
            {seller.contadores.map((contador) => {
              const cKey = cKeyFn(seller, contador.cnpj_cpf);
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
                      {showRenewalComissao && contador.total_comissao_renovacao > 0 && (
                        <div className="total-item">
                          <span className="total-label">Comissão<br />de Renovação</span>
                          <span className="total-value total-comissao-renovacao">
                            {formatCurrency(contador.total_comissao_renovacao)}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn-download-xlsx"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadContadorXlsx(seller, contador, showRenewalComissao);
                        }}
                        title="Baixar XLSX"
                      >
                        XLSX
                      </button>
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
                          renderSale(sale, sellerComissaoMap.get(sale.numero_pedido) ?? 0, showRenewalComissao)
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
  };

  /** Render the renewal partner top-level node. */
  const renderRenewalPartner = (rp: RenewalPartnerInfo) => {
    const isExpanded = expandedNodes.has(renewalPartnerKey);
    const hasChildren = rp.sellers.length > 0;

    return (
      <div className="tree-node tree-renewal-partner">
        <div
          className="tree-node-header renewal-partner-header"
          onClick={() => toggle(renewalPartnerKey)}
        >
          <span className={`tree-toggle ${isExpanded ? 'expanded' : ''}`}>
            {hasChildren ? '▶' : '•'}
          </span>
          <div className="tree-node-info">
            <span className="tree-node-name">{rp.nome}</span>
            <span className="tree-node-doc">{rp.cnpj_cpf}</span>
            <span className="tree-node-badge badge-renovacao">
              Parceiro de Renovação
            </span>
            <span className="tree-node-badge badge-faixa">
              {rp.faixa_comissao}
            </span>
          </div>
          <div className="tree-node-totals">
            <div className="total-item">
              <span className="total-label">Nº Vendas</span>
              <span className="total-value">
                {rp.sellers.reduce((acc, s) => acc + s.vendas.length + s.contadores.reduce((ca, c) => ca + c.vendas.length, 0), 0)}
              </span>
            </div>
            <div className="total-item">
              <span className="total-label">Total Vendas</span>
              <span className="total-value">
                {formatCurrency(rp.total_vendas)}
              </span>
            </div>
            <div className="total-item">
              <span className="total-label">Comissão<br />de Renovação</span>
              <span className="total-value total-comissao-renovacao">
                {formatCurrency(rp.total_comissao)}
              </span>
            </div>
            <button
              type="button"
              className="btn-download-xlsx"
              onClick={(e) => {
                e.stopPropagation();
                downloadRenewalPartnerXlsx(rp);
              }}
              title="Baixar XLSX"
            >
              XLSX
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="tree-children">
            {rp.sellers.map((seller) =>
              renderSellerNode(
                seller,
                rpSellerKey(seller),
                rpDirectKey(seller),
                rpContadorKey,
                true
              )
            )}
          </div>
        )}
      </div>
    );
  };

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
              <button
                className="btn-primary btn-sm"
                onClick={() => response && downloadAsXlsx(response)}
                disabled={!response || (results?.length === 0 && !parceiroRenovacao)}
              >
                Baixar XLSX
              </button>
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

          {results.length === 0 && !parceiroRenovacao ? (
            <div className="empty-message">
              Nenhum resultado encontrado para o período selecionado.
            </div>
          ) : (
            <div className="tree">
              {/* Renewal Partner node */}
              {parceiroRenovacao && renderRenewalPartner(parceiroRenovacao)}

              {/* Sellers (alphabetical order) */}
              {[...results].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((seller) =>
                renderSellerNode(
                  seller,
                  sellerKey(seller),
                  directKey(seller),
                  contadorKey,
                  false
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
