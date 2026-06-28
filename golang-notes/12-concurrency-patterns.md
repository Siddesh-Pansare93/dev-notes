# Go Concurrency Patterns for Backend

> This chapter builds on basic goroutines and channels. Before reading, make sure you are comfortable with `go func()`, `make(chan T)`, and `select`. If not, review `04-goroutines-channels.md` first.

---

## 🗺️ Why Patterns? Why Not Just Spawn Goroutines?

Imagine a restaurant kitchen. Every order that comes in is a task. A naive approach: hire a new chef for every single order. That sounds fast — but what happens when 10,000 orders come in at once? You have 10,000 chefs crashing into each other, running out of counter space, and the restaurant collapses.

Real kitchens use **structure**: a fixed number of chefs (worker pool), a single pass-through window (channel), and clear roles (pipeline stages). Go concurrency patterns are exactly that — structure for your goroutines.

Without patterns you get:
- **Goroutine leaks** — goroutines that never exit, slowly eating memory
- **Thundering herd** — thousands of goroutines hammering a database simultaneously
- **Race conditions** — shared state corrupted by unsynchronized writes
- **Unpredictable failures** — one error kills everything, or worse, gets silently swallowed

The patterns in this chapter are what production Go backends actually use.

---

## 🏊 Pattern 1: Worker Pool

### The Analogy

A call center has a fixed number of agents (say, 10). Incoming calls queue up. Each agent picks the next call when they are free. You do not hire a new agent per call — that would be chaos.

### The Problem It Solves

If you do `go processJob(job)` for every job in a loop, and 50,000 jobs arrive, you spawn 50,000 goroutines. Each goroutine consumes ~8KB of stack. That is 400MB of memory before the first job finishes.

A worker pool caps goroutines at N, letting the rest wait in a channel queue.

```mermaid
graph LR
    Jobs["Job Source\n(HTTP, Queue, DB)"] -->|send| JC["jobs channel\n(buffered)"]
    JC -->|receive| W1["Worker 1"]
    JC -->|receive| W2["Worker 2"]
    JC -->|receive| W3["Worker 3"]
    W1 -->|send result| RC["results channel"]
    W2 -->|send result| RC
    W3 -->|send result| RC
    RC -->|collect| Agg["Aggregator / Caller"]
```

### Full Working Code

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

type Job struct {
    ID   int
    Data string
}

type Result struct {
    JobID  int
    Output string
    Err    error
}

// worker is a single goroutine. It reads from jobs, writes to results.
func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs { // range blocks until channel closes or a job arrives
        // Simulate real work (DB call, HTTP request, CPU task)
        time.Sleep(10 * time.Millisecond)
        results <- Result{
            JobID:  job.ID,
            Output: fmt.Sprintf("worker %d processed job %d: %s", id, job.ID, job.Data),
        }
    }
}

func RunWorkerPool(numWorkers int, allJobs []Job) []Result {
    jobs := make(chan Job, len(allJobs))    // buffered: producer never blocks
    results := make(chan Result, len(allJobs))

    var wg sync.WaitGroup

    // Start fixed N workers
    for i := 1; i <= numWorkers; i++ {
        wg.Add(1)
        go worker(i, jobs, results, &wg)
    }

    // Send all jobs
    for _, job := range allJobs {
        jobs <- job
    }
    close(jobs) // signal: no more jobs. Workers will exit their range loop.

    // Wait for all workers to finish, then close results
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect results
    var out []Result
    for r := range results {
        out = append(out, r)
    }
    return out
}

