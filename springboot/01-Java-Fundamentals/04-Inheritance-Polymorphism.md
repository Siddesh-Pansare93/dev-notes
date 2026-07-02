# Inheritance aur Polymorphism

Socho ek second ke liye — Zomato pe order karo toh kya hota hai? Ek delivery boy aata hai. Kabhi bhi Rapido wala, kabhi scooty wala, kabhi cycle wala. Tum bas "delivery agent aao" bol dete ho — kaun aayega yeh runtime pe decide hota hai. Yahi hai **polymorphism** ka asli idea. Aur **inheritance**? Woh toh aise hai jaise ek nayi startup apna poora base model kisi bade company se uthaa le aur sirf kuch cheezein customize kare.

TypeScript developer ke liye ek baat clear kar dete hain pehle — Java mein bhi `class Dog extends Animal` wali syntax same hai. Bas kuch **stricter rules** hain:
- **Single inheritance only** — ek class sirf ek parent se `extends` kar sakti hai, multiple nahi
- Methods by default **virtual** hote hain (matlab override ho sakte hain) — TypeScript jaisa hi
- `@Override` annotation technically optional hai, but hamesha lagao — compiler tumhara dost ban jaata hai
- `super()` call **pehla statement** hona chahiye constructor mein — koi jugaad nahi chalega

---

## `extends` aur `super` — Parent-Child Relationship

Kyun zaruri hai? Kyunki real duniya mein bahut saari cheezein ek dusre se related hoti hain. Ek Zomato app mein `User`, `RestaurantOwner`, `DeliveryPartner` — teeno ke paas naam aur phone number hai. Toh woh common cheezein ek parent class mein daal do, aur baaki specific cheezein child mein.

```java
// Parent class — har cheez ka base
public class Animal {
    // protected — child class access kar sakti hai, bahar nahi
    protected final String name;

    // Constructor — object banane ke liye
    public Animal(String name) {
        this.name = name;
    }

    // Yeh method override hoga child mein
    public String speak() {
        return "..."; // generic sound
    }

    // toString — jab bhi print karo toh yeh dikhega
    @Override
    public String toString() {
        return "%s(%s)".formatted(getClass().getSimpleName(), name);
        // getSimpleName() = "Dog", "Cat", etc. — class ka naam automatically
    }
}

// Child class — Animal ki saari properties inherit karti hai
public class Dog extends Animal {
    private final String breed;

    public Dog(String name, String breed) {
        super(name);   // MUST be FIRST — parent ka constructor call karo
        // agar yeh pehla statement nahi hai, compiler error dega
        this.breed = breed;
    }

    @Override  // compiler check karta hai — wrong signature hogi toh error
    public String speak() {
        return "Woof"; // Dog ki specific awaaz
    }
}
```

`super(name)` ka matlab hai — "parent ke constructor ko yeh value de do." Java mein yeh **mandatory pehla statement** hai. TypeScript mein bhi `super()` zaroori hai constructor mein, lekin Java thoda zyaada strict hai.

> [!info] TypeScript se comparison
> TypeScript: `super()` bhool gaye? Runtime error.
> Java: `super()` bhool gaye? **Compile time error.** Java compiler pehle hi pakad leta hai. Aur agar parent ka no-arg constructor nahi hai, toh explicitly `super(...)` likhna hi padega.

---

## Polymorphism — Ek Reference, Kaafi Types

Yahi magic hai OOP ki. **Parent type ka reference child type ka object hold kar sakta hai**, aur method call hamesha actual runtime type ka version chalega.

```java
// a ka type Animal hai — reference
Animal a = new Dog("Rex", "Labrador");

// speak() call hogi — lekin KAUNSA speak()?
System.out.println(a.speak());   // Output: "Woof" — Dog ka version!
// Yeh hai dynamic dispatch — runtime pe decide hota hai
```

Zomato analogy: Tum "payment gateway" pe click karte ho. Pata nahi andar UPI hai, Card hai ya Wallet — tum bas `pay()` call karte ho. Actual implementation runtime pe decide hoti hai.

Node.js mein tum yeh duck typing se karte the — koi bhi object jisme `pay()` method ho, chal jaata tha. Java mein yeh type-safe hai — compiler guarantee karta hai ki `Animal` type ka jo bhi object aaye, usmein `speak()` zaroor hogi.

---

## `instanceof` aur Pattern Matching — Type Check karo Smart Tarike se

Kabhi kabhi tum jaanna chahte ho ki actual object kya hai. Pehle ka style:

```java
// Old way — verbose aur prone to ClassCastException
if (a instanceof Dog) {
    Dog d = (Dog) a;        // manually cast karo
    System.out.println(d.breed);
}
```

