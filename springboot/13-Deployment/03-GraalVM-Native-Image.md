# GraalVM Native Image

> [!info] Express/TS wale dev ke liye
> Zara socho — tumhara poora Node app ek single static binary mein compile ho jaaye, jo **40ms** mein boot ho aur sirf **80MB RAM** khaaye. Bas yahi hai GraalVM Native Image ka wada. Lekin free lunch nahi hai — build time slow ho jaata hai (minutes lagte hain), reflection ke liye manually hints dene padte hain, aur peak throughput warm JVM se kam ho sakta hai. Trade-off samajh ke use karo, blindly nahi.

## Why bother — itna hype kyun hai isme?

Normal Spring Boot app JVM pe chalta hai — JVM start hota hai, classes load hoti hain, JIT compiler warm-up karta hai, tab jaake app fully fast ho paata hai. Yeh sab 2-10 seconds le sakta hai. Ab socho tumhara app AWS Lambda pe hai, jahan har cold start pe yeh poora tamasha repeat hota hai — user request kare aur 5 second wait kare, bura experience hai na?

GraalVM Native Image isi problem ko solve karta hai. Yeh tumhare Java/Spring app ko **pehle se compile** karke ek standalone binary bana deta hai — bilkul Go ya Rust ke binary jaisa. Koi JVM startup nahi, koi class loading overhead nahi, seedha machine code run hota hai.

| Metric | JVM Mode | Native Image |
|--------|----------|--------------|
| Cold start | 2-10s | 40-100ms |
| Idle memory | 200-400MB | 50-100MB |
| Peak throughput | Zyada (JIT-optimized) | Kam (AOT) |
| Build time | 10-30s | 2-5 min |
| Image size | 250MB+ | 70-100MB |

Yeh kab use karna best hai, socho aise:

- **Serverless / FaaS** (AWS Lambda, Google Cloud Run) — jahan cold start hi sabse bada dushman hai. Zomato ka koi background function jo sirf occasionally trigger hota hai (jaise "restaurant ne menu update kiya, notification bhejo") — usko har baar 5 second JVM boot ke liye wait nahi karna chahiye.
- **Short-lived CLI tools** — jo start ho, kaam kare, exit ho jaaye. Yahan JIT warm-up ka fayda hi nahi milta kyunki app itni der chalta hi nahi.
- **Heavy autoscaling** — jab traffic spike ho (Big Billion Day sale jaisa) aur naye pods second-second mein spin up ho rahe hon, tab fast startup critical hai.
- **Memory-constrained edge devices** — jahan RAM mehenga hai (IoT devices, edge servers).

Lekin agar tumhara app ek long-running service hai jo hamesha chalta rehta hai (jaise tumhara main Orders API jo 24x7 traffic serve karta hai), toh JVM mode hi better hai — kyunki JIT compiler time ke saath usko aur optimize karta rehta hai, aur peak throughput native image se zyada milta hai.

## How it works — mental model samjho

GraalVM ka `native-image` tool **AOT (Ahead-Of-Time) compilation** karta hai. Iska matlab — jo kaam normally JVM *runtime* pe karta hai (bytecode ko machine code mein convert karna), woh kaam yahan *build time* pe hi ho jaata hai.

Process kuch aisa chalta hai:

1. **Static analysis** — `main()` method se shuru karke, jo bhi code reachable hai (yaani actually call ho sakta hai), sirf uska hi analysis hota hai.
2. **Closed-world assumption** — yeh sabse important concept hai. Build ke time jo code "reachable" nahi mila, woh runtime pe **load hi nahi ho sakta**. JVM mode mein tum `Class.forName("SomeClass")` likh ke kuch bhi dynamically load kar sakte ho — native image mein yeh tabhi kaam karega jab tumne build ko explicitly bataya ho ki "haan yeh class use hogi".
3. **Safe classes ka initialization build time pe** — kuch classes ka static initialization build ke time hi ho jaata hai aur binary mein bake ho jaata hai (isse startup aur fast hota hai).
4. Final output — ek single **ELF (Linux) ya Mach-O (Mac) binary**, jisme JVM embedded hi nahi hai, woh khud self-sufficient hai.

Node.js background se aane wale ke liye analogy: yeh thoda `pkg` ya `nexe` jaisa hai jo Node app ko single executable mein bundle karte hain — bas GraalVM ka case zyada strict hai kyunki woh actual machine code generate karta hai, sirf V8 runtime bundle nahi karta.

**Iske implications kya hain?**

