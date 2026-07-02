# JUnit 5 Basics

> [!info] Express/TS dev ke liye
> JUnit 5 (jisko pyaar se "Jupiter" bhi bolte hain) Java duniya ka `jest`/`vitest` hai. Shape bilkul same hai — `@Test` ≈ `it()`, `@BeforeEach` ≈ `beforeEach()`, `assertEquals` ≈ `expect(x).toEqual(y)`. Bas ek fark hai — yahan har jagah annotations hain, nested `describe()` callbacks nahi.

## Concept

Kya hota hai JUnit 5 ke andar? Socho isko ek 3-layer cake ki tarah — lekin tumhe roz sirf ek hi layer khani padti hai:

- **JUnit Platform** — engine jo tests ko actually run karta hai (IDE, Maven, Gradle sab isi ko use karte hain background mein). Ye Node ka test-runner samjho — jaise `jest`/`vitest` ka internal runner.
- **JUnit Jupiter** — ye woh API hai jispe tum apne tests likhte ho (`@Test`, `@BeforeEach` waghera). Rozana kaam yahin hota hai.
- **JUnit Vintage** — ek "legacy bridge" jo purane JUnit 4 tests ko JUnit 5 environment mein chalne deta hai. Jaise koi purana Express 3 app ko naye Node version pe patch karke chalate ho.

99% time tumhara matlab sirf **Jupiter** se hai jab bhi koi "JUnit 5" bolta hai.

### Lifecycle annotations

Kyun zaruri hai ye samajhna? Kyunki ye annotations decide karte hain ki tumhara setup/cleanup code kab-kab chalega — bilkul Jest ke hooks jaisa.

| Annotation | Kab chalta hai | Jest equivalent |
|------------|------|-----------------|
| `@BeforeAll` | Pura class ke saare tests se pehle ek baar (method `static` hona chahiye) | `beforeAll()` |
| `@BeforeEach` | Har test se pehle | `beforeEach()` |
| `@AfterEach` | Har test ke baad | `afterEach()` |
| `@AfterAll` | Saare tests ke baad ek baar (`static`) | `afterAll()` |
| `@Test` | Ye method ek test hai, aisa bolta hai | `it()` / `test()` |
| `@Disabled` | Test ko skip kar do | `it.skip()` |
| `@DisplayName("...")` | Human-friendly naam dikhane ke liye | `it("...")` ka string part |
| `@Nested` | Related tests ko group karna | `describe()` |
| `@Tag("slow")` | Tests ko category dena (filter karne ke liye) | jest `--testPathPattern` jaisa filtering |

> [!tip] Zomato analogy
> Socho `@BeforeAll` woh restaurant ka "kitchen setup" hai — ek baar subah oven on karo, sabziyan kaato. Ye din mein ek hi baar hota hai. `@BeforeEach` woh "table clean karna" hai — har naye order (test) se pehle table saaf karni padti hai, taaki previous customer ka bacha-khucha kisi aur ke order mein na mix ho.

## Code example

Chalo ek complete test class dekhte hain — isme sab kuch hai: setup, assertions, nested groups, parameterized tests, sab kuch.

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
        // expensive setup jo pura class ke liye ek hi baar chalna hai
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

    // Parameterized test — jest ke `it.each` jaisa
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

Is class mein kya-kya ho raha hai, line by line samajhte hain:

- `initOnce()` — ye class ke saare tests se pehle sirf ek baar chalega. Isme heavy setup daalo (jaise DB connection, ya kisi bade fixture ko load karna) — Jest ke `beforeAll()` jaisa.
- `setUp()` — har single test se pehle ek fresh `Cart` bana raha hai, taaki ek test ka data doosre test mein leak na ho. Ye sabse important habit hai — tests ekdusre pe depend nahi karne chahiye.
- `@Nested class WhenCoupon` — ye ek "sub-describe block" hai. Jab tumhe kisi specific scenario ke liye alag setup chahiye (jaise "jab coupon apply ho chuka ho"), tab nested class banao. Bilkul Jest ke nested `describe()` jaisa feel hai.
- `@ParameterizedTest` waale teen examples — inhe ek-ek karke samjhenge niche.

### Assertions

**JUnit ke built-in assertions:**

```java
assertEquals(expected, actual);
assertTrue(condition);
assertNotNull(obj);
assertThrows(IOException.class, () -> readFile());
assertTimeout(Duration.ofSeconds(2), () -> heavy());
assertAll("group", () -> ..., () -> ...);  // sab failures ek saath collect karta hai
```

`assertAll` ka fayda samjho — normal assertions mein pehla fail hote hi test ruk jaata hai, baaki assertions check hi nahi hote. Lekin `assertAll` sabko chalata hai aur ek saath saare failures report karta hai. Jaise Swiggy order checkout pe agar 3 items out-of-stock hain, tumhe ek-ek karke error nahi chahiye — ek saath poori list chahiye ki "ye 3 items available nahi hain".

**AssertJ (fluent style — naye code ke liye preferred):**

```java
assertThat(list).hasSize(3).contains("a", "b").doesNotContain("c");
assertThat(map).containsEntry("k", "v");
assertThat(user.getEmail()).isEqualTo("a@b.com").endsWith(".com");
assertThatThrownBy(() -> svc.fail()).isInstanceOf(BadRequest.class)
    .hasMessageContaining("missing");
```

