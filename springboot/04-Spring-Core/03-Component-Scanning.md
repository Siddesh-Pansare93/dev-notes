# Component Scanning aur Stereotypes

Socho Zomato ka kitchen management system hai. Hazaron restaurants hain, hazaron dishes hain. Kya Zomato manually har ek restaurant ko apne system mein register karta hai? Nahi na — unka system automatically scan karta hai ki kaun-kaun registered hai, unki categories kya hain (veg/non-veg, North Indian/Chinese), aur phir accordingly routing karta hai.

Yahi kaam **Component Scanning** karta hai Spring Boot mein. Tu manually har class ko Spring ke ApplicationContext mein "yaar, is class ko bhi register kar lo" bolne ki zarurat nahi padti. Spring khud chalta hai, tera codebase scan karta hai, jahan bhi `@Component`, `@Service`, `@Repository`, ya `@Controller` dikh jaaye — boom — us class ka bean bana diya. Automatic. Zero manual wiring.

Node.js se aaya hai tu, toh yaad kar — Express mein har cheez manually `require` karni padti thi, phir manually DI container mein inject karna padta tha (ya NestJS mein `imports` array mein dalna padta tha module ka). Spring Boot mein yeh sab **convention over configuration** ke principle pe automatically hota hai.

---

## Problem Jo Component Scanning Solve Karta Hai

Node.js/Express mein agar tu NestJS use karta hai, toh kuch aisa karta tha:

```typescript
// NestJS mein manually module mein declare karna padta tha
@Module({
  providers: [UserService, UserRepository, EmailService],  // har ek manually
  controllers: [UserController],
  imports: [TypeOrmModule.forFeature([User])],
})
export class UserModule {}
```

Agar 50 services hain, toh 50 lines likhni padegi. Koi bhool gaya? Runtime error. Enjoyable nahi hai.

Spring Boot mein yeh problem exist hi nahi karti. Tu sirf class ke upar ek annotation laga — Spring khud dhundh lega.

---

## `@ComponentScan` — Kaam Kaise Karta Hai?

`@ComponentScan` Spring ko bolta hai: "Bhai, is package mein ja, aur jo bhi class `@Component` ya uske derived annotations (`@Service`, `@Repository`, `@Controller`) se annotated ho — unka bean bana de."

```java
@Configuration
@ComponentScan(basePackages = "com.example.app")
public class AppConfig {
    // Bas itna hi — Spring baaki sab khud handle karega
}
```

Spring startup pe yeh kaam karta hai:

1. `basePackages` mein diye gaye package aur uske saare sub-packages scan karta hai
2. Har `.class` file mein dekh ta hai — koi annotation hai kya?
3. `@Component` ya uska koi derived annotation mila? Bean definition create karo
4. Bean definition ko ApplicationContext mein register karo
5. Jahan inject karna hai (constructor, field, setter) — wahan autowire karo

> [!info] Node.js wale ke liye comparison
> Yeh roughly Next.js ke file-based routing jaisa hai — convention over configuration. Ek khaas folder mein file rakho, aur automatically route ban jaata hai. Yahan khaas annotation lagao, bean automatically ban jaata hai. Tu manually kuch wire nahi karta.

---

## `@SpringBootApplication` — Implicit Scanning

Practically, tu rarely `@ComponentScan` khud likhega. Kyun? Kyunki `@SpringBootApplication` ke andar pehle se hi packed hai.

```java
// Yeh teen annotations ka shortcut hai:
// @Configuration — yeh class khud ek config class hai
// @EnableAutoConfiguration — Spring Boot ki magic (auto-config)
// @ComponentScan — main class ke package aur sub-packages scan karo

@SpringBootApplication       // Teen annotations ek mein
public class ZomatoApp {
    public static void main(String[] args) {
        SpringApplication.run(ZomatoApp.class, args);
    }
}
```

**Rule of thumb**: `@SpringBootApplication` jis package mein hai (say `com.zomato`), Spring wahan se neeche ke **saare sub-packages** scan karega:
- `com.zomato.user` ✅
- `com.zomato.order` ✅
- `com.zomato.restaurant` ✅
- `com.zomato.payment` ✅

Lekin agar koi class `com.zomato` ke **bahar** hai — jaise `com.thirdparty.something` — woh scan nahi hoga.

> [!warning] Sabse common beginner mistake
> Main class `com.zomato.app.ZomatoApp` mein hai, aur tune ek service `com.zomato.ZomatoHelperService` mein rakhi. Lagta hai yeh bhi scan hoga, right? **WRONG.** `com.zomato` parent package hai `com.zomato.app` ka — Spring neeche jaata hai, upar nahi. Is case mein `ZomatoHelperService` scan nahi hogi aur `NoSuchBeanDefinitionException` milega. Fix: main class ko topmost package mein rakho, ya `basePackages` explicitly specify karo.