Java 16 ke baad — **pattern matching** aaya, bilkul TypeScript type guards jaisa:

```java
// New way — Java 16+ pattern variable
if (a instanceof Dog d) {
    // d yahan Dog type ka hai — automatically cast ho gaya
    System.out.println(d.speak());  // d typed as Dog inside this block
}
```

TypeScript mein:
```typescript
if (a instanceof Dog) {
    a.bark(); // TypeScript yahan a ko Dog samajhta hai
}
```

Java 16+ mein practically same hi hai — sirf variable directly declare hoti hai `instanceof` ke saath.

---

## `final`, `abstract`, `sealed` — Class pe Control

### Class-level Modifiers

| Modifier      | Kya matlab hai                                                |
| ------------- | ------------------------------------------------------------- |
| `final`       | Koi bhi class isko extend nahi kar sakti — locked            |
| `abstract`    | Object nahi bana sakte iska — sirf extend kar sakte hain     |
| `sealed`      | Sirf specific classes extend kar sakti hain (Java 17+)       |
| *(kuch nahi)* | Default — koi bhi extend kar sakta hai                       |

### Abstract Class — Template banao

```java
// Abstract class — blueprint hai, object nahi ban sakta iska
public abstract class Shape {
    // Abstract method — koi body nahi, child implement karega
    public abstract double area();

    // Concrete method — yeh sab shapes use kar sakte hain
    public String describe() {
        return "Shape with area=" + area();
        // area() yahan polymorphically call hogi — actual shape ki
    }
}

// final class — koi aur extend nahi kar sakta Circle ko
public final class Circle extends Shape {
    private final double r;

    public Circle(double r) {
        this.r = r;
    }

    @Override
    public double area() {
        return Math.PI * r * r;  // Circle ka formula
    }
}

public class Rectangle extends Shape {
    private final double width, height;

    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }

    @Override
    public double area() {
        return width * height;  // Rectangle ka formula
    }
}

// Usage
Shape s1 = new Circle(5);
Shape s2 = new Rectangle(4, 6);

System.out.println(s1.describe());  // "Shape with area=78.539..."
System.out.println(s2.describe());  // "Shape with area=24.0"
// describe() ek hi method, dono pe alag result — polymorphism!
```

> [!tip] Abstract vs Interface
> Abstract class use karo jab **shared state** (fields) aur **partial implementation** chahiye. Interface use karo jab sirf **contract** define karna ho. Spring mein zyaada interfaces use hoti hain — aage dekhenge.

---

## Method Overriding ke Rules — Thoda Strict hai Java

TypeScript thoda lenient hai overriding mein. Java mein rules hain:

1. **Same method name** — obviously
2. **Same ya covariant return type** — child class thoda specific return type de sakti hai
3. **Same parameter types** — ek bhi parameter different hua toh overload ho jaayega, override nahi
4. **Visibility kam nahi ho sakti** — parent mein `public` hai toh child mein `public` ya zyaada hi rehni chahiye, `private` nahi ho sakti
5. **Broader checked exceptions throw nahi kar sakte** — parent se zyaada exceptions add nahi kar sakte

```java
public class Animal {
    public Animal makeChild() { return new Animal("baby"); }
    // Return type Animal hai
}

public class Dog extends Animal {
    @Override
    public Dog makeChild() { return new Dog("puppy", "Lab"); }
    // Covariant return — Dog, Animal ka subtype hai, toh valid hai
}
```

```java
// GALAT — compile error aayega
public class Dog extends Animal {
    @Override
    private String speak() {  // ERROR! public ko private nahi kar sakte
        return "Woof";
    }
}
```

`@Override` annotation ka ek bada fayda — agar tum galti se wrong signature likh do, compiler immediately batata hai:

```java
public class Dog extends Animal {
    @Override
    public String Speak() {  // ERROR! capital S — Animal mein Speak() nahi hai
        return "Woof";
    }
    // Without @Override yeh silently ek naya method bana deta
    // With @Override compiler pakad leta hai
}
```

---

## Object Class — Har Java Class ka Ancestor

Java mein har class implicitly `java.lang.Object` se inherit karti hai. Yeh universe ki base class hai. Kuch important methods jo tum usually override karte ho:

### `toString()` — Debug aur Logging ke liye

```java
public class DeliveryAgent {
    private final String name;
    private final String vehicleType;

    public DeliveryAgent(String name, String vehicleType) {
        this.name = name;
        this.vehicleType = vehicleType;
    }

    @Override
    public String toString() {
        return "DeliveryAgent{name='%s', vehicle='%s'}".formatted(name, vehicleType);
    }
}

DeliveryAgent agent = new DeliveryAgent("Raju", "Bike");
System.out.println(agent);
// Without toString(): com.example.DeliveryAgent@7852e922 (useless!)
// With toString(): DeliveryAgent{name='Raju', vehicle='Bike'} (useful!)
```

