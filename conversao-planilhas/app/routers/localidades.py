# routers/localidades.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from .. import crud, models, schemas
from ..database import get_db
from ..auth import get_current_active_user

router = APIRouter(
    prefix="/localidades",
    tags=["Localidades"],
    dependencies=[Depends(get_current_active_user)]
)

@router.post("/", response_model=schemas.Localidade, status_code=201)
async def create_localidade(
    localidade: schemas.LocalidadeCreate, 
    db: AsyncSession = Depends(get_db)
):
    db_localidade = await crud.get_localidade_by_codigo(db, codigo=localidade.codigo_localidade)
    if db_localidade:
        raise HTTPException(status_code=400, detail="Código de localidade já cadastrado")
    return await crud.create_localidade(db=db, localidade=localidade)


@router.get("/", response_model=List[schemas.Localidade])
async def read_localidades(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db)
):
    localidades = await crud.get_localidades(db, skip=skip, limit=limit)
    return localidades