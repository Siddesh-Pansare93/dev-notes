# Mockito

> [!info] Express/TS wale dev ke liye
> Mockito matlab Java duniya ka `jest.fn()` / `vi.fn()` — bas thoda zyada powerful aur thoda zyada verbose. Farak yeh hai: Jest module loader ko mock karta hai (`jest.mock("./db")` likho aur poora module hi fake ho jaata hai), lekin Mockito **objects** ko mock karta hai — runtime pe bytecode magic se ek fake subclass generate karke. Iska matlab: tum un dependencies ko mock karte ho jo tumne **inject** ki hain, un modules ko nahi jo tumne `import`/`require` kiye hain. Yeh chhota sa difference hi batata hai ki Java mein Dependency Injection itna zaruri kyun hai.

## Concept

Socho tumhe `OrderService` test karna hai, lekin uske andar ek `PaymentGateway` hai jo real mein bank ko call karta hai. Test chalate waqt tum real bank ko toh call nahi karoge (paise kat jayenge, aur test slow + flaky ho jayega). Yahan Mockito kaam aata hai — woh `PaymentGateway` ka ek **fake version** bana deta hai, jisko tum control kar sakte ho: "jab charge() call ho, toh bas 'txn-123' return kar de, asli bank ko touch mat kar."

Mockito fake implementations banata hai classes/interfaces ki. Fir tum unke methods ko **stub** karte ho (yeh bolo ki kya return karna hai) aur baad mein **verify** karte ho ki interactions sahi hui ya nahi (yaani "kya woh method call hua bhi ya nahi").

Teen core verbs yaad rakho — baaki sab inhi ke upar based hai:

| Verb | Kaam kya karta hai |
|------|---------|
| `mock(X.class)` | Ek fake X bana do. Saare methods default values return karenge (null/0/false) jab tak stub na karo. |
| `when(x.foo()).thenReturn(y)` | Stub: jab bhi `foo()` call ho, `y` return kar do. |
| `verify(x).foo()` | Assert karo ki `foo()` actually call hua tha. |

Aur kuch advanced tools jo kaam aayenge:

| Verb | Kaam kya karta hai |
|------|---------|
| `spy(realObj)` | Real object hi hai, bas usme se selected methods ko stub kar sakte ho — baaki sab asli hi chalega. |
| `ArgumentCaptor` | Jo arguments mock ko pass kiye gaye the, unko capture karke baad mein inspect karo. |
| `@Mock` / `@InjectMocks` | Annotation-based shortcut — manually `mock()` likhne ki zarurat nahi. |

## Code example

### Plain Mockito

