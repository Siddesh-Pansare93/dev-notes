# Database Access in Go — pgx, sqlx, and GORM

> "The database is where your app's memory lives. Pick the wrong tool and every query feels like digging through a filing cabinet blindfolded."

---

## 🗺️ The Landscape: Three Layers of Abstraction

Before we touch any code, let's understand what problem each library solves.

Imagine you want to get coffee:

- **pgx** = You walk to the coffee farm, pick beans, roast them yourself, and brew with a hand grinder. Maximum control, maximum effort.
- **sqlx** = You buy ground coffee from the store and use your own machine. Less work, still hands-on.
- **GORM** = You press a button on a Nespresso machine. Almost zero effort, but you trust the machine knows what it is doing.

None of these is wrong. The right choice depends on how much control vs. convenience you need.

```mermaid
graph TD
    A[Your Go Code] --> B[pgx - Raw Driver]
    A --> C[sqlx - Stdlib Wrapper]
    A --> D[GORM - Full ORM]

    B --> E[(PostgreSQL)]
    C --> E
    D --> E

    B -- "max performance, full control" --> E
    C -- "convenience + sql.DB compat" --> E
    D -- "auto migrations, relations, hooks" --> E

    style B fill:#ff6b6b,color:#fff
    style C fill:#ffa94d,color:#fff
    style D fill:#51cf66,color:#fff
```

---

## 🔌 Setting Up: Connection Pooling Basics

Think of a connection pool like a shared taxi fleet. Instead of hiring a new cab every time you need a ride (opening a new DB connection), a pool keeps cabs ready and waiting. You grab one, use it, return it.

Without a pool, every query would open a new TCP connection to PostgreSQL — expensive and slow.

---

## 🔥 pgx — The Raw Powerhouse

pgx is a pure Go PostgreSQL driver. It talks directly to PostgreSQL using the wire protocol. No abstraction layers, no magic. Just raw, fast SQL.

### When to use pgx

| Situation | Use pgx? |
|---|---|
| High-throughput APIs (10k+ req/s) | YES |
| Complex queries with PostgreSQL-specific types | YES |
| You want full control over every query | YES |
| You are building a small CRUD app | Maybe overkill |
| You hate writing boilerplate | NO |

### Installing pgx

```bash
go get github.com/jackc/pgx/v5
go get github.com/jackc/pgx/v5/pgxpool
```

### pgxpool.New — Creating a Connection Pool

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/jackc/pgx/v5/pgxpool"
)

func main() {
    // DATABASE_URL format: postgres://user:password@host:port/dbname
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        dsn = "postgres://postgres:secret@localhost:5432/myapp?sslmode=disable"
    }

    // pgxpool.New creates a pool of connections
    // Think: reserving 10 tables at a restaurant in advance
    pool, err := pgxpool.New(context.Background(), dsn)
    if err != nil {
        log.Fatalf("cannot connect to database: %v", err)
    }
    defer pool.Close()

    // Verify the connection works
    if err := pool.Ping(context.Background()); err != nil {
        log.Fatalf("database ping failed: %v", err)
    }

    fmt.Println("Connected to PostgreSQL!")
}
```

You can also configure the pool size:

```go
config, err := pgxpool.ParseConfig(dsn)
if err != nil {
    log.Fatal(err)
}

config.MaxConns = 20          // max 20 simultaneous connections
config.MinConns = 5           // keep at least 5 open
config.MaxConnLifetime = time.Hour
config.MaxConnIdleTime = 30 * time.Minute

pool, err := pgxpool.NewWithConfig(context.Background(), config)
```

### Defining a Model

```go
type User struct {
    ID        int       `db:"id"`
    Name      string    `db:"name"`
    Email     string    `db:"email"`
    CreatedAt time.Time `db:"created_at"`
}

