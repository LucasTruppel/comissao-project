from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)


class LocalidadeAtendimento(Base):
    __tablename__ = "localidades_atendimento"

    id = Column(Integer, primary_key=True, index=True)
    # O código que você pediu, único e indexado para buscas rápidas
    codigo_localidade = Column(String(50), unique=True, index=True, nullable=False)
    nome = Column(String(255), nullable=False)

    # Define a relação: Uma localidade pode ter vários agentes
    agentes = relationship("AgenteValidacao", back_populates="localidade")


class AgenteValidacao(Base):
    __tablename__ = "agentes_validacao"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    # CPF deve ser único
    cpf = Column(String(11), unique=True, index=True, nullable=False)
    
    # Chave estrangeira que aponta para o ID da tabela de localidades
    localidade_id = Column(Integer, ForeignKey("localidades_atendimento.id"))

    # Define a relação inversa: Um agente pertence a uma localidade
    localidade = relationship("LocalidadeAtendimento", back_populates="agentes")