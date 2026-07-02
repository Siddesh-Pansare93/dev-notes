# Exceptions — Java mein Error Handling ka Poora Scene

Socho ek second ke liye — tumhara Zomato order app chal raha hai. User ne order place kiya, payment ka request gaya, aur achanak bank ka server down ho gaya. Kya hoga? Agar tumne proper error handling nahi ki, toh ya toh app crash ho jaayega, ya user ko ek blank screen milegi — aur woh dono scenarios acceptable nahi hain.

Yahi hai exceptions ka kaam. **Exceptions woh mechanism hai jisse tumhara program unexpected situations ko handle karta hai — gracefully, bina crash kiye.** Node.js mein tumne try-catch use kiya hoga, aur `Error` object ke saath kaam kiya hoga. Java mein yeh concept zyada structured aur powerful hai — do flavors hain: *checked* aur *unchecked* exceptions — aur compiler khud tumse ensure karta hai ki tum important errors handle karo.

Yeh file padhne ke baad tum samajhoge ki:
- Java ka exception hierarchy kya hai
- Checked aur unchecked ka difference kya hai (aur kyun yeh important hai)
- try-catch-finally kaise use karte hain
- Apni custom exceptions kaise banate hain
- try-with-resources kya hai aur kyun yeh `finally` se better hai
- Spring Boot mein exceptions kaise handle hoti hain

---

## Exception Hierarchy — Java ka Family Tree

Java mein sabse pehle yeh samajhna zaruri hai ki exceptions ek hierarchy mein hain. Yeh Node.js se quite different hai, jahan basically ek hi `Error` class hoti hai.

```
Throwable
├── Error                    (JVM-level problems — KABHI mat pakdo)
│   ├── OutOfMemoryError
│   ├── StackOverflowError
│   └── AssertionError
└── Exception
    ├── RuntimeException         (UNCHECKED — Node.js ke errors jaisa)
    │   ├── NullPointerException
    │   ├── IllegalArgumentException
    │   ├── IndexOutOfBoundsException
    │   ├── ClassCastException
    │   └── ArithmeticException
    └── (sab baki)               (CHECKED — compiler enforce karta hai)
        ├── IOException
        │   ├── FileNotFoundException
        │   └── NoSuchFileException
        ├── SQLException
        └── ParseException
```

**`Error`** — yeh JVM ke internal problems hain. `OutOfMemoryError` matlab JVM ko memory nahi mili. `StackOverflowError` matlab infinite recursion chal rahi hai. Inhe kabhi catch mat karo — agar yeh aa raha hai toh kuch fundamentally galat hai tumhare application mein.

**`Exception`** — yeh woh cheezein hain jo tum actually handle karte ho.

---

## Checked vs Unchecked — Yeh Dono Kya Hain?

Yeh Java ka sabse important concept hai jo beginners ko confuse karta hai.

### Checked Exceptions — Compiler ka "Karo Ya Batao" Wala Rule

Checked exceptions woh hain jo compiler force karta hai ki tum either handle karo ya declare karo. Matlab agar koi method ek checked exception throw kar sakta hai, toh:
1. Ya toh uss method ko `try-catch` mein wrap karo
2. Ya apne method mein `throws IOException` likh do (aage wale ko deal karne do)

**Kyun exist karte hain?** Socho file reading — woh file exist nahi bhi ho sakti, ya disk full ho sakti hai. Java ke creators ne socha ki yeh situations itni common hain ki developers ko explicitly handle karna chahiye. Compiler ek reminder hai.

```java
// yeh method ek checked exception throw kar sakta hai
public String fileParho(String path) throws IOException {
    // compiler ensure karta hai ki caller handle kare
    return Files.readString(Path.of(path));
}

// caller ke paas do options hain:

// Option 1: try-catch se handle karo
public void option1() {
    try {
        String content = fileParho("config.json");
        System.out.println(content);
    } catch (IOException e) {
        System.err.println("File nahi mili bhai: " + e.getMessage());
    }
}

// Option 2: aage pass kar do (throws declare karo)
public void option2() throws IOException {
    String content = fileParho("config.json");
    System.out.println(content);
}
```