type Post struct {
    ID        int       `db:"id"`
    UserID    int       `db:"user_id"`
    Title     string    `db:"title"`
    Body      string    `db:"body"`
    CreatedAt time.Time `db:"created_at"`
}
```

### pool.QueryRow — Fetching a Single Row

`QueryRow` is like asking "what is ONE thing?" — you expect at most one result.

```go
func GetUserByID(ctx context.Context, pool *pgxpool.Pool, userID int) (*User, error) {
    query := `
        SELECT id, name, email, created_at
        FROM users
        WHERE id = $1
    `

    // $1 is a positional placeholder — pgx uses $1, $2, $3...
    row := pool.QueryRow(ctx, query, userID)

    var user User
    err := row.Scan(
        &user.ID,
        &user.Name,
        &user.Email,
        &user.CreatedAt,
    )
    if err != nil {
        // pgx.ErrNoRows means zero results — not a bug, just "not found"
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, fmt.Errorf("user %d not found", userID)
        }
        return nil, fmt.Errorf("query error: %w", err)
    }

    return &user, nil
}
```

### pool.Query — Fetching Multiple Rows

`Query` is like asking "give me ALL items matching this filter."

```go
func GetPostsByUser(ctx context.Context, pool *pgxpool.Pool, userID int) ([]Post, error) {
    query := `
        SELECT id, user_id, title, body, created_at
        FROM posts
        WHERE user_id = $1
        ORDER BY created_at DESC
    `

    rows, err := pool.Query(ctx, query, userID)
    if err != nil {
        return nil, fmt.Errorf("query failed: %w", err)
    }
    defer rows.Close() // ALWAYS close rows when done

    var posts []Post
    for rows.Next() {
        var p Post
        err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Body, &p.CreatedAt)
        if err != nil {
            return nil, fmt.Errorf("scan failed: %w", err)
        }
        posts = append(posts, p)
    }

    // Check for errors that occurred DURING iteration
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("rows error: %w", err)
    }

    return posts, nil
}
```

### pool.Exec — Running Queries That Return No Rows

INSERT, UPDATE, DELETE — use `Exec` when you do not want rows back.

```go
func CreateUser(ctx context.Context, pool *pgxpool.Pool, name, email string) (int, error) {
    query := `
        INSERT INTO users (name, email, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
    `

    var userID int
    err := pool.QueryRow(ctx, query, name, email).Scan(&userID)
    if err != nil {
        return 0, fmt.Errorf("insert failed: %w", err)
    }

    return userID, nil
}

