# Module System: npm vs Maven, Packages vs Modules

Socho ek second ke liye — tu Node.js se aa raha hai, jahan `import { something } from './utils'` likhna matlab ek file se doosri file mein kuch le aana. Simple, seedha, file-based. Ek file = ek module. Done.

Ab Java mein aao — yahan "module" ka matlab teen alag-alag cheezein ho sakti hain, aur beginners yahan ghabraate hain. Agar tune pehli baar Java project khola aur socha "yeh `package` kya hai, yeh `groupId` kya hai, aur JPMS ka kya chakkar hai?" — toh tu akela nahi hai.

Yeh file teri confusion khatam karegi. Ek baar samajh gaya, toh Spring Boot ka poora project structure crystal clear ho jaayega.

> [!info] Node.js developer ke liye short summary
> Node mein ek file = ek module. Java mein modularity ke **teen layers** hain:
> 1. **Package** — namespacing ke liye (folder hierarchy)
> 2. **Artifact (JAR)** — distribution ke liye (npm package jaisa)
> 3. **JPMS Module** — advanced encapsulation (Java 9+, 95% apps ignore karte hain)
>
> Tu pehle packages aur artifacts samajh — Spring Boot ke liye yahi kaafi hai.

---

## Teen Layers of Modularity — Ek Baar Mein Samajho

| Layer | Java Concept | Kya hota hai exactly | TypeScript mein kya hai |
|---|---|---|---|
| Compilation unit | `.java` file | Ek source file, ek public class | `.ts` file |
| Namespace | **Package** | Folder hierarchy + `package` keyword | Folder + relative imports |
| Distribution | **Artifact (JAR)** | `.class` files ka ZIP | npm package |
| Strong encapsulation | **JPMS module** | `module-info.java` se exports declare karo | Koi equivalent nahi |

Spring Boot apps ke liye: **Packages** aur **Artifacts** — yahi do cheezein roz kaam aayengi. JPMS ko filhaal bhool jao.

---

## Packages — Namespacing Ki Duniya

### Kya hota hai package?

Java mein ek **package** basically ek folder hai — lekin sirf folder nahi. Har `.java` file ke top pe likhna padta hai ki "main is package ka hissa hoon."

Zomato ka example lo. Unka codebase socho:
- `com.zomato.orders` — Order processing ka code
- `com.zomato.restaurants` — Restaurant listing ka code
- `com.zomato.payments` — Payment ka code
- `com.zomato.users` — User management

Yeh folders bhi hain aur packages bhi. Ek class `com.zomato.orders` mein hai, doosri `com.zomato.payments` mein — dono ek doosre ko import kar sakte hain, lekin clearly alag-alag namespaces mein hain.

```java
// File: src/main/java/com/zomato/orders/OrderService.java
package com.zomato.orders;  // <-- yeh line MANDATORY hai

import com.zomato.payments.PaymentService;   // doosre package se import
import com.zomato.users.User;                // users package se
import java.math.BigDecimal;                 // Java standard library

public class OrderService {
    // yahan order logic
}
```

> [!warning] Folder aur `package` declaration MUST match karna chahiye
> Agar file `com/zomato/orders/OrderService.java` pe hai, toh pehli line `package com.zomato.orders;` ZAROOR honi chahiye. Compiler ye enforce karta hai — ek character bhi galat hua toh compile error.

### Reverse-DNS Convention — Kyun?

Tune dekha hoga ki package names `com.zomato.*` ya `org.springframework.*` se start hoti hain. Yeh **reverse domain name** convention hai.

Kyun? Kyunki Java mein packages ka koi global registry nahi hai. npm mein ek "lodash" package register hai — koi doosra "lodash" nahi bana sakta. Java mein aisa kuch nahi. Toh agar tu `utils` naam ka package banata hai aur main bhi `utils` banata hoon — clash ho jaayega.

Solution? Domain name reverse kar do:
- `io.github.siddesh` — GitHub pe `siddesh` account hai toh
- `com.zomato` — zomato.com ke owners ka code
- `org.springframework` — springframework.org ke log

