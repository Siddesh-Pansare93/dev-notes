---
title: Testing Modules in Isolation
tags: [spring, spring-boot, modulith, testing, integration-tests]
date: 2026-05-26
---

# Testing Modules

In a traditional Spring Boot application, an integration test using `@SpringBootTest` loads the entire application context. In a large monolith, this is slow and brings in dependencies you might not care about for testing a specific feature.

Spring Modulith provides `@ApplicationModuleTest` to test a single [[02-Application-Modules|Application Module]] in isolation.

## Using `@ApplicationModuleTest`

When you annotate a test class with `@ApplicationModuleTest`, Spring Modulith only bootstraps the Spring beans belonging to that specific module (and its allowed dependencies).

```java
import org.junit.jupiter.api.Test;
import org.springframework.modulith.test.ApplicationModuleTest;

@ApplicationModuleTest
class OrderModuleIntegrationTests {

    @Autowired
    OrderService orderService;

    @Test
    void testOrderCreation() {
        // Only beans from the 'order' module are loaded!
        // orderService.createOrder(...);
    }
}
```

> [!info] Bootstrapping Mode
> By default, `@ApplicationModuleTest` acts like `@SpringBootTest` but restricts component scanning. You can configure `mode = BootstrapMode.DIRECT_DEPENDENCIES` to also load modules this module depends on.

## Mocking Inter-Module Dependencies

If your module depends on another module (e.g., `Order` depends on `Inventory`), and you are testing `Order` in isolation, the `Inventory` beans won't be available in the context.

You must mock them using `@MockBean` (or `@MockitoBean` in newer Spring Boot versions):

```java
@ApplicationModuleTest
class OrderModuleIntegrationTests {

    @Autowired
    OrderService orderService;

    @MockBean
    InventoryService inventoryService; // Mock external module API

    @Test
    void testOrderCreation() {
        when(inventoryService.checkStock(any())).thenReturn(true);
        // ...
    }
}
```

## Testing Events

Testing asynchronous events ([[04-Events-and-Async]]) can be tricky. Spring Modulith provides a `Scenario` API to make testing event publications declarative and robust.

```java
@ApplicationModuleTest
class OrderModuleTests {

    @Test
    void shouldPublishEventOnOrderCreation(Scenario scenario, OrderService service) {
        scenario.stimulus(() -> service.createOrder(new Order()))
                .andWaitForEventOfType(OrderPlacedEvent.class)
                .toArrive();
    }
}
```

The `Scenario` API handles the asynchronous nature of the events, waiting for them to be published, and allows you to assert that specific events were triggered.