### Unchecked Exceptions — Runtime Surprises

Unchecked exceptions `RuntimeException` extend karte hain. Inhe compiler enforce nahi karta — yeh runtime pe aate hain. Node.js ke errors basically yahi hain.

```java
// yeh method kuch declare nahi karta
public User userDhundo(int userId) {
    User user = userRepository.findById(userId);
    // agar user null hai toh NullPointerException aayegi — unchecked
    return user;
}
```

**Modern Java + Spring Boot mein:** Unchecked exceptions prefer kiye jaate hain. Spring ka design philosophy hai ki checked exceptions zyada verbose code banate hain. Isliye Spring khud internally checked exceptions ko unchecked mein convert karta hai (jaise `DataAccessException`).

> [!info] Node.js/TypeScript se comparison
> TypeScript mein sab errors basically unchecked hain — compiler kabhi force nahi karta ki tum specific errors handle karo. Java ka checked system zyada strict hai, lekin modern Spring Boot mein tum mostly unchecked hi use karoge. `try { } catch (e: unknown) { }` wala pattern Java ke unchecked exceptions jaisa hi hai.

---

## try / catch / finally — Pura Syntax

### Basic Structure

```java
try {
    // woh code jo fail ho sakta hai
    var data = Files.readString(Path.of("config.json"));
    process(data);

} catch (NoSuchFileException e) {
    // specific exception pehle aati hai (hierarchy mein neeche wali)
    log.warn("Config file nahi mili, default values use karte hain");

} catch (IOException e) {
    // broader exception baad mein (hierarchy mein upar wali)
    log.error("File padhne mein koi serious problem aayi", e);
    throw new RuntimeException(e);   // wrap karke rethrow — caller ko batao

} finally {
    // yeh HAMESHA chalega — exception aaye ya na aaye
    cleanup();
}
```

**Exception catching ka order matter karta hai!** Parent class pehle nahi aani chahiye. Agar `IOException` ko `NoSuchFileException` se pehle pakdo, toh `NoSuchFileException` kabhi reach nahi karega (kyunki `NoSuchFileException` extends `IOException` karta hai).

### Multi-Catch — Ek Block Mein Multiple Exceptions

```java
try {
    // Zomato order processing ka example
    String orderData = Files.readString(Path.of("order.json"));
    Connection conn = database.getConnection();
    conn.createStatement().execute("INSERT INTO orders ...");

} catch (IOException | SQLException e) {
    // dono same tarah handle hoti hain toh combine kar lo
    log.error("Order process karte waqt error: {}", e.getMessage(), e);
    throw new OrderProcessingException("Order fail ho gaya", e);
}
```

### finally Block — Guaranteed Cleanup

`finally` block hamesha execute hota hai — chahe exception aaye, chahe na aaye, chahe `return` bhi kar do.

```java
Connection connection = null;
try {
    connection = dataSource.getConnection();
    // kaam karo
    return doWork(connection);

} catch (SQLException e) {
    log.error("DB error", e);
    throw new DataException(e);

} finally {
    // connection close karo — chahe kuch bhi ho
    if (connection != null) {
        try {
            connection.close();
        } catch (SQLException ignored) {}
    }
}
```

> [!tip] finally ka ek quirk
> Agar `finally` block mein bhi `return` ya `throw` hai, toh woh `try` block ka `return`/`throw` override kar deta hai. Isliye `finally` mein kabhi `return` mat likhna — confusing bugs aate hain.

---

## throws Clause — "Mera Kaam Nahi Hai Yeh Handle Karna"

Jab tumhara method ek checked exception throw karta hai lekin handle nahi karta, toh `throws` declare karna padta hai.