---

## Stereotype Annotations — Ek Family Hai Bhai

`@Component` ek base annotation hai. Baaki saare uske "variants" hain — functionally same, lekin semantic meaning alag. Jaise Swiggy pe "restaurant", "cloud kitchen", "darkstore" sab food deliver karte hain, lekin type different hoti hai.

| Annotation | Kahan Lagaao | Extra Kaam |
|---|---|---|
| `@Component` | Kisi bhi generic bean pe | Kuch nahi — sirf bean ban jaata hai |
| `@Service` | Business logic wali classes pe | Kuch nahi — semantic intent hi hai |
| `@Repository` | Database access layer (DAO/JPA) pe | Persistence exceptions ko Spring ke `DataAccessException` mein translate karta hai |
| `@Controller` | Web MVC controllers pe | `@RequestMapping` handlers ke liye scan hota hai |
| `@RestController` | REST API controllers pe | `@Controller` + `@ResponseBody` dono ek saath |
| `@Configuration` | Bean definition classes pe | `@Bean` methods proxy hote hain (singleton guarantee) |

> [!tip] Most specific annotation use karo
> Agar business logic wali class hai — `@Service` lagao, `@Component` nahi. Technically dono same kaam karenge. But `@Service` lagane se team members samajhte hain ki yeh layer kya kar rahi hai. Jaise code mein `const` aur `let` dono kaam kar sakte hain, but `const` lagane se intent clear hota hai.

### `@Repository` Ka Special Superpower

Ek important cheez — `@Repository` sirf semantic nahi hai. Yeh **exception translation** bhi karta hai.

Database layer mein alag-alag exceptions aate hain — Hibernate ki `HibernateException`, JDBC ki `SQLException`, etc. In sab ko agar tu directly propagate kare toh service layer database-specific exceptions ke saath tightly coupled ho jaati hai.

`@Repository` Spring ko bolta hai: "Bhai, is class ke kisi bhi method se agar database-specific exception aaye, use `DataAccessException` (Spring ka own hierarchy) mein wrap kar do." Result? Service layer ko pata bhi nahi chalega ki tune Hibernate use kiya tha ya plain JDBC.

```java
@Repository
public class OrderRepository {
    // Agar yahaan koi Hibernate exception aaye,
    // Spring automatically use DataAccessException mein convert karega
    public Order findById(Long id) {
        // database operation
    }
}
```

---

## Complete Working Example — Zomato Style

Chalte hain ek poora example dekhte hain. Imagine karo Zomato ka order management system:

```java
// --- Main App Class ---
// com.zomato package mein hai, toh com.zomato.** sab scan hoga

package com.zomato;

@SpringBootApplication   // @ComponentScan bhi implicit hai iske andar
public class ZomatoApp {
    public static void main(String[] args) {
        SpringApplication.run(ZomatoApp.class, args);
    }
}
```

```java
// --- Repository Layer — Database se directly baat karta hai ---
// Sirf @Repository lagaya, Spring ne bean bana diya. Manual registration zero.

package com.zomato.order;

import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository   // 1. Bean ban gaya, 2. Exception translation milti hai
public class OrderRepository {

    // Real world mein yahaan JPA ya JDBC code hoga
    public Optional<Order> findById(Long orderId) {
        // Database se order fetch karo
        return Optional.empty(); // placeholder
    }

    public Order save(Order order) {
        // Database mein save karo
        return order;
    }
}
```

```java
// --- Service Layer — Business logic yahaan hoti hai ---
// @Service lagaya, Spring ne bean banaya aur OrderRepository inject kar diya

package com.zomato.order;

import org.springframework.stereotype.Service;

@Service   // Business logic layer — semantic clarity ke liye
public class OrderService {

    private final OrderRepository orderRepository;

    // Constructor injection — Spring khud OrderRepository ka bean inject karega
    // Koi @Autowired ki zarurat nahi (single constructor pe)
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Order getOrder(Long orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order " + orderId + " nahi mila!"));
    }

    public Order placeOrder(Order order) {
        // Business rules validate karo
        if (order.getItems().isEmpty()) {
            throw new IllegalArgumentException("Bhai, cart khali hai!");
        }
        return orderRepository.save(order);
    }
}
```

```java
// --- Controller Layer — HTTP requests handle karta hai ---
// @RestController = @Controller + @ResponseBody dono ek mein

package com.zomato.order;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")   // Base URL
public class OrderController {

    private final OrderService orderService;

    // Spring OrderService inject karega automatically
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/{id}")
    public Order getOrder(@PathVariable Long id) {
        return orderService.getOrder(id);
    }

    @PostMapping
    public Order placeOrder(@RequestBody Order order) {
        return orderService.placeOrder(order);
    }
}
```