func DeleteUser(ctx context.Context, pool *pgxpool.Pool, userID int) error {
    result, err := pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
    if err != nil {
        return fmt.Errorf("delete failed: %w", err)
    }

    // RowsAffected tells you if the row actually existed
    if result.RowsAffected() == 0 {
        return fmt.Errorf("user %d not found", userID)
    }

    return nil
}
```

### Transactions with pgx

Think of a transaction like a shopping cart. You put things in, but nothing is FINAL until you click "Checkout" (Commit). If something goes wrong, you click "Cancel" (Rollback) and nothing changes.

```go
func TransferPost(ctx context.Context, pool *pgxpool.Pool, postID, fromUserID, toUserID int) error {
    // Begin a transaction
    tx, err := pool.Begin(ctx)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }

    // Defer a rollback — if we return early with an error, this runs automatically
    // If we commit successfully, the rollback after commit is a no-op (safe!)
    defer tx.Rollback(ctx)

    // Step 1: Verify the post belongs to fromUserID
    var ownerID int
    err = tx.QueryRow(ctx,
        "SELECT user_id FROM posts WHERE id = $1",
        postID,
    ).Scan(&ownerID)
    if err != nil {
        return fmt.Errorf("post not found: %w", err)
    }

    if ownerID != fromUserID {
        return fmt.Errorf("post does not belong to user %d", fromUserID)
    }

    // Step 2: Update the post's owner
    _, err = tx.Exec(ctx,
        "UPDATE posts SET user_id = $1 WHERE id = $2",
        toUserID, postID,
    )
    if err != nil {
        return fmt.Errorf("update failed: %w", err)
    }

    // Step 3: Log the transfer
    _, err = tx.Exec(ctx,
        "INSERT INTO audit_log (action, post_id, from_user, to_user) VALUES ('transfer', $1, $2, $3)",
        postID, fromUserID, toUserID,
    )
    if err != nil {
        return fmt.Errorf("audit log failed: %w", err)
    }

    // Commit — makes everything permanent
    return tx.Commit(ctx)
}
```

### Prepared Statements with pgx

Prepared statements are like telling the waiter your order once, and they remember it. PostgreSQL compiles the query once and reuses the plan.

```go
func PreparedExample(ctx context.Context, pool *pgxpool.Pool) {
    // pgx automatically uses server-side prepared statements
    // when you use the same query multiple times via pgxpool

    // For explicit control, use pgxpool.Conn
    conn, err := pool.Acquire(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Release()

    _, err = conn.Conn().Prepare(ctx, "get_user", "SELECT id, name FROM users WHERE id = $1")
    if err != nil {
        log.Fatal(err)
    }

    // Now execute using the statement name
    var id int
    var name string
    err = conn.Conn().QueryRow(ctx, "get_user", 42).Scan(&id, &name)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("User: %d %s\n", id, name)
}
```

---

## 🛠️ sqlx — The Comfortable Middle Ground

sqlx wraps Go's standard `database/sql` with conveniences. The key difference from pgx: it works with any SQL database (PostgreSQL, MySQL, SQLite). You still write SQL, but sqlx removes most of the scanning boilerplate.

Think of sqlx as sql.DB with superpowers.

### When to use sqlx

| Situation | Use sqlx? |
|---|---|
| You want readable SQL but hate row.Scan() | YES |
| You need to support multiple databases | YES |
| Your team already knows database/sql | YES |
| You need max PostgreSQL performance | Use pgx instead |
| You want auto-migrations and relations | Use GORM instead |

### Installing sqlx

```bash
go get github.com/jmoiron/sqlx
go get github.com/lib/pq  # PostgreSQL driver for database/sql
```

### Connecting with sqlx

```go
import (
    "github.com/jmoiron/sqlx"
    _ "github.com/lib/pq" // register the postgres driver
)

func NewDB(dsn string) (*sqlx.DB, error) {
    db, err := sqlx.Connect("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("connect: %w", err)
    }

    // Configure the connection pool
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(10)
    db.SetConnMaxLifetime(time.Hour)

    return db, nil
}
```

### db.Get — Scan Directly Into a Struct

`Get` is the killer feature. No more `.Scan(&u.ID, &u.Name, &u.Email, ...)`. It maps columns to struct fields automatically using the `db` tag.

```go
type User struct {
    ID        int       `db:"id"`
    Name      string    `db:"name"`
    Email     string    `db:"email"`
    CreatedAt time.Time `db:"created_at"`
}

func GetUser(ctx context.Context, db *sqlx.DB, userID int) (*User, error) {
    var user User

    // sqlx maps column names to struct fields via `db` tags
    err := db.GetContext(ctx, &user,
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        userID,
    )
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, fmt.Errorf("user not found")
        }
        return nil, err
    }

    return &user, nil
}
```

### db.Select — Scan Multiple Rows Into a Slice

```go
func GetUserPosts(ctx context.Context, db *sqlx.DB, userID int) ([]Post, error) {
    var posts []Post

    // Select populates the entire slice in one call
    err := db.SelectContext(ctx, &posts,
        "SELECT id, user_id, title, body, created_at FROM posts WHERE user_id = $1 ORDER BY created_at DESC",
        userID,
    )
    if err != nil {
        return nil, err
    }

    return posts, nil
}
```

### Named Queries — Human-Readable Placeholders

Instead of `$1, $2, $3`, named queries let you write `:name, :email`. This is especially useful for inserts and updates with many columns — no more counting placeholder numbers.

```go
func CreateUser(ctx context.Context, db *sqlx.DB, user User) (int, error) {
    query := `
        INSERT INTO users (name, email, created_at)
        VALUES (:name, :email, NOW())
        RETURNING id
    `

    // sqlx maps the struct fields to :name, :email automatically
    rows, err := db.NamedQueryContext(ctx, query, user)
    if err != nil {
        return 0, fmt.Errorf("insert failed: %w", err)
    }
    defer rows.Close()

    var id int
    if rows.Next() {
        if err := rows.Scan(&id); err != nil {
            return 0, err
        }
    }

    return id, nil
}
```

Named queries also work with maps:

```go
result, err := db.NamedExecContext(ctx,
    "UPDATE users SET name = :name WHERE id = :id",
    map[string]interface{}{
        "name": "Alice Updated",
        "id":   42,
    },
)
```

### IN Queries — The Tricky Part

SQL `IN ($1, $2, $3)` is painful when you have a dynamic slice. sqlx has a helper:

```go
func GetUsersByIDs(ctx context.Context, db *sqlx.DB, ids []int) ([]User, error) {
    // sqlx.In rewrites the query and expands the slice
    query, args, err := sqlx.In(
        "SELECT id, name, email FROM users WHERE id IN (?)",
        ids, // pass the slice directly
    )
    if err != nil {
        return nil, err
    }

    // Rebind converts ? placeholders to $1, $2... for PostgreSQL
    query = db.Rebind(query)

    var users []User
    err = db.SelectContext(ctx, &users, query, args...)
    return users, err
}
```

---

## 🚀 GORM — The Full ORM

GORM is the most popular Go ORM. It handles migrations, associations, hooks, and much more. The trade-off: you give up some visibility into the SQL it generates.

Think of GORM as a smart assistant. You describe WHAT you want, and it figures out HOW to do it in SQL.

### When to use GORM

| Situation | Use GORM? |
|---|---|
| Rapid prototyping or internal tools | YES |
| Complex associations (users, posts, tags) | YES |
| You want automatic schema migrations | YES |
| Performance-critical hot paths | NO — drop to raw SQL |
| Small team that prefers convention over configuration | YES |
| You need very fine-grained query control | NO |

### Installing GORM

```bash
go get gorm.io/gorm
go get gorm.io/driver/postgres
```

### Defining Models

GORM models use struct tags to configure behavior.

```go
import "gorm.io/gorm"

