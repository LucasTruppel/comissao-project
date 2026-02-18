from pydantic import BaseModel, EmailStr
from typing import Optional, List

# --- User / Auth ---

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

# --- Localidade ---

# Schema base (campos comuns)
class LocalidadeBase(BaseModel):
    codigo_localidade: str
    nome: str

# Schema para criação (o que a API recebe no POST)
class LocalidadeCreate(LocalidadeBase):
    pass

# Schema para leitura (o que a API retorna no GET)
class Localidade(LocalidadeBase):
    id: int

    # Permite que o Pydantic leia dados de objetos SQLAlchemy
    class Config:
        from_attributes = True


# --- Agente ---

# Schema base
class AgenteBase(BaseModel):
    nome: str
    cpf: str

# Schema para criação (recebe o ID da localidade)
class AgenteCreate(AgenteBase):
    localidade_id: Optional[int] = None

# Schema para leitura (retorna o ID do agente e o ID da localidade)
class Agente(AgenteBase):
    id: int
    localidade_id: int

    class Config:
        from_attributes = True

# Schema complexo: Retorna um Agente com os dados da Localidade aninhados
class AgenteWithLocalidade(Agente):
    localidade: Localidade

# Schema complexo: Retorna uma Localidade com a lista de Agentes aninhada
class LocalidadeWithAgentes(Localidade):
    agentes: List[Agente] = []

class AgenteUpdateLocalidade(BaseModel):
    cpf: str
    localidade_codigo: str

# --- Commission Calculation ---

class SaleInfo(BaseModel):
    numero_pedido: str
    numero_protocolo: str
    valor_venda: float
    comissao: float

class ContadorInfo(BaseModel):
    nome: str
    cnpj_cpf: str
    faixa_comissao: str
    total_vendas: float
    total_comissao: float
    vendas: List[SaleInfo] = []

class SellerInfo(BaseModel):
    nome: str
    cnpj_cpf: Optional[str] = None
    faixa_comissao: str
    total_vendas: float
    total_comissao: float
    contadores: List[ContadorInfo] = []
    vendas: List[SaleInfo] = []