func main() {
    jobs := make([]Job, 20)
    for i := range jobs {
        jobs[i] = Job{ID: i, Data: fmt.Sprintf("payload-%d", i)}
    }

    results := RunWorkerPool(5, jobs) // only 5 goroutines handle 20 jobs
    fmt.Printf("Processed %d jobs\n", len(results))
}
```

### When to Use / When NOT to Use

| Situation | Use Worker Pool? |
|---|---|
| Processing a queue of images/emails/tasks | YES |
| Making N DB queries from a list of IDs | YES |
| Each task takes similar time | YES |
| One task per HTTP request (already bounded by connection pool) | Maybe not — HTTP server already limits concurrency |
| Tasks are extremely fast (< 1 microsecond) | NO — channel overhead dominates |

---

## 📡 Pattern 2: Fan-Out / Fan-In

### The Analogy

A news agency receives a single feed. It fans out stories to 5 reporters (each covering different regions). Each reporter files their story. An editor collects all stories into one final newspaper. That is fan-out (1 → N) followed by fan-in (N → 1).

### The Problem It Solves

You have one source of work and want to process items concurrently, then merge all results back into a single stream for the caller.

```mermaid
graph TD
    Source["Source Channel"] --> FO["Fan-Out\n(spawn N goroutines)"]
    FO --> W1["Worker 1"]
    FO --> W2["Worker 2"]
    FO --> W3["Worker 3"]
    W1 --> FI["Fan-In / Merge"]
    W2 --> FI
    W3 --> FI
    FI --> Out["Output Channel"]
```

### Full Working Code

```go
package main

import (
    "fmt"
    "sync"
)

// fanOut distributes work from one channel to N goroutines
func fanOut(input <-chan int, numWorkers int) []<-chan int {
    channels := make([]<-chan int, numWorkers)
    for i := 0; i < numWorkers; i++ {
        out := make(chan int)
        channels[i] = out
        go func(out chan<- int) {
            defer close(out)
            for v := range input {
                out <- v * v // square each number
            }
        }(out)
    }
    return channels
}

// fanIn merges multiple channels into one
func fanIn(channels ...<-chan int) <-chan int {
    merged := make(chan int)
    var wg sync.WaitGroup

    output := func(c <-chan int) {
        defer wg.Done()
        for v := range c {
            merged <- v
        }
    }

    wg.Add(len(channels))
    for _, c := range channels {
        go output(c)
    }

    // Close merged when all inputs are done
    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}

func main() {
    input := make(chan int)

    go func() {
        defer close(input)
        for i := 1; i <= 12; i++ {
            input <- i
        }
    }()

    // Fan out to 3 workers
    workerChannels := fanOut(input, 3)

    // Fan in results
    results := fanIn(workerChannels...)

    for v := range results {
        fmt.Println(v)
    }
}
```

### Real Backend Use Case

Fetching data from multiple microservices in parallel and merging into one response — e.g., a product page that fetches pricing, inventory, and reviews concurrently.

---

## 🔗 Pattern 3: Pipeline

### The Analogy

An assembly line. Raw metal goes in → cut → weld → paint → package → ship. Each stage does one job and passes the result forward. No stage waits for the stage after it to finish before taking the next piece.

### The Problem It Solves

Multi-step processing where each step can run concurrently on different items. While step 2 processes item A, step 1 is already working on item B.

```mermaid
graph LR
    In["Raw Input"] -->|chan| S1["Stage 1\nParse"]
    S1 -->|chan| S2["Stage 2\nValidate"]
    S2 -->|chan| S3["Stage 3\nEnrich"]
    S3 -->|chan| S4["Stage 4\nStore"]
    S4 -->|chan| Out["Output / Response"]
```

### Full Working Code

```go
package main

import (
    "fmt"
    "strings"
)

type Record struct {
    Raw       string
    Parsed    []string
    Validated bool
    Enriched  string
}

// Each stage takes an input channel and returns an output channel

func parse(input <-chan string) <-chan Record {
    out := make(chan Record)
    go func() {
        defer close(out)
        for raw := range input {
            out <- Record{Raw: raw, Parsed: strings.Fields(raw)}
        }
    }()
    return out
}

func validate(input <-chan Record) <-chan Record {
    out := make(chan Record)
    go func() {
        defer close(out)
        for r := range input {
            r.Validated = len(r.Parsed) > 0
            out <- r
        }
    }()
    return out
}

