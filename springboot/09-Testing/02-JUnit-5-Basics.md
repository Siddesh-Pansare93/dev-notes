---
tags: [testing, junit, basics]
aliases: [JUnit 5, Jupiter]
stage: advanced
---

# JUnit 5 Basics

> [!info] For the Express/TS dev
> JUnit 5 (a.k.a. Jupiter) is `jest`/`vitest` for Java. Same shape: `@Test` ≈ `it()`, `@BeforeEach` ≈ `beforeEach()`, `assertEquals` ≈ `expect(x).toEqual(y)`. The big difference is annotations everywhere instead of nested `describe()` callbacks.

## Concept

JUnit 5 is split into three modules — you mostly only see Jupiter:

- **JUnit Platform** — the engine that runs tests (used by IDEs, Maven, Gradle).
- **JUnit Jupiter** — the API you write tests against (`@Test`, `@BeforeEach`, etc).
- **JUnit Vintage** — runs JUnit 4 tests in a 5 environment (legacy bridge).

### Lifecycle annotations

| Annotation | When | Jest equivalent |
|------------|------|-----------------|
| `@BeforeAll` | Once before all tests in class (must be `static`) | `beforeAll()` |
| `@BeforeEach` | Before each test | `beforeEach()` |
| `@AfterEach` | After each test | `afterEach()` |
| `@AfterAll` | Once after all tests (`static`) | `afterAll()` |
| `@Test` | Marks a test method | `it()` / `test()` |
| `@Disabled` | Skip a test | `it.skip()` |
| `@DisplayName("...")` | Human-readable name | the string in `it("...")` |
| `@Nested` | Group related tests | `describe()` |
| `@Tag("slow")` | Categorize tests | jest `--testPathPattern` |

## Code example

A complete test class showing structure:

```java
package com.example.shop;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Cart")
class CartTest {

    private Cart cart;

    @BeforeAll
    static void initOnce() {
        // expensive setup once for the whole class
    }

    @BeforeEach
    void setUp() {
        cart = new Cart();
    }

    @Test
    @DisplayName("starts empty")
    void startsEmpty() {
        assertThat(cart.items()).isEmpty();
        assertEquals(0, cart.total());
    }

    @Test
    void addItem_increasesTotal() {
        cart.add(new Item("Book", 20));
        cart.add(new Item("Pen", 5));

        assertAll("cart state",
            () -> assertEquals(2, cart.size()),
            () -> assertEquals(25, cart.total()),
            () -> assertTrue(cart.contains("Book"))
        );
    }

    @Test
    void removingMissingItem_throws() {
        var ex = assertThrows(NoSuchItemException.class,
            () -> cart.remove("ghost"));
        assertThat(ex.getMessage()).contains("ghost");
    }

    @Test
    @Disabled("flaky — fixing in JIRA-1234")
    void someFlakyTest() { /* ... */ }

    @Nested
    @DisplayName("when applying a coupon")
    class WhenCoupon {
        @BeforeEach
        void apply() { cart.applyCoupon("SAVE10"); }

        @Test
        void totalIsDiscounted() {
            cart.add(new Item("Book", 100));
            assertEquals(90, cart.total());
        }
    }

    // Parameterized test — like jest's `it.each`
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 5, 10})
    void canAddVariousQuantities(int qty) {
        cart.add(new Item("Pen", 1), qty);
        assertEquals(qty, cart.size());
    }

    @ParameterizedTest
    @CsvSource({
        "100, SAVE10, 90",
        "100, SAVE25, 75",
        "50,  FREE,    0"
    })
    void couponMath(int total, String code, int expected) {
        cart.add(new Item("X", total));
        cart.applyCoupon(code);
        assertEquals(expected, cart.total());
    }

    @ParameterizedTest
    @MethodSource("badCoupons")
    void invalidCoupons(String code) {
        assertThrows(IllegalArgumentException.class,
            () -> cart.applyCoupon(code));
    }

    static Stream<String> badCoupons() {
        return Stream.of("", " ", "EXPIRED", null);
    }

    @AfterEach
    void tearDown() {
        cart = null;
    }
}
```

### Assertions

JUnit's built-in:

```java
assertEquals(expected, actual);
assertTrue(condition);
assertNotNull(obj);
assertThrows(IOException.class, () -> readFile());
assertTimeout(Duration.ofSeconds(2), () -> heavy());
assertAll("group", () -> ..., () -> ...);  // collects all failures
```

AssertJ (fluent — preferred for new code):

```java
assertThat(list).hasSize(3).contains("a", "b").doesNotContain("c");
assertThat(map).containsEntry("k", "v");
assertThat(user.getEmail()).isEqualTo("a@b.com").endsWith(".com");
assertThatThrownBy(() -> svc.fail()).isInstanceOf(BadRequest.class)
    .hasMessageContaining("missing");
```

## Express/Node comparison

```typescript
// Jest
describe("Cart", () => {
  let cart: Cart;
  beforeEach(() => { cart = new Cart(); });

  it("starts empty", () => {
    expect(cart.items).toEqual([]);
  });

  it.each([[1], [2], [10]])("adds %i items", (qty) => {
    cart.add(item, qty);
    expect(cart.size).toBe(qty);
  });
});
```

| JUnit 5 | Jest/Vitest |
|---------|-------------|
| `@Test` | `it()` |
| `@BeforeEach` | `beforeEach()` |
| `@Nested class` | `describe()` |
| `@DisplayName` | string in `it("...")` |
| `@ParameterizedTest @ValueSource` | `it.each()` |
| `@Disabled` | `it.skip()` |
| `assertThrows` | `expect(fn).toThrow()` |
| `assertTimeout` | `jest.setTimeout` + manual |

## Gotchas

> [!warning] Test methods can be package-private
> Java tradition was `public void testFoo()`. JUnit 5 dropped that — use package-private. `public` works but is noise.

> [!warning] `@BeforeAll` must be `static`
> ...unless you add `@TestInstance(Lifecycle.PER_CLASS)` to the class. Then JUnit reuses one instance and you can use non-static `@BeforeAll`. The default is `PER_METHOD` (new instance per test) which matches Jest's default.

> [!tip] Use AssertJ over the JUnit assertions
> Better failure messages, IDE autocomplete on the assertion side, and chainable. Most Spring Boot tutorials use AssertJ.

> [!warning] `assertThat` is from two libraries
> `org.junit.jupiter.api.Assertions.assertThat` doesn't exist — but `org.hamcrest.MatcherAssert.assertThat` and `org.assertj.core.api.Assertions.assertThat` both do. Pick one.

## Related
- [[01-Testing-Pyramid-and-Tools]]
- [[03-Mockito]]
- [[04-Spring-Boot-Test]]
- [[../02-Java-vs-TypeScript/01-Syntax-Cheatsheet|Syntax cheatsheet]]
