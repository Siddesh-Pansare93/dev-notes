# Packages aur Modules — Java ka File System

Socho ek second ke liye — tumhare paas ek bada Zomato jaisa app hai. Ek taraf restaurant listing ka code hai, doosri taraf payment processing, teesri taraf delivery tracking, aur chauthi taraf user profiles. Agar yeh sab code ek hi jagah, ek hi folder mein dump kar do, toh kya hoga? Complete chaos. Koi samajh nahi paayega ki kaun si class kahan hai, ek team doosri team ka code accidentally use kar legi, aur debugging ek nightmare ban jaayegi.

Yahi problem solve karte hain **Packages** — Java ka organization system. Aur agar tum TypeScript ya Node.js se aaye ho, toh ek cheez seedha bata deta hoon: Java mein koi relative imports nahi hote. Koi `../../../utils/helper` waali bakwaas nahi. Har cheez **fully qualified package name** se import hoti hai, aur directory structure package name se **exactly match** karni chahiye. Ek bar yeh concept clear ho gaya, toh Java projects mein kabhi confuse nahi hoge.

---

## Packages — Kyun Zaruri Hain?

TypeScript mein tum files ko folders mein organize karte ho aur `index.ts` barrel files use karte ho. Java mein **package** woh folder hierarchy hai, but with a twist — yeh sirf organization nahi hai, yeh **namespace** bhi hai aur **access control** ka part bhi hai.

Ek real example lo. Zomato ka codebase roughly aisa structure rakhta hoga:

```
com.zomato.orders       — order management
com.zomato.payments     — payment processing
com.zomato.restaurants  — restaurant catalog
com.zomato.delivery     — delivery tracking
com.zomato.users        — user profiles
```

Yeh `com.zomato` prefix isliye hai kyunki convention hai ki tum apni company ka **reverse domain name** use karo. `zomato.com` ka reverse hua `com.zomato`. Isse globally unique package names milte hain — agar `com.google.utils` aur `com.zomato.utils` dono hain, toh Java confuse nahi hoga.

---

## Package Declaration — Basic Syntax

Har Java file ka **pehla statement** (comments ke baad) package declaration hona chahiye:

```java
// File: src/main/java/com/example/shop/Order.java
package com.example.shop;  // yeh line MANDATORY hai agar tum kisi package mein ho

public class Order {
    private String orderId;
    private String customerId;
    private double totalAmount;

    // constructor
    public Order(String orderId, String customerId, double totalAmount) {
        this.orderId = orderId;
        this.customerId = customerId;
        this.totalAmount = totalAmount;
    }

    // getters
    public String getOrderId()      { return orderId; }
    public String getCustomerId()   { return customerId; }
    public double getTotalAmount()  { return totalAmount; }
}
```

> [!warning] IRON RULE — Package naam aur folder structure SAME honi chahiye
> Agar file mein likha hai `package com.example.shop;`, toh woh file **zaroor** `src/main/java/com/example/shop/` folder mein honi chahiye. Agar match nahi kiya, compilation fail hogi. Build tools (Maven, Gradle) yeh cheez bohot strictly enforce karte hain.

---

## Imports — Doosre Packages ki Classes Use Karna

TypeScript mein likhte ho:
```typescript
import { Product } from './models/product';
import { UserService } from '../services/UserService';
```

Java mein relative paths ka concept hi nahi hai. Yahan likhte ho:
```java
import com.example.shop.model.Product;      // ek specific class
import com.example.shop.service.UserService; // doosri class

// wildcards bhi chal te hain (but avoid karo production mein)
import java.util.*;   // java.util ke saare classes import ho jaate hain
```

### Static Imports — Utility Methods ke Liye

Kabhi kabhi tum baar baar ek class ka naam likhna avoid karna chahte ho. Static imports iske liye hai:

```java
package com.example.app;

import java.util.List;
import java.util.Collections;
import static java.util.Collections.emptyList;   // sirf yeh method import karo
import static java.util.Collections.unmodifiableList; // ya yeh

public class App {
    // static import ki wajah se Collections.emptyList() likhne ki zarurat nahi
    List<String> noItems = emptyList();

    // bina static import ke yahan likhna padta:
    // List<String> noItems = Collections.emptyList();
}
```

### Kya Import Karna Zaruri NAHI hai?

Kuch cheezein automatically available hoti hain — tum kuch bhi import kiye bina use kar sakte ho:

1. **Same package ki classes** — agar `Order.java` aur `OrderItem.java` dono `com.example.shop` mein hain, toh `Order` ko `OrderItem` import karne ki zarurat nahi.

2. **`java.lang.*`** — yeh package automatically import hota hai. Isliye `String`, `Integer`, `Math`, `System`, `Thread`, `StringBuilder` — inhe tum bina import ke use karte ho.

```java
package com.example;

// yeh sab bina import ke kaam karte hain:
public class Demo {
    String name = "Siddesh";          // java.lang.String — auto-imported
    Integer count = 42;               // java.lang.Integer — auto-imported
    System.out.println("Hello");      // java.lang.System — auto-imported
}
```

> [!tip] IDE pe rely karo imports ke liye
> IntelliJ IDEA ya VS Code mein Java extension hai — woh automatically imports add aur remove karte hain. Tum manually imports yaad karne ki koshish mat karo. `Alt+Enter` (IntelliJ) ya `Ctrl+.` (VS Code) dabao, IDE sab handle kar leta hai.

---

## Visibility aur Access Control — Package ka Role

TypeScript mein tumhare paas `export` aur non-export (module-private) hota hai. Java thoda zyada granular hai.

| Modifier | Class ke andar | Same Package | Subclass (doosra package) | Bahar |
|---|---|---|---|---|
| `public` | Yes | Yes | Yes | Yes |
| `protected` | Yes | Yes | Yes | No |
| *(kuch nahi — package-private)* | Yes | Yes | No | No |
| `private` | Yes | No | No | No |

**Package-private** sabse important concept hai yahan. Agar kisi class ya method pe koi modifier nahi likha, toh woh **sirf usi package mein accessible** hai. Yeh bohot powerful encapsulation tool hai.

```java
// File: com/example/payment/PaymentProcessor.java
package com.example.payment;

// public nahi hai — sirf payment package ke andar use hoga
class PaymentValidator {
    // yeh class "implementation detail" hai
    // bahar ki duniya ko pata bhi nahi chalega yeh exist karti hai
    boolean isValidUpiId(String upiId) {
        return upiId != null && upiId.contains("@");
    }
}

// Yeh public hai — bahar se use kar sakte hain
public class PaymentProcessor {
    // internal use ke liye validator — package-private class
    private final PaymentValidator validator = new PaymentValidator();

    public boolean processUpiPayment(String upiId, double amount) {
        if (!validator.isValidUpiId(upiId)) {
            throw new IllegalArgumentException("Invalid UPI ID: " + upiId);
        }
        // ... payment logic
        return true;
    }
}
```

Is example mein `PaymentValidator` ko bahar ka koi code directly access nahi kar sakta — yeh Java ka built-in encapsulation hai, TypeScript ke `private` naming conventions (`_privateMethod`) se zyada strong.

---

## Standard Project Layout — Maven/Gradle Structure

Jab tum Spring Initializr (`start.spring.io`) se project banate ho, yeh folder structure milti hai:

```
my-app/
├── pom.xml                        ← Maven build file (package.json ka equivalent)
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/app/
│   │   │       ├── MyAppApplication.java    ← main class (Spring Boot entry point)
│   │   │       ├── controller/
│   │   │       │   └── OrderController.java ← REST endpoints
│   │   │       ├── service/
│   │   │       │   └── OrderService.java    ← business logic
│   │   │       ├── repository/
│   │   │       │   └── OrderRepository.java ← database access
│   │   │       └── model/
│   │   │           └── Order.java           ← data classes
│   │   └── resources/
│   │       ├── application.yml              ← config (Node ka .env ka equivalent)
│   │       └── static/                      ← static files (optional)
│   └── test/
│       └── java/
│           └── com/example/app/
│               └── service/
│                   └── OrderServiceTest.java ← tests
└── target/                        ← compiled output (gitignore kar do isko)
```

> [!info] Node.js se comparison
> `src/main/java/` wahi hai jo TypeScript mein `src/` hota hai. `src/main/resources/` wahi hai jo `config/` ya `.env` files hoti hain. `target/` wahi hai jo `dist/` hota hai — compiled output.

### Recommended Package Structure for Spring Boot

Ek typical Spring Boot app mein packages aisi organize hoti hain:

