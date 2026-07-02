# Packaging: Fat JAR

> [!info] For the Express/TS dev
> Fat JAR samajhna hai? Socho tumne apna Express app + `node_modules` + ek runtime entry point — sabko ek hi single file mein zip kar diya. `java -jar app.jar` basically tumhara `node dist/index.js` hi hai, bas fark itna hai ki is JAR ke andar tumhari saari dependencies bhi baithi hain. Koi separate `npm install` production server pe chalane ki zarurat nahi — sab kuch ek hi file mein packed hai, jaise ek dabbawala ka poora tiffin ek hi box mein aata hai.

## Kya hota hai jab tum build karte ho?

**Kyun zaruri hai?** Production mein deploy karte time tumhe ek aisi cheez chahiye jo bina kisi extra setup ke seedha chal jaye — na `node_modules` copy karna, na dependency resolve karna server pe. Bas ek file, aur woh chal jaye.

`mvn package` (ya `./gradlew bootJar`) chalane pe ye milta hai:

```
target/
  orders-api-1.0.0.jar          ← executable fat JAR (~30-60MB)
  orders-api-1.0.0.jar.original ← thin JAR (sirf tumhara code, dependencies nahi)
```

Isse run karna:

```bash
java -jar target/orders-api-1.0.0.jar
```

Bas itna hi. Koi alag se app server install nahi karna — Tomcat (ya Netty/Jetty) already andar embedded hai. Ye Express se bilkul different hai jahan tumhe khud ek HTTP server (jaise `express()`) spin up karna padta hai runtime pe — yahan Spring Boot ka fat JAR apna khud ka mini web server carry karke aata hai, jaise Swiggy ka delivery partner apna khud ka bike leke aata hai, tumhe alag se vehicle arrange nahi karna padta.

## Fat JAR ke andar hota kya hai (Layout)

Curious ho ki ye 40MB ki file ke andar hai kya? Chalo kholte hain:

```
orders-api-1.0.0.jar
├── META-INF/
│   └── MANIFEST.MF          ← Main-Class: org.springframework.boot.loader.launch.JarLauncher
├── BOOT-INF/
│   ├── classes/             ← tumhare compiled .class files + resources
│   ├── lib/                 ← saari dependency JARs (uber-jar ka asli maal yahi hai)
│   └── classpath.idx
├── org/springframework/boot/loader/   ← Spring Boot ka launcher
└── ...
```

Yahan ek interesting cheez samajhne wali hai — `MANIFEST.MF` mein Main-Class tumhara khud ka `Application.java` nahi hai, balki Spring Boot ka apna `JarLauncher` hai. Ye launcher ek chota sa bootstrapper hai jiska sirf ek kaam hai: `BOOT-INF/lib/` ke andar rakhi saari nested JARs ko dhoondhna, unhe classpath pe daalna, aur tab jaake tumhara actual `main()` method call karna.

Kyun aisa complicated approach? Kyunki normal JVM `.jar` files ke andar dusri `.jar` files ko directly load nahi kar sakta — isliye Spring Boot ne apna khud ka classloader likha jo in nested JARs ko samajh sake. Node.js mein aisa kuch nahi hota kyunki `require()` seedha `node_modules` folder se files padh leta hai — waha koi "nested zip ke andar zip" wala jhanjhat nahi hai.

## Maven configuration

Ye plugin hi hai jo tumhare normal thin JAR ko fat JAR mein badalta hai:

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <executions>
                <execution>
                    <goals>
                        <goal>repackage</goal>
                        <goal>build-info</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

`repackage` goal hi wo jaadu karta hai — pehle Maven normal thin JAR banata hai (sirf tumhara code), phir ye plugin usme saari dependencies bhar deta hai aur original thin JAR ko `.jar.original` extension se rename kar deta hai.

## Gradle wala tarika

Agar tum Gradle use kar rahe ho (Node ke `yarn`/`pnpm` jaisa alternative build tool samjho):

```kotlin
plugins {
    id("org.springframework.boot") version "3.4.0"
    id("io.spring.dependency-management") version "1.1.6"
    java
}

tasks.bootJar {
    archiveFileName.set("orders-api.jar")
}
```

`bootJar` task hi fat JAR banata hai — `jar` task se confuse mat hona, wo sirf thin JAR banata hai.

## Layered JARs (Docker ke liye must-know)

**Kyun zaruri hai?** Ye sabse important concept hai jab tum Docker mein deploy karoge. Socho tumhara `pom.xml` waise ka waisa hai lekin sirf ek line code change kiya — agar poora fat JAR ek hi blob hai, toh Docker ko poora ka poora layer phir se build karna padega, chahe sirf 2 lines hi kyun na badli hon. Ye bilkul waisा hai jaise tum Zomato pe sirf apna delivery address change karo aur poori order dobara place karni pade!