Kyun AssertJ better hai? Kyunki ye chainable hai — ek hi line mein multiple checks chain kar sakte ho, aur failure message bhi bahut readable hota hai. Jaise agar `hasSize(3)` fail ho, toh error message seedha bolega "expected size 3 but was 2" — koi guesswork nahi.

## Express/Node comparison

Same test JavaScript/Jest mein kaisa dikhta:

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

Dekho kitna similar structure hai — bas annotations vs function calls ka fark hai:

| JUnit 5 | Jest/Vitest |
|---------|-------------|
| `@Test` | `it()` |
| `@BeforeEach` | `beforeEach()` |
| `@Nested class` | `describe()` |
| `@DisplayName` | `it("...")` ka string |
| `@ParameterizedTest @ValueSource` | `it.each()` |
| `@Disabled` | `it.skip()` |
| `assertThrows` | `expect(fn).toThrow()` |
| `assertTimeout` | `jest.setTimeout` + manual handling |

## Parameterized tests — thoda detail mein

Kya hota hai `@ParameterizedTest`? Ye tumhe ek hi test method ko multiple inputs ke saath baar-baar run karne deta hai — bina copy-paste kiye. Node duniya mein `it.each()` yehi kaam karta hai.

Teen tareeke se data de sakte ho:

1. **`@ValueSource`** — simple single-value list (ints, strings, etc):
```java
@ParameterizedTest
@ValueSource(ints = {1, 2, 5, 10})
void canAddVariousQuantities(int qty) { ... }
```
2. **`@CsvSource`** — multiple columns ek row mein, jaise CSV file:
```java
@ParameterizedTest
@CsvSource({
    "100, SAVE10, 90",
    "100, SAVE25, 75"
})
void couponMath(int total, String code, int expected) { ... }
```
3. **`@MethodSource`** — jab data complex ho ya generate karna ho, ek static method se stream return karo:
```java
@ParameterizedTest
@MethodSource("badCoupons")
void invalidCoupons(String code) { ... }

static Stream<String> badCoupons() {
    return Stream.of("", " ", "EXPIRED", null);
}
```

> [!tip] Kab kaunsa use karo?
> Simple ek-column data ho toh `@ValueSource`. Multiple related values (input + expected output) ho toh `@CsvSource`. Aur agar data dynamically banana ho ya objects pass karne hon, toh `@MethodSource` — ye sabse flexible hai.

## Gotchas

> [!warning] Test methods package-private ho sakte hain
> Purani Java tradition thi `public void testFoo()` likhna. JUnit 5 ne ye zaroorat hata di — ab package-private (koi modifier nahi) methods bhi chal jaate hain. `public` likhoge toh bhi chalega, lekin ye sirf extra noise hai — zaroorat nahi.

> [!warning] `@BeforeAll` ko `static` hona hi padega
> ...jab tak tum class pe `@TestInstance(Lifecycle.PER_CLASS)` na laga do. Us case mein JUnit ek hi instance reuse karta hai, aur tab non-static `@BeforeAll` bhi chal jaata hai. Default behavior `PER_METHOD` hai (har test ke liye naya instance) — ye Jest ke default se match karta hai, jahan har `it()` fresh context mein chalta hai.

> [!tip] JUnit ke built-in assertions se AssertJ better hai
> Behtar failure messages, IDE autocomplete assertion side pe (jaise `.hasSize()`, `.contains()` type karte hi suggestions aa jaate hain), aur chainable syntax. Zyada Spring Boot tutorials AssertJ hi use karte hain aajkal.

> [!warning] `assertThat` do alag libraries se aata hai
> `org.junit.jupiter.api.Assertions.assertThat` naam ki koi cheez exist nahi karti — lekin `org.hamcrest.MatcherAssert.assertThat` aur `org.assertj.core.api.Assertions.assertThat` dono exist karte hain. Import mismatch se confusing compile errors aate hain — isliye ek library pick karo (AssertJ recommended) aur usi se chipke raho poore project mein.

## Key Takeaways

- JUnit 5 = 3 modules (Platform, Jupiter, Vintage) — 99% kaam Jupiter ke saath hota hai.
- Lifecycle annotations (`@BeforeEach`, `@BeforeAll`, etc) Jest ke hooks jaise hain, bas function calls ki jagah annotations use hote hain.
- `@Nested` classes se `describe()`-jaisi grouping milti hai, especially jab kisi specific scenario ke liye alag setup chahiye ho.
- `@ParameterizedTest` (`@ValueSource`, `@CsvSource`, `@MethodSource`) se `it.each()`-jaisa data-driven testing hota hai — copy-paste se bachne ke liye zaroor use karo.
- Assertions ke liye AssertJ (`assertThat(...)`) ko prefer karo — chainable aur readable failure messages ke liye.
- `assertAll()` se multiple assertions ek saath check karo, taaki pehli failure pe hi test na ruke — sab failures ek saath dikh jaayein.
- Test method `public` hona zaroori nahi — package-private hi kaafi hai.
- `@BeforeAll` default mein `static` chahiye hota hai, jab tak `@TestInstance(Lifecycle.PER_CLASS)` na lagao.

## Related
- [[01-Testing-Pyramid-and-Tools]]
- [[03-Mockito]]
- [[04-Spring-Boot-Test]]
- [[../02-Java-vs-TypeScript/01-Syntax-Cheatsheet|Syntax cheatsheet]]