**Kya hua yahan?**
- Teeno classes `com.zomato.order` package mein hain
- `ZomatoApp` `com.zomato` mein hai — toh `com.zomato.**` sab scan hoga
- Teeno beans ban gaye, Spring ne automatically inject kar diya
- Tu ne kahi bhi manually `new OrderRepository()` ya `new OrderService()` nahi kiya
- Node.js ke `require` ki zarurat nahi, NestJS ke `providers` array ki zarurat nahi

---

## Custom Scan Paths — Jab Default Kaafi Na Ho

Maan lo tere paas ek shared library hai jo ek alag package mein hai — `com.shared.utils`. Default scanning `com.zomato` se start hoti hai, toh `com.shared` scan nahi hoga.

```java
@SpringBootApplication
@ComponentScan(basePackages = {
    "com.zomato",        // main app
    "com.shared.utils"   // shared library ka package
})
public class ZomatoApp { }
```

Ek safer tarika — class reference use karo (typo se bacho):

```java
@ComponentScan(basePackageClasses = {
    ZomatoApp.class,          // com.zomato package
    SharedUtilsMarker.class   // com.shared.utils package (ek marker class)
})
```

---

## Filtering — Selective Scanning

Kabhi kabhi chahiye ki sirf kuch specific classes scan ho, ya kuch classes exclude ho jaayein:

```java
@ComponentScan(
    basePackages = "com.zomato",

    // Sirf woh classes include karo jinke naam "Bot" pe khatam hote hain
    includeFilters = @ComponentScan.Filter(
        type = FilterType.REGEX,
        pattern = ".*Bot"
    ),

    // @Deprecated annotation wali classes exclude karo
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ANNOTATION,
        classes = Deprecated.class
    )
)
```

`FilterType` ke options:
- `ANNOTATION` — specific annotation wali classes
- `ASSIGNABLE_TYPE` — specific class/interface ko implement/extend karne wali
- `REGEX` — class name regex se match karne wali
- `ASPECTJ` — AspectJ expression (advanced use case)
- `CUSTOM` — apna khud ka `TypeFilter` implement karo

---

## Custom Stereotype Annotations — Apna Khud Ka Banana

Ye ek advanced lekin bahut useful feature hai. Tu apna khud ka stereotype annotation bana sakta hai jo `@Service` ya `@Repository` se derived ho:

```java
// Ek custom annotation banaya "DomainService" ke liye
// Yeh @Service ka hi alias hai, lekin team ko clearly pata chalega
// ki yeh specifically "domain service" hai (DDD pattern)

@Target(ElementType.TYPE)         // Sirf classes pe lagega
@Retention(RetentionPolicy.RUNTIME) // Runtime pe bhi available rahega
@Service                           // Is annotation ke saath @Service bhi aata hai
public @interface DomainService {
    // Optional: extra attributes add kar sakte ho
    String description() default "";
}
```

```java
// Ab use karo — Spring ise automatically @Service ki tarah treat karega
@DomainService(description = "Handles pricing and discount logic")
public class PricingEngine {
    
    public double calculateFinalPrice(Order order) {
        // Zomato-style discount logic
        double basePrice = order.getItems().stream()
            .mapToDouble(Item::getPrice)
            .sum();
        
        // Peak hours mein surge pricing
        if (isPeakHour()) {
            return basePrice * 1.2;
        }
        
        return basePrice;
    }
}
```

`PricingEngine` automatically scan hoga aur bean banega — kyunki `@DomainService` ke andar `@Service` hai, aur `@Service` ke andar `@Component` hai. Spring meta-annotations ko recursively check karta hai.

---

## Debugging — Kaise Pata Chalega Ki Kya Scan Hua?

```java
// ApplicationContext mein ek debug bean add karo temporarily
// Startup pe saare registered beans print ho jaayenge

@Bean
CommandLineRunner debugBeans(ApplicationContext ctx) {
    return args -> {
        System.out.println("\n=== Registered Beans ===");
        Arrays.stream(ctx.getBeanDefinitionNames())
              .sorted()
              .forEach(System.out::println);
        System.out.println("========================\n");
    };
}
```

Ya `application.properties` mein logging enable karo:

```properties
# Scan ki detailed log chahiye?
logging.level.org.springframework.context.annotation=DEBUG
```

Console pe kuch aisa dikhega:
```
DEBUG o.s.c.a.ClassPathBeanDefinitionScanner - Identified candidate component class: ...OrderRepository.class
DEBUG o.s.c.a.ClassPathBeanDefinitionScanner - Identified candidate component class: ...OrderService.class
```

---