Yeh dekho — ek real-jaisa test kaise likhte hain. Socho `OrderService` Zomato jaisa hai: order place hoti hai, payment gateway se paisa katata hai, order save hoti hai, aur confirmation email jaata hai. Har dependency mock hai, so hum poori tarah control kar sakte hain ki kya hoga:

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock PaymentGateway gateway;
    @Mock OrderRepository repo;
    @Mock EmailService email;

    @InjectMocks OrderService service;  // constructor injection auto-wired

    @Captor ArgumentCaptor<Order> orderCaptor;

    @Test
    void placesOrder_savesAndCharges() {
        // Arrange (stub) — bata do fake dependencies ko kya karna hai
        when(gateway.charge(anyInt())).thenReturn("txn-123");
        when(repo.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act — asli method call karo jise test kar rahe ho
        var result = service.place(new Cart(List.of(new Item("Book", 20))));

        // Assert — result sahi hai kya
        assertThat(result.txnId()).isEqualTo("txn-123");

        // Verify interactions — kya sahi dependencies call hui thi sahi tarike se
        verify(gateway).charge(20);
        verify(repo).save(orderCaptor.capture());
        verify(email).sendConfirmation(orderCaptor.getValue());
        verifyNoMoreInteractions(email);

        // Captured argument ko inspect karo
        Order saved = orderCaptor.getValue();
        assertThat(saved.status()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    void chargeFails_throwsAndDoesntSave() {
        // Payment gateway fail ho jaaye (jaise UPI transaction declined ho jaaye)
        when(gateway.charge(anyInt()))
            .thenThrow(new PaymentException("declined"));

        assertThatThrownBy(() -> service.place(new Cart(List.of(new Item("X", 5)))))
            .isInstanceOf(PaymentException.class);

        // Payment fail hui toh order save nahi hona chahiye, email bhi nahi jaani chahiye
        verify(repo, never()).save(any());
        verifyNoInteractions(email);
    }

    @Test
    void retriesOnTransientError() {
        // Pehli call fail, doosri call success — jaise network glitch ke baad retry
        when(gateway.charge(anyInt()))
            .thenThrow(new TransientException())
            .thenReturn("txn-ok");

        var result = service.place(new Cart(List.of(new Item("X", 5))));

        verify(gateway, times(2)).charge(5);
        assertThat(result.txnId()).isEqualTo("txn-ok");
    }
}
```

Yahan `@InjectMocks` ka kaam samajh lo — yeh `OrderService` ka ek instance banata hai aur upar declare kiye saare `@Mock` fields (gateway, repo, email) ko uske constructor mein automatically inject kar deta hai. Manually `new OrderService(gateway, repo, email)` likhne ki zarurat nahi — Mockito khud dekh leta hai kaunsa constructor use karna hai.

### Spies (real object, partial mock)

Kya hota hai spy? Socho tumhare paas ek real `ArrayList` hai, aur tum chahte ho ki `add()` toh asli hi kaam kare, lekin `size()` ko temporarily fake karna hai kisi edge-case test ke liye. Yahi spy karta hai — poora object real hai, bas jo method tum stub karo woh fake ban jaata hai:

```java
@Test
void spyOnRealList() {
    List<String> spy = spy(new ArrayList<>());
    spy.add("hello");                       // real call

    when(spy.size()).thenReturn(100);        // stubbed!
    assertThat(spy.size()).isEqualTo(100);
    assertThat(spy.get(0)).isEqualTo("hello"); // still real
}
```

> [!tip] mock vs spy
> `mock()` = poora fake, sab kuch default return karega jab tak stub na karo.
> `spy()` = poora real, sirf jo stub karo woh fake ban jaayega. Spy tab use karo jab kisi legacy class ka sirf ek method behavior change karna ho, poori class ko fake nahi karna.

### Argument matchers

Jab tumhe exact value nahi pata (ya matter nahi karta), toh matchers use karo — jaise "koi bhi string chalega" ya "kisi bhi Config object ke saath":

```java
when(repo.findByEmail(anyString())).thenReturn(Optional.of(user));
when(svc.process(eq("a"), any(Config.class))).thenReturn(true);
when(repo.find(argThat(s -> s.startsWith("admin")))).thenReturn(adminUser);
```

> Yeh rule hamesha yaad rakho: agar ek argument ke liye **koi bhi matcher** use kiya (`any()`, `anyString()`, `argThat()` waghera), toh **saare arguments** ke liye matcher use karna padega — literal values ke liye `eq()` use karo. Yeh Mockito ka strict rule hai, isko todoge toh `InvalidUseOfMatchersException` milega.

### `doReturn` for tricky cases

`when(...).thenReturn(...)` likhte waqt Mockito real method ko actually call kar leta hai stubbing ke time (bas result use nahi karta). Yeh void methods ya spies ke saath problem create karta hai — spy pe real method chal jaayega jo tum nahi chahte the. Iske liye alag syntax hai:

```java
doReturn("x").when(spy).method();
doThrow(new IOException()).when(mock).voidMethod();
doNothing().when(mock).voidMethod();
```

> [!tip] Kab `doX()` use karein?
> Jab method **void** ho, ya jab **spy** pe stub kar rahe ho — in dono cases mein `when().thenReturn()` fail ya risky ho sakta hai. Normal mocks pe normal methods ke liye `when()` hi use karo, woh zyada readable hai.

### Mocking statics (Mockito 3.4+)

Kabhi kabhi tumhe `Instant.now()` jaisa static method mock karna padta hai (time-dependent tests ke liye). Mockito ismein bhi help karta hai, though yeh last resort hona chahiye:

```java
try (MockedStatic<Instant> clock = mockStatic(Instant.class)) {
    clock.when(Instant::now).thenReturn(Instant.parse("2024-01-01T00:00:00Z"));
    // ...
}
```

> [!warning] Static mocking ek smell hai
> Iske bajaye `Clock` ya `Supplier<Instant>` inject karna better design hai — static mocking bytecode manipulation pe depend karta hai, thoda fragile aur "magic" feel deta hai. Use tabhi karo jab third-party static call ho jise tum change nahi kar sakte (jaise `Instant.now()` khud).

## Express/Node comparison

Same test agar Jest mein likhte toh kuch aisa dikhta:

```typescript
// Jest
const gateway = { charge: jest.fn().mockReturnValue("txn-1") };
const repo    = { save: jest.fn(o => o) };
const service = new OrderService(gateway, repo);

await service.place(cart);

expect(gateway.charge).toHaveBeenCalledWith(20);
expect(repo.save).toHaveBeenCalledWith(
  expect.objectContaining({ status: "PAID" })
);
```

Dekho kitna similar hai concept-wise — bas syntax alag hai. Poora mapping table yeh raha:

| Mockito | Jest |
|---------|------|
| `mock(X.class)` | `jest.fn()` / manual stub object |
| `when(x.f()).thenReturn(y)` | `jest.fn().mockReturnValue(y)` |
| `verify(x).f()` | `expect(x.f).toHaveBeenCalled()` |
| `verify(x, times(2)).f()` | `.toHaveBeenCalledTimes(2)` |
| `verify(x, never()).f()` | `.not.toHaveBeenCalled()` |
| `ArgumentCaptor` | `expect(x.f).toHaveBeenCalledWith(...)` ya `mock.calls[0]` |
| `@Mock` + `@InjectMocks` | manual constructor wiring |
| `spy(real)` | `jest.spyOn(obj, 'method')` |
| `doThrow(...).when(...)...` | `.mockImplementation(() => { throw ... })` |
| `mockStatic` | `jest.mock('module')` |

Sabse bada mental shift yaad rakho: **Jest modules ko mock karta hai, Mockito objects ko mock karta hai.** Yehi wajah hai ki Java mein Dependency Injection itna important hai — tum `jest.mock("./db")` jaisa shortcut lekar bade design problems se nahi bach sakte. Agar tumne apni class mein `new PaymentGateway()` hardcode kar diya (constructor ke bahar se inject nahi kiya), toh Mockito usko mock nahi kar payega — DI hi tumhara escape hatch hai.

## Gotchas

> [!warning] `when()` void methods pe kaam nahi karta
> Void method pe `when(mock.voidMethod())` likhoge toh compile hi nahi hoga (kyunki void return karta hai, when() ko argument chahiye). Iske bajaye `doNothing()` / `doThrow()` / `doAnswer()` use karo.

> [!warning] Final classes mock karna
> Pre-Mockito 2 mein yeh impossible tha. Modern Mockito mein kaam karta hai agar `mockito-inline` classpath pe ho (Spring Boot ka test starter already isse include karta hai, so tumhe manually add nahi karna). Fir bhi — agar tumhe baar-baar final classes mock karni pad rahi hain, toh shayad design mein hi kuch improve karne ki zarurat hai.

> [!danger] Jo cheez tumhari nahi hai usko mock mat karo
> `String`, `LocalDate`, ya third-party value objects mock karna brittle tests deta hai — thoda sa upstream library update hua aur tumhare tests toot jaayenge bina wajah. Sirf **boundaries** ko mock karo (apne repos, gateways, external service clients) — data/value objects ko nahi. Yeh waise hi hai jaise tum Zomato ke andar "Restaurant" entity ko mock nahi karoge, "PaymentGateway" jaisi external dependency ko karoge.

> [!warning] `verifyNoMoreInteractions` chipakta bahut hai
> Yeh bahut strict hai — agar koi non-essential method bhi call ho gaya jo tumne verify nahi kiya, poora test fail ho jaayega. Isko sparingly use karo; zyada use karne se test tumhare implementation details se tightly coupled ho jaata hai, aur chhota sa refactor bhi test todne lagta hai.

> [!tip] Strict stubbing
> Mockito 3+ (via `MockitoExtension`) default mein strict mode use karta hai: agar koi `when(...)` stub declare kiya lekin woh kabhi use hi nahi hua, test fail ho jaayega ("UnnecessaryStubbingException"). Yeh actually accha hai — stale stubs (jo purane refactor se reh gaye) turant pakad leta hai, jo copy-paste se aaye galat tests ka common source hote hain.

## Related
- [[01-Testing-Pyramid-and-Tools]]
- [[02-JUnit-5-Basics]]
- [[04-Spring-Boot-Test]]
- [[../04-Spring-Core/03-Dependency-Injection|DI makes mocking easy]]