func enrich(input <-chan Record) <-chan Record {
    out := make(chan Record)
    go func() {
        defer close(out)
        for r := range input {
            if r.Validated {
                r.Enriched = fmt.Sprintf("[enriched] %s", strings.Join(r.Parsed, "|"))
            }
            out <- r
        }
    }()
    return out
}

func main() {
    rawInput := make(chan string)

    go func() {
        defer close(rawInput)
        lines := []string{"hello world", "go is great", "", "backend dev"}
        for _, l := range lines {
            rawInput <- l
        }
    }()

    // Chain the pipeline
    stage1 := parse(rawInput)
    stage2 := validate(stage1)
    stage3 := enrich(stage2)

    for record := range stage3 {
        fmt.Printf("valid=%v enriched=%q\n", record.Validated, record.Enriched)
    }
}
```

### When to Use Pipeline

- ETL (Extract, Transform, Load) jobs
- HTTP middleware chains (each middleware is a stage)
- Log processing (read → parse → filter → forward)
- Streaming data transformation

---

## 🚦 Pattern 4: Semaphore (Buffered Channel as Semaphore)

### The Analogy

A parking garage with 10 spots. Cars queue at the entrance. Only 10 cars can be inside at once. When one leaves, the barrier opens for the next.

### The Problem It Solves

You want to allow at most N concurrent operations — not a fixed pool, just a limit. Perfect for limiting concurrent HTTP calls to a third-party API that throttles you.

```mermaid
sequenceDiagram
    participant Caller
    participant Semaphore as Semaphore (cap=3)
    participant Resource

    Caller->>Semaphore: acquire (send token)
    Caller->>Semaphore: acquire (send token)
    Caller->>Semaphore: acquire (send token)
    Note over Semaphore: full — 4th caller blocks
    Semaphore->>Resource: work
    Resource->>Semaphore: release (recv token)
    Note over Semaphore: slot free — 4th caller proceeds
```

### Full Working Code

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

type Semaphore chan struct{}

func NewSemaphore(n int) Semaphore {
    return make(chan struct{}, n)
}

func (s Semaphore) Acquire(ctx context.Context) error {
    select {
    case s <- struct{}{}: // take a slot
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

func (s Semaphore) Release() {
    <-s // free a slot
}

func fetchURL(ctx context.Context, sem Semaphore, url string, wg *sync.WaitGroup) {
    defer wg.Done()

    if err := sem.Acquire(ctx); err != nil {
        fmt.Printf("context cancelled before acquiring semaphore for %s\n", url)
        return
    }
    defer sem.Release()

    // Simulate HTTP call
    fmt.Printf("fetching: %s\n", url)
    time.Sleep(100 * time.Millisecond)
    fmt.Printf("done: %s\n", url)
}

func main() {
    sem := NewSemaphore(3) // max 3 concurrent fetches
    ctx := context.Background()

    urls := []string{
        "api.example.com/a", "api.example.com/b", "api.example.com/c",
        "api.example.com/d", "api.example.com/e", "api.example.com/f",
    }

    var wg sync.WaitGroup
    for _, url := range urls {
        wg.Add(1)
        go fetchURL(ctx, sem, url, &wg)
    }
    wg.Wait()
}
```

### Semaphore vs Worker Pool

| Aspect | Semaphore | Worker Pool |
|---|---|---|
| Goroutine count | One goroutine per task (capped by sem) | Fixed N goroutines always running |
| Overhead | Higher (goroutines created per task) | Lower (goroutines reused) |
| Flexibility | Each goroutine can do unique setup | Workers are homogeneous |
| Best for | Limiting concurrent I/O ops | Batch processing a queue |

---

## ⏱️ Pattern 5: Rate Limiter with time.Ticker

### The Analogy

A highway on-ramp. There is a traffic light that turns green every 500ms, letting exactly one car merge. You cannot rush the light.

### The Problem It Solves

External APIs often enforce rate limits (e.g., 100 requests/minute). A rate limiter ensures your backend respects those limits without needing to check manually each time.

### Full Working Code

