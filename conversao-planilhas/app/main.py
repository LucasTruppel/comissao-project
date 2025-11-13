# main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models # Import models para que o create_all saiba das tabelas
from .config import settings

# Importe os novos módulos de roteador
from .routers import auth, agentes, localidades, conversores

# --- Configuração ---
app = FastAPI(
    title="API de Conversão de Planilhas",
    description="Processa planilhas de remuneração e as converte para o formato base.",
    root_path="/api-comissao"
)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Inclusão dos Roteadores ---
app.include_router(auth.router)
app.include_router(agentes.router)
app.include_router(localidades.router)
app.include_router(conversores.router)

# Evento de "startup": Cria as tabelas no banco de dados
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/", summary="Verifica status da API")
async def read_root():
    """Endpoint raiz para verificar se a API está online."""
    return {"status": "API de Conversão de Planilhas está no ar."}