type User struct {
    gorm.Model                     // adds ID, CreatedAt, UpdatedAt, DeletedAt (soft delete)
    Name      string  `gorm:"not null"`
    Email     string  `gorm:"uniqueIndex;not null"`
    Posts     []Post  `gorm:"foreignKey:UserID"` // HasMany
}

type Post struct {
    gorm.Model
    Title   string `gorm:"not null"`
    Body    string
    UserID  uint   `gorm:"not null;index"`
    User    User   `gorm:"constraint:OnDelete:CASCADE"` // BelongsTo
    Tags    []Tag  `gorm:"many2many:post_tags"`          // ManyToMany
}

type Tag struct {
    gorm.Model
    Name  string `gorm:"uniqueIndex"`
    Posts []Post `gorm:"many2many:post_tags"`
}
```

`gorm.Model` injects these fields automatically:

```go
// Equivalent to:
type Model struct {
    ID        uint           `gorm:"primarykey"`
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"` // soft delete support
}
```

### Connecting to the Database

```go
import (
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func NewGORM(dsn string) (*gorm.DB, error) {
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info), // log all SQL
    })
    if err != nil {
        return nil, err
    }

    // Configure the underlying sql.DB pool
    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }
    sqlDB.SetMaxOpenConns(25)
    sqlDB.SetMaxIdleConns(10)

    return db, nil
}
```

### AutoMigrate — Schema Sync

AutoMigrate reads your structs and creates/updates tables. It never drops columns — only adds.

```go
func RunMigrations(db *gorm.DB) error {
    return db.AutoMigrate(
        &User{},
        &Post{},
        &Tag{},
    )
}
```

> WARNING: AutoMigrate is great for development. For production, use versioned migration files (see golang-migrate section below).

### CRUD Operations

```go
// CREATE
user := User{Name: "Alice", Email: "alice@example.com"}
result := db.Create(&user)
// user.ID is now populated after insert
fmt.Printf("Created user with ID: %d\n", user.ID)