```
com.zomato.app
├── controller/        ← REST APIs (@RestController)
├── service/           ← Business logic (@Service)
├── repository/        ← Database queries (@Repository)
├── model/ or entity/  ← Data classes (@Entity, records)
├── dto/               ← Data Transfer Objects (request/response shapes)
├── exception/         ← Custom exceptions
├── config/            ← Spring configuration classes
└── util/              ← Utility/helper classes
```

Yeh structure bohot common hai. Jab koi Spring Boot project open karo, yahi pattern dikhega.

---

## Classpath — Java ka `node_modules`

Node.js mein tumhare dependencies `node_modules/` folder mein hoti hain aur Node automatically wahan dhundta hai. Java mein **classpath** woh list hai jahan JVM classes dhundta hai.

Modern apps mein tumhe manually classpath manage karna nahi padta — Maven/Gradle yeh karte hain. But agar kabhi command line se run karna ho:

```bash
# Purana tarika — manually classpath specify karo
java -cp target/classes:lib/jackson-databind-2.15.0.jar:lib/spring-core-6.0.0.jar \
     com.example.app.Main

# Modern tarika — fat jar (Spring Boot ka default)
# Saari dependencies ek hi JAR file mein bundle ho jaati hain
java -jar app.jar
```

**Fat JAR** ek interesting concept hai — Spring Boot jab `mvn package` ya `./gradlew build` run karo, toh woh ek single `.jar` file banata hai jisme tumhara code bhi hai aur saari dependencies bhi (Spring Framework, Jackson, Hibernate, sab kuch). Ek file, deploy karo, chal jaata hai. Node.js mein tum `node_modules/` folder bhi saath copy karte ho — yahan ek file kaafi hai.

---

## Ek Complete Example — Zomato-Style Shop

Yeh dekho ek mini e-commerce system kaise packages mein organize hota hai:

```java
// File: src/main/java/com/example/shop/model/Product.java
package com.example.shop.model;

// Java 16+ record — TypeScript ke interface jaisa, but immutable aur auto-generated methods ke saath
public record Product(String sku, String name, double price) {
    // compact constructor — validation ke liye
    public Product {
        if (price < 0) throw new IllegalArgumentException("Price negative nahi ho sakta!");
        if (sku == null || sku.isBlank()) throw new IllegalArgumentException("SKU required hai");
    }
}
```

```java
// File: src/main/java/com/example/shop/service/Catalog.java
package com.example.shop.service;

import com.example.shop.model.Product;  // doosre package se import
import java.util.*;

public class Catalog {
    // internal storage — private, bahar nahi dikhta
    private final Map<String, Product> store = new HashMap<>();

    public void add(Product p) {
        store.put(p.sku(), p);  // record ka getter: p.sku() — not p.getSku()
    }

    // Optional return karta hai — NullPointerException se bachne ke liye
    public Optional<Product> find(String sku) {
        return Optional.ofNullable(store.get(sku));
    }

    public Collection<Product> all() {
        // unmodifiable return karo — caller accidentally modify na kar sake
        return Collections.unmodifiableCollection(store.values());
    }
}
```

```java
// File: src/main/java/com/example/shop/Main.java
package com.example.shop;

// dono import karne pad rahe hain — different packages hain
import com.example.shop.model.Product;
import com.example.shop.service.Catalog;

public class Main {
    public static void main(String[] args) {
        var catalog = new Catalog();  // var = TypeScript ka let/const, type infer hoti hai

        // Products add karo
        catalog.add(new Product("BIRYANI-01", "Chicken Biryani", 299.00));
        catalog.add(new Product("COKE-02",    "Coca Cola 500ml",  60.00));
        catalog.add(new Product("BREAD-03",   "Brown Bread",      45.00));

        // Find karo — Optional handle karo
        catalog.find("BIRYANI-01")
               .ifPresent(p -> System.out.println("Mila: " + p.name() + " ₹" + p.price()));

        // Missing item — koi crash nahi, graceful handling
        catalog.find("PIZZA-99")
               .ifPresentOrElse(
                   p -> System.out.println("Mila: " + p),
                   () -> System.out.println("Item nahi mila catalog mein")
               );

        // Saare products print karo
        System.out.println("\n--- Catalog ---");
        catalog.all().forEach(p ->
            System.out.printf("%-15s %-25s ₹%.2f%n", p.sku(), p.name(), p.price())
        );
    }
}
```

---

## Modules (JPMS) — Java 9+ ka Feature

Packages ke upar ek aur layer hai — **Java Platform Module System (JPMS)**. Yeh Java 9 mein aaya tha. `module-info.java` naam ki ek special file hoti hai:

```java
// File: src/main/java/module-info.java
module com.example.shop {
    // kaun si external modules chahiye
    requires java.sql;
    requires com.fasterxml.jackson.databind; // Jackson JSON library

    // kaun se packages bahar dikhenge
    exports com.example.shop;           // Main class wala package
    exports com.example.shop.model;     // Product, Order — public API

    // com.example.shop.service — export NAHI kiya
    // matlab koi bahar se Catalog class directly use nahi kar sakta
    // even if Catalog is 'public'!
}
```

### JPMS ke Fayde

1. **Strong Encapsulation** — Bina `exports` ke, `public` class bhi bahar se access nahi hoti. Package-private se bhi zyada strict.

2. **Reliable Configuration** — Agar koi required module missing hai, toh app **startup pe fail** hogi, runtime pe nahi. Production mein `ClassNotFoundException` kabhi nahi aayegi.

3. **`jlink` tool** — Sirf woh modules include karo jo chahiye. 500MB JRE ki jagah 30MB custom JRE bana sakte ho.

> [!warning] Reality Check — Spring Boot apps mein JPMS use nahi karte
> Yeh padh ke mat sochna ki tum Spring Boot app mein `module-info.java` banana zaroori hai. **Most Spring Boot apps classpath use karte hain, JPMS nahi.** JPMS mainly JDK internals aur kuch libraries ke liye hai. Jab tak koi specific reason na ho, ignore karo.

---

## TypeScript se Java — Side-by-Side Comparison

| TypeScript / Node.js | Java | Notes |
|---|---|---|
| `import { Foo } from './foo'` | `import com.acme.Foo;` | Java mein relative paths nahi |
| `import * as utils from './utils'` | `import com.acme.utils.*;` | Wildcard import — avoid karo |
| Files are modules | Files contain classes | Java file = one public class |
| `export class Foo {}` | `public class Foo {}` | `public` = exported |
| `export default Foo` | Koi equivalent nahi | Java mein default export nahi |
| `package.json` `exports` field | `module-info.java` `exports` | JPMS — rarely used |
| `node_modules/` | classpath / `.jar` files | Maven/Gradle handle karta hai |
| `tsconfig.json` `paths` | Nahi hota | Package = directory always |
| `index.ts` barrel files | Koi equivalent nahi | Har class directly import karo |
| Auto-import in IDE | Same — IDE sab karta hai | IntelliJ, VS Code dono mein hai |
| `interface` | `interface` | Similar concept |
| `type` aliases | Nahi — use classes/records | TypeScript-specific feature |

---

## Common Gotchas — Beginners Jo Galtiyan Karte Hain

> [!warning] Gotcha #1 — Package declaration aur folder mismatch
> ```java
> // File location: src/main/java/com/zomato/payment/PaymentService.java
> package com.zomato.order;  // GALAT! Folder 'payment' hai, package 'order' likha
> ```
> Yeh compile nahi hoga. Build tool turant scream karega. Package naam aur path EXACT match hona chahiye.

> [!warning] Gotcha #2 — Wildcard import se class name collision
> ```java
> import java.util.*;   // java.util.Date bhi include hai
> import java.sql.*;    // java.sql.Date bhi include hai
>
> // Ab yeh line likhoge toh compiler confuse ho jaayega
> Date d = new Date();  // KAUN SA Date? Compilation error!
> ```
> Solution: Specific imports use karo — `import java.util.Date;` ya `import java.sql.Date;` — dono same time pe nahi.

> [!warning] Gotcha #3 — Java mein top-level functions nahi hote
> TypeScript mein likh sakte ho:
> ```typescript
> // utils.ts
> export function formatPrice(amount: number): string {
>     return `₹${amount.toFixed(2)}`;
> }
> ```
> Java mein **sab kuch class ke andar** hota hai. Utility functions ke liye pattern hai:
> ```java
> // PriceUtils.java
> public final class PriceUtils {
>     private PriceUtils() {}  // instantiation rok do — private constructor
>
>     public static String formatPrice(double amount) {
>         return String.format("₹%.2f", amount);
>     }
>
>     public static boolean isValidAmount(double amount) {
>         return amount > 0 && amount <= 100000; // max 1 lakh
>     }
> }
>
> // Use karo:
> String price = PriceUtils.formatPrice(299.0);  // "₹299.00"
> ```

