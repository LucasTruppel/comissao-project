# routers/comissao.py
import csv
import io
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from unidecode import unidecode

from ..auth import get_current_active_user
from ..schemas import SellerInfo, ContadorInfo, SaleInfo, RenewalPartnerInfo, ComissaoResponse

RENEWAL_PARTNER_CPF_CNPJ = "34151313001"

router = APIRouter(
    tags=["Comissão"],
    dependencies=[Depends(get_current_active_user)]
)


def parse_commission_percentage(faixa_comissao: str) -> Optional[float]:
    """Extract commission percentage from 'Faixa de Comissão' field.
    
    Accepts formats like: "10%", "20%", "Faixa 20%", "30 VENDIDO 25 EMITIDO", etc.
    Returns the percentage as a float (e.g., 0.10 for 10%), or None if invalid.
    """
    if not faixa_comissao or faixa_comissao.strip() == "-":
        return None
    
    # Remove common prefixes and normalize
    text = unidecode(faixa_comissao.strip().upper())
    
    # Look for percentage patterns: "10%", "20%", etc.
    # Try to find the first valid percentage
    patterns = [
        r'(\d+(?:[.,]\d+)?)\s*%',  # Matches "10%", "20.5%", "30%"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                percentage = float(match.group(1).replace(',', '.'))
                if 0 <= percentage <= 100:
                    return percentage / 100.0
            except ValueError:
                continue
    
    return None


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse date string in format DD/MM/YYYY or DD/MM/YYYY HH:MM:SS."""
    if not date_str or date_str.strip() == "":
        return None
    
    date_str = date_str.strip()
    formats = [
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    return None


def parse_float(value: str) -> float:
    """Parse float value, handling Brazilian format (comma as decimal separator)."""
    if not value or value.strip() == "":
        return 0.0
    
    # Replace comma with dot and remove spaces
    value = value.strip().replace(".", "").replace(",", ".")
    try:
        return float(value)
    except ValueError:
        return 0.0


def normalize_cpf_cnpj(doc: str) -> str:
    """Normalize CPF/CNPJ by removing dots, dashes, and slashes."""
    if not doc:
        return ""
    return doc.strip().replace(".", "").replace("-", "").replace("/", "").replace(" ", "")


def parse_csv_file(file: UploadFile) -> Tuple[List[Dict[str, str]], Dict[str, str]]:
    """Parse CSV file with semicolon delimiter and return rows and header map.
    
    Returns:
        - rows: List of dictionaries where keys are the original header names
        - header_map: Dictionary mapping normalized header names to original header names
    """
    content = file.file.read()
    if isinstance(content, bytes):
        content = content.decode('utf-8-sig')  # Handle BOM
    
    csv_reader = csv.DictReader(io.StringIO(content), delimiter=';')
    
    # Get headers
    headers = csv_reader.fieldnames
    if not headers:
        raise HTTPException(status_code=400, detail="CSV file has no headers")
    
    # Create header map (normalized -> original)
    header_map = {}
    for header in headers:
        normalized = unidecode(header.strip().lower())
        header_map[normalized] = header
    
    # Read all rows
    rows = []
    for row in csv_reader:
        rows.append(row)
    
    return rows, header_map


def get_header_name(headers_map: Dict[str, str], header_name: str) -> Optional[str]:
    """Find the original header name from normalized map."""
    normalized = unidecode(header_name.lower().strip())
    return headers_map.get(normalized)


def validate_dates(data_inicio: str, data_fim: str) -> Tuple[datetime, datetime]:
    """Validate and parse start and end dates."""
    inicio = parse_date(data_inicio)
    fim = parse_date(data_fim)
    
    if not inicio or not fim:
        raise HTTPException(
            status_code=400,
            detail="Datas inválidas. Use o formato DD/MM/YYYY"
        )
    
    if inicio > fim:
        raise HTTPException(
            status_code=400,
            detail="Data de início deve ser anterior à data de fim"
        )
    
    return inicio, fim


def get_vendas_column_names(headers_map: Dict[str, str]) -> Dict[str, str]:
    """Get column names for vendas CSV."""
    return {
        'numero_pedido': get_header_name(headers_map, 'Nº Pedido'),
        'numero_protocolo': get_header_name(headers_map, 'Nº Protocolo'),
        'data_venda': get_header_name(headers_map, 'Data Venda'),
        'valor_venda': get_header_name(headers_map, 'Valor Venda'),
        'status_financeiro': get_header_name(headers_map, 'Status Financeiro'),
        'doc_vendedor': get_header_name(headers_map, 'Doc. Vendedor'),
        'usuario_criacao_pedido': get_header_name(headers_map, 'Usuário de Criação do pedido'),
        'produto': get_header_name(headers_map, 'Produto'),
        'cliente': get_header_name(headers_map, 'Cliente'),
        'doc_cliente': get_header_name(headers_map, 'Doc. Cliente'),
    }


def get_parceiros_column_names(headers_map: Dict[str, str]) -> Dict[str, str]:
    """Get column names for parceiros CSV."""
    return {
        'tipo_parceiro': get_header_name(headers_map, 'Tipo Parceiro'),
        'faixa_comissao': get_header_name(headers_map, 'Faixa de Comissão'),
        'cnpj_cpf': get_header_name(headers_map, 'CNPJ/CPF'),
        'nome_razao': get_header_name(headers_map, 'Nome/Razão Social'),
        'gestor_01': get_header_name(headers_map, 'Gestor 01'),
    }


def validate_columns(vendas_cols: Dict[str, Optional[str]], parceiros_cols: Dict[str, Optional[str]]):
    """Validate that all required columns are present."""
    # usuario_criacao_pedido is optional (used for renewal detection)
    optional_vendas = {'usuario_criacao_pedido', 'produto', 'cliente', 'doc_cliente'}
    missing_vendas = [k for k, v in vendas_cols.items() if v is None and k not in optional_vendas]
    missing_parceiros = [k for k, v in parceiros_cols.items() if v is None]
    
    if missing_vendas:
        raise HTTPException(
            status_code=400,
            detail=f"Colunas faltando no CSV de vendas: {', '.join(missing_vendas)}"
        )
    
    if missing_parceiros:
        raise HTTPException(
            status_code=400,
            detail=f"Colunas faltando no CSV de parceiros: {', '.join(missing_parceiros)}"
        )


def build_sellers_and_contadores(
    parceiros_rows: List[Dict[str, str]],
    parceiros_cols: Dict[str, str]
) -> Tuple[Dict[str, SellerInfo], Dict[str, ContadorInfo], Dict[str, str], Dict[str, str]]:
    """Build dictionaries of sellers and contadores from parceiros CSV.
    
    Returns:
        - sellers_dict: Dict keyed by normalized CPF/CNPJ
        - contadores_dict: Dict keyed by normalized CPF/CNPJ
        - contador_to_seller: Maps contador CPF/CNPJ to seller CPF/CNPJ
        - seller_name_to_cpf: Maps seller name to CPF/CNPJ (for Gestor 01 lookup)
    """
    sellers_dict: Dict[str, SellerInfo] = {}  # Key: normalized CPF/CNPJ
    contadores_dict: Dict[str, ContadorInfo] = {}  # Key: normalized CPF/CNPJ
    contador_cpf_cnpj_to_gestor_name: Dict[str, str] = {}  # Maps contador CPF/CNPJ to gestor name
    contador_to_seller: Dict[str, str] = {}  # Maps contador CPF/CNPJ to seller CPF/CNPJ
    seller_name_to_cpf: Dict[str, str] = {}  # Maps seller name to CPF/CNPJ

    
    # First pass: collect all sellers and contadores
    for row in parceiros_rows:
        tipo = row.get(parceiros_cols['tipo_parceiro'], "").strip() if parceiros_cols['tipo_parceiro'] else ""
        faixa = row.get(parceiros_cols['faixa_comissao'], "").strip() if parceiros_cols['faixa_comissao'] else ""
        cnpj_cpf_raw = row.get(parceiros_cols['cnpj_cpf'], "").strip() if parceiros_cols['cnpj_cpf'] else ""
        nome = row.get(parceiros_cols['nome_razao'], "").strip() if parceiros_cols['nome_razao'] else ""
        gestor_01 = row.get(parceiros_cols['gestor_01'], "").strip() if parceiros_cols['gestor_01'] else ""

        nome = nome.split(" - ")[0].strip()
        
        # Normalize CPF/CNPJ
        cnpj_cpf_normalized = normalize_cpf_cnpj(cnpj_cpf_raw)
        if not cnpj_cpf_normalized:
            continue  # Skip if no CPF/CNPJ
        
        # Extract commission percentage
        commission_pct = parse_commission_percentage(faixa)
        
        if tipo.lower() == "contador":
            # This is a contador
            if commission_pct is None:
                continue  # Skip if invalid commission format
            
            contador = ContadorInfo(
                nome=nome,
                cnpj_cpf=cnpj_cpf_raw,
                faixa_comissao=faixa,
                total_vendas=0.0,
                total_comissao=0.0,
                vendas=[]
            )
            contadores_dict[cnpj_cpf_normalized] = contador
            
            # Link contador to seller via Gestor 01 (store gestor name for now)
            if gestor_01:
                gestor_name = gestor_01.split(" - ")[0].strip()
                contador_cpf_cnpj_to_gestor_name[cnpj_cpf_normalized] = gestor_name
        else:
            # This might be a seller (or vendedor)

            if commission_pct is None:
                commission_pct = 0.0
                # print(f"commission_pct does not follow the expected format: {faixa}")
            
            seller = SellerInfo(
                nome=nome,
                cnpj_cpf=cnpj_cpf_raw,
                faixa_comissao=faixa,
                total_vendas=0.0,
                total_comissao=0.0,
                contadores=[],
                vendas=[]
            )
            sellers_dict[cnpj_cpf_normalized] = seller
            seller_name_to_cpf[nome] = cnpj_cpf_normalized
    
    # Link contadores to sellers 
    for contador_cpf_cnpj, gestor_name in contador_cpf_cnpj_to_gestor_name.items():
        seller_cpf = seller_name_to_cpf.get(gestor_name)
        if seller_cpf:
            contador_to_seller[contador_cpf_cnpj] = seller_cpf
            sellers_dict[seller_cpf].contadores.append(contadores_dict[contador_cpf_cnpj])
    
    return sellers_dict, contadores_dict, contador_to_seller, seller_name_to_cpf


def find_renewal_partner_info(
    parceiros_rows: List[Dict[str, str]],
    parceiros_cols: Dict[str, str]
) -> Optional[Tuple[str, str, str]]:
    """Find renewal partner info from parceiros CSV.
    
    Returns: (name, cpf_cnpj_raw, faixa_comissao) or None if not found.
    """
    for row in parceiros_rows:
        cnpj_cpf_raw = row.get(parceiros_cols['cnpj_cpf'], "").strip() if parceiros_cols['cnpj_cpf'] else ""
        cnpj_cpf_normalized = normalize_cpf_cnpj(cnpj_cpf_raw)
        if cnpj_cpf_normalized == RENEWAL_PARTNER_CPF_CNPJ:
            nome = row.get(parceiros_cols['nome_razao'], "").strip() if parceiros_cols['nome_razao'] else ""
            nome = nome.split(" - ")[0].strip()
            faixa = row.get(parceiros_cols['faixa_comissao'], "").strip() if parceiros_cols['faixa_comissao'] else ""
            return nome, cnpj_cpf_raw, faixa
    return None


def is_renewal_sale(
    usuario_criacao_pedido: str,
    renewal_partner_name: str
) -> bool:
    """Check if a sale is a renewal based on 'Usuário de Criação do pedido'."""
    if not usuario_criacao_pedido or not renewal_partner_name:
        return False
    normalized_usuario = unidecode(usuario_criacao_pedido.strip().upper())
    normalized_name = unidecode(renewal_partner_name.strip().upper())
    return normalized_name in normalized_usuario


def find_seller(doc_vendedor: str, sellers_dict: Dict[str, SellerInfo]) -> Optional[SellerInfo]:
    """Find seller by CPF/CNPJ (normalized)."""
    doc_normalized = normalize_cpf_cnpj(doc_vendedor)
    if not doc_normalized:
        return None
    return sellers_dict.get(doc_normalized)


def find_contador(
    doc_vendedor: str,
    contadores_dict: Dict[str, ContadorInfo]
) -> Optional[ContadorInfo]:
    """Find contador by CPF/CNPJ (normalized)."""
    doc_normalized = normalize_cpf_cnpj(doc_vendedor)
    if not doc_normalized:
        return None
    return contadores_dict.get(doc_normalized)


def process_sale(
    row: Dict[str, str],
    vendas_cols: Dict[str, str],
    inicio: datetime,
    fim: datetime,
    sellers_dict: Dict[str, SellerInfo],
    contadores_dict: Dict[str, ContadorInfo],
    contador_to_seller: Dict[str, str],
    renewal_partner_name: Optional[str] = None,
    renewal_commission_pct: Optional[float] = None
):
    """Process a single sale and update seller/contador totals.
    
    Logic:
    - If 'Doc. Vendedor' matches a contador CPF/CNPJ, the sale has both a contador and a seller (via Gestor 01)
    - If 'Doc. Vendedor' matches a seller CPF/CNPJ, the sale only has a seller (no contador)
    - If 'Usuário de Criação do pedido' contains the renewal partner's name, the sale is a renewal
    """
    # Get field values
    status_financeiro = row.get(vendas_cols['status_financeiro'], "").strip() if vendas_cols['status_financeiro'] else ""
    data_venda_str = row.get(vendas_cols['data_venda'], "").strip() if vendas_cols['data_venda'] else ""
    doc_vendedor = row.get(vendas_cols['doc_vendedor'], "").strip() if vendas_cols['doc_vendedor'] else ""
    numero_pedido = row.get(vendas_cols['numero_pedido'], "").strip() if vendas_cols['numero_pedido'] else ""
    numero_protocolo = row.get(vendas_cols['numero_protocolo'], "").strip() if vendas_cols['numero_protocolo'] else ""
    valor_venda_str = row.get(vendas_cols['valor_venda'], "").strip() if vendas_cols['valor_venda'] else ""
    usuario_criacao_pedido = ""
    if vendas_cols.get('usuario_criacao_pedido'):
        usuario_criacao_pedido = row.get(vendas_cols['usuario_criacao_pedido'], "").strip()
    produto = ""
    if vendas_cols.get('produto'):
        produto = row.get(vendas_cols['produto'], "").strip()
    cliente = ""
    if vendas_cols.get('cliente'):
        cliente = row.get(vendas_cols['cliente'], "").strip()
    doc_cliente = ""
    if vendas_cols.get('doc_cliente'):
        doc_cliente = row.get(vendas_cols['doc_cliente'], "").strip()
    
    # Filter by Status Financeiro
    if status_financeiro.upper() != "PAGO":
        return
    
    # Filter by date
    data_venda = parse_date(data_venda_str)
    if not data_venda or data_venda < inicio or data_venda > fim:
        return
    
    valor_venda = parse_float(valor_venda_str)
    if valor_venda <= 0:
        return
    
    if not doc_vendedor:
        return  # No document, skip
    
    # Determine if this is a renewal sale
    # Do not consider as renewal when the seller is the renewal partner
    sale_is_renovacao = False
    sale_comissao_renovacao = 0.0
    doc_vendedor_normalized = normalize_cpf_cnpj(doc_vendedor)
    seller_is_renewal_partner = doc_vendedor_normalized == RENEWAL_PARTNER_CPF_CNPJ
    if renewal_partner_name and renewal_commission_pct is not None and not seller_is_renewal_partner:
        sale_is_renovacao = is_renewal_sale(usuario_criacao_pedido, renewal_partner_name)
        if sale_is_renovacao:
            sale_comissao_renovacao = valor_venda * renewal_commission_pct
    
    # Check if vendedor is a contador first (by CPF/CNPJ)
    contador = find_contador(doc_vendedor, contadores_dict)
    
    if contador:
        # Vendedor is a contador - sale has both contador and seller
        # Find the seller associated with this contador via Gestor 01
        seller_cpf = contador_to_seller.get(doc_vendedor_normalized)
        if not seller_cpf:
            return  # Contador has no associated seller, skip
        
        # Find the seller
        seller = sellers_dict.get(seller_cpf)
        if not seller:
            return  # Seller not found, skip
        
        # Calculate contador commission
        contador_commission_pct = parse_commission_percentage(contador.faixa_comissao)
        if contador_commission_pct is None:
            return
        
        contador_commission = valor_venda * contador_commission_pct
        
        # Create sale info for contador
        contador_sale_info = SaleInfo(
            numero_pedido=numero_pedido,
            numero_protocolo=numero_protocolo,
            valor_venda=valor_venda,
            comissao=contador_commission,
            is_renovacao=sale_is_renovacao,
            comissao_renovacao=sale_comissao_renovacao,
            produto=produto,
            cliente=cliente,
            doc_cliente=doc_cliente
        )
        
        contador.vendas.append(contador_sale_info)
        contador.total_vendas += valor_venda
        contador.total_comissao += contador_commission
        if sale_is_renovacao:
            contador.total_comissao_renovacao += sale_comissao_renovacao
        
        # Calculate seller commission
        seller_commission_pct = parse_commission_percentage(seller.faixa_comissao)
        if seller_commission_pct is None:
            return
        
        seller_commission = valor_venda * seller_commission_pct
        
        # Create sale info for seller
        seller_sale_info = SaleInfo(
            numero_pedido=numero_pedido,
            numero_protocolo=numero_protocolo,
            valor_venda=valor_venda,
            comissao=seller_commission,
            is_renovacao=sale_is_renovacao,
            comissao_renovacao=sale_comissao_renovacao,
            produto=produto,
            cliente=cliente,
            doc_cliente=doc_cliente
        )
        
        seller.vendas.append(seller_sale_info)
        seller.total_vendas += valor_venda
        seller.total_comissao += seller_commission
        if sale_is_renovacao:
            seller.total_comissao_renovacao += sale_comissao_renovacao
        
    else:
        # Vendedor is a seller - sale only has seller (no contador)
        seller = find_seller(doc_vendedor, sellers_dict)
        if not seller:
            return  # Seller not found, skip
        
        # Calculate seller commission
        seller_commission_pct = parse_commission_percentage(seller.faixa_comissao)
        if seller_commission_pct is None:
            return
        
        seller_commission = valor_venda * seller_commission_pct
        
        # Create sale info
        sale_info = SaleInfo(
            numero_pedido=numero_pedido,
            numero_protocolo=numero_protocolo,
            valor_venda=valor_venda,
            comissao=seller_commission,
            is_renovacao=sale_is_renovacao,
            comissao_renovacao=sale_comissao_renovacao,
            produto=produto,
            cliente=cliente,
            doc_cliente=doc_cliente
        )
        
        # Add to seller
        seller.vendas.append(sale_info)
        seller.total_vendas += valor_venda
        seller.total_comissao += seller_commission
        if sale_is_renovacao:
            seller.total_comissao_renovacao += sale_comissao_renovacao


def process_sales(
    vendas_rows: List[Dict[str, str]],
    vendas_cols: Dict[str, str],
    inicio: datetime,
    fim: datetime,
    sellers_dict: Dict[str, SellerInfo],
    contadores_dict: Dict[str, ContadorInfo],
    contador_to_seller: Dict[str, str],
    renewal_partner_name: Optional[str] = None,
    renewal_commission_pct: Optional[float] = None
):
    """Process all sales and update seller/contador totals."""
    for row in vendas_rows:
        process_sale(
            row, vendas_cols, inicio, fim,
            sellers_dict, contadores_dict, contador_to_seller,
            renewal_partner_name, renewal_commission_pct
        )


def filter_and_format_results(sellers_dict: Dict[str, SellerInfo]) -> List[SellerInfo]:
    """Filter out sellers/contadores with no sales and return formatted results."""
    result = list[SellerInfo](sellers_dict.values())
    
    # Filter out sellers with no sales
    result = [s for s in result if s.total_vendas > 0]
    
    # Filter out contadores with no sales from each seller
    for seller in result:
        seller.contadores = [c for c in seller.contadores if c.total_vendas > 0]
    
    return result


def build_renewal_partner_node(
    sellers: List[SellerInfo],
    renewal_partner_name: str,
    renewal_partner_cpf_cnpj: str,
    renewal_partner_faixa: str
) -> Optional[RenewalPartnerInfo]:
    """Build renewal partner node with filtered renewal-only sales tree.
    
    Replicates the seller/contador tree but only including renewal sales.
    """
    renewal_sellers: List[SellerInfo] = []
    partner_total_vendas = 0.0
    partner_total_comissao = 0.0
    
    for seller in sellers:
        # Filter renewal sales for this seller
        renewal_vendas = [v for v in seller.vendas if v.is_renovacao]
        
        # Build filtered contadores with only renewal sales
        renewal_contadores: List[ContadorInfo] = []
        for contador in seller.contadores:
            renewal_contador_vendas = [v for v in contador.vendas if v.is_renovacao]
            if renewal_contador_vendas:
                renewal_contadores.append(ContadorInfo(
                    nome=contador.nome,
                    cnpj_cpf=contador.cnpj_cpf,
                    faixa_comissao=contador.faixa_comissao,
                    total_vendas=sum(v.valor_venda for v in renewal_contador_vendas),
                    total_comissao=sum(v.comissao for v in renewal_contador_vendas),
                    total_comissao_renovacao=sum(v.comissao_renovacao for v in renewal_contador_vendas),
                    vendas=renewal_contador_vendas
                ))
        
        # Only include seller if it has renewal sales (direct or via contadores)
        if not renewal_vendas and not renewal_contadores:
            continue
        
        seller_renewal_total_vendas = sum(v.valor_venda for v in renewal_vendas)
        seller_renewal_total_comissao = sum(v.comissao for v in renewal_vendas)
        seller_renewal_total_comissao_renovacao = sum(v.comissao_renovacao for v in renewal_vendas)
        
        renewal_seller = SellerInfo(
            nome=seller.nome,
            cnpj_cpf=seller.cnpj_cpf,
            faixa_comissao=seller.faixa_comissao,
            total_vendas=seller_renewal_total_vendas,
            total_comissao=seller_renewal_total_comissao,
            total_comissao_renovacao=seller_renewal_total_comissao_renovacao,
            contadores=renewal_contadores,
            vendas=renewal_vendas
        )
        renewal_sellers.append(renewal_seller)
        
        # Accumulate partner totals (from direct sales + contador sales)
        partner_total_vendas += seller_renewal_total_vendas
        partner_total_comissao += seller_renewal_total_comissao_renovacao
        for rc in renewal_contadores:
            partner_total_vendas += rc.total_vendas
            partner_total_comissao += rc.total_comissao_renovacao
    
    if not renewal_sellers:
        return None
    
    return RenewalPartnerInfo(
        nome=renewal_partner_name,
        cnpj_cpf=renewal_partner_cpf_cnpj,
        faixa_comissao=renewal_partner_faixa,
        total_vendas=partner_total_vendas,
        total_comissao=partner_total_comissao,
        sellers=renewal_sellers
    )


@router.post(
    "/calcular-comissao/",
    summary="Calcula comissão de vendedores e contadores",
    description="Recebe dois arquivos CSV (vendas e parceiros) e calcula as comissões "
                "para vendedores e contadores no período especificado.",
    response_model=ComissaoResponse
)
async def calcular_comissao(
    vendas_file: UploadFile = File(..., description="CSV de vendas"),
    parceiros_file: UploadFile = File(..., description="CSV de parceiros"),
    data_inicio: str = Form(..., description="Data de início (DD/MM/YYYY)"),
    data_fim: str = Form(..., description="Data de fim (DD/MM/YYYY)")
):
    try:
        # Validate and parse dates
        inicio, fim = validate_dates(data_inicio, data_fim)
        
        # Parse CSV files
        vendas_rows, vendas_headers = parse_csv_file(vendas_file)
        parceiros_rows, parceiros_headers = parse_csv_file(parceiros_file)
        
        # Get column names
        vendas_cols = get_vendas_column_names(vendas_headers)
        parceiros_cols = get_parceiros_column_names(parceiros_headers)
        
        # Validate required columns
        validate_columns(vendas_cols, parceiros_cols)
        
        # Build sellers and contadores dictionaries
        sellers_dict, contadores_dict, contador_to_seller, _ = build_sellers_and_contadores(
            parceiros_rows, parceiros_cols
        )
        
        # Find renewal partner info
        renewal_partner_name = None
        renewal_partner_cpf_cnpj = ""
        renewal_partner_faixa = ""
        renewal_commission_pct = None
        
        renewal_info = find_renewal_partner_info(parceiros_rows, parceiros_cols)
        if renewal_info:
            renewal_partner_name, renewal_partner_cpf_cnpj, renewal_partner_faixa = renewal_info
            renewal_commission_pct = parse_commission_percentage(renewal_partner_faixa)
        
        # Process all sales
        process_sales(
            vendas_rows, vendas_cols, inicio, fim,
            sellers_dict, contadores_dict, contador_to_seller,
            renewal_partner_name, renewal_commission_pct
        )
        
        # Filter and format results
        sellers = filter_and_format_results(sellers_dict)
        
        # Build renewal partner node
        parceiro_renovacao = None
        if renewal_partner_name and renewal_commission_pct is not None:
            parceiro_renovacao = build_renewal_partner_node(
                sellers,
                renewal_partner_name,
                renewal_partner_cpf_cnpj,
                renewal_partner_faixa
            )
        
        return ComissaoResponse(
            sellers=sellers,
            parceiro_renovacao=parceiro_renovacao
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Ocorreu um erro inesperado ao processar os arquivos: {str(e)}"
        )

