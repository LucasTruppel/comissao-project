from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # Carrega a variável do arquivo .env
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ADMIN_TOKEN: str
    CORS_ORIGINS: str

    # Adicione esta linha de volta, com o caminho corrigido
    model_config = SettingsConfigDict(env_file=".env", extra='ignore')
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

# Cria uma instância única das configurações
settings = Settings()