```go
package main

import (
    "context"
    "fmt"
    "time"
)

type RateLimiter struct {
    ticker *time.Ticker
    done   chan struct{}
}

func NewRateLimiter(rps int) *RateLimiter {
    interval := time.Second / time.Duration(rps)
    return &RateLimiter{
        ticker: time.NewTicker(interval),
        done:   make(chan struct{}),
    }
}

// Wait blocks until the rate limiter allows the next operation
func (rl *RateLimiter) Wait(ctx context.Context) error {
    select {
    case <-rl.ticker.C:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    case <-rl.done:
        return fmt.Errorf("rate limiter stopped")
    }
}

func (rl *RateLimiter) Stop() {
    rl.ticker.Stop()
    close(rl.done)
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()

    rl := NewRateLimiter(5) // 5 requests per second
    defer rl.Stop()

    for i := 1; ; i++ {
        if err := rl.Wait(ctx); err != nil {
            fmt.Println("done:", err)
            break
        }
        fmt.Printf("request %d at %s\n", i, time.Now().Format("15:04:05.000"))
        // Make your API call here
    }
}
```

### Burst + Rate Limit (Token Bucket)

For real backends, use `golang.org/x/time/rate` which implements a proper token bucket (allows short bursts):

```go
import "golang.org/x/time/rate"

limiter := rate.NewLimiter(rate.Limit(10), 20) // 10 rps, burst of 20

if err := limiter.Wait(ctx); err != nil {
    return err
}
// proceed with request
```

---

## 🧵 Pattern 6: Context Propagation

### The Analogy

A manager sends a team on a task and holds a walkie-talkie. If the client cancels the project, the manager radios all team members to stop immediately — even those in deep sub-tasks.

### The Rule

**Always pass `ctx` as the first argument. Always check `ctx.Done()` in loops and before expensive operations.**

```mermaid
graph TD
    HTTP["HTTP Handler\nctx from request"] --> S1["Service Layer\nctx passed in"]
    S1 --> DB["DB Query\nctx.Done() checked"]
    S1 --> API["External API\nctx passed to http.NewRequestWithContext"]
    DB --> Cancel{"client disconnected?"}
    Cancel -->|yes| Stop["stop query, return error"]
    Cancel -->|no| Done["return results"]
```

### Full Working Code

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "time"
)

// BAD: ignores context
func fetchUserBad(db *sql.DB, userID int) (string, error) {
    var name string
    err := db.QueryRow("SELECT name FROM users WHERE id = $1", userID).Scan(&name)
    return name, err
}

// GOOD: context-aware
func fetchUser(ctx context.Context, db *sql.DB, userID int) (string, error) {
    var name string
    // QueryRowContext cancels the query if ctx is done
    err := db.QueryRowContext(ctx, "SELECT name FROM users WHERE id = $1", userID).Scan(&name)
    return name, err
}

// Context in a processing loop
func processItems(ctx context.Context, items []int) error {
    for _, item := range items {
        // Check cancellation before each unit of work
        select {
        case <-ctx.Done():
            return fmt.Errorf("processing cancelled: %w", ctx.Err())
        default:
        }

        // Do the work
        if err := processOne(ctx, item); err != nil {
            return err
        }
    }
    return nil
}