```java
// method signature mein throws likha — caller ki zimmedari
public String configLoad(Path configPath) throws IOException {
    return Files.readString(configPath);
}

// chain mein aage pass karo
public void appStart() throws IOException {
    String config = configLoad(Path.of("app.properties"));
    parseConfig(config);
}

// kisi ek jagah finally pakdo
public static void main(String[] args) {
    try {
        appStart();
    } catch (IOException e) {
        System.err.println("App start nahi ho saka: " + e.getMessage());
        System.exit(1);
    }
}
```

`RuntimeException` subclasses ke liye `throws` declare karne ki zarurat nahi hoti — optional hai (good for documentation though).

---

## Custom Exceptions — Apni Exception Classes Banana

Yeh bahut important hai production code mein. Generic exceptions ki jagah specific exceptions use karo.

### Basic Custom Exception

```java
// Unchecked exception — Spring Boot mein yahi prefer karte hain
public class UserNotFoundException extends RuntimeException {

    // simple message wala constructor
    public UserNotFoundException(String message) {
        super(message);
    }

    // cause ke saath wala constructor — chaining ke liye
    public UserNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    // userId ke saath — extra context
    public UserNotFoundException(long userId) {
        super("User nahi mila jiska ID hai: " + userId);
    }
}
```

### Real-World Example — Zomato Style Order System

```java
// Order nahi mila
public class OrderNotFoundException extends RuntimeException {
    private final String orderId;

    public OrderNotFoundException(String orderId) {
        super("Order nahi mila: " + orderId);
        this.orderId = orderId;
    }

    public String getOrderId() {
        return orderId;
    }
}

// Payment fail ho gaya
public class PaymentFailedException extends RuntimeException {
    private final String reason;
    private final double amount;

    public PaymentFailedException(double amount, String reason) {
        super(String.format("%.2f rupaye ka payment fail: %s", amount, reason));
        this.amount = amount;
        this.reason = reason;
    }

    public String getReason() { return reason; }
    public double getAmount() { return amount; }
}

// Restaurant closed hai
public class RestaurantClosedException extends RuntimeException {
    public RestaurantClosedException(String restaurantName) {
        super(restaurantName + " abhi closed hai — baad mein try karo");
    }
}

// Use karo:
public Order orderPlace(String restaurantId, Cart cart, PaymentInfo payment) {
    Restaurant r = restaurantRepo.findById(restaurantId)
        .orElseThrow(() -> new OrderNotFoundException(restaurantId));

    if (!r.isOpen()) {
        throw new RestaurantClosedException(r.getName());
    }

    boolean paid = paymentGateway.charge(payment, cart.getTotal());
    if (!paid) {
        throw new PaymentFailedException(cart.getTotal(), "UPI transaction declined");
    }

    return orderRepo.save(new Order(r, cart, payment));
}
```

> [!info] Spring Boot mein Custom Exceptions ka magic
> Spring Boot mein `@ControllerAdvice` + `@ExceptionHandler` use karke tum in custom exceptions ko automatically HTTP responses mein convert kar sakte ho. `UserNotFoundException` -> 404, `PaymentFailedException` -> 402, etc. Yeh bahut clean pattern hai.

---

## try-with-resources — finally Ko Bhool Jao

Java 7 se ek bahut useful feature aaya — **try-with-resources**. Agar koi object `AutoCloseable` implement karta hai (jaise file streams, DB connections, HTTP clients), toh tum usse try ke parentheses mein declare kar sakte ho. Java automatically `close()` call kar dega — exception aaye ya na aaye.

### Purana Style (ugly finally)

```java
// Purana tareka — Node.js ke fs module jaisa manual cleanup
BufferedReader reader = null;
try {
    reader = new BufferedReader(new FileReader("data.txt"));
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    log.error("File read error", e);
} finally {
    if (reader != null) {
        try {
            reader.close(); // yeh bhi exception throw kar sakta hai!
        } catch (IOException e) {
            log.error("Close karte waqt error", e);
        }
    }
}
```

