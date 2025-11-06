from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from .. import crud, models, schemas
from ..database import get_db
from ..auth import get_current_active_user

router = APIRouter(
    prefix="/agentes",
    tags=["Agentes"],
    dependencies=[Depends(get_current_active_user)]
)

@router.post("/", response_model=schemas.Agente, status_code=201)
async def create_agente(
    agente: schemas.AgenteCreate, 
    db: AsyncSession = Depends(get_db)
):
    db_agente = await crud.get_agente_by_cpf(db, cpf=agente.cpf)
    if db_agente:
        raise HTTPException(status_code=400, detail="CPF já cadastrado")
    
    db_localidade = await crud.get_localidade(db, localidade_id=agente.localidade_id)
    if not db_localidade:
        raise HTTPException(status_code=404, detail="ID da Localidade não encontrado")

    return await crud.create_agente(db=db, agente=agente)


@router.get("/", response_model=List[schemas.Agente])
async def read_agentes(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db)
):
    agentes = await crud.get_agentes(db, skip=skip, limit=limit)
    return agentes


@router.get("/{agente_id}/localidade", response_model=schemas.AgenteWithLocalidade)
async def read_agente_com_localidade(
    agente_id: int, 
    db: AsyncSession = Depends(get_db)
):
    db_agente = await crud.get_agente_with_localidade(db, agente_id=agente_id)
    if db_agente is None:
        raise HTTPException(status_code=404, detail="Agente não encontrado")
    return db_agente

@router.post("/atualizar_localidade", response_model=schemas.AgenteWithLocalidade)
async def atualizar_localidade_agente(
    atualizar_localidade_request: schemas.AgenteUpdateLocalidade,
    db: AsyncSession = Depends(get_db)
):
    db_agente = await crud.get_agente_by_cpf(db, cpf=atualizar_localidade_request.cpf)
    if db_agente is None:
        raise HTTPException(status_code=404, detail="Agente não encontrado")
    
    db_localidade = await crud.get_localidade_by_codigo(db, codigo=atualizar_localidade_request.localidade_codigo)
    if db_localidade is None:
        raise HTTPException(status_code=404, detail="Localidade não encontrada")
    
    updated_agente = await crud.update_agente_localidade(
        db,
        agente_id=db_agente.id,
        localidade_id=db_localidade.id
    )
    if updated_agente is None:
        raise HTTPException(status_code=500, detail="Erro ao atualizar a localidade do agente")
    
    db_agente_com_localidade = await crud.get_agente_with_localidade(db, agente_id=updated_agente.id)
    return db_agente_com_localidade