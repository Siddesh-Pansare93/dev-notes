---
title: Documentation and Actuator
tags: [spring, spring-boot, modulith, c4-model, actuator, documentation]
date: 2026-05-26
---

# Documentation and Actuator

Spring Modulith doesn't just enforce architecture; it helps you document and monitor it.

## Generating Architecture Documentation

Since Spring Modulith understands your module structure (via [[03-Encapsulation-and-Verification|ApplicationModules]]), it can automatically generate C4 Model architecture diagrams and component documentation.

You typically do this in a test class using the `Documenter` API.

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

Running this test generates `.puml` (PlantUML) files in the `target/spring-modulith-docs` folder.

> [!tip] Living Documentation
> By tying documentation generation to a test, you ensure that your diagrams are always up-to-date with your actual codebase. It becomes "living documentation."

## Spring Boot Actuator Integration

If you have `spring-boot-starter-actuator` on your classpath, Spring Modulith automatically exposes actuator endpoints to inspect the module structure at runtime.

By default, the endpoint is available at `/actuator/modulith`.

To enable it, ensure it's exposed in your `application.properties`:
```properties
management.endpoints.web.exposure.include=health,info,modulith
```

### What does the actuator show?

A `GET` request to `/actuator/modulith` returns a JSON representation of your modules, including:
- Module names and display names
- Base packages
- Dependencies on other modules

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

This information can be extremely valuable for building developer portals or dashboards that visualize the health and structure of your monolithic application.