Iss tarah globally unique packages milte hain bina kisi registry ke.

### Visibility Modifiers — Package-Private Ka Kamaal

Java mein 4 visibility levels hain. TypeScript mein sirf 3:

| Modifier | Kahan visible hai | TypeScript mein kya hai |
|---|---|---|
| `public` | Everywhere — har class, har package | `export` ke saath public |
| `protected` | Same package + subclasses | `protected` |
| *(kuch nahi)* | **Same package only** — "package-private" | **Koi equivalent nahi** |
| `private` | Same class only | `private` |

**Package-private** Java ka ek underrated feature hai. Iska use karke tu apne package ke andar ki cheezein "internal" rakh sakta hai — koi bahar se use nahi kar sakta, import bhi nahi kar sakta.

```java
// File: src/main/java/com/zomato/orders/InternalOrderCalculator.java
package com.zomato.orders;

// Notice: koi 'public' nahi — yeh package-private hai
// Sirf com.zomato.orders package ke andar se access hoga
class InternalOrderCalculator {
    BigDecimal calculateDiscount(Order order) {
        // internal logic jo bahar expose nahi karni
    }
}
```

```java
// File: src/main/java/com/zomato/payments/PaymentService.java
package com.zomato.payments;

// import com.zomato.orders.InternalOrderCalculator; // ERROR! package-private hai
import com.zomato.orders.OrderService; // yeh public hai, toh OK

public class PaymentService {
    // ...
}
```

Node.js mein yeh concept nahi hai. Wahan sab kuch ya toh `export` karo (public) ya mat karo (module-private, but sirf ek file ke liye). Package-private Java ka ek extra layer hai jo cheezein organize rakhne mein help karta hai.

---

## Artifacts — Distribution Ka Chakkar

### JAR Kya Hota Hai?

Jab tu apna Java project build karta hai, output ek **JAR** file hoti hai (Java ARchive). Yeh basically ek ZIP file hai jisme saare compiled `.class` files hote hain.

npm ka `package.json` lete aur `npm pack` karte ho toh `.tgz` milta hai — JAR bilkul wahi kaam karta hai.

### Maven Coordinate — Library Ko Identify Karna

Har library (JAR) ka ek unique address hota hai Maven mein:

```
groupId : artifactId : version
```

Upar Zomato wala example continue karo:
- Agar Zomato apni payment library open-source kare: `com.zomato:payments-sdk:1.0.0`
- Spring Boot web starter: `org.springframework.boot:spring-boot-starter-web:3.3.4`

| Coordinate Part | Example | npm equivalent |
|---|---|---|
| `groupId` | `org.springframework.boot` | npm scope (`@org/...`) |
| `artifactId` | `spring-boot-starter-web` | package name |
| `version` | `3.3.4` | version |
| Combined | `org.springframework.boot:spring-boot-starter-web:3.3.4` | `@org/foo@1.0.0` |

**Maven Central** woh registry hai jahan yeh sab JARs publish hote hain — bilkul `npmjs.com` ki tarah. Tu `pom.xml` mein coordinate likhta hai, Maven Central se download ho jaata hai.

### pom.xml mein Dependency Add Karna

```xml
<!-- pom.xml — Maven ka package.json -->
<dependencies>

    <!-- Spring Boot Web — Express jaisa -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
        <!-- version nahi likhte — parent pom manage karta hai -->
    </dependency>

    <!-- Validation — Zod jaisa -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Database ORM — Prisma jaisa -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- Testing — Jest jaisa -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>  <!-- sirf test ke time use hoga -->
    </dependency>

</dependencies>
```

### Maven vs npm — Side-by-Side Comparison