> [!warning] Gotcha #4 — `internal` packages convention
> Agar tum ek library ship kar rahe ho (apni team ke liye bhi), toh implementation detail packages ko `internal` naam do:
> ```
> com.zomato.payments.api          ← public API — dusre use karte hain
> com.zomato.payments.internal     ← internal implementation — hands off!
> ```
> JPMS ke bina koi technical barrier nahi hai, but yeh convention hai aur IDE warnings deta hai. Agar tum `internal` package ki class import karo, toh IntelliJ warning dikhayega.

> [!warning] Gotcha #5 — Default package mein class banana
> Kuch tutorials dikhate hain bina package declaration ke class banana:
> ```java
> // GALAT — koi package nahi!
> public class HelloWorld {
>     public static void main(String[] args) {
>         System.out.println("Hello");
>     }
> }
> ```
> Yeh chal ta hai simple programs ke liye, but **Spring Boot projects mein kabhi mat karo**. Spring Boot ka component scanning default package ke classes pick nahi karta. Hamesha proper package likho.

> [!tip] Spring Boot mein package scanning
> Spring Boot automatically usi package aur uske sub-packages scan karta hai jahan tumhari main class hai. Agar `MyAppApplication.java` hai `com.example.app` mein, toh Spring `com.example.app.controller`, `com.example.app.service`, etc. sab scan karega. Isliye **main class ko root package mein rakho**, sub-packages mein nahi.

---

## JPMS ke Saath Complete Module Example

Agar kabhi JPMS use karna ho (library banate waqt ya advanced apps mein), toh yeh complete example hai:

```java
// File: src/main/java/module-info.java
module com.example.shop {
    // Standard library modules
    requires java.base;      // automatically included, but explicitly likhna helpful hai
    requires java.sql;       // JDBC ke liye

    // Third-party library modules
    requires com.fasterxml.jackson.databind; // JSON processing

    // Kaun se packages bahar dikhein
    exports com.example.shop;               // Main entry point
    exports com.example.shop.model;         // Data classes — public API
    // com.example.shop.service — export nahi kiya, internal hai

    // Agar koi doosra module reflection use kare (Spring/Hibernate ke liye zaroori)
    opens com.example.shop.model to com.fasterxml.jackson.databind;
}
```

Yahan `opens` keyword important hai Spring ke liye — Spring internally reflection use karta hai (`@Autowired`, `@Value` inject karne ke liye), aur JPMS by default reflection rok deta hai. Isliye Spring Boot apps ko ya JPMS se door rehna chahiye, ya `opens` carefully configure karna chahiye.

---

## Build Tool se Package Management — Ek Nazar

`pom.xml` (Maven) ya `build.gradle` (Gradle) mein dependencies add karte ho:

```xml
<!-- pom.xml mein — npm install jaisa -->
<dependencies>
    <!-- Spring Boot Web — Express jaisa, REST APIs ke liye -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Jackson — JSON parse/serialize karne ke liye -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
</dependencies>
```

Yeh dependencies `~/.m2/repository/` folder mein download hoti hain (Node ka `~/.npm/` cache jaisa), aur build tool automatically classpath mein add kar deta hai. Tumhe kuch nahi karna.

---

## Key Takeaways

- **Package = namespace + folder structure** — dono ek dusre se exactly match karne chahiye. Mismatch = compilation error.

- **Import syntax always fully qualified** — `import com.example.shop.Order;` — koi relative paths nahi. IDE auto-import karta hai, tum manually yaad mat karo.

- **Same package classes auto-available** — ek hi package mein hain toh import ki zarurat nahi.

- **`java.lang.*` auto-imported** — `String`, `Integer`, `System`, `Math` seedha use karo.

- **Package-private visibility** — koi modifier nahi = sirf same package mein accessible. Encapsulation ka powerful tool.

- **Standard structure: `controller/service/repository/model/dto`** — yeh Spring Boot ka de-facto standard hai. Follow karo.

- **Classpath = node_modules** — Maven/Gradle handle karta hai. Fat JAR = sab kuch ek file mein.

- **JPMS (modules) Spring Boot apps mein nahi use karte** — sirf libraries aur JDK ke liye relevant hai. Abhi ke liye ignore karo.

- **Main class root package mein rakho** — Spring Boot ka component scanning isi pe depend karta hai.

- **Wildcard imports avoid karo production mein** — collision risk aur readability dono issues hain.
