# Middleware, Validation, and Configuration in Go

> Chapter 8 of the Go Backend Series

---

## 🚦 What Is Middleware? (The Real-World Analogy)

Imagine you are going through airport security. Before you board the plane (your actual handler), you go through a series of checkpoints: ticket check, ID verification, baggage X-ray, body scanner. Each checkpoint either lets you through or stops you. If you pass all checkpoints, you board the plane. If any checkpoint fails, you are turned back.

Middleware in a web server works exactly the same way. Every incoming HTTP request passes through a chain of functions (checkpoints) before reaching your actual route handler. Each middleware can:

- Inspect the request
- Modify the request or response
- Decide to stop the request (return an error)
- Pass control to the next middleware or handler

```mermaid
flowchart LR
    Client -->|HTTP Request| MW1[Logger Middleware]
    MW1 -->|next| MW2[Auth Middleware]
    MW2 -->|next| MW3[Rate Limiter]
    MW3 -->|next| Handler[Route Handler]
    Handler -->|response| MW3
    MW3 -->|response| MW2
    MW2 -->|response| MW1
    MW1 -->|response| Client
```

Notice the flow goes in and back out. Middleware wraps around the handler. Code written before `next()` runs on the way in. Code written after `next()` runs on the way out (after the handler has finished). This is the key insight that makes middleware powerful.

---

## 🔗 How the Gin Middleware Chain Works

Gin stores middleware as a slice of `HandlerFunc`. When a request comes in, Gin runs them one by one. The `c.Next()` call tells Gin to jump to the next function in the chain.

```go
// Under the hood, Gin's context looks like this (simplified)
type Context struct {
    handlers HandlersChain // []HandlerFunc
    index    int8           // current position in the chain
}

func (c *Context) Next() {
    c.index++
    for c.index < int8(len(c.handlers)) {
        c.handlers[c.index](c)
        c.index++
    }
}
```

Here is a minimal example showing how the chain runs:

```go
package main

import (
    "fmt"
    "github.com/gin-gonic/gin"
    "net/http"
)

func middlewareA() gin.HandlerFunc {
    return func(c *gin.Context) {
        fmt.Println("A: before")
        c.Next()
        fmt.Println("A: after")
    }
}

func middlewareB() gin.HandlerFunc {
    return func(c *gin.Context) {
        fmt.Println("B: before")
        c.Next()
        fmt.Println("B: after")
    }
}

func main() {
    r := gin.New()
    r.Use(middlewareA(), middlewareB())
    r.GET("/", func(c *gin.Context) {
        fmt.Println("Handler")
        c.JSON(http.StatusOK, gin.H{"ok": true})
    })
    r.Run(":8080")
}
```

Output for a single request:
```
A: before
B: before
Handler
B: after
A: after
```

### Why Ordering Matters

Think of middleware like layers of an onion. The first middleware you register is the outermost layer. It runs first on the way in and last on the way out. This means:

- Put your **logger** first so it captures the duration of everything inside it
- Put your **recovery** (panic catcher) early so it catches panics from all inner middleware
- Put your **auth** after recovery but before business logic
- Put your **rate limiter** after auth (so you can rate-limit per user, not per IP)

```mermaid
flowchart TD
    subgraph "Outer (runs first in, last out)"
        Logger
        subgraph "Middle"
            Recovery
            subgraph "Inner (runs last in, first out)"
                Auth
                RateLimiter
                Handler
            end
        end
    end
```

---

## 🛠️ Building Custom Middleware

### 1. Request ID Middleware

Attach a unique ID to every request. This is essential for tracing logs across a distributed system.

```go
package middleware

import (
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

const RequestIDKey = "X-Request-ID"

func RequestID() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Check if the client sent one, otherwise generate
        reqID := c.GetHeader(RequestIDKey)
        if reqID == "" {
            reqID = uuid.New().String()
        }

        // Store in context so handlers can access it
        c.Set(RequestIDKey, reqID)
        // Echo it back in the response header
        c.Header(RequestIDKey, reqID)

        c.Next()
    }
}
```

### 2. Structured Logger Middleware (with Duration)

