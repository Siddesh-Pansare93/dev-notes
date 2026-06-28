# 06 - Settings Management

## BaseSettings: Configuration with Validation

Pydantic's `BaseSettings` class is designed specifically for application configuration. It automatically reads values from **environment variables**, **`.env` files**, and **defaults** -- and validates everything through the same Pydantic validation engine.

Think of it as **dotenv + Joi/Zod validation + config management** all in one.

```bash
pip install pydantic-settings
```

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "My App"
    debug: bool = False
    database_url: str
    api_key: str
    port: int = 8000

# Reads from environment variables automatically!
# DATABASE_URL=postgres://... API_KEY=secret123 python app.py
settings = Settings()
```

### The Node.js Equivalent

In Node.js, you would typically combine multiple packages:

```typescript
// Node.js approach: 3+ packages for what Pydantic does in one class

// 1. dotenv - loads .env files
import dotenv from "dotenv";
dotenv.config();

// 2. Zod or Joi - validates the config
import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().default("My App"),
  DEBUG: z.coerce.boolean().default(false),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  PORT: z.coerce.number().int().default(8000),
});

// 3. Manual wiring
const env = envSchema.parse(process.env);

// Or using a config package like convict:
import convict from "convict";
const config = convict({
  env: { format: ["production", "development"], default: "development", env: "NODE_ENV" },
  port: { format: "port", default: 8080, env: "PORT" },
  db: { url: { format: String, default: "", env: "DATABASE_URL" } },
});
```

With Pydantic, the class definition IS all of that:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "My App"
    debug: bool = False
    database_url: str          # required, no default
    api_key: str               # required, no default
    port: int = 8000

settings = Settings()  # reads env vars, validates, done
```

---

## Reading from Environment Variables

By default, `BaseSettings` maps field names to **uppercase environment variables**:

| Field Name | Environment Variable |
|---|---|
| `database_url` | `DATABASE_URL` |
| `api_key` | `API_KEY` |
| `debug` | `DEBUG` |
| `port` | `PORT` |

```python
import os

# Simulate environment variables (in production these come from the actual env)
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost/db"
os.environ["API_KEY"] = "sk-abc123"
os.environ["DEBUG"] = "true"

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    api_key: str
    debug: bool = False
    port: int = 8000

settings = Settings()
print(settings.database_url)  # "postgresql://user:pass@localhost/db"
print(settings.api_key)       # "sk-abc123"
print(settings.debug)         # True (coerced from string "true")
print(settings.port)          # 8000 (default, no env var set)
```

### Environment Variable Prefix

To avoid collisions (e.g., `PORT` is very generic), add a prefix:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MYAPP_")

    database_url: str
    api_key: str
    debug: bool = False

# Now reads: MYAPP_DATABASE_URL, MYAPP_API_KEY, MYAPP_DEBUG
```

This is like the Node.js convention of `APP_DATABASE_URL` or using convict's `env` option.

### Custom Environment Variable Names

```python
from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    db_connection: str = Field(validation_alias="DATABASE_URL")
    secret: str = Field(validation_alias="MY_SECRET_KEY")
```

---

## .env File Support

### Setup

```bash
pip install pydantic-settings  # includes dotenv support
```

Create a `.env` file:

```env
# .env
DATABASE_URL=postgresql://user:pass@localhost/db
API_KEY=sk-development-key
DEBUG=true
PORT=3000
```

### Configuration

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",           # path to .env file
        env_file_encoding="utf-8",  # encoding
    )

    database_url: str
    api_key: str
    debug: bool = False
    port: int = 8000

settings = Settings()
print(settings.port)  # 3000 (from .env file)
```

### Multiple .env Files

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),  # .env.local overrides .env
    )

    database_url: str
    api_key: str
    debug: bool = False
```

This is similar to how Next.js loads `.env`, `.env.local`, `.env.development`, etc.

---

## Settings Priority Hierarchy

Pydantic settings sources have a priority order (highest to lowest):

1. **Constructor arguments** (passed directly to `Settings()`)
2. **Environment variables** (from the system environment)
3. **`.env` file** values
4. **Default values** (in the class definition)

```python
# .env file: PORT=3000
# Environment: PORT=4000

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    port: int = 8000