func processOne(ctx context.Context, item int) error {
    // Simulate work that also respects context
    select {
    case <-time.After(50 * time.Millisecond):
        fmt.Printf("processed item %d\n", item)
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
    defer cancel()

    items := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
    if err := processItems(ctx, items); err != nil {
        fmt.Println("stopped:", err)
    }
}
```

### Context Rules for Backend

| Rule | Why |
|---|---|
| Pass `ctx` as first arg, always | Convention — tools, linters, and your team expect it |
| Never store ctx in a struct | It is request-scoped, not application-scoped |
| Use `context.WithTimeout` for outbound calls | Prevent hanging on slow dependencies |
| Use `context.WithCancel` for long jobs | Let the caller abort |
| Propagate `ctx` to DB, HTTP, gRPC calls | The standard library supports it everywhere |

---

## 🔂 Pattern 7: sync.Once — Lazy Singleton Initialization

### The Analogy

A hospital's generator. The first power outage triggers startup. Every nurse who notices the outage tries to start it, but only the first one actually flips the switch — the rest see it is already running.

### The Problem It Solves

Initializing a shared resource (DB connection pool, config, cache client) exactly once, even if multiple goroutines try simultaneously.

### Full Working Code

```go
package main

import (
    "database/sql"
    "fmt"
    "sync"

    _ "github.com/lib/pq"
)

type DB struct {
    conn *sql.DB
    once sync.Once
    err  error
}

var globalDB DB

func GetDB() (*sql.DB, error) {
    globalDB.once.Do(func() {
        fmt.Println("initializing DB connection pool (runs exactly once)")
        globalDB.conn, globalDB.err = sql.Open("postgres",
            "postgres://user:pass@localhost/mydb?sslmode=disable")
        if globalDB.err == nil {
            globalDB.conn.SetMaxOpenConns(25)
            globalDB.conn.SetMaxIdleConns(5)
        }
    })
    return globalDB.conn, globalDB.err
}

func main() {
    var wg sync.WaitGroup
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(i int) {
            defer wg.Done()
            db, err := GetDB()
            if err != nil {
                fmt.Printf("goroutine %d: error: %v\n", i, err)
                return
            }
            fmt.Printf("goroutine %d: got DB %p\n", i, db)
        }(i)
    }
    wg.Wait()
}
```

10 goroutines call `GetDB()` — only one initialization runs. All 10 get the same `*sql.DB`. No mutex needed in the caller.

---

## ♻️ Pattern 8: sync.Pool — Object Reuse to Reduce GC Pressure

### The Analogy

A coffee shop where cups are washed and reused instead of thrown away after each customer. Creating a new cup (allocating memory) is slow. Reusing clean cups is fast.

### The Problem It Solves

In high-throughput backends (thousands of requests/second), allocating and discarding the same type of object (HTTP response buffers, JSON encoders, byte slices) creates enormous GC pressure. `sync.Pool` lets you reuse objects safely across goroutines.

### Full Working Code

```go
package main

import (
    "bytes"
    "fmt"
    "sync"
)

// Pool of byte buffers for JSON building
var bufPool = sync.Pool{
    New: func() interface{} {
        // Called only when pool is empty
        return &bytes.Buffer{}
    },
}

func buildJSON(data map[string]string) string {
    // Get a buffer from the pool (or create one if empty)
    buf := bufPool.Get().(*bytes.Buffer)
    buf.Reset() // IMPORTANT: reset before use
    defer bufPool.Put(buf) // return to pool when done

    buf.WriteString("{")
    first := true
    for k, v := range data {
        if !first {
            buf.WriteString(",")
        }
        fmt.Fprintf(buf, `"%s":"%s"`, k, v)
        first = false
    }
    buf.WriteString("}")

    return buf.String()
}

func main() {
    var wg sync.WaitGroup
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func(i int) {
            defer wg.Done()
            result := buildJSON(map[string]string{
                "id":   fmt.Sprintf("%d", i),
                "name": "gopher",
            })
            _ = result
        }(i)
    }
    wg.Wait()
    fmt.Println("done")
}
```

### sync.Pool Gotchas

- The GC **can evict pool objects at any time** — do not store state across requests
- Always call `buf.Reset()` before use — you may get a dirty object
- Not for objects that must be finalized (connections, file handles)
- Works best for **large, frequently allocated, short-lived objects**

---

## 🧩 Pattern 9: errgroup — Goroutines with Error Collection

### The Analogy

A space shuttle launch: three teams (propulsion, navigation, comms) each run final checks concurrently. If **any** team finds a problem, the launch is aborted immediately. All teams report back before the countdown continues.

### The Problem It Solves

Running N goroutines where you want to:
1. Wait for all of them
2. Cancel all if any one fails
3. Return the first error

`sync.WaitGroup` + manual error channels is verbose and error-prone. `errgroup` solves this cleanly.

### Full Working Code

```go
package main

import (
    "context"
    "fmt"
    "time"

    "golang.org/x/sync/errgroup"
)