```go
package middleware

import (
    "time"
    "github.com/gin-gonic/gin"
    "github.com/rs/zerolog/log"
)

func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        query := c.Request.URL.RawQuery

        // Process the request
        c.Next()

        // Log after the handler finishes
        duration := time.Since(start)
        reqID, _ := c.Get(RequestIDKey)

        log.Info().
            Str("request_id", reqID.(string)).
            Str("method", c.Request.Method).
            Str("path", path).
            Str("query", query).
            Int("status", c.Writer.Status()).
            Dur("duration", duration).
            Str("client_ip", c.ClientIP()).
            Int("body_size", c.Writer.Size()).
            Msg("request completed")
    }
}
```

### 3. JWT Auth Middleware

```go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
)

func Auth(jwtSecret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "authorization header required",
            })
            return // important: return after Abort
        }

        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "authorization header format must be: Bearer <token>",
            })
            return
        }

        token, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
            if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, jwt.ErrSignatureInvalid
            }
            return []byte(jwtSecret), nil
        })

        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "invalid or expired token",
            })
            return
        }

        claims, ok := token.Claims.(jwt.MapClaims)
        if !ok {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "invalid token claims",
            })
            return
        }

        // Store user info in context for handlers
        c.Set("user_id", claims["sub"])
        c.Set("user_email", claims["email"])

        c.Next()
    }
}
```

**Key point:** `c.Abort()` stops the chain. The handler will NOT run. `c.AbortWithStatusJSON()` does the same but also writes a JSON response. Always `return` after calling Abort — otherwise code below it still executes in the current middleware.

### 4. Rate Limiter Middleware

```go
package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

type rateLimiter struct {
    mu       sync.Mutex
    visitors map[string]*visitor
}

type visitor struct {
    count    int
    lastSeen time.Time
}

func RateLimit(maxRequests int, window time.Duration) gin.HandlerFunc {
    rl := &rateLimiter{
        visitors: make(map[string]*visitor),
    }

    // Background cleanup goroutine
    go func() {
        for range time.Tick(window) {
            rl.mu.Lock()
            for ip, v := range rl.visitors {
                if time.Since(v.lastSeen) > window {
                    delete(rl.visitors, ip)
                }
            }
            rl.mu.Unlock()
        }
    }()

    return func(c *gin.Context) {
        ip := c.ClientIP()

        rl.mu.Lock()
        v, exists := rl.visitors[ip]
        if !exists {
            rl.visitors[ip] = &visitor{count: 1, lastSeen: time.Now()}
            rl.mu.Unlock()
            c.Next()
            return
        }

        if time.Since(v.lastSeen) > window {
            v.count = 1
            v.lastSeen = time.Now()
        } else {
            v.count++
        }

        if v.count > maxRequests {
            rl.mu.Unlock()
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                "error": "rate limit exceeded",
            })
            return
        }

        rl.mu.Unlock()
        c.Next()
    }
}
```

> In production, use a Redis-backed rate limiter (like `github.com/go-redis/redis_rate`) so limits are shared across multiple server instances.

---

## 🗂️ Global vs Group vs Single-Route Middleware

Think of middleware scopes like rules in a building. Global rules apply to everyone everywhere. Floor rules apply to everyone on that floor. Room rules apply only to that specific room.

```go
func main() {
    r := gin.New()

    // GLOBAL — applies to every request in the entire app
    r.Use(middleware.RequestID())
    r.Use(middleware.Logger())
    r.Use(gin.Recovery()) // catches panics

    // Public routes — no auth needed
    r.POST("/auth/login", handlers.Login)
    r.POST("/auth/register", handlers.Register)

    // GROUP — applies only to routes in this group
    api := r.Group("/api/v1")
    api.Use(middleware.Auth(cfg.JWTSecret))
    api.Use(middleware.RateLimit(100, time.Minute))
    {
        api.GET("/users", handlers.ListUsers)
        api.GET("/users/:id", handlers.GetUser)

        // SINGLE-ROUTE — applies only to this one route
        admin := api.Group("/admin")
        admin.Use(middleware.RequireRole("admin"))
        {
            admin.DELETE("/users/:id", handlers.DeleteUser)
        }
    }

    r.Run(":8080")
}
```

| Scope | How to Register | When to Use |
|---|---|---|
| Global | `r.Use(...)` | Logger, Recovery, Request ID, CORS |
| Group | `group.Use(...)` | Auth, Rate Limit for protected routes |
| Single Route | `r.GET("/path", mw, handler)` | One-off rules like role checks |

