# Java & Spring Boot

Ek complete guide Java aur Spring Boot ki, backend developers ke liye — language, framework, microservices, security, testing, aur production deployment sab cover hoga. Ye notes ek experienced backend developer (jo Node.js/TypeScript/Express se aata hai) ke perspective se likhe gaye hain — matlab har concept ko kisi na kisi cheez se map karke samjhaya gaya hai jo tumhe pehle se pata hai.

> [!info]
> Socho ye aisa hai jaise tumne Zomato ka backend Node mein banaya hai, aur ab wahi cheez Java/Spring mein banani hai. Naam alag honge, syntax alag hoga — lekin problem wahi hai, solution ka pattern wahi hai. Bas "IoC Container" ko "DI system jaisa NestJS mein hota hai" samajh lo, aadha dar khatam.

## Table of Contents

### Part 1: Getting Started
- [Start Here & Overview](./00-Start-Here/00-README.md)
- [Learning Path (8-Week Plan)](./00-Start-Here/01-Learning-Path.md)
- [FAQ for Express/TS Developers](./00-Start-Here/06-FAQ-for-Express-Devs.md)
- [Glossary](./00-Start-Here/05-Glossary.md)

### Part 2: Java Language
- [Java Fundamentals](./01-Java-Fundamentals/01-JVM-JDK-JRE.md)
- [Java vs TypeScript (Side-by-Side)](./02-Java-vs-TypeScript/01-Mental-Model-Map.md)
- [Build Tools: Maven & Gradle](./03-Build-Tools/01-Maven-Basics.md)

### Part 3: Spring Framework
- [Spring Core: IoC & Dependency Injection](./04-Spring-Core/01-IoC-DI-Concepts.md)
- [Spring Boot: Auto-config & Starters](./05-Spring-Boot/01-What-is-Spring-Boot.md)
- [Web & REST: Controllers, Validation, Error Handling](./06-Web-REST/01-RestController-Basics.md)
- [Data & JPA: Entities, Repositories, Transactions](./07-Data-JPA/README.md)

### Part 4: Security & Testing
- [Spring Security: JWT, OAuth2, RBAC](./08-Security/README.md)
- [Testing: JUnit, Mockito, Testcontainers](./09-Testing/01-Testing-Pyramid-and-Tools.md)

### Part 5: Microservices & Production
- [Microservices: Eureka, Gateway, Feign](./10-Microservices/01-What-is-a-Microservice.md)
- [Messaging: Kafka & RabbitMQ](./11-Messaging/01-Messaging-Concepts.md)
- [Observability: Actuator, Metrics, Tracing](./12-Observability/01-Spring-Boot-Actuator.md)
- [Deployment: Docker, Kubernetes, CI/CD](./13-Deployment/01-Packaging-Fat-JAR.md)

### Part 6: Ecosystem & Advanced
- [Ecosystem: Lombok, MapStruct, Jackson](./14-Ecosystem/01-Library-Cheatsheet.md)
- [Spring Modulith](./15-Spring-Modulith/01-Modulith-Concepts.md)
- [Spring GraphQL](./16-Spring-GraphQL/01-GraphQL-Concepts.md)

## Learning Path

Kaise padhna hai iska ek roadmap chahiye? Neeche 3 tracks diye hain — apni level ke hisaab se pick karo.

### Beginner Track (Week 1-2)
Agar Java bilkul naya hai tumhare liye, yahan se shuru karo:
1. [JVM, JDK, JRE](./01-Java-Fundamentals/01-JVM-JDK-JRE.md)
2. [Syntax Basics](./01-Java-Fundamentals/02-Syntax-Basics.md)
3. [OOP: Classes & Objects](./01-Java-Fundamentals/03-OOP-Classes-Objects.md)
4. [Java vs TypeScript Mental Model](./02-Java-vs-TypeScript/01-Mental-Model-Map.md)
5. [Maven Basics](./03-Build-Tools/01-Maven-Basics.md)
6. [What is Spring Boot](./05-Spring-Boot/01-What-is-Spring-Boot.md)