// READ — single record
var found User
db.First(&found, 1)                         // by primary key
db.First(&found, "email = ?", "alice@example.com") // by condition

// READ — multiple records
var users []User
db.Where("name LIKE ?", "%alice%").Find(&users)
db.Where("created_at > ?", time.Now().AddDate(0, -1, 0)).Find(&users)

// UPDATE
db.Model(&user).Update("name", "Alice Smith")
db.Model(&user).Updates(map[string]interface{}{
    "name":  "Alice Smith",
    "email": "alice.smith@example.com",
})

// DELETE (soft delete if gorm.Model is embedded)
db.Delete(&user)              // sets DeletedAt, does not remove the row
db.Unscoped().Delete(&user)   // actually removes the row
```

### Associations — Relations Made Easy

```go
// Preload fetches associated records — avoids N+1 query problem
var user User
db.Preload("Posts").First(&user, 1)
// Now user.Posts is populated

// Preload with conditions
db.Preload("Posts", "title LIKE ?", "%Go%").First(&user, 1)

// Nested preloads
db.Preload("Posts.Tags").First(&user, 1)
// user.Posts[0].Tags is populated

// Create with associations
post := Post{
    Title:  "Learning GORM",
    UserID: user.ID,
    Tags:   []Tag{{Name: "go"}, {Name: "database"}},
}
db.Create(&post)

// Add to association
db.Model(&user).Association("Posts").Append(&Post{Title: "Another Post"})

// Count associations
count := db.Model(&user).Association("Posts").Count()
```

### Hooks — Lifecycle Callbacks

Hooks are like event listeners. They fire automatically before or after database operations.

```go
import "golang.org/x/crypto/bcrypt"

type User struct {
    gorm.Model
    Name     string
    Email    string
    Password string // hashed
}

// BeforeCreate fires before every INSERT
func (u *User) BeforeCreate(tx *gorm.DB) error {
    // Hash the password automatically
    hashed, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    u.Password = string(hashed)
    return nil
}

// AfterCreate fires after every successful INSERT
func (u *User) AfterCreate(tx *gorm.DB) error {
    // Send welcome email, emit an event, etc.
    log.Printf("New user created: %s (%s)\n", u.Name, u.Email)
    return nil
}

// BeforeDelete can prevent accidental deletes
func (u *User) BeforeDelete(tx *gorm.DB) error {
    if u.Name == "admin" {
        return errors.New("cannot delete the admin user")
    }
    return nil
}
```

Available hooks: `BeforeCreate`, `AfterCreate`, `BeforeSave`, `AfterSave`, `BeforeUpdate`, `AfterUpdate`, `BeforeDelete`, `AfterDelete`, `BeforeFind`, `AfterFind`.

### Transactions in GORM

```go
// Simple transaction
err := db.Transaction(func(tx *gorm.DB) error {
    // Use tx (not db!) inside the transaction
    if err := tx.Create(&user).Error; err != nil {
        return err // triggers rollback
    }

    if err := tx.Create(&post).Error; err != nil {
        return err // triggers rollback
    }

    return nil // commits the transaction
})
```

### Raw SQL Escape Hatch

When GORM cannot express what you need, drop to raw SQL:

```go
// Raw query
var results []map[string]interface{}
db.Raw(`
    SELECT u.name, COUNT(p.id) as post_count
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id
    GROUP BY u.id, u.name
    ORDER BY post_count DESC
    LIMIT 10
`).Scan(&results)