### Naya Style (try-with-resources)

```java
// Clean! Automatic close hoga
try (var reader = new BufferedReader(new FileReader("data.txt"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    log.error("File read error", e);
}
// reader.close() automatically call ho gaya — guarantee hai
```

### Multiple Resources

```java
// Dono automatically close honge — reverse order mein (out pehle, phir in)
try (var in  = Files.newBufferedReader(sourcePath);
     var out = Files.newBufferedWriter(destPath)) {

    String line;
    while ((line = in.readLine()) != null) {
        out.write(line);
        out.newLine();
    }
}
// out.close() phir in.close() — automatically
```

### Apna AutoCloseable Banana

```java
// Custom resource jo automatically cleanup hogi
public class DatabaseTransaction implements AutoCloseable {
    private final Connection connection;
    private boolean committed = false;

    public DatabaseTransaction(DataSource ds) throws SQLException {
        this.connection = ds.getConnection();
        this.connection.setAutoCommit(false);
    }

    public void commit() throws SQLException {
        connection.commit();
        committed = true;
    }

    @Override
    public void close() throws SQLException {
        if (!committed) {
            connection.rollback(); // exception aaya toh rollback
        }
        connection.close();
    }
}

// Use:
try (var txn = new DatabaseTransaction(dataSource)) {
    orderRepo.save(order);
    inventoryRepo.update(items);
    txn.commit();
} // automatically close() call hoga — rollback bhi agar exception aaya
```

> [!tip] Node.js comparison
> Node.js mein `using` keyword aaya hai (Stage 3 proposal) jo Java ke try-with-resources jaisa hi hai. Java mein yeh Java 7 se stable hai. `Symbol.dispose` wala concept bilkul `AutoCloseable` jaisa hai.

---

## Exception Chaining — Original Error Mat Khoye

Jab tum ek exception catch karke naya throw karte ho, toh original exception ko cause ke roop mein preserve karo. Warna debugging mein bahut problem hoti hai.

```java
// GALAT — original exception lost ho gayi
try {
    db.query("SELECT ...");
} catch (SQLException e) {
    throw new ServiceException("User load failed"); // e kahan gaya?
}

// SAHI — cause preserve karo
try {
    db.query("SELECT ...");
} catch (SQLException e) {
    throw new ServiceException("User load failed", e); // e ander save hai
}
```

Stack trace mein dono exceptions dikhenge — pehle naya, phir `Caused by:` ke saath original.

```
com.example.ServiceException: User load failed
    at com.example.UserService.findUser(UserService.java:45)
    ...
Caused by: java.sql.SQLException: Connection refused
    at org.postgresql.Driver.connect(Driver.java:123)
    ...
```

`e.getCause()` call karke original exception retrieve kar sakte ho programmatically.

---

## Spring Boot mein Exceptions — Real-World Setup

Spring Boot mein ek global exception handler setup karte hain jise `@ControllerAdvice` kehte hain. Yeh ek centralized jagah hai jahan sab unhandled exceptions jaati hain.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    // UserNotFoundException -> 404 Not Found
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("USER_NOT_FOUND", ex.getMessage()));
    }

    // PaymentFailedException -> 402 Payment Required
    @ExceptionHandler(PaymentFailedException.class)
    public ResponseEntity<ErrorResponse> handlePaymentFailed(PaymentFailedException ex) {
        return ResponseEntity
            .status(HttpStatus.PAYMENT_REQUIRED)
            .body(new ErrorResponse("PAYMENT_FAILED", ex.getMessage()));
    }

    // Validation errors -> 400 Bad Request
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors()
            .stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity
            .badRequest()
            .body(new ErrorResponse("VALIDATION_FAILED", msg));
    }

    // Sabke liye fallback -> 500 Internal Server Error
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        log.error("Unexpected error", ex); // log karo stack trace ke saath
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "Kuch galat ho gaya, baad mein try karo"));
    }
}