# With no env var and no .env: port = 8000 (default)
# With .env PORT=3000:          port = 3000 (.env overrides default)
# With env var PORT=4000:       port = 4000 (env var overrides .env)
# With Settings(port=5000):     port = 5000 (constructor overrides everything)
```

### Node.js Comparison

This is equivalent to a common Node.js pattern:

```typescript
// Node.js manual priority
const port =
  parseInt(process.argv[2]) ||          // CLI arg (highest)
  parseInt(process.env.PORT) ||          // env var
  parseInt(dotenv.parsed?.PORT) ||       // .env file
  8000;                                   // default (lowest)
```

Pydantic does this automatically.

---

## Nested Settings

For complex configurations, you can nest settings:

```python
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

class DatabaseSettings(BaseModel):
    host: str = "localhost"
    port: int = 5432
    name: str = "mydb"
    user: str = "postgres"
    password: str = ""

    @property
    def url(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

class RedisSettings(BaseModel):
    host: str = "localhost"
    port: int = 6379
    db: int = 0

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",  # use double underscore for nesting
    )

    app_name: str = "My App"
    debug: bool = False
    database: DatabaseSettings = DatabaseSettings()
    redis: RedisSettings = RedisSettings()
```

With `env_nested_delimiter="__"`, you set nested values like:

```env
# .env
DATABASE__HOST=db.example.com
DATABASE__PORT=5432
DATABASE__NAME=production_db
DATABASE__USER=admin
DATABASE__PASSWORD=secretpassword
REDIS__HOST=redis.example.com
REDIS__PORT=6380
```

```python
settings = Settings()
print(settings.database.host)  # "db.example.com"
print(settings.database.url)   # "postgresql://admin:secretpassword@db.example.com:5432/production_db"
print(settings.redis.host)     # "redis.example.com"
```

### Node.js Comparison (convict)

```typescript
// convict nested config
const config = convict({
  database: {
    host: { default: "localhost", env: "DATABASE_HOST" },
    port: { default: 5432, env: "DATABASE_PORT", format: "port" },
    name: { default: "mydb", env: "DATABASE_NAME" },
  },
  redis: {
    host: { default: "localhost", env: "REDIS_HOST" },
    port: { default: 6379, env: "REDIS_PORT", format: "port" },
  },
});
```

---

## Secrets from Files

For Docker/Kubernetes deployments, secrets are often mounted as files (e.g., `/run/secrets/db_password`). Pydantic can read from these:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        secrets_dir="/run/secrets"  # Docker secrets directory
    )

    database_password: str  # reads from /run/secrets/database_password
    api_key: str            # reads from /run/secrets/api_key
```

The file name matches the field name (lowercased). The file content becomes the field value.

```bash
# Docker secrets
echo "supersecretpassword" > /run/secrets/database_password
echo "sk-abc123" > /run/secrets/api_key
```

### Priority with Secrets

The full priority order becomes:

1. Constructor arguments
2. Environment variables
3. `.env` file
4. Secrets files
5. Default values

---

## Complete Real-World Settings Example

Here is a production-grade settings pattern used with FastAPI:

```python
# config.py
from functools import lru_cache
from typing import Literal
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        case_sensitive=False,
    )

    # App
    app_name: str = "My API"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1
    allowed_origins: list[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "sqlite:///./dev.db"

    # Auth
    secret_key: SecretStr
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # External Services
    redis_url: str = "redis://localhost:6379/0"
    smtp_host: str | None = None
    smtp_port: int = 587

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

# Cache the settings so .env is only read once
@lru_cache
def get_settings() -> Settings:
    return Settings()

# Usage in FastAPI:
# from config import get_settings
#
# @app.get("/info")
# async def info(settings: Settings = Depends(get_settings)):
#     return {"app": settings.app_name, "env": settings.environment}
```

