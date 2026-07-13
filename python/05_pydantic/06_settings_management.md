# 06 - Settings Management

## BaseSettings: Configuration with Validation

Socho ek second ke liye — tumhara app banate ho to har jagah hardcode values rakhoge? Database URL, API keys, debug mode... sab kuch ek jagah manage karna padta hai. Node.js mein tum `dotenv` + `Zod/Joi` + kuch aur packages use karte ho. Python mein? Pydantic ka `BaseSettings` class ek hi jagah sab kuch kar deta hai.

`BaseSettings` automatically **environment variables**, **`.env` files**, aur **defaults** se values padh leta hai — aur sab kuch Pydantic ke validation engine se validate bhi karta hai.

Think of it as **dotenv + Joi/Zod validation + config management** — sab ek class mein!

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

# Environment variables se automatically read hota hai!
# DATABASE_URL=postgres://... API_KEY=secret123 python app.py
settings = Settings()
```

Bassically, tum just fields define karo, aur Pydantic baki sab sambhal leta hai. Kaafi sasta aur clean.

### Node.js mein Kyun Zyada Complicated Hota Hai?

Node.js mein same kaam karne ke liye tumhe multiple packages combine karne padenge:

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

Python mein sab kuch ek class definition mein:

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

Badaa difference, na? 😎

---

## Environment Variables se Reading

Jab `BaseSettings` se values read karte ho, to field names automatically **uppercase environment variables** ke liye map hote hain:

| Field Name | Environment Variable |
|---|---|
| `database_url` | `DATABASE_URL` |
| `api_key` | `API_KEY` |
| `debug` | `DEBUG` |
| `port` | `PORT` |

Snake case ka field, UPPER_SNAKE_CASE environment variable ban jata hai.

```python
import os

# Environment variables simulate kar rahe hain (production mein ye actual env se aate hain)
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
print(settings.debug)         # True (string se bool mein coerce ho gaya)
print(settings.port)          # 8000 (default, env var nahi tha)
```

Notice kiya na — `DEBUG="true"` string tha, but automatically `True` boolean ban gaya? Ye Pydantic validation ka kaam hai.

### Environment Variable Prefix lagaana

Ek problem hota hai — `PORT` bohot generic naam hai. Agar kisi aur package ko bhi `PORT` variable chahiye ho to collision ho sakta hai. Isliye prefix use karo:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MYAPP_")

    database_url: str
    api_key: str
    debug: bool = False

# Ab ye environment variables read karega: MYAPP_DATABASE_URL, MYAPP_API_KEY, MYAPP_DEBUG
```

Jaise Swiggy ke paas `SWIGGY_DATABASE_URL`, `SWIGGY_API_KEY` hote hain — organized rakhne ke liye.

### Custom Environment Variable Names

Kya agar actual environment variable ka naam alag hai? No problem:

```python
from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    db_connection: str = Field(validation_alias="DATABASE_URL")
    secret: str = Field(validation_alias="MY_SECRET_KEY")
```

Ab `db_connection` field, `DATABASE_URL` environment variable se padega, bhale field ka naam alag ho.

---

## .env File Support

### Setup

```bash
pip install pydantic-settings  # includes dotenv support
```

Ek `.env` file banao repo mein:

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
        env_file=".env",           # .env file ka path
        env_file_encoding="utf-8",  # encoding (agar non-ASCII characters ho)
    )

    database_url: str
    api_key: str
    debug: bool = False
    port: int = 8000

settings = Settings()
print(settings.port)  # 3000 (.env file se aaya)
```

Simple na? Pehle define karo `env_file=".env"`, aur Pydantic automatically padh lega.

### Multiple .env Files

Development aur production mein alag-alag config chahiye? Tum multiple `.env` files load kar sakte ho:

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),  # .env.local overrides .env
    )

    database_url: str
    api_key: str
    debug: bool = False
```

Ye Next.js jaise tarika hai — `.env`, `.env.local`, `.env.development` — priority order mein load hota hai.

---

## Settings Priority Hierarchy

Ab yeh important concept hai. Agar multiple sources se settings read kar rahe ho (constructor, env var, `.env`, defaults), to kis source ko priority dogi?

Pydantic ke paas fixed priority order hai (highest to lowest):

1. **Constructor arguments** (seedha `Settings()` mein pass kiya gaya value)
2. **Environment variables** (system ke actual env variables)
3. **`.env` file** values
4. **Default values** (class definition mein likha gaya)

```python
# .env file: PORT=3000
# Environment: PORT=4000

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    port: int = 8000

# Kya value final hogi?
# Case 1: No env var + no .env:     port = 8000 (default)
# Case 2: .env PORT=3000:            port = 3000 (.env overrides default)
# Case 3: env var PORT=4000:         port = 4000 (env var overrides .env)
# Case 4: Settings(port=5000):       port = 5000 (constructor overrides sab)
```

Jaise Zomato ka order placement system — customer ka choice > restaurant ka default > old preference. Latest kahini win hoti hai.

### Node.js mein Manual Priority

Node.js mein tum manually ye sab handle karte ho:

```typescript
// Node.js manual priority
const port =
  parseInt(process.argv[2]) ||          // CLI arg (highest)
  parseInt(process.env.PORT) ||          // env var
  parseInt(dotenv.parsed?.PORT) ||       // .env file
  8000;                                   // default (lowest)
```

