# Recommended Reading

> [!info] Express/TS wale dev ke liye
> Yeh ek curated list hai — sirf names diye hain, official source dhundhne ke liye title search kar lena. Java/Spring ki duniya mein bahut badhiya free official docs available hain, isliye random tutorials ke peeche bhagne se pehle inhe try karo.

## Official documentation (yahan se start karo)

Kyun zaruri hai? Node/Express mein humne kabhi na kabhi MDN ya Express docs khole hi honge — Java/Spring mein bhi yeh docs itne solid hain ki tumhe zyada tutorials ki zarurat nahi padegi.

- **Spring Boot Reference Documentation** — sabse zyada kaam ki cheez, isse pehle padho
- **Spring Framework Reference Documentation** — core IoC, AOP, transactions ke liye
- **Spring Security Reference Documentation**
- **Spring Data JPA Reference Documentation**
- **Java Language Specification (JLS)** — jo log deep-dive karna chahte hain unke liye
- **Java API Documentation (Javadoc)** — JDK ki class library ka reference
- **OpenJDK Project Documentation**

## Books — Java language

Socho ek second — jaise humne Node.js seekhne ke baad "You Don't Know JS" padha tha, waise hi Java ke liye kuch classic books hain jo har senior dev suggest karta hai.

- **Effective Java** by Joshua Bloch — *the* book hai idiomatic Java likhne ke liye. Hafte mein 2-3 items padho, jaldi mat karo.
- **Java Concurrency in Practice** by Brian Goetz et al. — concurrency ki bible
- **Modern Java in Action** by Raoul-Gabriel Urma, Mario Fusco, Alan Mycroft — streams, lambdas, modules
- **The Well-Grounded Java Developer (2nd ed.)** by Benjamin J. Evans, Jason Clark, Martijn Verburg
- **Core Java, Volumes I & II** by Cay Horstmann — comprehensive language reference, encyclopedia jaisi
- **Java Performance: The Definitive Guide** by Scott Oaks

## Books — Spring & Spring Boot

- **Spring in Action** by Craig Walls — Spring Boot ka broad coverage, ek accha starting point
- **Spring Boot in Practice** by Somnath Musib
- **Spring Microservices in Action** by John Carnell
- **Pro Spring Boot 3** by Felipe Gutierrez

## Books — architecture & design

Yeh woh books hain jo language-agnostic hain — Node.js mein bhi kaam aayengi. System design interviews ke liye bhi useful.

- **Domain-Driven Design** by Eric Evans (Blue Book) — thoda heavy hai lekin foundational
- **Implementing Domain-Driven Design** by Vaughn Vernon (Red Book) — Blue Book ka practical version
- **Patterns of Enterprise Application Architecture** by Martin Fowler
- **Building Microservices (2nd ed.)** by Sam Newman
- **Designing Data-Intensive Applications** by Martin Kleppmann — language-agnostic, must-read. Agar Zomato/Swiggy jaisa scale wala system banane ka sapna hai, toh yeh book bible hai.
- **Release It!** by Michael Nygard — production mein cheezein kaise fail hoti hain (timeouts, circuit breakers, bulkheads) uska practical guide

## Books — testing

- **Growing Object-Oriented Software, Guided by Tests** by Steve Freeman, Nat Pryce
- **Unit Testing Principles, Practices, and Patterns** by Vladimir Khorikov
- **xUnit Test Patterns** by Gerard Meszaros

## Books — JVM & performance

Kya hota hai in books mein? JVM ke andar deep jaake dekhte hain — GC kaise kaam karta hai, JIT compiler kya karta hai, waghera. Jab production mein performance issue aaye, tab kaam aayengi.

- **Optimizing Java** by Benjamin J. Evans, James Gough, Chris Newland
- **The Garbage Collection Handbook** by Richard Jones, Antony Hosking, Eliot Moss

## Online courses

- **Spring Academy** (official, free tier) — Broadcom/VMware ka. Spring Certified Professional path bhi hai.
- **Baeldung Learn Spring Series**
- **Java Brains** (YouTube) — Koushik Kothagal ka channel
- **Marco Codes** (YouTube) — modern Spring Boot 3 content, kaafi up-to-date
- **Amigoscode** (YouTube)
- **Dan Vega** (YouTube + Spring Developer Advocate)

## Blogs and reference sites

- **Baeldung** — exhaustive how-tos hain. Isse reference ki tarah use karo, poora tutorial sequence follow karne ki zarurat nahi (Stack Overflow ka Spring version samjho).
- **Spring Blog** (official) — release announcements, deep-dives
- **InfoQ — Java track**
- **Foojay.io** — Java community hub
- **Vlad Mihalcea's blog** — JPA/Hibernate ke expert, deep expertise
- **Thorben Janssen's blog** — JPA/Hibernate
- **Reflectoring.io** — solid Spring Boot articles

## Newsletters & podcasts

Kyun follow karo? Passive learning ke liye — commute mein ya chai peete waqt sun lo, dheere-dheere ecosystem ka pulse pata chalta rehta hai.

- **Java Weekly** by Baeldung
- **Spring Calendar** (official Spring blog updates)
- **Inside Java** (Oracle ka podcast)
- **A Bootiful Podcast** by Josh Long (Spring Developer Advocate)
- **The Java Posse Roundup** (archived hai lekin content abhi bhi gold hai)

## YouTube channels worth subscribing to

- **Spring Developer** (official)
- **Java** (official Oracle)
- **Marco Codes**
- **Dan Vega**
- **Java Brains**
- **Bouali Ali** — full Spring Boot project walkthroughs, end-to-end project banate hue dikhate hain

## Conferences (videos free online milte hain)

- **SpringOne** — Spring ki flagship conference
- **Devoxx** (Belgium, France, Poland, UK)
- **JavaOne / Oracle CloudWorld**
- **JFokus**
- **JavaZone**
- **GOTO Conferences**

> [!tip] Pro tip
> YouTube pe `<conference> <year> <topic>` search karo — zyada tar talks public available hain, koi paywall nahi.

## Specs (jab deep jaana ho)

- **Jakarta EE Specifications** — Servlet, JPA, Bean Validation, JSON-B, etc.
- **JEPs (JDK Enhancement Proposals)** — language feature roadmap, yeh dekh ke pata chalta hai Java kis direction mein ja raha hai
- **W3C Trace Context** — distributed tracing propagation
- **OpenAPI Specification**
- **OAuth 2.1 / OIDC Core 1.0**

## Reference architectures

- **Spring PetClinic** — canonical Spring Boot sample (aur iske microservices/k8s/native variants bhi hain)
- **Spring Boot samples** — spring-projects GitHub org mein milenge

## How to use this list

Itni saari cheezein dekh ke overwhelm mat ho jana — sab ek saath padhne ki zarurat nahi hai. Ek strategy follow karo:

> [!tip] Reading strategy
> 1. **Effective Java** ko daily coding ke parallel padho — chahe slow ho, koi baat nahi
> 2. **Spring Boot Reference Documentation** ko bookmark kar lo aur Stack Overflow jaane se pehle isse consult karo
> 3. Har quarter mein **ek** architecture book uthao (DDIA → Building Microservices → DDD) — sab kuch ek saath mat lo
> 4. Java Weekly + koi ek YouTube channel subscribe kar lo, passive osmosis ke liye

## Related
- [[00-README]]
- [[01-Learning-Path]]
- [[01-Library-Cheatsheet]]
- [[06-IDE-Setup]]