// Raw exec (no results)
db.Exec("UPDATE users SET email_verified = true WHERE id = ?", userID)

// Mix raw with GORM
db.Where("id IN (?)",
    db.Raw("SELECT user_id FROM posts WHERE title LIKE ?", "%Go%"),
).Find(&users)
```

---

## 📊 pgx vs sqlx vs GORM — Decision Table

```mermaid
graph LR
    A{What matters most?} --> B[Raw Performance]
    A --> C[Convenience + SQL Control]
    A --> D[Developer Speed / Relations]

    B --> E[pgx]
    C --> F[sqlx]
    D --> G[GORM]

    E --> E1[Production APIs\nHigh throughput\nPostgreSQL-only]
    F --> F1[Cross-DB apps\nTeams that know SQL\nLess boilerplate than pgx]
    G --> G1[Prototypes\nAdmin panels\nApps with complex relations]
```

| Feature | pgx | sqlx | GORM |
|---|---|---|---|
| Performance | Fastest | Fast | Slower (extra reflection) |
| SQL control | Full | Full | Partial (raw SQL escape hatch) |
| Boilerplate | High | Medium | Low |
| Auto migrations | No | No | Yes (AutoMigrate) |
| Associations | Manual | Manual | Built-in |
| Hooks/Callbacks | No | No | Yes |
| Multiple databases | PostgreSQL only | Yes | Yes |
| Learning curve | Steeper | Moderate | Easy |
| Debugging SQL | Easy (you wrote it) | Easy (you wrote it) | Harder (generated SQL) |
| Best for | High-perf services | Most backend apps | Rapid prototyping |

---

## 🏗️ Full Example: User + Post Repository Pattern with pgx

The Repository Pattern separates your database logic from your business logic. Think of it as a librarian — your app asks the librarian for books (data), the librarian knows where to find them.

```mermaid
graph TD
    H[HTTP Handler] --> R[UserRepository interface]
    R --> PGX[pgxUserRepository]
    PGX --> DB[(PostgreSQL)]

    style H fill:#339af0,color:#fff
    style R fill:#868e96,color:#fff
    style PGX fill:#ff6b6b,color:#fff
    style DB fill:#51cf66,color:#fff
```

```go
// repository/user.go
package repository

import (
    "context"
    "errors"
    "fmt"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

// User domain model
type User struct {
    ID        int
    Name      string
    Email     string
    CreatedAt time.Time
}

// Post domain model
type Post struct {
    ID        int
    UserID    int
    Title     string
    Body      string
    CreatedAt time.Time
}

// UserRepository defines what operations are possible
// This interface lets you swap pgx for something else in tests
type UserRepository interface {
    GetByID(ctx context.Context, id int) (*User, error)
    GetByEmail(ctx context.Context, email string) (*User, error)
    Create(ctx context.Context, name, email string) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id int) error
    GetPosts(ctx context.Context, userID int) ([]Post, error)
    CreatePost(ctx context.Context, post *Post) error
}

// pgxUserRepository implements UserRepository using pgx
type pgxUserRepository struct {
    pool *pgxpool.Pool
}

// NewUserRepository creates a new repository
func NewUserRepository(pool *pgxpool.Pool) UserRepository {
    return &pgxUserRepository{pool: pool}
}

func (r *pgxUserRepository) GetByID(ctx context.Context, id int) (*User, error) {
    row := r.pool.QueryRow(ctx,
        `SELECT id, name, email, created_at FROM users WHERE id = $1`,
        id,
    )

    var u User
    err := row.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, fmt.Errorf("user %d not found", id)
        }
        return nil, fmt.Errorf("GetByID: %w", err)
    }

    return &u, nil
}