Pydantic automatically sab kuch kar deta hai — zyada clean!

---

## Nested Settings

Jab settings bohot complex ho jaaye? Jaise tum kar rahe ho — app config, database config, Redis config, email config, sab alag-alag. Tum nested settings use kar sakte ho:

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
        env_nested_delimiter="__",  # double underscore = nesting symbol
    )

    app_name: str = "My App"
    debug: bool = False
    database: DatabaseSettings = DatabaseSettings()
    redis: RedisSettings = RedisSettings()
```

`env_nested_delimiter="__"` ka matlab — environment variables mein double underscore se nested config set kar sakte ho:

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

Socho isko like a directory structure — `DATABASE__HOST` matlab `settings.database.host`. Clean structure!

### Node.js mein (convict)

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

Same idea, sirf syntax alag hai.

---

## Secrets from Files

Docker ya Kubernetes use kar rahe ho? Secrets usually mounted hote hain as files (like `/run/secrets/db_password`). Pydantic directly un files se padh sakta hai:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        secrets_dir="/run/secrets"  # Docker secrets directory
    )

    database_password: str  # /run/secrets/database_password se padega
    api_key: str            # /run/secrets/api_key se padega
```

File ka naam = field ka naam (lowercase mein). File ka content = field ka value.

```bash
# Docker secrets banao
echo "supersecretpassword" > /run/secrets/database_password
echo "sk-abc123" > /run/secrets/api_key
```

Pydantic automatically find karke padh lega. Badaa useful Docker deployments mein.

### Priority with Secrets

Full priority order ab ye ban jata hai (highest to lowest):

1. Constructor arguments
2. Environment variables
3. `.env` file
4. Secrets files
5. Default values

---

## Complete Real-World Settings Example

Chalo ab ek production-grade example dekho — FastAPI ke saath:

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

# Settings cache karke rakho taaki .env sirf ek baar padhe
@lru_cache
def get_settings() -> Settings:
    return Settings()

# FastAPI mein use:
# from config import get_settings
#
# @app.get("/info")
# async def info(settings: Settings = Depends(get_settings)):
#     return {"app": settings.app_name, "env": settings.environment}
```

Aur corresponding `.env` file:

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

> [!warning]
> Production mein kabhi secret keys hardcode mat karna! Environment variables ya secrets files se hi read karna. `SecretStr` use karna taaki sensitive data log mein expose na ho.

### Node.js equivalent

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

Same idea, sirf Pydantic ka approach zyada structured aur Pythonic hai.

---

## Testing with Settings

Testing ke time settings override karna bohot easy hai — `constructor` use karo (highest priority):

```python
import pytest
from config import Settings

def test_with_custom_settings():
    # Constructor mein values pass karo (highest priority)
    settings = Settings(
        database_url="sqlite:///./test.db",
        secret_key="test-secret",
        debug=True,
        environment="development",
    )
    assert settings.debug is True
    assert "test.db" in settings.database_url

def test_with_env_override(monkeypatch):
    """pytest ka monkeypatch use karke env vars set karo single test ke liye."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test.db")
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    settings = Settings()
    assert "test.db" in settings.database_url
```

Node.js mein similarly:

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
Create a `Settings` class jo read kare: `APP_NAME` (str, default "My App"), `DEBUG` (bool, default False), `PORT` (int, default 8000), `DATABASE_URL` (str, required). `os.environ` use karke set karo aur verify karo values read ho rahe hain.

### Exercise 2: Settings with .env File
Ek `.env` file banao at least 5 settings ke saath. `Settings` class banao jo `.env` se read kare. Test karo ki defaults work karte hain jab values `.env` mein missing ho. Test karo ki environment variables override karte hain `.env` values ko.

### Exercise 3: Nested Database Config
Settings banao nested database configuration ke saath: `DB__HOST`, `DB__PORT`, `DB__NAME`, `DB__USER`, `DB__PASSWORD`. `env_nested_delimiter="__"` use karo. Ek computed property add karo jo full connection URL return kare.

### Exercise 4: Environment-Specific Config
`Settings` class banao `ENVIRONMENT` field ke saath (Literal["dev", "staging", "prod"]). Properties add karo jo different values return kare based on environment (jaise `is_production`, `log_level`, `cors_origins`). Load karo different `.env` files based on environment.

### Exercise 5: Settings Singleton
`@lru_cache` pattern implement karo ek singleton settings instance banane ke liye. Test likho jo verify kare same object return hota hai multiple calls mein. Phir test likho jo show kare cache clear karna tests mein.

### Exercise 6: Docker Secrets Simulation
Ek temporary directory banao "secret" files ke saath (sirf text files with secret values). `BaseSettings` configure karo `secrets_dir` use karke. Verify karo secrets load ho rahe hain correctly. Ye Docker aur Kubernetes secrets injection simulate karta hai.

### Exercise 7: Full App Config
Ek comprehensive settings class banao realistic web application ke liye: app config (name, version, env), server config (host, port, workers), database config (full connection details), Redis config, JWT/auth config (secret key as SecretStr, token expiry), email/SMTP config (optional), CORS settings (list of allowed origins). Proper defaults add karo development ke liye aur document karo production ke liye kya set karna padega.
