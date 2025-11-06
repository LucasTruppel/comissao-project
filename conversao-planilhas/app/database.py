from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from .config import settings

# Cria o "motor" assíncrono usando a URL do .env
engine = create_async_engine(
    settings.DATABASE_URL,
    # echo=True,
)

# Cria uma "fábrica" de sessões assíncronas
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Classe base para nossos modelos (tabelas)
class Base(DeclarativeBase):
    pass

# Função de dependência (Dependency Injection)
# Isso garante que cada requisição tenha sua própria sessão de banco
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()