---

## ✅ Request Validation with go-playground/validator

Think of validation like a form at a government office. The clerk (your validator) checks every field before accepting your application. If anything is missing or wrong, you get it back immediately with a list of errors.

### Installation

```bash
go get github.com/go-playground/validator/v10
```

Gin includes validator v10 by default when you bind JSON, so you often do not need to import it separately.

### Struct Tags

```go
type CreateUserRequest struct {
    // required: field must be present and non-zero
    Name     string `json:"name"     validate:"required,min=2,max=100"`
    
    // email: must be a valid email format
    Email    string `json:"email"    validate:"required,email"`
    
    // min/max on numbers: value range
    Age      int    `json:"age"      validate:"required,min=18,max=120"`
    
    // oneof: value must be one of these
    Role     string `json:"role"     validate:"required,oneof=admin user moderator"`
    
    // url: must be a valid URL
    Website  string `json:"website"  validate:"omitempty,url"`
    
    // eqfield: must equal another field (confirm password)
    Password string `json:"password" validate:"required,min=8"`
    Confirm  string `json:"confirm"  validate:"required,eqfield=Password"`
}
```

### Binding and Returning Clean Errors

```go
package handlers

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/go-playground/validator/v10"
)

// ValidationError is a clean error response
type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

func formatValidationErrors(err error) []ValidationError {
    var errors []ValidationError
    for _, e := range err.(validator.ValidationErrors) {
        var msg string
        switch e.Tag() {
        case "required":
            msg = "this field is required"
        case "email":
            msg = "must be a valid email address"
        case "min":
            msg = "value is too short or too small (min: " + e.Param() + ")"
        case "max":
            msg = "value is too long or too large (max: " + e.Param() + ")"
        case "oneof":
            msg = "must be one of: " + strings.ReplaceAll(e.Param(), " ", ", ")
        case "eqfield":
            msg = "must match " + e.Param()
        default:
            msg = "validation failed on rule: " + e.Tag()
        }
        errors = append(errors, ValidationError{
            Field:   strings.ToLower(e.Field()),
            Message: msg,
        })
    }
    return errors
}

func CreateUser(c *gin.Context) {
    var req CreateUserRequest
    
    // ShouldBindJSON binds AND validates using struct tags
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error":  "validation failed",
            "fields": formatValidationErrors(err),
        })
        return
    }
    
    // req is now safe to use
    c.JSON(http.StatusCreated, gin.H{"user": req.Name})
}
```

### Custom Validators

Sometimes built-in tags are not enough. You can register your own:

```go
package validation

import (
    "regexp"
    "github.com/go-playground/validator/v10"
)

var phoneRegex = regexp.MustCompile(`^\+[1-9]\d{7,14}$`)

// RegisterCustomValidators adds your custom rules to the validator
func RegisterCustomValidators(v *validator.Validate) {
    // "phone" tag: validates E.164 phone format like +14155552671
    v.RegisterValidation("phone", func(fl validator.FieldLevel) bool {
        return phoneRegex.MatchString(fl.Field().String())
    })

    // "notblank" tag: fails on whitespace-only strings
    v.RegisterValidation("notblank", func(fl validator.FieldLevel) bool {
        return strings.TrimSpace(fl.Field().String()) != ""
    })
}
```

Usage in a struct:
```go
Phone string `json:"phone" validate:"required,phone"`
Bio   string `json:"bio"   validate:"omitempty,notblank,max=500"`
```

---

## ⚙️ Configuration Management

Think of configuration like a recipe card. Your application is the chef. The recipe card tells the chef what ingredients to use (database URL, port, API keys). The recipe card should be easy to change without rewriting the recipe.

### The Problem with Raw `os.Getenv`

```go
// Bad — scattered, no defaults, no type safety
db := os.Getenv("DATABASE_URL")
port := os.Getenv("PORT") // this is always a string, needs manual parsing
```

### The Config Struct Pattern

Define all your config in one struct. This gives you type safety, documentation, and a single place to look.

