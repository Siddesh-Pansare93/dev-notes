---
tags: [testing, mockito, mocks]
aliases: [Mockito, Mocks, Stubs]
stage: advanced
---

# Mockito

> [!info] For the Express/TS dev
> Mockito is `jest.fn()` / `vi.fn()` for Java — but more powerful and more verbose. Where Jest mocks the module loader (`jest.mock("./db")`), Mockito mocks **objects** by generating a subclass at runtime via bytecode magic. So you mock dependencies you've **injected**, not modules you've imported.

## Concept

Mockito creates fake implementations of classes/interfaces. You then **stub** methods (define return values) and **verify** interactions.

Three core verbs:

| Verb | Purpose |
|------|---------|
| `mock(X.class)` | Make a fake X. All methods return defaults (null/0/false). |
| `when(x.foo()).thenReturn(y)` | Stub: when foo is called, return y. |
| `verify(x).foo()` | Assert that foo was called. |

Plus:

| Verb | Purpose |
|------|---------|
| `spy(realObj)` | Real object but you can stub specific methods. |
| `ArgumentCaptor` | Capture args passed to a mock for inspection. |
| `@Mock` / `@InjectMocks` | Annotation form. |

## Code example

### Plain Mockito

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
        // Arrange (stub)
        when(gateway.charge(anyInt())).thenReturn("txn-123");
        when(repo.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        var result = service.place(new Cart(List.of(new Item("Book", 20))));

        // Assert
        assertThat(result.txnId()).isEqualTo("txn-123");

        // Verify interactions
        verify(gateway).charge(20);
        verify(repo).save(orderCaptor.capture());
        verify(email).sendConfirmation(orderCaptor.getValue());
        verifyNoMoreInteractions(email);

        // Inspect captured arg
        Order saved = orderCaptor.getValue();
        assertThat(saved.status()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    void chargeFails_throwsAndDoesntSave() {
        when(gateway.charge(anyInt()))
            .thenThrow(new PaymentException("declined"));

        assertThatThrownBy(() -> service.place(new Cart(List.of(new Item("X", 5)))))
            .isInstanceOf(PaymentException.class);

        verify(repo, never()).save(any());
        verifyNoInteractions(email);
    }

    @Test
    void retriesOnTransientError() {
        // Different return per call
        when(gateway.charge(anyInt()))
            .thenThrow(new TransientException())
            .thenReturn("txn-ok");

        var result = service.place(new Cart(List.of(new Item("X", 5))));

        verify(gateway, times(2)).charge(5);
        assertThat(result.txnId()).isEqualTo("txn-ok");
    }
}
```

### Spies (real object, partial mock)

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

### Argument matchers

```java
when(repo.findByEmail(anyString())).thenReturn(Optional.of(user));
when(svc.process(eq("a"), any(Config.class))).thenReturn(true);
when(repo.find(argThat(s -> s.startsWith("admin")))).thenReturn(adminUser);
```

> If you use **any matcher** for one arg, you must use matchers for **all** args (use `eq()` for literals).

### `doReturn` for tricky cases

`when(...).thenReturn(...)` calls the real method during stubbing. For void methods or spies use:

```java
doReturn("x").when(spy).method();
doThrow(new IOException()).when(mock).voidMethod();
doNothing().when(mock).voidMethod();
```

### Mocking statics (Mockito 3.4+)

```java
try (MockedStatic<Instant> clock = mockStatic(Instant.class)) {
    clock.when(Instant::now).thenReturn(Instant.parse("2024-01-01T00:00:00Z"));
    // ...
}
```

> [!warning] Static mocking is a smell — prefer injecting a `Clock` or `Supplier<Instant>`.

## Express/Node comparison

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

| Mockito | Jest |
|---------|------|
| `mock(X.class)` | `jest.fn()` / manual stub object |
| `when(x.f()).thenReturn(y)` | `jest.fn().mockReturnValue(y)` |
| `verify(x).f()` | `expect(x.f).toHaveBeenCalled()` |
| `verify(x, times(2)).f()` | `.toHaveBeenCalledTimes(2)` |
| `verify(x, never()).f()` | `.not.toHaveBeenCalled()` |
| `ArgumentCaptor` | `expect(x.f).toHaveBeenCalledWith(...)` or `mock.calls[0]` |
| `@Mock` + `@InjectMocks` | manual constructor wiring |
| `spy(real)` | `jest.spyOn(obj, 'method')` |
| `doThrow(...).when(...)...` | `.mockImplementation(() => { throw ... })` |
| `mockStatic` | `jest.mock('module')` |

The biggest mental shift: **Jest mocks modules, Mockito mocks objects.** This is why DI matters so much in Java — you can't `jest.mock("./db")` your way out of bad design.

## Gotchas

> [!warning] `when()` doesn't work on void methods
> Use `doNothing()` / `doThrow()` / `doAnswer()`.

> [!warning] Mocking final classes
> Pre-Mockito 2: impossible. Modern Mockito: works if `mockito-inline` is on the classpath (Spring Boot's starter includes it). Still — final classes are often a smell to mock.

> [!danger] Don't mock what you don't own
> Mocking `String`, `LocalDate`, or third-party value objects leads to brittle tests. Mock **boundaries** (your repos, gateways), not data.

> [!warning] `verifyNoMoreInteractions` is sticky
> It's strict — if a non-essential method was called, the test fails. Use it sparingly; over-using couples tests to implementation.

> [!tip] Strict stubbing
> Mockito 3+ defaults to strict mode (`MockitoExtension`): unused stubs fail the test. This catches stale `when(...)` calls — usually a good thing.

## Related
- [[01-Testing-Pyramid-and-Tools]]
- [[02-JUnit-5-Basics]]
- [[04-Spring-Boot-Test]]
- [[../04-Spring-Core/03-Dependency-Injection|DI makes mocking easy]]
