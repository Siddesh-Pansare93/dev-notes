# Testing Modules

Socho tumne Zomato jaisa ek bada monolith bana rakha hai — Order, Inventory, Payment, Delivery sab modules ek hi Spring Boot app mein hain. Ab tumhe sirf `Order` module ka ek test likhna hai. Traditional tarike se agar tum `@SpringBootTest` use karoge, toh Spring poore application context ko boot karega — matlab Order ke saath Inventory, Payment, Delivery, sabka context bhi load hoga. Yeh slow bhi hai aur unnecessary bhi, kyunki tumhe toh sirf Order module test karna tha.

Yehi problem solve karne ke liye Spring Modulith laata hai `@ApplicationModuleTest` — jisse tum ek single [[02-Application-Modules|Application Module]] ko isolation mein test kar sakte ho, bina baaki poori app ko load kiye.

## `@ApplicationModuleTest` Kya Hai Aur Kaise Use Karein?

Jab tum apni test class pe `@ApplicationModuleTest` laga dete ho, Spring Modulith sirf usi module ke beans ko bootstrap karta hai (aur uske allowed dependencies ko). Baaki sab modules ka context load hi nahi hota — matlab test fast bhi hoga aur focused bhi.

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

Node.js background se socho toh yeh kuch aisa hai jaise tum apne poore Express app ka server start kiye bina, sirf ek specific route/module ke controller aur service ko import karke unit-integration test likh do — baaki routes/middlewares ki koi zarurat hi nahi.

> [!info] Bootstrapping Mode
> Default mein, `@ApplicationModuleTest` `@SpringBootTest` jaisa hi behave karta hai lekin component scanning ko restrict kar deta hai — sirf usi module tak. Agar tumhe apne module ke dependencies (jin modules pe yeh depend karta hai) bhi load karne hain, toh `mode = BootstrapMode.DIRECT_DEPENDENCIES` set kar sakte ho.

## Inter-Module Dependencies Ko Mock Karna

Ab yahan ek practical dikkat aati hai — real duniya mein modules aksar ek doosre pe depend karte hain. Jaise Zomato ke `Order` module ko `Inventory` module se baat karni padti hai ("bhai stock hai kya restaurant mein?"). Agar tum `Order` ko isolation mein test kar rahe ho, toh `Inventory` ke beans context mein available hi nahi honge — kyunki `@ApplicationModuleTest` ne unhe load hi nahi kiya.

Toh karna kya hai? Simple — `@MockBean` (ya newer Spring Boot versions mein `@MockitoBean`) use karke unhe mock kar do:

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

Yeh bilkul waisa hi hai jaise Node.js mein Jest ke `jest.mock()` se tum kisi external service call ko fake response dete ho, taaki tumhara test real network call ya real dependency pe depend na kare. Idea same hai — dusre module ka "contract" fix rakho, uska real implementation mat chalao.

> [!tip] Yeh approach tumhe module boundaries ko strictly enforce karne mein bhi help karta hai — agar mocking karna mushkil lag raha hai (bahut saare methods mock karne pad rahe hain), toh shायad tumhare modules ke beech coupling zyada tight hai.

## Events Ko Test Karna

Kya hota hai jab tumhara module events publish karta hai? [[04-Events-and-Async|Events aur async communication]] test karna thoda tricky ho jaata hai — kyunki events asynchronously publish hote hain, toh tumhe wait karna padta hai ki event actually fire hua ya nahi, bina apne test mein random `Thread.sleep()` daale.

Iske liye Spring Modulith deta hai ek `Scenario` API, jo event publication testing ko declarative aur robust banata hai — matlab tum clean tarike se likh sakte ho "yeh action karo, phir wait karo is event ke aane ka."

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

Yahan `Scenario` API khud hi asynchronous nature ko handle karta hai — event publish hone ka wait karta hai, aur phir assert karne deta hai ki specific event trigger hua ya nahi. Isse tumhe manually `CountDownLatch` ya polling wagera likhne ki zarurat nahi padti, jo normally async testing mein karna padta hai.

> [!warning] Agar tumne `Scenario` parameter test method mein add nahi kiya, toh Spring Modulith use inject nahi karega automatically — yeh test method parameter ke through hi milta hai, `@Autowired` field ke through nahi.

## Key Takeaways

- `@ApplicationModuleTest` ek module ko poori app load kiye bina isolation mein test karne deta hai — fast aur focused integration tests ke liye best hai.
- Default mode sirf usi module ke beans load karta hai; `BootstrapMode.DIRECT_DEPENDENCIES` use karo agar dependent modules bhi chahiye.
- Cross-module dependencies (jaise `Order` → `Inventory`) ko `@MockBean`/`@MockitoBean` se mock karo — bilkul Jest ke `jest.mock()` jaisa concept.
- Async events test karne ke liye `Scenario` API use karo — `stimulus()` se action trigger karo aur `andWaitForEventOfType()...toArrive()` se event ka wait karo, koi manual sleep/polling nahi chahiye.
- `Scenario` object test method parameter ke through inject hota hai, field injection ke through nahi.