```go
package config

type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    JWT      JWTConfig
    Log      LogConfig
}

type ServerConfig struct {
    Port         int           `mapstructure:"port"`
    ReadTimeout  time.Duration `mapstructure:"read_timeout"`
    WriteTimeout time.Duration `mapstructure:"write_timeout"`
    IdleTimeout  time.Duration `mapstructure:"idle_timeout"`
}

type DatabaseConfig struct {
    DSN             string        `mapstructure:"dsn"`
    MaxOpenConns    int           `mapstructure:"max_open_conns"`
    MaxIdleConns    int           `mapstructure:"max_idle_conns"`
    ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
}

type JWTConfig struct {
    Secret     string        `mapstructure:"secret"`
    Expiration time.Duration `mapstructure:"expiration"`
}

type LogConfig struct {
    Level  string `mapstructure:"level"`
    Format string `mapstructure:"format"` // json or text
}
```

### Loading Config with Viper + godotenv

```bash
go get github.com/spf13/viper
go get github.com/joho/godotenv
```

```go
package config

import (
    "fmt"
    "strings"
    "time"

    "github.com/joho/godotenv"
    "github.com/spf13/viper"
)

func Load() (*Config, error) {
    // Load .env file if it exists (does not override real env vars)
    // In production, real env vars from Docker/K8s take priority
    _ = godotenv.Load()

    viper.SetConfigName("config")  // looks for config.yaml, config.json, etc.
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")
    viper.AddConfigPath("./config")

    // Allow environment variables to override config file values
    // e.g., SERVER_PORT overrides server.port
    viper.SetEnvPrefix("APP")
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
    viper.AutomaticEnv()

    // Sensible defaults
    viper.SetDefault("server.port", 8080)
    viper.SetDefault("server.read_timeout", 10*time.Second)
    viper.SetDefault("server.write_timeout", 10*time.Second)
    viper.SetDefault("server.idle_timeout", 60*time.Second)
    viper.SetDefault("database.max_open_conns", 25)
    viper.SetDefault("database.max_idle_conns", 5)
    viper.SetDefault("database.conn_max_lifetime", 5*time.Minute)
    viper.SetDefault("jwt.expiration", 24*time.Hour)
    viper.SetDefault("log.level", "info")
    viper.SetDefault("log.format", "json")

    if err := viper.ReadInConfig(); err != nil {
        // Config file is optional; env vars alone are fine
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            return nil, fmt.Errorf("reading config: %w", err)
        }
    }

    var cfg Config
    if err := viper.Unmarshal(&cfg); err != nil {
        return nil, fmt.Errorf("unmarshalling config: %w", err)
    }

    return &cfg, nil
}
```

Your `config.yaml` file:
```yaml
server:
  port: 8080
  read_timeout: 10s
  write_timeout: 10s

database:
  dsn: "postgres://user:password@localhost:5432/mydb?sslmode=disable"
  max_open_conns: 25

jwt:
  secret: "supersecret-change-in-production"
  expiration: 24h

log:
  level: info
  format: json
```

Your `.env` file (for local development):
```
APP_DATABASE_DSN=postgres://dev:dev@localhost:5432/devdb
APP_JWT_SECRET=local-dev-secret
```

---

## 📊 Structured Logging with Zerolog

Think of logging like a doctor's medical record vs a sticky note. A sticky note (`fmt.Println("error happened")`) is easy to write but impossible to search. A medical record (structured JSON log) has typed fields you can query, filter, and alert on.

### Setup

```bash
go get github.com/rs/zerolog
```

```go
package logger

import (
    "os"
    "time"

    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

func Init(level, format string) {
    // Parse log level
    lvl, err := zerolog.ParseLevel(level)
    if err != nil {
        lvl = zerolog.InfoLevel
    }
    zerolog.SetGlobalLevel(lvl)

    // Add timestamp to every log entry
    zerolog.TimeFieldFormat = time.RFC3339

    if format == "text" {
        // Pretty output for local development
        log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
    }
    // In JSON mode (default), logs go to stderr as JSON — perfect for log aggregators
}
```

### Using the Logger

```go
// Simple message
log.Info().Msg("server starting")

// With fields
log.Info().
    Str("host", "localhost").
    Int("port", 8080).
    Msg("server listening")

// Error with stack
log.Error().
    Err(err).
    Str("user_id", userID).
    Msg("failed to fetch user")

// Conditional logging (only at debug level in dev)
log.Debug().
    Interface("request_body", body).
    Msg("incoming request")
```

JSON output in production:
```json
{"level":"info","time":"2025-01-15T10:30:00Z","method":"POST","path":"/api/v1/users","status":201,"duration":"12ms","request_id":"abc-123"}
```