### Intermediate Track (Week 3-5)
Ab apna pehla production-ready API banate hain:
1. [IoC & Dependency Injection](./04-Spring-Core/01-IoC-DI-Concepts.md)
2. [REST Controllers](./06-Web-REST/01-RestController-Basics.md)
3. [Validation & Error Handling](./06-Web-REST/05-Validation.md)
4. [Spring Data JPA](./07-Data-JPA/README.md)
5. [Spring Security + JWT](./08-Security/README.md)
6. [Testing with JUnit & Mockito](./09-Testing/01-Testing-Pyramid-and-Tools.md)

### Advanced Track (Week 6-8)
Ab production aur distributed systems ki taraf badhte hain:
1. [Microservices with Spring Cloud](./10-Microservices/01-What-is-a-Microservice.md)
2. [Kafka & RabbitMQ](./11-Messaging/01-Messaging-Concepts.md)
3. [Observability & Actuator](./12-Observability/01-Spring-Boot-Actuator.md)
4. [Docker & Kubernetes](./13-Deployment/02-Docker-for-Spring-Boot.md)
5. [Spring Modulith](./15-Spring-Modulith/01-Modulith-Concepts.md)

## Kya Seekhoge Is Guide Mein?

- Java language: types, generics, streams, lambdas, concurrency, aur modern Java features (records, sealed classes)
- Spring ka IoC container aur dependency injection kaise kaam karta hai (aur ye kyun NestJS jaisa lagega tumhe)
- REST APIs banana — validation, error handling, content negotiation ke saath
- JPA/Hibernate: entities, repositories, relationships, N+1 problem, transactions — Sequelize/Prisma se comparison ke saath
- Spring Security: filter chain, JWT auth, OAuth2, RBAC, ABAC — Express ke `passport.js`/middleware wale mental model se
- Testing: unit tests, slice tests (`@WebMvcTest`, `@DataJpaTest`), aur Testcontainers se real DB pe tests
- Microservices: Eureka service discovery, Spring Cloud Gateway, OpenFeign, Resilience4j
- Messaging: Kafka producers/consumers, RabbitMQ, dead letter queues, idempotency
- Observability: Micrometer metrics, distributed tracing, health checks
- Deployment: Fat JAR, Docker, Kubernetes, GraalVM native image, CI/CD

## Prerequisites — Ye Pata Hona Chahiye

- REST APIs aur HTTP ke saath comfortable ho (jaise tum already ho)
- Kisi bhi backend framework ka experience (Express, FastAPI, NestJS, waghera)
- Basic SQL aur database ka knowledge
- Docker se thodi familiarity — baad ke sections mein kaam aayegi

## Is Guide Ko Kaise Use Karein?

1. **FAQ se shuru karo** — [FAQ for Express Devs](./00-Start-Here/06-FAQ-for-Express-Devs.md) tumhare pehle 20 "Spring mein X kahan hai?" wale sawaalon ka jawab 10 minute mein de dega
2. **8-week plan follow karo** — [Learning Path](./00-Start-Here/01-Learning-Path.md) mein structured week-by-week schedule mil jayega
3. **Concepts ko apne knowledge se map karo** — har note mein "For the Express/TS dev" wala section hai jo equivalent dikhata hai
4. **Java Fundamentals skip mat karna** — Java ka type system aur generics foundation hai, isko pakka karo pehle
5. **Seekhte-seekhte build bhi karo** — ye notes tab sabse zyada kaam karte hain jab saath mein ek real Spring Boot project bhi bana rahe ho

> [!tip]
> Agar tumhe lagta hai "yaar itna Java syntax yaad kaise rakhu", chill maaro. Zyada tar cheezein tumhare Express/TS knowledge ka hi ek "verbose" version hain. `@Controller` = `router.get()`, `@Autowired` = `constructor(private service: Service)`, `@Transactional` = manually likha hua `BEGIN...COMMIT`. Bas naam alag hai, concept wahi purana dost hai.

---

Shuru karo [FAQ for Express/TS Developers](./00-Start-Here/06-FAQ-for-Express-Devs.md) se — 5 minute mein sab kuch reframe ho jayega tumhare dimaag mein. ☕