type UserProfile struct {
    ID       int
    Name     string
    Orders   []string
    Payments []string
}

func fetchName(ctx context.Context, userID int) (string, error) {
    select {
    case <-time.After(50 * time.Millisecond):
        return "Alice", nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}

func fetchOrders(ctx context.Context, userID int) ([]string, error) {
    select {
    case <-time.After(80 * time.Millisecond):
        return []string{"order-1", "order-2"}, nil
    case <-ctx.Done():
        return nil, ctx.Err()
    }
}

func fetchPayments(ctx context.Context, userID int) ([]string, error) {
    select {
    case <-time.After(30 * time.Millisecond):
        // Simulate an error
        return nil, fmt.Errorf("payment service unavailable")
    case <-ctx.Done():
        return nil, ctx.Err()
    }
}

func GetUserProfile(ctx context.Context, userID int) (*UserProfile, error) {
    profile := &UserProfile{ID: userID}

    // errgroup.WithContext returns a group and a derived ctx
    // If any goroutine returns an error, the ctx is cancelled
    g, ctx := errgroup.WithContext(ctx)

    g.Go(func() error {
        name, err := fetchName(ctx, userID)
        if err != nil {
            return fmt.Errorf("name fetch: %w", err)
        }
        profile.Name = name
        return nil
    })

    g.Go(func() error {
        orders, err := fetchOrders(ctx, userID)
        if err != nil {
            return fmt.Errorf("orders fetch: %w", err)
        }
        profile.Orders = orders
        return nil
    })

    g.Go(func() error {
        payments, err := fetchPayments(ctx, userID)
        if err != nil {
            return fmt.Errorf("payments fetch: %w", err)
        }
        profile.Payments = payments
        return nil
    })

    // Wait blocks until all goroutines finish or one errors
    if err := g.Wait(); err != nil {
        return nil, err // first error returned
    }

    return profile, nil
}

func main() {
    ctx := context.Background()
    profile, err := GetUserProfile(ctx, 42)
    if err != nil {
        fmt.Println("error:", err)
        return
    }
    fmt.Printf("profile: %+v\n", profile)
}
```

### errgroup vs WaitGroup

| Feature | sync.WaitGroup | errgroup |
|---|---|---|
| Wait for all goroutines | YES | YES |
| Collect first error | Manual | Built-in |
| Cancel on first error | Manual | Built-in (WithContext) |
| Code verbosity | High | Low |
| Import | stdlib | `golang.org/x/sync` |

---

## 🚰 Pattern 10: Avoiding Goroutine Leaks

### The Analogy

A water pipe left open. Even a tiny drip (one leaking goroutine per request) adds up. At 1000 requests/second, after 10 minutes, you have 600,000 goroutines consuming memory until the server crashes.

### How Goroutines Leak

```go
// LEAK: goroutine blocks forever waiting to send — nobody is receiving
func leaky() {
    ch := make(chan int) // unbuffered
    go func() {
        ch <- 42 // blocks here forever if nobody reads ch
    }()
    // function returns without reading from ch
    // goroutine is now stuck forever
}
```

### The Three Rules to Prevent Leaks

**Rule 1: The goroutine that creates a channel owns closing it.**

**Rule 2: Always give goroutines a way to exit — via context cancellation or channel close.**

**Rule 3: Use `defer` to ensure cleanup runs.**

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// PATTERN: Background worker that respects cancellation
func startWorker(ctx context.Context) <-chan string {
    out := make(chan string)

    go func() {
        defer close(out) // ALWAYS close the channel you own
        ticker := time.NewTicker(500 * time.Millisecond)
        defer ticker.Stop()

        for {
            select {
            case <-ctx.Done():
                fmt.Println("worker: context cancelled, exiting cleanly")
                return // goroutine exits — no leak
            case t := <-ticker.C:
                // Non-blocking send: drop if nobody is reading
                select {
                case out <- fmt.Sprintf("event at %s", t.Format("15:04:05")):
                default:
                    fmt.Println("worker: output full, dropping event")
                }
            }
        }
    }()

    return out
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    events := startWorker(ctx)

    for event := range events {
        fmt.Println("received:", event)
    }

    fmt.Println("main: done")
}
```

### Leak Detection in Production

Use `runtime.NumGoroutine()` in your health endpoint:

```go
import "runtime"

http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, `{"goroutines": %d}`, runtime.NumGoroutine())
})
```

If this number grows unboundedly over time — you have a leak. Also use `github.com/uber-go/goleak` in tests:

```go
func TestNoLeak(t *testing.T) {
    defer goleak.VerifyNone(t)
    // ... your test
}
```

### Common Leak Patterns and Fixes

| Leak Scenario | Fix |
|---|---|
| Goroutine blocks on unbuffered send | Use buffered channel or select with default |
| Goroutine loops forever | Pass ctx, check `ctx.Done()` in loop |
| goroutine waits on channel that is never closed | Close the channel in the sender using defer |
| `http.Get` hangs | Use `http.NewRequestWithContext(ctx, ...)` |
| Goroutine waits on `time.After` in infinite loop | Use `time.NewTicker` with `defer ticker.Stop()` |

---

## 📊 Pattern Quick-Reference Table

| Pattern | Best For | Key Primitive |
|---|---|---|
| Worker Pool | Batch job processing, bounded parallelism | `chan Job` + `sync.WaitGroup` |
| Fan-Out/Fan-In | Parallel fetch + merge | Multiple goroutines + merge channel |
| Pipeline | Multi-stage streaming transformation | Chained channels |
| Semaphore | Limit concurrent I/O to external service | Buffered `chan struct{}` |
| Rate Limiter | Respect external API rate limits | `time.Ticker` / `x/time/rate` |
| Context Propagation | Cancellation, timeouts through call chain | `context.Context` |
| sync.Once | Singleton init (DB pool, config) | `sync.Once` |
| sync.Pool | Reduce allocations in hot path | `sync.Pool` |
| errgroup | Parallel tasks with first-error semantics | `errgroup.Group` |
| Leak Prevention | All goroutines | `ctx.Done()`, `defer close(ch)` |

---

## 🏆 Key Takeaways

1. **Never spawn unlimited goroutines.** Use a worker pool or semaphore to cap concurrency. A goroutine is cheap, but not free — 10,000 goroutines can exhaust memory and cause scheduler thrashing.

2. **Context is not optional.** Pass `ctx` everywhere. Check `ctx.Done()` in every loop. Use `context.WithTimeout` on every outbound call. This is the single biggest source of production issues in Go backends.

3. **The channel owner closes the channel.** This rule prevents double-closes (panic) and ensures receivers always see a proper close signal. Use `defer close(ch)` right after `make(chan T)`.

4. **Fan-out/Fan-in and pipelines compose naturally.** You can build complex processing graphs by connecting channel-returning functions — each stage is independent and testable.

5. **sync.Once is for application-lifetime singletons.** Use it for DB pools, config, and clients that are expensive to create and must be shared globally.

6. **sync.Pool is for hot-path allocations only.** If you are building JSON in every HTTP handler, a pool of `bytes.Buffer` can cut GC pause times significantly at high load.

7. **errgroup is the right tool for parallel fan-out with error handling.** It replaces the WaitGroup + error channel boilerplate with clean, readable code.

8. **Goroutine leaks are silent killers.** Monitor `runtime.NumGoroutine()` in production. Write tests with `goleak`. Every goroutine you start must have a guaranteed exit path.

9. **Use `golang.org/x/time/rate` for production rate limiting.** It implements a token bucket that allows short bursts while maintaining a long-term average rate — much better than a raw ticker.

10. **Measure before optimizing.** `sync.Pool`, worker pools, and semaphores add complexity. Profile first with `go tool pprof`. Only add these patterns where profiling shows actual contention or allocation pressure.

---

> **Next:** `13-database-patterns.md` — connection pooling, transactions, and query patterns for PostgreSQL and MySQL in Go backends.
