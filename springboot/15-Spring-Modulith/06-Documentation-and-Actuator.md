# Documentation and Actuator

Spring Modulith sirf architecture enforce nahi karta — woh us architecture ko document karne aur runtime pe monitor karne mein bhi madad karta hai. Socho isko apne Swiggy app ke "About" page jaisa — jahan tumhe pata chal jaata hai ki kaunsa module (restaurant-service, delivery-service, payment-service) kis se baat kar raha hai, bina khud manually diagram banaye.

## Generating Architecture Documentation

### Kyun zaruri hai?

Jab bhi naya developer team join karta hai, sabse pehla sawaal yehi hota hai — "bhai architecture diagram kahan hai?" Aur zyadatar companies mein woh diagram outdated hota hai — kisi ne Confluence pe 6 mahine pehle banaya tha, code badal gaya, diagram wahi ka wahi reh gaya. Result? Diagram par bharosa hi nahi karte.

Spring Modulith ka solution simple hai: chunki woh already tumhare module structure ko samajhta hai (via [[03-Encapsulation-and-Verification|ApplicationModules]]), woh automatically C4 Model architecture diagrams aur component documentation generate kar sakta hai — seedha tumhare actual code se, kisi manual drawing tool ke bina.

### Kaise karte hain?

Yeh kaam tum ek test class mein `Documenter` API use karke karte ho:

```java
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

class DocumentationTests {

    @Test
    void writeDocumentationSnippets() {
        ApplicationModules modules = ApplicationModules.of(ShopApplication.class);

        new Documenter(modules)
            .writeModulesAsPlantUml()
            .writeIndividualModulesAsPlantUml();
    }
}
```

Yeh test run karne pe `.puml` (PlantUML) files `target/spring-modulith-docs` folder mein generate ho jaati hain. Inn files ko tum kisi bhi PlantUML renderer mein khol ke actual visual diagram dekh sakte ho.

> [!tip] Living Documentation
> Documentation generation ko ek test se jodne ka sabse bada fayda yeh hai ki tumhare diagrams hamesha tumhare actual codebase ke saath sync rehte hain. Agar kisi ne module structure badal diya aur diagram update karna bhool gaya, toh koi baat nahi — agli baar test run hoga toh naya diagram khud-ba-khud ban jaayega. Isko bolte hain "living documentation" — jo apne aap zinda rehti hai, kabhi buasi (stale) nahi hoti.
>
> Node.js background se aane waalon ke liye analogy: yeh bilkul waisa hai jaise Swagger/OpenAPI spec tumhare actual route definitions se generate hoti hai, na ki alag se hath se likhi jaati hai.

## Spring Boot Actuator Integration

### Kya hota hai?

Agar tumne kabhi Spring Boot Actuator use kiya hai, toh pata hoga — `/actuator/health`, `/actuator/info` jaise endpoints milte hain jo runtime pe application ki health/info dikhate hain. Bilkul waise hi, agar tumhare classpath pe `spring-boot-starter-actuator` present hai, toh Spring Modulith automatically ek naya actuator endpoint expose kar deta hai jisse tum apne **module structure ko runtime pe inspect** kar sakte ho.

By default yeh endpoint milta hai: `/actuator/modulith`

### Kyun zaruri hai?

Socho tumhare paas ek bada monolithic Zomato-jaisa application hai jisme `order`, `inventory`, `payment`, `delivery` modules hain. Production mein kabhi tumhe pata karna ho ki actually deployed version mein kaunsa module kis dusre module pe depend karta hai — bina source code khole, sirf ek API call se — tab yeh endpoint kaam aata hai. Yeh ek tarah ka "live architecture map" hai jo tumhare running application se seedha aata hai.

### Enable kaise karein?

Endpoint ko expose karne ke liye apni `application.properties` mein yeh line add karo:

```properties
management.endpoints.web.exposure.include=health,info,modulith
```

> [!warning] Default Behaviour
> Actuator endpoints by default sensitive hote hain aur exposed nahi hote (except `health`). Agar tumne `modulith` ko `exposure.include` list mein explicitly nahi daala, toh endpoint hit karne pe 404 milega — jaise Express mein koi route register hi nahi kiya ho.

### Actuator kya dikhata hai?

`/actuator/modulith` pe ek `GET` request bhejne se tumhe apne saare modules ka JSON representation milta hai, jisme yeh sab included hota hai:
- Module names aur unke display names
- Base packages
- Dusre modules ke saath dependencies

```json
{
  "inventory": {
    "displayName": "Inventory",
    "basePackage": "com.example.shop.inventory",
    "dependencies": []
  },
  "order": {
    "displayName": "Order Management",
    "basePackage": "com.example.shop.order",
    "dependencies": [
      {
        "target": "inventory",
        "types": ["com.example.shop.inventory.InventoryService"]
      }
    ]
  }
}
```

Yahan dekho — `order` module `inventory` module pe depend karta hai via `InventoryService` class. Yeh exactly waisi jaankari hai jo tumhe module boundaries samajhne ke liye chahiye hoti hai, bina puri codebase khangaale.

### Real-world use case

Yeh information kaafi valuable hoti hai agar tum:
- **Developer portal** bana rahe ho jahan naye engineers apne monolith ka structure dekh saken (jaise internal Backstage-type tool)
- Ek **dashboard** bana rahe ho jo tumhare monolithic application ki health aur structure visualize kare
- CI/CD pipeline mein automated architecture checks laga rahe ho, jahan koi tool actuator endpoint hit karke verify kare ki koi naya "illegal" dependency toh nahi aa gaya

> [!info] Node.js Comparison
> Express/Node.js world mein aisi built-in cheez directly nahi milti — tumhe khud custom `/debug/architecture`-type route banana padta, jo manually module registry maintain kare. Spring Modulith mein yeh sab automatically, framework-level pe milta hai, bina extra effort ke.

## Key Takeaways

- `Documenter` API se tum C4 Model style architecture diagrams (PlantUML format) automatically generate kar sakte ho — seedha apne module structure se.
- Documentation generation ko test se jodo taaki woh hamesha "living" (up-to-date) rahe, kabhi outdated na ho.
- `spring-boot-starter-actuator` hone par Spring Modulith automatically `/actuator/modulith` endpoint expose kar deta hai.
- Yeh endpoint by default expose nahi hota — `management.endpoints.web.exposure.include` mein `modulith` explicitly add karna padta hai.
- Actuator response mein module names, base packages, aur inter-module dependencies ka JSON milta hai — jo dashboards, developer portals, aur runtime architecture checks ke liye kaafi useful hota hai.