### `equals()` aur `hashCode()` — Value Equality

```java
public class OrderId {
    private final String id;

    public OrderId(String id) { this.id = id; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;          // same object
        if (!(o instanceof OrderId other)) return false;  // null ya wrong type
        return id.equals(other.id);           // actual comparison
    }

    @Override
    public int hashCode() {
        return id.hashCode();  // equals ke saath consistent rehna chahiye
    }
}

OrderId id1 = new OrderId("ORD-001");
OrderId id2 = new OrderId("ORD-001");

System.out.println(id1 == id2);       // false — different objects
System.out.println(id1.equals(id2));  // true — same value
```

> [!warning] equals() aur hashCode() saath override karo
> Agar `equals()` override ki aur `hashCode()` nahi ki — `HashMap` aur `HashSet` mein bugs aayenge. Dono hamesha saath override karo. IntelliJ mein auto-generate karo — `Alt+Insert` → Generate → equals() and hashCode().

---

## Real Project Example — Payment System (Zomato Style)

Yeh dekho ek practical example — jaise Zomato pe alag alag payment methods hote hain:

```java
package com.example.payments;

// Abstract base — sab payments ke liye common structure
public abstract class Payment {
    protected final double amount;
    protected final String orderId;

    public Payment(double amount, String orderId) {
        this.amount = amount;
        this.orderId = orderId;
    }

    // Yeh method har payment type implement karega — different tarike se
    public abstract String process();

    // Yeh method final hai — koi override nahi kar sakta
    // Template method pattern — common logic yahan, specific logic abstract method mein
    public final String receipt() {
        return "Order %s: Paid ₹%.2f via %s".formatted(
            orderId,
            amount,
            getClass().getSimpleName()  // "UpiPayment", "CardPayment", etc.
        );
    }

    @Override
    public String toString() {
        return "%s[₹%.2f for %s]".formatted(getClass().getSimpleName(), amount, orderId);
    }
}

// UPI Payment — jaise PhonePe ya GPay
public class UpiPayment extends Payment {
    private final String upiId;

    public UpiPayment(double amount, String orderId, String upiId) {
        super(amount, orderId);  // Parent ka constructor — PEHLE
        this.upiId = upiId;
    }

    @Override
    public String process() {
        return "UPI request sent to %s for ₹%.2f".formatted(upiId, amount);
    }
}

// Card Payment — Visa/Mastercard
public class CardPayment extends Payment {
    private final String last4;
    private final String bank;

    public CardPayment(double amount, String orderId, String last4, String bank) {
        super(amount, orderId);
        this.last4 = last4;
        this.bank = bank;
    }

    @Override
    public String process() {
        return "%s card *%s charged ₹%.2f".formatted(bank, last4, amount);
    }
}

// Wallet Payment — Paytm/Amazon Pay
public class WalletPayment extends Payment {
    private final String walletProvider;
    private final String userId;

    public WalletPayment(double amount, String orderId, String walletProvider, String userId) {
        super(amount, orderId);
        this.walletProvider = walletProvider;
        this.userId = userId;
    }

    @Override
    public String process() {
        return "%s wallet deducted ₹%.2f from user %s".formatted(walletProvider, amount, userId);
    }
}

// Polymorphic use — yahan magic hoti hai
public class PaymentProcessor {
    public static void main(String[] args) {
        // Alag alag payment types — sab Payment reference mein store
        Payment[] payments = {
            new UpiPayment(249.00, "ORD-101", "raju@paytm"),
            new CardPayment(499.00, "ORD-102", "4242", "HDFC"),
            new WalletPayment(149.00, "ORD-103", "Paytm", "user_789"),
        };

        // Ek loop — sab handle ho gaye!
        // process() ka actual version runtime pe decide hota hai
        for (Payment p : payments) {
            System.out.println(p.process());   // Polymorphism in action
            System.out.println(p.receipt());   // final method — same for all
            System.out.println("---");
        }

        // instanceof se specific type check karo agar zaroorat ho
        for (Payment p : payments) {
            if (p instanceof UpiPayment upi) {
                System.out.println("UPI found: " + upi);
                // yahan upi UpiPayment type ka hai
            }
        }
    }
}
```

Output:
```
UPI request sent to raju@paytm for ₹249.00
Order ORD-101: Paid ₹249.00 via UpiPayment
---
HDFC card *4242 charged ₹499.00
Order ORD-102: Paid ₹499.00 via CardPayment
---
Paytm wallet deducted ₹149.00 from user user_789
Order ORD-103: Paid ₹149.00 via WalletPayment
---
```

