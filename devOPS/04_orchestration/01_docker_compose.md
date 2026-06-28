# Docker Compose

> Multi-container applications made simple with Docker Compose configuration files.

## Basic Usage

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

volumes:
  postgres-data:

networks:
  app-network:
    driver: bridge
```

### Common Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes too
docker-compose down -v

# Execute command
docker-compose exec web npm install

# Rebuild images
docker-compose up --build
```

## Advanced Features

### Environment Files

```bash
# .env
DATABASE_PASSWORD=secret123
NODE_ENV=production
```

```yaml
env_file:
  - .env
```

### Override Production Services

```yaml
# docker-compose.override.yml (auto-loaded)
version: '3.8'

services:
  web:
    ports:
      - "3000:3000"
    volumes:
      - .:/app  # Live code reload
    environment:
      - DEBUG=true
```

### Multi-Stage Setup

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml up -d
```

## Summary

- **Compose** orchestrates multiple containers locally
- **Services** define containers
- **Volumes** persist data
- **Networks** enable inter-container communication
- **Health checks** ensure readiness
- **Great for development and testing**

Next: [Kubernetes Basics](./02_kubernetes_basics.md)