func (r *pgxUserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
    row := r.pool.QueryRow(ctx,
        `SELECT id, name, email, created_at FROM users WHERE email = $1`,
        email,
    )

    var u User
    err := row.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, nil // not found is OK here — caller decides
        }
        return nil, fmt.Errorf("GetByEmail: %w", err)
    }

    return &u, nil
}

func (r *pgxUserRepository) Create(ctx context.Context, name, email string) (*User, error) {
    var u User
    err := r.pool.QueryRow(ctx,
        `INSERT INTO users (name, email, created_at)
         VALUES ($1, $2, NOW())
         RETURNING id, name, email, created_at`,
        name, email,
    ).Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt)
    if err != nil {
        return nil, fmt.Errorf("Create: %w", err)
    }

    return &u, nil
}

func (r *pgxUserRepository) Update(ctx context.Context, user *User) error {
    result, err := r.pool.Exec(ctx,
        `UPDATE users SET name = $1, email = $2 WHERE id = $3`,
        user.Name, user.Email, user.ID,
    )
    if err != nil {
        return fmt.Errorf("Update: %w", err)
    }
    if result.RowsAffected() == 0 {
        return fmt.Errorf("user %d not found", user.ID)
    }

    return nil
}

func (r *pgxUserRepository) Delete(ctx context.Context, id int) error {
    tx, err := r.pool.Begin(ctx)
    if err != nil {
        return err
    }
    defer tx.Rollback(ctx)

    // Delete posts first (or rely on ON DELETE CASCADE in schema)
    _, err = tx.Exec(ctx, "DELETE FROM posts WHERE user_id = $1", id)
    if err != nil {
        return fmt.Errorf("Delete posts: %w", err)
    }

    result, err := tx.Exec(ctx, "DELETE FROM users WHERE id = $1", id)
    if err != nil {
        return fmt.Errorf("Delete user: %w", err)
    }
    if result.RowsAffected() == 0 {
        return fmt.Errorf("user %d not found", id)
    }

    return tx.Commit(ctx)
}

