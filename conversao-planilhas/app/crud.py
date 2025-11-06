from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from . import models, schemas
from .auth import get_password_hash

# --- CRUD para Localidade ---

async def get_localidade(db: AsyncSession, localidade_id: int):
    result = await db.get(models.LocalidadeAtendimento, localidade_id)
    return result

async def get_localidade_by_codigo(db: AsyncSession, codigo: str):
    q = select(models.LocalidadeAtendimento).where(models.LocalidadeAtendimento.codigo_localidade == codigo)
    result = await db.execute(q)
    return result.scalar_one_or_none()

async def get_localidades(db: AsyncSession, skip: int = 0, limit: int = 100):
    q = select(models.LocalidadeAtendimento).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()

async def create_localidade(db: AsyncSession, localidade: schemas.LocalidadeCreate):
    db_localidade = models.LocalidadeAtendimento(**localidade.model_dump())
    db.add(db_localidade)
    await db.commit()
    await db.refresh(db_localidade)
    return db_localidade


# --- CRUD para Agente ---

async def get_agente_by_cpf(db: AsyncSession, cpf: str):
    q = select(models.AgenteValidacao).where(models.AgenteValidacao.cpf == cpf)
    result = await db.execute(q)
    return result.scalar_one_or_none()

async def create_agente(db: AsyncSession, agente: schemas.AgenteCreate):
    db_agente = models.AgenteValidacao(**agente.model_dump())
    db.add(db_agente)
    await db.commit()
    await db.refresh(db_agente)
    return db_agente

async def get_agentes(db: AsyncSession, skip: int = 0, limit: int = 100):
    q = select(models.AgenteValidacao).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()

# Função para buscar um agente e já incluir (JOIN) os dados da localidade
async def get_agente_with_localidade(db: AsyncSession, agente_id: int):
    q = select(models.AgenteValidacao).options(
        selectinload(models.AgenteValidacao.localidade)
    ).where(models.AgenteValidacao.id == agente_id)
    
    result = await db.execute(q)
    return result.scalar_one_or_none()

async def update_agente_localidade(db: AsyncSession, agente_id: int, localidade_id: int):
    agente = await db.get(models.AgenteValidacao, agente_id)
    if agente:
        agente.localidade_id = localidade_id
        db.add(agente)
        await db.commit()
        await db.refresh(agente)
    return agente

# --- CRUD para User ---

async def create_user(db: AsyncSession, user: schemas.UserCreate):
    """Cria um novo usuário"""
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def get_user(db: AsyncSession, user_id: int):
    """Busca usuário por ID"""
    return await db.get(models.User, user_id)