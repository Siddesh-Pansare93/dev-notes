---
title: Encapsulation and Verification
tags: [spring, spring-boot, modulith, archunit, testing]
date: 2026-05-26
---

# Encapsulation and Verification

Defining [[02-Application-Modules|Application Modules]] is only useful if those boundaries are respected. Spring Modulith provides tools to verify your architectural rules.

## Package-Private Visibility

The simplest and most effective way to enforce encapsulation in Java is using access modifiers.

> [!important] The Power of Package-Private
> Make your internal classes, interfaces, and methods package-private (no access modifier) instead of `public`. This prevents other packages (modules) from even importing them, let alone using them.

Only expose the classes/interfaces that form the API of your module as `public`.

## Structural Verification with `ApplicationModules`

Spring Modulith integrates with ArchUnit to analyze your application's structure and ensure no module boundaries are violated.

You typically create a test class in your root package to run this verification.

```java
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModulithApplicationTests {

    @Test
    void verifyModulithStructure() {
        // Analyze the ApplicationModules based on the main App class
        ApplicationModules modules = ApplicationModules.of(ShopApplication.class);
        
        // Verify that no module accesses internal classes of another module
        modules.verify();
    }
}
```

### What does `.verify()` check?

When you call `verify()`, Spring Modulith checks:
1. **No Circular Dependencies**: Module A cannot depend on Module B if Module B depends on Module A.
2. **Encapsulation**: Modules can only access exposed components (API) of other modules. Accessing nested packages (like `.internal`) from another module will throw an exception.
3. **Explicit Dependencies**: If you used `@ApplicationModule(allowedDependencies = ...)`, it verifies that only those allowed modules are accessed.

> [!failure] Example Violation
> If `OrderService` (in `order` module) tries to inject `InventoryRepository` (located in `inventory.internal` sub-package), the `verify()` test will fail, indicating an architectural violation.

## Printing the Module Structure

You can also print the discovered module structure to the console, which is helpful for debugging:

```java
ApplicationModules modules = ApplicationModules.of(ShopApplication.class);
modules.forEach(System.out::println);
```

To see how to decouple modules further, explore [[04-Events-and-Async]].