Spring Boot 2.3+ mein **layered JAR** feature aaya jo dependencies, snapshot-dependencies, resources, aur tumhara khud ka application code — inko alag-alag layers mein split kar deta hai. Docker in layers ko cache kar leta hai, toh jo slow-changing hai (dependencies) wo baar baar rebuild nahi hota, sirf jo fast-changing hai (tumhara application code) wahi rebuild hota hai.

`pom.xml` mein plugin config:

```yaml
# pom.xml plugin config
<configuration>
    <layers>
        <enabled>true</enabled>
    </layers>
</configuration>
```

Layers ko inspect karne ke liye:

```bash
java -Djarmode=layertools -jar app.jar list
# dependencies
# spring-boot-loader
# snapshot-dependencies
# application
```

Dekho — chaar layers hain, aur order bhi important hai: sabse pehle wo layers jo kabhi change nahi hote (dependencies), sabse aakhir mein wo jo har build pe change hote hain (application — tumhara khud ka code).

Extract karne ke liye:

```bash
java -Djarmode=layertools -jar app.jar extract
```

Ye foundation hai [[02-Docker-for-Spring-Boot|Docker layered build]] ke liye — jahan hum inhi layers ko Dockerfile mein alag-alag `COPY` commands se copy karenge taaki Docker layer caching sahi se kaam kare.

> [!tip]
> Node.js world mein iska equivalent hai Dockerfile mein pehle `package.json` copy karke `npm install` karna, phir baad mein poora source code copy karna — taaki dependencies wala layer cache rahe jab tak `package.json` na badle. Spring Boot layered JAR bilkul yahi philosophy follow karta hai, bas thoda zyada granular tarike se.

## Runtime args — JAR ko chalate waqt options

Production mein JVM tuning aur profile set karna common hai:

```bash
# Profile + JVM tuning
java -XX:MaxRAMPercentage=75 \
     -Dspring.profiles.active=prod \
     -Dserver.port=8080 \
     -jar orders-api.jar

# Program args pass karna
java -jar orders-api.jar --server.port=9090 --my.flag=true
```

Yahan do tarah ke arguments ka fark samajhna zaruri hai:
- `-D` wale JVM system properties hain — JVM khud in par control rakhta hai (memory, GC tuning waghera).
- `--` wale Spring Boot ke apne application arguments hain — jaise tum Express app mein `process.env.PORT` ya CLI flags read karte ho, waise hi Spring Boot inhe apne `Environment` mein pick kar leta hai aur `application.properties` ki values ko override kar deta hai.

`-XX:MaxRAMPercentage=75` khaas kar Docker containers mein important hai — container ke available memory ka 75% JVM heap ke liye reserve karta hai, taaki JVM container ki memory limit se zyada na kha jaye aur OOMKilled na ho.

## Reproducible builds — same code, same JAR, hamesha

**Kyun zaruri hai?** Socho tumne aaj ek JAR banaya, kal wahi source code se dobara banaya — dono JARs ke bytes bhi same hone chahiye, sirf functionality nahi. Ye supply-chain security ke liye important hai — tum prove kar sakte ho ki "ye exact binary isi source code se aaya hai, beech mein kisi ne tamper nahi kiya."

```xml
<properties>
    <project.build.outputTimestamp>2024-01-01T00:00:00Z</project.build.outputTimestamp>
</properties>
```

Ye timestamp fix karne se same source hamesha byte-identical JAR banayega — kyunki normally JAR files ke andar timestamps embed hote hain jo har build mein alag hote hain (chahe code same ho), isliye bina is fix ke do builds ke bytes kabhi match nahi karte.

## Build info — `/actuator/info` ka data source

`build-info` goal ek file banata hai `META-INF/build-info.properties`, jisme build time, version, artifact name jaisi details hoti hain. Ye information Spring Boot Actuator ke `/actuator/info` endpoint pe consume hoti hai — matlab tum production mein hit kar sakte ho `/actuator/info` aur pata chal jayega ki kaunsa build version deployed hai. Bahut kaam ki cheez hai jab debug karna ho ki "arre production mein kaunsa build chal raha hai abhi?"

## Skinny JAR — ek alternative jo shayad zaroorat na pade

Agar tumhara runtime environment (jaise ek fixed `lib/` folder waala server) already saari dependencies provide karta hai, toh tum unke bina bhi JAR package kar sakte ho — isse "skinny JAR" kehte hain. Lekin honestly, ye rarely worth hota hai — aajkal fat JAR + Docker layering hi standard/modern approach hai. Complexity add karke thoda size bachana mostly fayde ka deal nahi hota.

## Related
- [[02-Docker-for-Spring-Boot]]
- [[03-GraalVM-Native-Image]]
- [[01-Maven-Basics]]
- [[02-Gradle-Basics]]