---

## TypeScript se Java ka Comparison

| TypeScript                             | Java                                           |
| -------------------------------------- | ---------------------------------------------- |
| `class Dog extends Animal`             | `class Dog extends Animal` — same syntax!      |
| `super()` in constructor               | `super()` — must be **first statement**        |
| Multiple `implements` allowed          | Same — `implements A, B, C`                    |
| Multiple `extends` (interface)         | Class: single `extends` only                   |
| Methods virtual by default             | Same — `final` lagao lock karne ke liye        |
| `abstract class`                       | `abstract class`                               |
| `instanceof Dog` (narrows type)        | `obj instanceof Dog d` (Java 16+ pattern var)  |
| `Object.prototype` chain               | All classes extend `java.lang.Object`          |
| TS mein `sealed` nahi                  | `sealed class` — Java 17+                      |
| Duck typing possible                   | Strict type checking — compiler guarantee      |

---

## Gotchas — Yeh Mistakes Mat Karna

> [!warning] Multiple inheritance of state nahi hoti
> Java mein class sirf ek class extend kar sakti hai. Node.js mein mixins ya multiple inheritance hoti thi prototype chain se — Java mein nahi. Agar multiple sources se behavior chahiye, `interface` (with default methods) ya composition use karo.

> [!warning] Constructors inherit nahi hote
> Yeh Node.js developers ko surprise karta hai. Agar `Animal` ka `Animal(String name)` constructor hai, toh `Dog` class mein automatically woh nahi aata. Explicitly likhna padega:
> ```java
> public class Dog extends Animal {
>     public Dog(String name, String breed) {
>         super(name);  // Yeh manually likhna padega — inherit nahi hota
>         this.breed = breed;
>     }
> }
> ```

> [!warning] Constructor mein overridable method mat call karo
> Yeh ek serious bug source hai. Socho:
> ```java
> public class Animal {
>     public Animal() {
>         System.out.println(speak());  // DANGER! Override hogi Dog ki
>     }
>     public String speak() { return "..."; }
> }
>
> public class Dog extends Animal {
>     private final String name;
>     public Dog(String name) {
>         super();  // Yahan Dog.speak() call hogi
>         this.name = name;  // But this.name ABHI SET NAHI HUA!
>     }
>     @Override
>     public String speak() {
>         return "Woof from " + name;  // name = null here!
>     }
> }
>
> new Dog("Rex");  // Prints: "Woof from null" — BUG!
> ```
> Constructor mein call hone wale methods ko `final` ya `private` rakho.

> [!warning] Casting se pehle instanceof check karo
> ```java
> Animal a = new Dog("Rex", "Lab");
>
> // Galat — ClassCastException aayi toh?
> Cat c = (Cat) a;  // Runtime exception!
>
> // Sahi — pehle check karo
> if (a instanceof Cat cat) {
>     // sirf yahan enter hoga agar a actually Cat hai
> }
> ```

> [!tip] Composition prefer karo deep hierarchies pe
> Spring mein tum dekhoge ki deep inheritance chains kum use hoti hain. Jab class hierarchy 3-4 levels deep ho jaaye — sochno. "Is-a" relationship ke liye inheritance, "has-a" ke liye composition. Spring khud dependency injection se composition heavily use karta hai.

---

## Key Takeaways

- **`extends`** se child class parent ki sab non-private fields aur methods inherit karti hai — code reuse ka best way
- **`super(args)`** parent ka constructor call karta hai — Java mein yeh **first statement** hona chahiye, warna compile error
- **Polymorphism** mein parent type reference child type object hold karta hai — `animal.speak()` runtime pe decide hoti hai ki kaun sa version chalega (dynamic dispatch)
- **`@Override`** hamesha lagao — signature mismatch pe compiler pakad leta hai, silent bugs se bachao
- **`abstract` class** ka object nahi ban sakta — sirf blueprint hai, child implement karegi abstract methods
- **`final` class** extend nahi ho sakti; **`final` method** override nahi ho sakta
- **`instanceof` pattern matching** (Java 16+) — `if (obj instanceof Dog d)` mein `d` automatically Dog-typed hai, cast ki zaroorat nahi
- **`equals()` aur `hashCode()`** hamesha saath override karo — HashMap/HashSet mein unexplained bugs aate hain agar nahi kiya
- **Constructor mein overridable methods mat call karo** — child object puri tarah initialize nahi hua hota, null pointer ya wrong values milti hain
- **Composition over inheritance** — Spring strongly favor karta hai yeh approach; flat class hierarchies zyaada maintainable hoti hain