| Kaam | npm/Node | Maven/Java |
|---|---|---|
| Web server | `express` | `org.springframework.boot:spring-boot-starter-web` |
| Validation | `zod` | `org.springframework.boot:spring-boot-starter-validation` |
| HTTP client | `axios` | `org.springframework:spring-web` |
| Logging | `pino` | (transitive — starters ke saath automatically aata hai) |
| Testing | `jest` | `org.springframework.boot:spring-boot-starter-test` |
| JSON | (built-in) | `com.fasterxml.jackson.core:jackson-databind` |
| ORM | `prisma` | `org.springframework.boot:spring-boot-starter-data-jpa` |
| Registry | npmjs.com | Maven Central (search.maven.org) |
| Lock file | `package-lock.json` | (Maven uses deterministic resolution, no separate lock file) |

### CRITICAL: Package aur Artifact Ek Nahi Hain

Yeh **sabse badi confusion** hai beginners ke liye. Ek artifact (JAR) ke andar kaafi saare packages ho sakte hain.

```
spring-boot-starter-web (artifact — ye pom.xml mein likhte hain)
├── org.springframework.boot.autoconfigure.web    (package — ye import karte hain)
├── org.springframework.web.servlet               (package)
├── org.springframework.http                      (package)
├── org.springframework.web.bind.annotation       (package — @RestController yahan hai)
└── aur bahut saare...
```

`pom.xml` mein artifact ka coordinate likhte hain (download ke liye).
Code mein package ka naam likhte hain (import ke liye).

Dono alag hain. Ek artifact kaafi saare packages provide karta hai.

---

## Imports — Java mein Kaise Karte Hain?

### File-based vs Class-based

Node/TypeScript mein imports file path se hote hain:

```typescript
// TypeScript — file ka relative path
import { OrderService } from '../orders/order-service';
import { z } from 'zod';  // node_modules se
```

Java mein imports **fully-qualified class name** se hote hain:

```java
// Java — class ka poora naam (package + class name)
import com.zomato.orders.OrderService;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
```

Koi `../` nahi, koi relative path nahi. Sirf package name + class name.

### Same Package = No Import Needed

Agar do classes ek hi package mein hain, unhe import nahi karna padta:

```java
// File: com/zomato/orders/OrderService.java
package com.zomato.orders;

// Order class bhi com.zomato.orders mein hai — import ki zarurat nahi!
public class OrderService {
    public Order createOrder(User user) {  // Order — same package, auto-available
        return new Order(user);
    }
}
```

### java.lang — Auto-Import

`java.lang` package automatically available hota hai — kuch bhi import nahi karna:
- `String` — `java.lang.String`
- `Integer`, `Long`, `Double` — `java.lang.Integer` etc.
- `Object` — `java.lang.Object`
- `Thread` — `java.lang.Thread`
- `Math` — `java.lang.Math`

Baaki sab ke liye import likhna padta hai.

### Wildcard Import — Seedha Nahi Likhte

```java
import java.util.*;  // java.util ke saare public types import

// Better practice: specific imports
import java.util.List;
import java.util.Optional;
import java.util.Map;
```

IntelliJ aur VS Code (with Java extension) automatically optimize karte hain — wildcard ko specific imports mein convert kar dete hain. Manually manage nahi karna padta.

### Static Import

```java
import static java.util.Objects.requireNonNull;
import static org.springframework.http.HttpStatus.NOT_FOUND;

// Use karo bina class name ke
requireNonNull(order, "order cannot be null");
return ResponseEntity.status(NOT_FOUND).build();
```

TypeScript mein `import { requireNonNull }` jaisa hi hai — bas keyword alag hai.

### No Default Export, No Re-export

Java mein yeh cheezein nahi hain:
- `export default` — nahi hai (har cheez named import hai)
- `export * from './utils'` — nahi hai
- `import * as Utils from 'utils'` — wildcard `import java.util.*` hai, but `Utils.List` nahi bolte, seedha `List` use karte hain

---

## File aur Class ke Strict Rules

> [!warning] Yeh rules TypeScript mein nahi hain — Java mein mandatory hain
> 1. Ek `public` class ka naam **file ke naam se exactly match** karna chahiye. `OrderService` class → `OrderService.java` file. Ek character alag hua → compile error.
> 2. Ek file mein **ek hi public class** ho sakti hai.
> 3. Package-private classes ek file mein share kar sakte hain (rare practice).
> 4. File ki **pehli non-comment line** `package` declaration HONI CHAHIYE.