func (r *pgxUserRepository) GetPosts(ctx context.Context, userID int) ([]Post, error) {
    rows, err := r.pool.Query(ctx,
        `SELECT id, user_id, title, body, created_at
         FROM posts
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        userID,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var posts []Post
    for rows.Next() {
        var p Post
        if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Body, &p.CreatedAt); err != nil {
            return nil, err
        }
        posts = append(posts, p)
    }

    return posts, rows.Err()
}

func (r *pgxUserRepository) CreatePost(ctx context.Context, post *Post) error {
    return r.pool.QueryRow(ctx,
        `INSERT INTO posts (user_id, title, body, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, created_at`,
        post.UserID, post.Title, post.Body,
    ).Scan(&post.ID, &post.CreatedAt)
}
```

### Using the Repository in a Handler

```go
// handler/user_handler.go
package handler

type UserHandler struct {
    repo repository.UserRepository
}

func NewUserHandler(repo repository.UserRepository) *UserHandler {
    return &UserHandler{repo: repo}
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    idStr := chi.URLParam(r, "id") // using chi router
    id, err := strconv.Atoi(idStr)
    if err != nil {
        http.Error(w, "invalid id", http.StatusBadRequest)
        return
    }

    user, err := h.repo.GetByID(r.Context(), id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }

    json.NewEncoder(w).Encode(user)
}
```

---

## 🗄️ Database Migrations with golang-migrate

AutoMigrate (GORM) is fine for development. But in production, you need **versioned migration files** — one file per change, tracked in version control.

Think of migrations like Git commits for your database schema. Each migration is a small, reversible step.

```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
go get github.com/golang-migrate/migrate/v4
go get github.com/golang-migrate/migrate/v4/database/postgres
go get github.com/golang-migrate/migrate/v4/source/file
```

### Creating Migration Files

```bash
# Creates two files: 000001_create_users.up.sql and 000001_create_users.down.sql
migrate create -ext sql -dir ./migrations -seq create_users
migrate create -ext sql -dir ./migrations -seq create_posts
```

```sql
-- migrations/000001_create_users.up.sql
CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- migrations/000001_create_users.down.sql
DROP TABLE IF EXISTS users;

-- migrations/000002_create_posts.up.sql
CREATE TABLE posts (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(500) NOT NULL,
    body       TEXT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);

-- migrations/000002_create_posts.down.sql
DROP TABLE IF EXISTS posts;
```

### Running Migrations in Go Code

```go
package database

import (
    "fmt"
    "log"

    "github.com/golang-migrate/migrate/v4"
    _ "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigrations(databaseURL string) error {
    m, err := migrate.New(
        "file://./migrations", // path to your .sql files
        databaseURL,
    )
    if err != nil {
        return fmt.Errorf("creating migrate instance: %w", err)
    }
    defer m.Close()

    if err := m.Up(); err != nil {
        if err == migrate.ErrNoChange {
            log.Println("No new migrations to apply")
            return nil
        }
        return fmt.Errorf("running migrations: %w", err)
    }

    version, _, _ := m.Version()
    log.Printf("Database migrated to version %d\n", version)
    return nil
}
```

### CLI Usage

```bash
# Apply all pending migrations
migrate -path ./migrations -database "$DATABASE_URL" up

# Roll back the last migration
migrate -path ./migrations -database "$DATABASE_URL" down 1

# Check current version
migrate -path ./migrations -database "$DATABASE_URL" version

# Go to a specific version
migrate -path ./migrations -database "$DATABASE_URL" goto 3
```

---

## 🔄 The Full Flow — Putting It Together

```mermaid
sequenceDiagram
    participant App
    participant Pool as pgxpool
    participant DB as PostgreSQL

    App->>Pool: pgxpool.New(dsn)
    Pool-->>App: pool (ready)

    App->>Pool: pool.QueryRow(ctx, sql, args)
    Pool->>DB: acquire connection from pool
    DB-->>Pool: connection granted
    Pool->>DB: execute query
    DB-->>Pool: result rows
    Pool-->>App: pgx.Row
    App->>App: row.Scan(&struct)
    Pool->>DB: release connection back to pool

    App->>Pool: pool.Begin(ctx)
    Pool-->>App: tx
    App->>Pool: tx.Exec(sql)
    App->>Pool: tx.Exec(sql)
    App->>Pool: tx.Commit()
    Pool->>DB: COMMIT
```

---

## ✅ Key Takeaways

1. **pgx** gives you raw speed and full PostgreSQL feature access. Use it when performance matters most. Expect more code.

2. **sqlx** hits the sweet spot for most backend apps. You still write SQL, but struct scanning and named queries cut the boilerplate significantly.

3. **GORM** is fastest to develop with. Great for rapid prototyping and apps with rich relations. Watch out for generated SQL in complex queries — always log and inspect it.

4. **Always use a connection pool** (`pgxpool`, `sql.DB`). Never open a new connection per request.

5. **Repository pattern** keeps your database logic isolated and testable. Define an interface, implement it with your chosen library.

6. **Use golang-migrate for production schemas**. AutoMigrate is fine for development, but versioned SQL files give you full control, rollback support, and an audit trail.

7. **Defer tx.Rollback()** immediately after beginning a transaction. If you commit successfully, the deferred rollback is a harmless no-op. If you return early on error, the rollback runs automatically.

8. **Named queries in sqlx** (`:name` instead of `$1`) become extremely valuable with 5+ parameters — they eliminate off-by-one placeholder bugs.

9. **GORM hooks** are powerful but easy to forget about. Document them clearly — invisible side effects are a common source of bugs.

10. **Raw SQL is always an option** — even in GORM. Do not contort your code to avoid raw SQL when a join or aggregation is easier to express directly.

---

*Next Chapter: HTTP Routing and Middleware in Go — chi, gin, and net/http*