// Error response DTO
public record ErrorResponse(String code, String message) {}
```

Aur service layer mein sirf throw karo — handler khud handle kar lega:

```java
@Service
public class UserService {

    public User findUser(long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
        // bas! GlobalExceptionHandler handle karega
    }
}
```

> [!info] Spring Data ka secret
> Spring Data JPA internally `SQLException` aur dusri checked exceptions ko `DataAccessException` (unchecked) mein wrap karta hai. Isliye tumhare repositories se checked exceptions propagate nahi hote. Yeh Spring ka "exception translation" feature hai.

---

## Lambdas aur Checked Exceptions — Annoying Problem

Yeh ek common frustration hai. Java ke functional interfaces (`Function`, `Predicate`, `Consumer`) checked exceptions allow nahi karte. Agar tum stream operations mein file reading karo, toh compiler complain karega.

```java
// COMPILE ERROR — Files.readString throws IOException (checked)
List<String> contents = paths.stream()
    .map(p -> Files.readString(p))   // ERROR: unhandled IOException
    .collect(Collectors.toList());
```

**Solution 1: Lambda ke andar try-catch**

```java
List<String> contents = paths.stream()
    .map(p -> {
        try {
            return Files.readString(p);
        } catch (IOException e) {
            throw new UncheckedIOException(e);  // unchecked mein wrap karo
        }
    })
    .collect(Collectors.toList());
```

**Solution 2: Helper method nikalo**

```java
// Helper method — cleaner lagta hai
private String safeReadFile(Path path) {
    try {
        return Files.readString(path);
    } catch (IOException e) {
        throw new UncheckedIOException(e);
    }
}

// Stream mein use karo — clean!
List<String> contents = paths.stream()
    .map(this::safeReadFile)
    .collect(Collectors.toList());
```

**Solution 3: Utility wrapper (team mein share karo)**

```java
// Reusable wrapper — ek baar banao, sab jagah use karo
@FunctionalInterface
public interface ThrowingFunction<T, R> {
    R apply(T t) throws Exception;

    static <T, R> Function<T, R> wrap(ThrowingFunction<T, R> fn) {
        return t -> {
            try {
                return fn.apply(t);
            } catch (RuntimeException e) {
                throw e;
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };
    }
}

// Use:
List<String> contents = paths.stream()
    .map(ThrowingFunction.wrap(Files::readString))
    .collect(Collectors.toList());
```

---

## Pura Code Example — FileLoader with All Concepts

```java
package com.example.errors;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.*;
import java.util.List;
import java.util.stream.Stream;

public class FileLoader {

    // --- Custom Exceptions ---

    // Unchecked — Spring Boot pattern follow kar rahe hain
    public static class LoadException extends RuntimeException {
        private final String fileName;

        public LoadException(String fileName, Throwable cause) {
            super("File load nahi ho saka: " + fileName, cause);
            this.fileName = fileName;
        }

        public String getFileName() { return fileName; }
    }

    // --- Main Methods ---

    /**
     * File load karo — agar file nahi mili toh empty list dedo (soft failure)
     * Dusri IOExceptions pe LoadException throw karo (hard failure)
     */
    public List<String> load(String name) {
        Path p = Path.of(name);
        try {
            return Files.readAllLines(p);

        } catch (NoSuchFileException e) {
            // File nahi mili — okay hai, empty list dedo
            // Zomato example: restaurant temporarily unavailable — graceful fallback
            return List.of();

        } catch (IOException e) {
            // Koi aur IO problem — serious hai, propagate karo
            throw new LoadException(name, e);
        }
    }