- **Reflection** — kuch bhi jo runtime pe reflection use karta hai (jaise `@Autowired`, Jackson serialization, JPA entities) — inhe explicitly declare karna padta hai ki "yeh class/method reflection se access hogi". Achi baat yeh hai ki Spring ka AOT processor 90% cases khud handle kar leta hai.
- **Dynamic class loading** restricted hai — koi bhi cheez jo runtime pe naya class load karti ho (jaise plugin systems) mushkil mein aa sakti hai.
- **Resources** (jaise `application.yml`, JSON files, templates) explicitly register karne padte hain taaki binary mein include ho aur runtime pe readable rahen.
- **JNI** (native code se Java calls) ko bhi registration chahiye.

## Spring Boot 3 setup — kaise laga karein

Spring Boot 3 mein native image support first-class hai. Maven mein plugins add karo:

```xml
<plugins>
    <plugin>
        <groupId>org.graalvm.buildtools</groupId>
        <artifactId>native-maven-plugin</artifactId>
    </plugin>
    <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
    </plugin>
</plugins>
```

`native` profile add karo (agar Spring Initializr se project banaya tha toh yeh already ho gaya hoga — https://start.spring.io pe "GraalVM Native Support" dependency select karne se yeh auto-configure ho jaata hai).

**Build & run:**

```bash
# GraalVM 21+ locally installed hona chahiye
./mvnw -Pnative native:compile
./target/orders-api
```

Ya phir agar tumhare paas GraalVM locally install nahi hai (jo ki common hai, kyunki setup thoda pain hai), toh **Buildpacks** use karo jo Docker ke andar hi native compile kar dete hain:

```bash
./mvnw -Pnative spring-boot:build-image
```

Isse ek Docker image ban jaayegi jisme native binary hai — ise directly `docker run` kar sakte ho, GraalVM install karne ki zaroorat nahi.

## AOT processing — Spring ka pehle se hisaab lagana

Spring 6 aur Boot 3 ne ek AOT pipeline introduce ki jo native image compile hone se **pehle** hi kuch heavy-lifting kar deti hai:

- Bean definitions ko **pre-compute** karta hai — normally Spring runtime pe classpath scan karke beans dhoondta hai, yeh slow hai aur native image mein possible bhi nahi (closed-world assumption yaad hai?). AOT isse build-time pe kar deta hai.
- Reflection/proxy/resource **hints generate** karta hai automatically.
- Dynamic proxies (jaise `@Transactional` ke liye banaye jaane wale) ko **generated classes** se replace karta hai.

Agar sirf AOT step dekhna hai (JVM pe hi, native compile kiye bina), toh:

```bash
./mvnw spring-boot:process-aot
```

Yeh `target/spring-aot/main/` mein generated code daal deta hai — curiosity ho toh dekh sakte ho Spring ne kya-kya generate kiya.

## Hints — jab auto-detection fail ho jaaye

Spring ka AOT processor smart hai, lekin har cheez khud detect nahi kar paata — especially teen-party libraries jo reflection use karti hain jinke baare mein Spring ko pata nahi. Aise cases mein manually `RuntimeHintsRegistrar` likhna padta hai:

```java
public class MyHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader cl) {
        hints.reflection().registerType(MyDto.class, MemberCategory.values());
        hints.resources().registerPattern("data/*.json");
        hints.serialization().registerType(SerializableThing.class);
    }
}
```

Yahan teen tarah ke hints diye ja rahe hain:
- **reflection** — batao ki `MyDto` class reflection se access hogi (jaise Jackson isse serialize/deserialize karega)
- **resources** — batao ki `data/*.json` pattern wale files binary mein bundle karke runtime pe readable rakhne hain
- **serialization** — batao ki `SerializableThing` ko Java serialization ke through use kiya jaayega

Isko register karne ke liye:

```java
@ImportRuntimeHints(MyHints.class)
```

Yeh kisi bhi `@Configuration` class pe laga do.

> [!tip] Zomato analogy
> Isko aise socho — closed-world assumption ek bouncer jaisa hai jo party (runtime) mein sirf unhi logo (classes) ko andar aane deta hai jinka naam guest list (build-time analysis) mein pehle se likha ho. Agar koi surprise guest (dynamically loaded class) aata hai jiska naam list mein nahi hai, bouncer usse andar nahi ghusne dega — crash ho jaayega. Hints registrar ka kaam hai guest list mein pehle se naam add karna.

## What breaks — kya cheezein fail ho sakti hain

> [!warning] Known limitations
> - **CGLIB jaisi libraries** jo runtime pe bytecode generate karti hain (kuch mocking libraries bhi isi category mein aati hain)
> - **Runtime classpath scanning** — rare hai well-written code mein, lekin purani ya generic libraries mein mil sakta hai
> - Kuch **serialization frameworks** jinke liye hints nahi diye gaye
> - **JDK Flight Recorder** (profiling tool) limited support ke saath kaam karta hai
> - **Spring Cloud Function** poori tarah kaam karta hai; kuch Spring Cloud components ko extra hints chahiye hote hain

Practical baat yeh hai — agar tumhara stack "boring" Spring Boot + JPA + REST hai, toh 90% chance hai sab kuch bina extra kuch kiye chal jaayega. Problem tab aati hai jab koi legacy ya bahut generic third-party library use kar rahe ho.

## Testing native — production mein deploy karne se pehle test karo

Native image ka behavior JVM se thoda different ho sakta hai (especially reflection-heavy code mein), isliye sirf `mvn test` pe bharosa mat karo. Native mode mein bhi test chalao:

```bash
./mvnw -PnativeTest test     # tests ko native image ke andar chalata hai
```

Yeh slow hai (kyunki har run pe native compile hota hai), isliye CI mein isse alag, kam-frequent stage mein rakho — har commit pe nahi, shayad merge-to-main pe.

## Kab native NAHI use karna chahiye

- **Long-running, throughput-heavy services** jahan JIT ka fayda milta hai — jaise tumhara main high-traffic Orders API jo hours/days tak chalta rehta hai. Yahan JVM ka JIT compiler time ke saath better optimize karta hai, native image ka fixed AOT-compiled code utna adapt nahi kar sakta.
- Apps jinme **heavy reflection ya dynamic proxies** hain jinhe tum fully hint nahi kar sakte — agar third-party library bahut zyada magic karti hai, hints likhte-likhte thak jaoge.
- Teams jo CI mein **5-minute build times** absorb nahi kar sakti — agar tumhara CI pipeline already slow hai aur fast feedback loop chahiye, native build add karna painful ho sakta hai.

Seedha rule: **serverless/short-lived → native; long-running high-throughput → JVM.**

## Tracing agent — jab third-party lib ko hints chahiye ho

Maano koi third-party library use kar rahe ho jo reflection karti hai aur usme hints already nahi diye gaye — ab kya karein? Manually har class dhoondh ke hint likhna painful hoga. Iske liye GraalVM ka **tracing agent** hai jo app ko normal JVM pe chalate hue observe karta hai ki kaunsi classes reflection/resources/proxies use ho rahi hain, aur khud hints generate kar deta hai:

```bash
java -agentlib:native-image-agent=config-output-dir=src/main/resources/META-INF/native-image \
     -jar target/app.jar
```

Isko chalao, phir apna app ka **poora flow exercise karo** — saare endpoints hit karo, saare edge cases trigger karo (jitna zyada coverage utne accurate hints). Jo bhi reflection/resources use hue, unka config generated folder mein likh diya jaayega. Uske baad us generated config ko commit kar do — ab native build ke time yeh hints automatically use ho jaayenge.

> [!tip] Practical tip
> Agent chalate waqt integration tests ya Postman collection run karna best hai — jitne zyada code paths exercise honge, hints utne complete banenge. Half-baked hints ka matlab hai native build toh ho jaayega, lekin production mein kisi rare path pe `ClassNotFoundException` jaisa crash milega.

## Key Takeaways

- **Native Image = AOT compilation** — Java code ko build-time pe hi machine code mein convert kar diya jaata hai, JVM ki zaroorat nahi rehti runtime pe.
- **Fastest startup, lowest memory** — 40-100ms boot, 50-100MB RAM — serverless aur autoscaling ke liye perfect.
- **Trade-off**: slow build (2-5 min), aur peak throughput warm JVM se kam ho sakta hai — long-running high-traffic services ke liye JVM mode hi behtar.
- **Closed-world assumption** sabse important concept hai — jo build-time pe reachable nahi, woh runtime pe load nahi ho sakta. Isliye reflection/dynamic loading ke liye explicit hints chahiye.
- Spring Boot 3 ka **AOT processor** zyada tar reflection/proxy hints khud generate kar deta hai — manual `RuntimeHintsRegistrar` sirf tab likho jab auto-detection fail ho.
- **Tracing agent** third-party libraries ke liye hints auto-generate karne ka sabse aasan tareeka hai — app ko exercise karo, config commit karo.
- Native build ko `-PnativeTest` se separately test karo, kyunki behavior JVM se differ kar sakta hai.
- Decision rule yaad rakho: **short-lived/serverless → Native Image; always-on high-throughput → JVM mode.**

## Related
- [[02-Docker-for-Spring-Boot]]
- [[01-Packaging-Fat-JAR]]
- [[01-JVM-Memory-and-GC]]
- [[02-Spring-Boot-Auto-Configuration]]