---

## 🌐 CORS Middleware

CORS (Cross-Origin Resource Sharing) is a browser security rule. Think of it like a nightclub with a guest list. If your frontend at `app.example.com` wants to call your API at `api.example.com`, the browser first asks the API: "is this domain allowed?" CORS middleware answers that question.

```bash
go get github.com/gin-contrib/cors
```

```go
package middleware

import (
    "time"
    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
)

func CORS(allowedOrigins []string) gin.HandlerFunc {
    config := cors.Config{
        AllowOrigins:     allowedOrigins, // e.g., ["https://app.example.com"]
        AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID"},
        ExposeHeaders:    []string{"X-Request-ID"},
        AllowCredentials: true,
        MaxAge:           12 * time.Hour, // how long the browser caches preflight results
    }
    return cors.New(config)
}
```

For local development, you might use `AllowAllOrigins: true`. Never use that in production.

---

## 🛑 Graceful Shutdown

Imagine you are a restaurant closing for the night. A bad owner locks the door mid-meal and kicks customers out. A good owner stops seating new customers, waits for everyone to finish eating, then closes. Graceful shutdown is the "good owner" approach.

Without graceful shutdown, when your server gets a SIGTERM (from Kubernetes, Docker, or Ctrl+C), in-flight requests are killed immediately. Users see errors. Data might be corrupted.

```go
package main

import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/rs/zerolog/log"
)

func startServer(srv *http.Server) {
    // Run server in background goroutine
    go func() {
        log.Info().Str("addr", srv.Addr).Msg("server starting")
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal().Err(err).Msg("server failed")
        }
    }()

    // Block until we receive a shutdown signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    sig := <-quit

    log.Info().Str("signal", sig.String()).Msg("shutdown signal received")

    // Give in-flight requests up to 30 seconds to finish
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Error().Err(err).Msg("forced shutdown due to timeout")
    } else {
        log.Info().Msg("server shut down cleanly")
    }
}
```

```mermaid
sequenceDiagram
    participant OS as OS/Kubernetes
    participant App as Go App
    participant Req as In-flight Requests

    OS->>App: SIGTERM
    App->>App: Stop accepting new connections
    App->>Req: Wait for completion (max 30s)
    Req-->>App: Requests finish
    App->>OS: Exit 0
```

---

## 🏭 Full Production Middleware Stack

Here is everything tied together. This is what a real production API server looks like:

```go
// cmd/api/main.go
package main

import (
    "fmt"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/rs/zerolog/log"

    "myapp/config"
    "myapp/internal/handlers"
    "myapp/internal/middleware"
    "myapp/internal/logger"
)

func main() {
    // 1. Load configuration
    cfg, err := config.Load()
    if err != nil {
        log.Fatal().Err(err).Msg("failed to load config")
    }

    // 2. Initialize logger
    logger.Init(cfg.Log.Level, cfg.Log.Format)

    // 3. Set Gin mode
    if cfg.Log.Level == "debug" {
        gin.SetMode(gin.DebugMode)
    } else {
        gin.SetMode(gin.ReleaseMode)
    }

    // 4. Create router (gin.New() instead of gin.Default() for manual middleware control)
    r := gin.New()

    // 5. Global middleware — order matters
    r.Use(middleware.CORS(cfg.Server.AllowedOrigins))
    r.Use(middleware.RequestID())
    r.Use(middleware.Logger())
    r.Use(gin.Recovery()) // converts panics into 500 responses

    // 6. Health check — no auth, no rate limit
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":    "ok",
            "timestamp": time.Now().UTC(),
        })
    })

    // 7. Public routes
    auth := r.Group("/auth")
    {
        auth.POST("/login", handlers.Login)
        auth.POST("/register", handlers.Register)
        auth.POST("/refresh", handlers.RefreshToken)
    }

    // 8. Protected API routes
    api := r.Group("/api/v1")
    api.Use(middleware.Auth(cfg.JWT.Secret))
    api.Use(middleware.RateLimit(200, time.Minute))
    {
        users := api.Group("/users")
        {
            users.GET("", handlers.ListUsers)
            users.GET("/:id", handlers.GetUser)
            users.PUT("/:id", handlers.UpdateUser)
        }

        posts := api.Group("/posts")
        {
            posts.GET("", handlers.ListPosts)
            posts.POST("", handlers.CreatePost)
            posts.GET("/:id", handlers.GetPost)
            posts.PUT("/:id", handlers.UpdatePost)
            posts.DELETE("/:id", handlers.DeletePost)
        }

        // 9. Admin routes — extra role middleware
        admin := api.Group("/admin")
        admin.Use(middleware.RequireRole("admin"))
        {
            admin.GET("/users", handlers.AdminListUsers)
            admin.DELETE("/users/:id", handlers.AdminDeleteUser)
        }
    }

    // 10. Build the HTTP server with timeouts
    srv := &http.Server{
        Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
        Handler:      r,
        ReadTimeout:  cfg.Server.ReadTimeout,
        WriteTimeout: cfg.Server.WriteTimeout,
        IdleTimeout:  cfg.Server.IdleTimeout,
    }

    // 11. Start server with graceful shutdown
    startServer(srv)
}
```