```java
// File naam: OrderService.java — class naam bhi OrderService hona CHAHIYE
package com.zomato.orders;

public class OrderService {  // OK — naam match karta hai
    // ...
}

// Yeh bhi same file mein ho sakta hai — package-private hai
class OrderHelper {  // No 'public' — package-private
    // ...
}

// public class AnotherService {}  // ERROR! Ek file mein do public class nahi
```

---

## JPMS — Java Platform Module System (Java 9+)

### Kya Hai Yeh?

Java 9 mein ek aur layer add ki gayi — JPMS. Packages ke upar ek aur level. Ek "module" declare karta hai:
- Kaun se packages woh export karta hai (bahar se visible)
- Kaun se packages woh require karta hai (dependencies)
- Kaunse packages reflection ke liye open hain (Hibernate jaisi libraries ke liye)

```java
// src/main/java/module-info.java
module com.zomato.orders {
    requires com.zomato.users;        // doosre module pe depend karte hain
    requires java.sql;                // Java standard library module
    requires spring.context;          // Spring ka module

    exports com.zomato.orders;        // public API — bahar se accessible
    exports com.zomato.orders.api to com.zomato.web;  // sirf web module ke liye

    // Hibernate ko reflection ke liye access dena
    opens com.zomato.orders.entity to org.hibernate.orm.core;
}
```

### Kyun Zyaadatar Apps JPMS Use Nahi Karte

Spring Boot apps mein JPMS rarely use hota hai, aur reasons valid hain:

1. **Spring classpath scanning reflection pe depend karta hai** — JPMS ke saath yeh awkward ho jaata hai. `opens` declarations likhne padte hain.
2. **Zyaada strict** — typical apps ko itni strict encapsulation ki zarurat nahi.
3. **Maven Central pe zyaadatar libraries JPMS-ready nahi hain** — compatibility issues.
4. **Complexity** — extra configuration ke liye benefit nahi dikhta production apps mein.

### Kab JPMS Use Karo?

- Jab tu ek **public library** ship kar raha ho (Zomato SDK for third parties)
- **`jlink`** se custom JVM image banana ho (serverless/container optimization)
- **Strict architecture enforcement** — layer violations compile time pe pakadni hoon

Spring Boot app bana raha hai? JPMS ignore karo. Agar kabhi zarurat padegi, tab seekhna.

---

## Multi-Module Maven Projects — Java Ka Monorepo

### Kab Use Karte Hain?

Jaise pnpm workspaces mein multiple packages hoti hain ek repo mein, waise Maven mein **multi-module project** hota hai.

Socho Swiggy ka monorepo:

```
swiggy-backend/
├── pom.xml              ← Parent POM (packaging = pom)
├── orders/
│   ├── pom.xml          ← Child module
│   └── src/main/java/com/swiggy/orders/...
├── restaurants/
│   ├── pom.xml
│   └── src/main/java/com/swiggy/restaurants/...
├── payments/
│   ├── pom.xml
│   └── src/main/java/com/swiggy/payments/...
└── api-gateway/
    ├── pom.xml
    └── src/main/java/com/swiggy/gateway/...
```

**Parent POM** sab modules declare karta hai:

```xml
<!-- swiggy-backend/pom.xml — parent -->
<groupId>com.swiggy</groupId>
<artifactId>swiggy-backend</artifactId>
<version>1.0.0</version>
<packaging>pom</packaging>  <!-- JAR nahi, sirf container -->

<modules>
    <module>orders</module>
    <module>restaurants</module>
    <module>payments</module>
    <module>api-gateway</module>
</modules>
```

**Child module** parent pe depend karta hai:

```xml
<!-- swiggy-backend/orders/pom.xml -->
<parent>
    <groupId>com.swiggy</groupId>
    <artifactId>swiggy-backend</artifactId>
    <version>1.0.0</version>
</parent>

<artifactId>orders</artifactId>  <!-- groupId aur version parent se inherit -->

<dependencies>
    <!-- orders, restaurants pe depend karta hai — Maven coordinate use karo -->
    <dependency>
        <groupId>com.swiggy</groupId>
        <artifactId>restaurants</artifactId>
        <version>${project.version}</version>
    </dependency>
</dependencies>
```

pnpm workspaces se comparison:
- pnpm: `"@swiggy/restaurants": "workspace:*"` → Maven: `<groupId>com.swiggy</groupId><artifactId>restaurants</artifactId>`
- pnpm: `pnpm install` → Maven: `mvn install`
- pnpm: `pnpm build --filter @swiggy/orders` → Maven: `mvn package -pl orders`

---

## Real Code Example — Package + Import + Visibility

Ek complete example dekho Zomato ke context mein:

```java
// File: src/main/java/com/zomato/orders/Order.java
package com.zomato.orders;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

// public record — bahar se bhi accessible
public record Order(
    Long id,
    String customerId,
    List<OrderItem> items,  // OrderItem same package mein hai — no import needed
    BigDecimal totalAmount,
    Instant placedAt,
    OrderStatus status       // OrderStatus bhi same package mein
) {}
```

```java
// File: src/main/java/com/zomato/orders/OrderRepository.java
package com.zomato.orders;

import java.util.List;
import java.util.Optional;

// package-private interface — sirf orders package ke andar visible
// com.zomato.payments ya com.zomato.users ye import nahi kar sakate
interface OrderRepository {
    Optional<Order> findById(Long id);
    List<Order> findByCustomerId(String customerId);
    Order save(Order order);
}
```

```java
// File: src/main/java/com/zomato/orders/OrderService.java
package com.zomato.orders;

import com.zomato.payments.PaymentService;  // doosre package se — public class
import com.zomato.restaurants.Restaurant;   // doosre package se — public record
import java.math.BigDecimal;
import java.util.List;

// public class — Spring aur doosre packages use kar sakte hain
public class OrderService {
    private final OrderRepository repository;  // package-private — OK, same package
    private final PaymentService paymentService;  // public — OK

    // constructor injection (Spring ke liye)
    public OrderService(OrderRepository repository, PaymentService paymentService) {
        this.repository = repository;
        this.paymentService = paymentService;
    }

    public Order placeOrder(String customerId, List<OrderItem> items, Restaurant restaurant) {
        BigDecimal total = calculateTotal(items);  // private method
        Order order = new Order(null, customerId, items, total,
                               java.time.Instant.now(), OrderStatus.PLACED);
        return repository.save(order);
    }

    private BigDecimal calculateTotal(List<OrderItem> items) {
        return items.stream()
            .map(item -> item.price().multiply(BigDecimal.valueOf(item.quantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

```java
// File: src/main/java/com/zomato/api/OrderController.java
package com.zomato.api;

import com.zomato.orders.Order;             // public — import kar sakte hain
import com.zomato.orders.OrderService;      // public — import kar sakte hain
// import com.zomato.orders.OrderRepository; // ERROR! package-private hai

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;  // constructor injection

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public Order placeOrder(@RequestBody PlaceOrderRequest request) {
        return orderService.placeOrder(
            request.customerId(),
            request.items(),
            request.restaurant()
        );
    }
}
```

---

## Full Comparison Table — TypeScript vs Java

| Aspect | TypeScript / Node | Java |
|---|---|---|
| Source unit | Ek file = ek module | Ek file (with package); package = folder |
| Distribution | npm package (`.tgz`) | Maven artifact (JAR) |
| Naming | `@scope/package-name` | `groupId:artifactId` |
| Registry | npmjs.com | Maven Central, JitPack, GitHub Packages |
| Import style | File path se (`'../utils'`) | Fully-qualified class name se |
| Default export | `export default` | Nahi hai |
| Re-export | `export * from 'x'` | Nahi hai |
| Wildcard import | `import * as X from 'y'` | `import pkg.*` (limited) |
| Public API | Conventions + `exports` in package.json | `public`/`protected`/package-private + JPMS |
| Local deps | pnpm workspaces | Multi-module Maven |
| Tree shaking | Bundler karta hai | Nahi hai — JAR mein sab classes jaati hain |
| Version lock | `package-lock.json` | Deterministic resolution, no lock file |
| Dev dependencies | `devDependencies` | `<scope>test</scope>` ya `<scope>provided</scope>` |

---

## Gotchas — Common Mistakes Beginners Karte Hain

> [!warning] Yeh galtiyaan mat karna

**1. Folder ka naam aur artifactId ek nahi hote**

`pom.xml` mein jo `artifactId` likha hai woh Maven coordinate hai. Folder ka naam sirf convention hai — dono alag ho sakte hain (though usually same rakhte hain).

**2. Do classes ka same simple name — alag packages**

```java
// java.util.Date aur java.sql.Date — dono "Date" hain
import java.util.Date;
// import java.sql.Date;  // ERROR — ambiguous import