The corresponding `.env` file:

```env
# .env
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
DATABASE_URL=postgresql://dev:dev@localhost:5432/myapp_dev
SECRET_KEY=dev-secret-key-change-in-production
REDIS_URL=redis://localhost:6379/0
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

### The Same Thing in Node.js

```typescript
// config.ts (Node.js equivalent)
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const settingsSchema = z.object({
  APP_NAME: z.string().default("My API"),
  ENVIRONMENT: z.enum(["development", "staging", "production"]).default("development"),
  DEBUG: z.coerce.boolean().default(false),
  LOG_LEVEL: z.enum(["DEBUG", "INFO", "WARNING", "ERROR"]).default("INFO"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().default(8000),
  WORKERS: z.coerce.number().int().default(1),
  DATABASE_URL: z.string().default("sqlite:///./dev.db"),
  SECRET_KEY: z.string(),
  JWT_ALGORITHM: z.string().default("HS256"),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().int().default(30),
  REDIS_URL: z.string().default("redis://localhost:6379/0"),
});

export const settings = settingsSchema.parse(process.env);
```

Same idea but Pydantic's approach is more structured and Pythonic.

---

## Testing with Settings

Override settings easily in tests:

```python
import pytest
from config import Settings

def test_with_custom_settings():
    # Pass values directly to the constructor (highest priority)
    settings = Settings(
        database_url="sqlite:///./test.db",
        secret_key="test-secret",
        debug=True,
        environment="development",
    )
    assert settings.debug is True
    assert "test.db" in settings.database_url

def test_with_env_override(monkeypatch):
    """Use pytest's monkeypatch to set env vars for a single test."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test.db")
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    settings = Settings()
    assert "test.db" in settings.database_url
```

In Node.js you would do something similar with `process.env`:

```typescript
describe("Settings", () => {
  it("reads from env", () => {
    process.env.DATABASE_URL = "sqlite:///./test.db";
    process.env.SECRET_KEY = "test-secret";
    const settings = settingsSchema.parse(process.env);
    expect(settings.DATABASE_URL).toContain("test.db");
  });
});
```

---

## Practice Exercises

### Exercise 1: Basic Settings
Create a `Settings` class that reads: `APP_NAME` (str, default "My App"), `DEBUG` (bool, default False), `PORT` (int, default 8000), `DATABASE_URL` (str, required). Set these as environment variables using `os.environ` and verify they are read correctly.

### Exercise 2: Settings with .env File
Create a `.env` file with at least 5 settings. Create a `Settings` class that reads from it. Test that defaults work when values are missing from `.env`. Test that environment variables override `.env` values.

### Exercise 3: Nested Database Config
Create settings with nested database configuration: `DB__HOST`, `DB__PORT`, `DB__NAME`, `DB__USER`, `DB__PASSWORD`. Use `env_nested_delimiter="__"`. Add a computed property that returns the full connection URL.

### Exercise 4: Environment-Specific Config
Create a `Settings` class with an `ENVIRONMENT` field (Literal["dev", "staging", "prod"]). Add properties that return different values based on the environment (e.g., `is_production`, `log_level`, `cors_origins`). Load from different `.env` files based on the environment.

### Exercise 5: Settings Singleton
Implement the `@lru_cache` pattern to create a singleton settings instance. Write a test that verifies the same object is returned on multiple calls. Then write a test that shows how to clear the cache for test isolation.

### Exercise 6: Docker Secrets Simulation
Create a temporary directory with "secret" files (just text files with secret values). Configure `BaseSettings` to read from this directory using `secrets_dir`. Verify the secrets are loaded correctly. This simulates how Docker and Kubernetes inject secrets.

### Exercise 7: Full App Config
Create a comprehensive settings class for a realistic web application with: app config (name, version, env), server config (host, port, workers), database config (full connection details), Redis config, JWT/auth config (secret key as SecretStr, token expiry), email/SMTP config (optional), and CORS settings (list of allowed origins). Include proper defaults for development and document what needs to be set for production.