---

## 📋 When to Use / When NOT to Use

### Middleware

| Use Middleware When | Do NOT Use Middleware When |
|---|---|
| Logic applies to many routes (auth, logging, CORS) | Logic is specific to one endpoint |
| You need pre/post processing around handlers | The logic needs complex handler-specific context |
| You want to short-circuit requests early | Performance is critical and the middleware adds unnecessary overhead |
| Cross-cutting concerns like tracing, metrics | You can just put the logic directly in the handler |

### Viper for Config

| Use Viper When | Do NOT Use Viper When |
|---|---|
| App has many config values | You have 2-3 env vars total |
| You need multiple config sources (file + env) | You are writing a CLI tool with flags only |
| You want auto-reload of config | Config never changes at runtime |
| Multiple environments (dev/staging/prod) | Simple script with no deployment concerns |

### Structured Logging

| Use JSON Structured Logging When | Use Plain Text When |
|---|---|
| Running in production with log aggregation (Datadog, ELK) | Local development only |
| Logs are parsed by machines | Logs are only read by humans |
| You need to alert on specific fields | Simple scripts or CLIs |
| Distributed systems where correlation is needed | Single-process apps |

---

## 📦 Trade-offs: Validation Approaches

| Approach | Pros | Cons |
|---|---|---|
| Struct tags + validator | Declarative, co-located with struct, fast | Tags can get verbose, custom messages need extra code |
| Manual validation in handler | Full control, clear error messages | Repetitive, easy to forget checks |
| Middleware validation | Centralized, reusable | Hard to validate route-specific data at middleware level |
| JSON Schema (gojsonschema) | Familiar to frontend devs, language-agnostic | External dependency, more setup |

---

## 🔑 Key Takeaways

1. **Middleware is an ordered chain.** Code before `c.Next()` runs on the way in; code after runs on the way out. Order your middleware intentionally (recovery first, logger next, auth after).

2. **`c.Abort()` stops the chain.** Always `return` after calling `Abort` to prevent executing code below it in the current middleware function.

3. **Three scopes for middleware:** global (`r.Use`), group (`group.Use`), and per-route (inline). Match the scope to where the rule applies.

4. **Struct tags make validation declarative.** Use `validate:"required,min=2,max=100,email"` etc. Format validation errors into user-friendly field-level messages, not raw validator internals.

5. **Config struct pattern centralizes all settings.** One `Config` struct, loaded once at startup, passed through your app. Never scatter `os.Getenv` calls throughout your code.

6. **Environment variables override config files.** Viper's `AutomaticEnv()` lets Docker/Kubernetes inject secrets without modifying config files.

7. **Graceful shutdown is not optional in production.** Listen for `SIGTERM`/`SIGINT`, call `srv.Shutdown(ctx)` with a timeout, and give in-flight requests time to complete.

8. **JSON structured logs are machine-readable.** Every log entry should have `level`, `timestamp`, `request_id`, and relevant business fields. This is what makes on-call debugging possible at 3am.

9. **CORS must be the first middleware** in your chain (or at least before anything that might return a response), because the browser's preflight OPTIONS request needs CORS headers even on non-200 responses.

10. **A rate limiter backed by memory only works on one server instance.** In a multi-instance deployment, use Redis for shared state.

---

*Next Chapter: Database Integration with GORM and raw sql — transactions, migrations, and query optimization.*