## Gotchas — Beginner Mistakes Jo Tujhe Avoid Karni Chahiye

> [!warning] 1. Class Wrong Package Mein Hai
> Main class `com.zomato.app` mein, lekin service `com.zomato` mein — scan nahi hogi.
> **Fix**: Main class ko root package (`com.zomato`) mein rakho, ya `@ComponentScan(basePackages = "com.zomato")` explicitly likho.

> [!warning] 2. Annotation Lagana Bhool Gaya
> Class banayi, inject kiya, lekin `@Service` lagana bhool gaya. Result:
> `NoSuchBeanDefinitionException: No qualifying bean of type 'XYZService' available`
> **Fix**: Annotation check karo. Lagbhag 90% baar yahi hota hai.

> [!warning] 3. `@Component` Interface Pe Lagaaya
> ```java
> @Component          // GALAT — interface pe kaam nahi karega
> public interface PaymentGateway { ... }
> ```
> Spring sirf concrete classes ko instantiate kar sakta hai. Interface pe annotation lagana useless hai.
> **Fix**: Implementation class pe lagao annotation.

> [!warning] 4. Inner Class Pe Lagaaya Lekin `static` Nahi Kiya
> ```java
> public class OuterService {
>     @Service
>     class InnerService { ... }  // GALAT — non-static inner class
> }
>
> public class OuterService {
>     @Service
>     static class InnerService { ... }  // SAHI — static inner class
> }
> ```
> Non-static inner class ka instance outer class ke instance ke bina nahi ban sakta. Spring ke paas outer class ka instance nahi hota, toh instantiation fail hogi.

> [!warning] 5. Test Config Aur Main Config Ka Overlap
> Test mein agar `@SpringBootApplication` wali main config load ho jaaye aur test config bhi ho — same bean twice register ho sakta hai conflict karega.
> **Fix**: Test classes pe `@TestConfiguration` use karo, na ki `@Configuration`. `@TestConfiguration` sirf test context mein participate karta hai.

> [!warning] 6. `@Bean` Method Ko `@Component` Class Mein Directly Call Karna
> ```java
> @Component
> public class MyConfig {
>     @Bean
>     public ServiceA serviceA() { return new ServiceA(); }
>
>     @Bean
>     public ServiceB serviceB() {
>         return new ServiceB(serviceA());  // PROBLEM — yeh method call Spring ke proxy se bypass ho sakti hai
>     }
> }
> ```
> `@Bean` methods CGLIB proxy ke through kaam karte hain sirf `@Configuration` classes mein. `@Component` mein yeh plain method call ban jaati hai — har baar nayi object!
> **Fix**: `@Bean` methods `@Configuration` class mein rakho, `@Component` mein nahi.

---

## Node.js/TypeScript Comparison — For Context

| Concept | Node.js / NestJS | Spring Boot |
|---|---|---|
| Bean registration | `@Injectable()` + `providers: [MyService]` in module | `@Service` — bas itna, manually register nahi karna |
| Controller | `@Controller()` + module ka `controllers: [...]` | `@RestController` — scan automatically karta hai |
| Database class | `@Injectable()` + TypeORM entity | `@Repository` — exception translation bhi milti hai |
| Custom scope | `{ provide: TOKEN, useClass: MyClass }` | `@Bean` method with `@Scope` |
| Module boundary | NestJS Module is explicit | Spring package = implicit boundary |

NestJS mein explicit module system hai — ek feature hai. Spring mein packages implicit boundaries hain. Dono approaches ke tradeoffs hain, lekin Spring ka approach less boilerplate hai chote se medium projects mein.

---

## Key Takeaways

- **Component Scanning** Spring ka automatic bean discovery mechanism hai — tu `@Component` (ya derived annotation) lagata hai, Spring khud bean banata hai
- **`@SpringBootApplication`** mein `@ComponentScan` implicit hai — main class ke package aur saare sub-packages automatically scan hote hain
- **Stereotype annotations** — `@Component`, `@Service`, `@Repository`, `@Controller`, `@RestController` — sab functionally same hain (sirf `@Repository` ka exception translation special hai), lekin semantic clarity ke liye alag-alag use karo
- **Package structure matters** — main class jis package mein ho, sirf uske sub-packages scan hote hain; agar class bahar hai toh `basePackages` explicitly specify karo
- **Custom stereotypes** bana sakta hai — `@Service` pe apna annotation layer karo, Spring meta-annotations recursively handle karta hai
- **Debugging**: `ctx.getBeanDefinitionNames()` ya `logging.level.org.springframework.context.annotation=DEBUG` se confirm karo ki kya scan hua
- **Sabse common mistakes**: wrong package mein class, annotation bhool gaya, interface pe annotation, non-static inner class