// Solution: ek import karo, doosre ko fully qualify karo
import java.util.Date;

Date utilDate = new Date();
java.sql.Date sqlDate = new java.sql.Date(System.currentTimeMillis());
```

**3. Circular Package Imports**

```
com.zomato.orders → imports → com.zomato.payments
com.zomato.payments → imports → com.zomato.orders
```

Java mein yeh technically legal hai (unlike Node's circular require which can cause issues), lekin yeh architecture ka smell hai. Agar do packages ek doosre pe depend karte hain, unhe merge kar do ya ek third package introduce karo.

**4. Package Split Across JARs**

```
jar-A: com.zomato.orders.Order
jar-B: com.zomato.orders.OrderService
```

Classpath pe allowed hai, but warnings aate hain. JPMS ke saath bilkul forbidden. Ek package ek hi JAR mein hona chahiye — convention aur good practice dono.

**5. Fat JAR Ke Andar JAR — Seedha Unzip Mat Karo**

Spring Boot ka fat JAR (executable JAR) ke andar saari dependency JARs nested hoti hain. Iska ek custom classloader (Spring Boot Loader) use hota hai. Agar tune `jar -xf app.jar` kiya aur andar wale JARs seedha run karne ki koshish ki — kaam nahi karega.

**6. `java.*` Packages Reserved Hain**

`java.util`, `java.lang` — yeh sab reserved hain. Kabhi apna code `java.` se start hone wale package mein mat rakho. JVM reject kar dega.

**7. IntelliJ Auto-Import Aur Unused Imports**

IntelliJ automatically imports suggest karta hai, aur unused imports ko grey kar deta hai. `Alt+Enter` se import kar, `Ctrl+Alt+O` (Optimize Imports) se unused hata. Manual management ki zarurat nahi.

---

## Key Takeaways

- **Package** = namespacing layer. Folder path = package name. `package com.zomato.orders;` har file mein pehle likhna padta hai.
- **Artifact (JAR)** = distribution layer. Maven coordinate `groupId:artifactId:version` se identify hota hai. `pom.xml` mein declare karte hain.
- **Package aur Artifact ek nahi** — ek artifact kaafi packages contain karta hai. Artifact `pom.xml` mein, package code mein import.
- **Maven Central** = npmjs.com of Java. Coordinates se search karo, `pom.xml` mein add karo, Maven download karta hai.
- **4 visibility levels**: `public`, `protected`, package-private (no keyword), `private`. Package-private underrated hai — internal APIs ke liye use karo.
- **File-class naming rule**: Public class ka naam file ke naam se exactly match karna chahiye. No exceptions.
- **Imports class-based hain**, file-path se nahi. `import com.zomato.orders.OrderService;`
- **JPMS ignore karo** jab tak Spring Boot app bana rahe ho. Library ship karne pe, ya `jlink` ke liye seekhna.
- **Multi-module Maven** = pnpm workspaces ka Java equivalent. Monorepo ke liye use karo.
- **No default exports, no re-exports** — Java mein sab named imports hain.