    /**
     * Ek file se doosri mein copy karo — try-with-resources use karo
     * Dono streams automatically close honge
     */
    public void copy(Path from, Path to) throws IOException {
        // try-with-resources — finally likhne ki zarurat nahi
        try (var in  = Files.newInputStream(from);
             var out = Files.newOutputStream(to)) {
            in.transferTo(out);
        }
        // in.close() aur out.close() automatically call hua — guaranteed
    }

    /**
     * Multiple files ek saath load karo — stream + exception handling
     */
    public List<String> loadAll(List<String> fileNames) {
        return fileNames.stream()
            .flatMap(name -> {
                try {
                    return Files.readAllLines(Path.of(name)).stream();
                } catch (NoSuchFileException e) {
                    return Stream.empty(); // file nahi mili, skip karo
                } catch (IOException e) {
                    throw new UncheckedIOException(e); // unchecked mein convert karo
                }
            })
            .collect(java.util.stream.Collectors.toList());
    }

    // --- Main for Testing ---

    public static void main(String[] args) {
        var loader = new FileLoader();

        // Test 1: missing file — empty list milegi, no exception
        var lines1 = loader.load("missing.txt");
        System.out.println("Missing file result: " + lines1); // []

        // Test 2: actual IO error — LoadException aayegi
        try {
            loader.load("/dev/full"); // simulated disk full scenario
        } catch (LoadException e) {
            System.err.println("Error: " + e.getMessage());
            System.err.println("Original cause: " + e.getCause());
            // getCause() se original IOException milti hai
        }

        // Test 3: exception chaining dekhte hain
        try {
            throw new LoadException("config.json", new IOException("Disk full hai bhai"));
        } catch (LoadException e) {
            System.err.println("Message: " + e.getMessage());
            System.err.println("Cause class: " + e.getCause().getClass().getSimpleName());
            // "Cause class: IOException"
        }
    }
}
```

---

## TypeScript ↔ Java — Side-by-Side Comparison

| TypeScript / Node.js                          | Java                                              |
|-----------------------------------------------|---------------------------------------------------|
| `throw new Error("kuch gadbad")`              | `throw new RuntimeException("kuch gadbad");`      |
| `try { } catch (e) { }`                       | `try { } catch (Exception e) { }`                 |
| `try { } finally { }`                         | `try { } finally { }`                             |
| Sab errors unchecked hain                     | Do flavors: checked + unchecked                   |
| `using` keyword (Stage 3 proposal)            | `try (var r = ...)` since Java 7 — stable         |
| `class FooError extends Error`                | `class FooException extends RuntimeException`     |
| `e.cause` property                            | `e.getCause()` method                             |
| `Promise.reject(new Error(...))`              | `CompletableFuture.failedFuture(ex)`              |
| No compiler enforcement                       | Checked exceptions: compiler enforce karta hai    |
| Express: `app.use((err, req, res, next) =>)` | Spring: `@ControllerAdvice` + `@ExceptionHandler` |

---

## Gotchas — Common Mistakes Beginners Karte Hain

> [!warning] NullPointerException — Java ka sabse common enemy
> NPE sabse zyada common runtime error hai. `user.getName()` call kiya aur `user` null tha — boom. Mitigations:
> - `Optional<User>` use karo return types mein
> - Collections mein kabhi `null` return mat karo — empty collection dedo
> - Inputs validate karo method ke shuru mein
> - Java 14+ mein helpful NPE messages aate hain: `"Cannot invoke "User.getName()" because "user" is null"`
> ```java
> // Galat
> public User getUser(long id) {
>     return userMap.get(id); // null return ho sakta hai
> }
>
> // Sahi
> public Optional<User> getUser(long id) {
>     return Optional.ofNullable(userMap.get(id));
> }
> ```

> [!warning] Exception swallow mat karo — Sabse bada sin
> ```java
> // SIN! Exception gaya kahan? Pata hi nahi chalega
> try {
>     riskyOperation();
> } catch (Exception e) {
>     // kuch nahi — empty catch block
> }
>
> // SAHI — kam se kam log karo
> try {
>     riskyOperation();
> } catch (Exception e) {
>     log.error("riskyOperation fail ho gayi: {}", e.getMessage(), e);
>     // ya rethrow karo, ya user ko batao
> }
> ```
> `InterruptedException` ke saath especially careful raho — agar swallow ki toh thread cancellation silently break ho jaata hai.

> [!warning] Bahut broad exception mat pakdo
> ```java
> // BAD — sab kuch pakad liya, specific handling impossible
> try {
>     complexOperation();
> } catch (Exception e) { // bahut broad!
>     log.error("Error", e);
> }
>
> // BETTER — specific exceptions pakdo
> try {
>     complexOperation();
> } catch (DatabaseException e) {
>     // DB specific handling
> } catch (NetworkException e) {
>     // Network specific handling
> }
> ```

> [!warning] Exception ki parent class pehle mat pakdo
> ```java
> // COMPILE ERROR — IOException ko NoSuchFileException se pehle pakda
> try {
>     Files.readString(path);
> } catch (IOException e) {        // parent pehle
>     handle(e);
> } catch (NoSuchFileException e) { // child kabhi reach nahi karega!
>     specificHandle(e);
> }
>
> // SAHI — specific (child) pehle, broad (parent) baad mein
> try {
>     Files.readString(path);
> } catch (NoSuchFileException e) { // child pehle
>     specificHandle(e);
> } catch (IOException e) {         // parent baad mein
>     handle(e);
> }
> ```

> [!warning] Stack trace preserve karo — debugging ke liye
> ```java
> // BAD — original stack trace lost
> try {
>     db.query();
> } catch (SQLException e) {
>     throw new ServiceException(e.getMessage()); // cause nahi diya!
> }
>
> // GOOD — cause ke saath wrap karo
> try {
>     db.query();
> } catch (SQLException e) {
>     throw new ServiceException("DB query fail", e); // e pass kiya
> }
> ```

> [!warning] finally mein return mat karo
> ```java
> // BUG! finally ka return try ka return override kar deta hai
> try {
>     return "success";
> } finally {
>     return "finally"; // "finally" return hoga, "success" nahi!
> }
> ```

> [!tip] log.error mein exception object pass karo — `e.getMessage()` nahi
> ```java
> // BAD — sirf message log hua, stack trace nahi
> log.error("Error: " + e.getMessage());
>
> // GOOD — full stack trace log hoga
> log.error("Operation fail ho gayi", e);
> // Ya SLF4J style:
> log.error("Operation fail ho gayi: {}", e.getMessage(), e);
> ```

---

## Key Takeaways

- **Hierarchy samajhlo**: `Throwable` > `Error` (mat pakdo) / `Exception` > `RuntimeException` (unchecked) / baaki checked hain
- **Checked vs Unchecked**: Checked ke liye compiler force karta hai handle karne ko; modern Spring Boot mein unchecked prefer karo
- **Custom exceptions banao**: Generic `RuntimeException` ki jagah domain-specific exceptions likhna — `UserNotFoundException`, `PaymentFailedException` — code zyada readable hota hai
- **try-with-resources**: Resources (`AutoCloseable`) ke liye hamesha yahi use karo — `finally` se cleaner hai, bugs kam hote hain
- **Exception chaining**: Jab wrap karke rethrow karo, original exception ko `cause` ke roop mein zarur pass karo — debugging mein bahut help milti hai
- **Kabhi swallow mat karo**: Empty catch block ek slow poison hai — kam se kam log karo
- **Spring mein `@ControllerAdvice`**: Ek centralized jagah banao sab exceptions handle karne ke liye — har controller mein try-catch likhne ki zarurat nahi
- **Lambdas + checked exceptions nahi milte**: Stream mein checked exceptions aaye toh unchecked mein wrap karo ya helper method banao
- **NPE se daro**: `Optional` use karo, null return mat karo, inputs validate karo — NPE ko prevent karo, catch mat karo
