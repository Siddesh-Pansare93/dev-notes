# Syntax Basics — Variables, Types, Operators, Control Flow

Bhai, agar tum Node.js/TypeScript se aa rahe ho, toh Java ki syntax dekh ke pehli baar thoda ajeeb lagega. But actually itna bhi tough nahi hai — bas kuch cheezein hain jo fundamentally alag hain, aur unhe ek baar samajh lo toh sab smooth ho jaata hai.

Socho aise — TypeScript mein tum likhte ho `let count: number = 0;` aur Java mein likhte ho `int count = 0;`. Type pehle aata hai, variable baad mein. Semicolons optional nahi hain — har statement ke baad semicolon lagta hi lagta hai. Aur sabse bada fark? **Java mein primitive types hote hain jo real objects nahi hain** — yeh concept TypeScript mein nahi hota, aur yahi cheez beginners ko confuse karti hai.

Real project mein yeh cheezein kyun matter karti hain? Imagine karo tum Swiggy ka order tracking system bana rahe ho — order ID store karna hai, price calculate karni hai, status check karna hai, loops chalane hain orders pe. Yeh sab karne ke liye tumhe Java ki basic syntax aani chahiye. Toh chalte hain depth mein.

---

## Java ka Pehla Fark: Har Cheez Ek Class Ke Andar Hoti Hai

TypeScript mein tum file ke top level pe seedha code likh sakte ho:

```typescript
// TypeScript — yeh valid hai
const name = "Siddesh";
console.log(name);
```

Java mein yeh nahi chalta. **Har code ek class ke andar hona chahiye**, aur program execution `public static void main(String[] args)` se start hota hai:

```java
// Java — har cheez class ke andar
public class Main {
    public static void main(String[] args) {
        // Tumhara code yahan aayega
        String name = "Siddesh";
        System.out.println(name);
    }
}
```

Yeh `main` method woh entry point hai jo JVM dhundta hai jab tum program chalate ho. Bilkul waise jaise Node.js mein `index.js` hota hai — but yahan class ke andar hona zaroori hai.

---

## Primitives vs Reference Types — Sabse Important Concept

> [!info] TypeScript dev ke liye special note
> TypeScript mein `number`, `string`, `boolean` technically objects bhi hote hain (wrapper objects ke through). Java mein yeh distinction **hard** hai — primitives aur objects genuinely alag cheezein hain, memory mein bhi, behavior mein bhi.

Java mein do tarah ke types hote hain:

**1. Primitive Types** — stack pe directly value store hoti hai, koi object nahi banta

| Primitive | Size   | Range / Notes                              |
| --------- | ------ | ------------------------------------------ |
| `byte`    | 8-bit  | -128 to 127                                |
| `short`   | 16-bit | -32,768 to 32,767                          |
| `int`     | 32-bit | Default integer — yahi use karo normally   |
| `long`    | 64-bit | Bade numbers ke liye, suffix `L` lagao: `1_000_000_000L` |
| `float`   | 32-bit | Decimal, suffix `f`: `3.14f`               |
| `double`  | 64-bit | Default decimal — more precision           |
| `boolean` | 1-bit  | Sirf `true` ya `false` — koi 0/1 nahi     |
| `char`    | 16-bit | Single character, single quotes: `'a'`     |

**2. Reference Types** — heap pe object banta hai, variable mein uska address (reference) store hota hai

Yeh hain: `String`, `Integer`, `List`, `Map`, aur tumhare banaye hue saare classes.

### Primitive choose karo ya Reference?

Zomato ka example lo — ek order ke liye:
- `int orderId` — primitive, fast, direct value
- `String customerName` — reference type, String class ka object
- `Double price` — capital D wala, yeh reference type hai (wrapper class)
- `double price` — small d wala, yeh primitive hai

```java
// Primitive — directly value store hoti hai
int orderCount = 150;
double orderAmount = 499.99;
boolean isPaid = true;

// Reference type — heap pe object, variable mein address
String customerName = "Rahul";
Integer loyaltyPoints = 250;   // Wrapper class — capital I
```

### Wrapper Classes — Primitives ke "Object Version"

Har primitive ka ek wrapper class hota hai:

| Primitive | Wrapper Class |
| --------- | ------------- |
| `int`     | `Integer`     |
| `long`    | `Long`        |
| `double`  | `Double`      |
| `boolean` | `Boolean`     |
| `char`    | `Character`   |
| `float`   | `Float`       |

Yeh wrapper classes kyun chahiye? **Collections ke liye.** Java generics mein primitive types directly nahi use ho sakti:

```java
// GALAT — compile error
List<int> prices = new ArrayList<>();

// SAHI — wrapper class use karo
List<Integer> prices = new ArrayList<>();

// Map mein bhi wrapper chahiye
Map<String, Double> itemPrices = new HashMap<>();
itemPrices.put("Biryani", 299.0);
itemPrices.put("Lassi", 89.0);
```

### Autoboxing aur Unboxing

Java smart hai — woh automatically `int` ko `Integer` mein convert kar deta hai (autoboxing) aur wapas bhi (unboxing):

```java
List<Integer> list = new ArrayList<>();
list.add(42);           // Autoboxing: int 42 → Integer 42 (Java khud karta hai)
int val = list.get(0);  // Unboxing: Integer → int

// But yahan ek trap hai!
Integer x = null;
int y = x;   // NullPointerException! null Integer ko unbox nahi kar sakte
```

---

## Variable Declaration — Ek Cheez TypeScript Se Ulta

TypeScript mein type baad mein likhte ho:
```typescript
let count: number = 0;
const name: string = "Alice";
```

Java mein type **pehle** likhte ho:
```java
int count = 0;
String name = "Alice";
```

### `final` — Java ka `const`

```java
int count = 0;                    // mutable variable
final double PI = 3.14159;        // immutable — change kiya toh compile error
final String APP_NAME = "Zomato"; // convention: final constants UPPER_SNAKE_CASE mein

// Yeh nahi chalega:
PI = 3.0;   // Compile Error: cannot assign a value to final variable
```

TypeScript ka `const` aur Java ka `final` mein ek fark: TypeScript ka `const` object ke andar change allow karta hai, Java ka `final` bhi reference ko lock karta hai (object ke andar changes ho sakte hain):

```java
final List<String> names = new ArrayList<>();
names.add("Siddesh");   // VALID — list ke andar add kar sakte ho
names.add("Rahul");     // VALID

names = new ArrayList<>();  // INVALID — reference change nahi kar sakte
```

### `var` — Java 10+ ka Type Inference

Java 10 ke baad `var` aaya — toh ab type infer ho jaata hai:

```java
var name = "Alice";              // String infer hoga
var count = 42;                  // int infer hoga
var prices = new ArrayList<Double>(); // ArrayList<Double> infer hoga
```

> [!warning] `var` kya nahi hai
> Java ka `var` TypeScript ka `any` nahi hai. Yeh **compile time pe type lock ho jaata hai** — TypeScript ke `const` jaisa jisme annotation nahi diya ho. Runtime pe type change nahi ho sakta. Aur `var` sirf local variables ke liye hai — method parameters ya class fields ke liye nahi.

```java
var x = 10;
x = "hello";  // Compile Error — x is int, String nahi de sakte
```

---

## Operators — Mostly Same, But Ek Bada Trap Hai

Addition, subtraction, multiplication, division, modulo — sab waise hi hai jaise TypeScript mein:

```java
int a = 10, b = 3;
int sum = a + b;        // 13
int diff = a - b;       // 7
int product = a * b;    // 30
int quotient = a / b;   // 3 (integer division!)
int remainder = a % b;  // 1
```

### Integer Division — TypeScript Developers Ka Common Mistake

TypeScript mein:
```typescript
console.log(5 / 2);  // 2.5
```

Java mein:
```java
System.out.println(5 / 2);    // 2 — decimal part cut ho jaata hai!
System.out.println(5.0 / 2);  // 2.5 — ek bhi operand double hoga toh decimal milega
System.out.println(5 / 2.0);  // 2.5
System.out.println((double) 5 / 2);  // 2.5 — casting se bhi ho jaata hai
```

Swiggy ka real example — delivery charge per km calculate karna:
```java
int totalAmount = 150;
int totalKm = 4;
int chargePerKm = totalAmount / totalKm;     // 37 — galat!
double chargePerKm2 = (double) totalAmount / totalKm;  // 37.5 — sahi
```

### `==` ka Trap — Java Ka Sabse Famous Gotcha

TypeScript mein `===` use karte ho value + type compare karne ke liye. Java mein `===` nahi hai — lekin `==` ka behavior primitives aur objects pe **alag** hai:

**Primitives ke liye** — `==` value compare karta hai (jaise TypeScript ka `===`):
```java
int x = 5, y = 5;
System.out.println(x == y);  // true — value same hai
```

**Objects/Reference types ke liye** — `==` **reference (memory address)** compare karta hai, value nahi:
```java
String a = new String("Swiggy");
String b = new String("Swiggy");

System.out.println(a == b);       // false — alag objects, alag addresses
System.out.println(a.equals(b));  // true — value same hai
```

> [!warning] String == ka trap
> Yeh Java developers ka number one gotcha hai. **Hamesha `.equals()` use karo String comparison ke liye.**
>
> Ek aur confusion: String literals Java "intern" karta hai — toh `"Swiggy" == "Swiggy"` accidentally `true` ho sakta hai. But yeh implementation detail hai, rely mat karo:
> ```java
> String a = "Swiggy";
> String b = "Swiggy";
> System.out.println(a == b);       // true — lucky, string pool se same object mila
>
> String c = new String("Swiggy");
> System.out.println(a == c);       // false — new keyword se naya object bana
> System.out.println(a.equals(c)); // true — hamesha .equals() use karo
> ```

### Comparison aur Logical Operators

```java
// Comparison
int age = 25;
boolean isAdult = age >= 18;    // true
boolean isExact = age == 25;    // true
boolean isNot25 = age != 25;    // false

// Logical
boolean hasUPILinked = true;
boolean hasSufficientBalance = false;
boolean canPay = hasUPILinked && hasSufficientBalance;  // false (AND)
boolean canOrder = hasUPILinked || hasSufficientBalance; // true (OR)
boolean notPaid = !canPay;                               // true (NOT)
```

### Ternary Operator — TypeScript Jaisa Hi

```java
// TypeScript
const status = isPaid ? "Paid" : "Pending";

// Java
String status = isPaid ? "Paid" : "Pending";
```

### Bitwise Operators (Kabhi Kabhi Kaam Aate Hain)

```java
int flags = 0b1010;       // Binary literal
int result = flags & 0b0110;  // AND
int orResult = flags | 0b0001; // OR
int shifted = flags << 2;      // Left shift
```

---

## Control Flow — Bilkul Familiar Lagega

### if-else

```java
int orderAmount = 599;

if (orderAmount > 500) {
    System.out.println("Free delivery milega!");
} else if (orderAmount > 200) {
    System.out.println("Rs. 30 delivery charge lagega");
} else {
    System.out.println("Rs. 50 delivery charge lagega");
}
```

### for Loop

```java
// Classic for loop
for (int i = 0; i < 5; i++) {
    System.out.println("Order #" + i);
}

// for-each loop — arrays aur collections ke liye
String[] restaurants = {"Biryani Blues", "Subway", "McDonald's"};
for (String restaurant : restaurants) {
    System.out.println("Restaurant: " + restaurant);
}

// for-each with List
List<Integer> orderIds = List.of(101, 102, 103, 104);
for (int id : orderIds) {
    System.out.println("Processing order: " + id);
}
```

### while aur do-while

```java
// while — condition pehle check hoti hai
int retries = 0;
while (retries < 3) {
    boolean success = sendOTP();  // UPI payment OTP
    if (success) break;
    retries++;
}

// do-while — code pehle chalta hai, condition baad mein check hoti hai
int attempt = 0;
do {
    System.out.println("Attempting delivery... " + attempt);
    attempt++;
} while (attempt < 3);
// Note: do-while mein code ATLEAST EK BAAR chalega, condition chahe jo bhi ho
```

### Switch Expression — Java 14+ ka Modern Syntax

Purana switch statement:
```java
// Old school switch — bohot verbose
String category;
switch (dayOfWeek) {
    case "MONDAY":
    case "TUESDAY":
        category = "weekday";
        break;
    case "SATURDAY":
    case "SUNDAY":
        category = "weekend";
        break;
    default:
        category = "unknown";
}
```

Naya switch expression — much cleaner (Java 14+):
```java
// Modern switch expression — much better!
String orderStatus = "DELIVERED";
String message = switch (orderStatus) {
    case "PLACED"     -> "Order placed! Restaurant ko bheja ja raha hai";
    case "ACCEPTED"   -> "Restaurant ne order accept kar liya";
    case "PREPARING"  -> "Khana ban raha hai";
    case "OUT_FOR_DELIVERY" -> "Delivery boy rasta mein hai";
    case "DELIVERED"  -> "Order deliver ho gaya!";
    case "CANCELLED"  -> "Order cancel ho gaya";
    default           -> "Status unknown";
};

System.out.println(message);  // "Order deliver ho gaya!"
```

Real Zomato-style example:
```java
int deliveryTimeMinutes = 35;
String deliveryLabel = switch (deliveryTimeMinutes / 10) {
    case 0, 1, 2 -> "Lightning Fast";   // 0-29 min
    case 3       -> "Fast Delivery";     // 30-39 min
    case 4, 5    -> "Normal";            // 40-59 min
    default      -> "Slow — order karo ya nahi?" ;
};
```

### break aur continue

```java
List<String> items = List.of("Pizza", "Burger", null, "Biryani", "Lassi");

for (String item : items) {
    if (item == null) {
        continue;  // null item skip karo, loop continue karo
    }
    if (item.equals("Biryani")) {
        System.out.println("Biryani mil gayi! Ruk jaate hain");
        break;  // Loop band karo
    }
    System.out.println("Item: " + item);
}
```

---

## Strings — Ek Pure Reference Type

`String` Java mein ek class hai — primitive nahi. Aur `String` **immutable** hai, matlab ek baar ban gayi toh change nahi hoti. Har operation ek naya String return karta hai.

```java
String restaurant = "biryani blues";

// Common String methods
String upper = restaurant.toUpperCase();     // "BIRYANI BLUES"
String lower = restaurant.toLowerCase();     // "biryani blues"
int length = restaurant.length();            // 13
boolean starts = restaurant.startsWith("biryani");  // true
boolean contains = restaurant.contains("blues");    // true
String trimmed = "  hello  ".trim();         // "hello"
String replaced = restaurant.replace("blues", "palace");  // "biryani palace"

// Comparison — HAMESHA .equals() use karo
boolean isSame = restaurant.equals("biryani blues");  // true
boolean ignoreCase = restaurant.equalsIgnoreCase("BIRYANI BLUES");  // true

// Splitting — TypeScript ke .split() jaisa hi
String csv = "Mumbai,Delhi,Bangalore,Chennai";
String[] cities = csv.split(",");  // ["Mumbai", "Delhi", "Bangalore", "Chennai"]

// Check karo empty hai ya nahi
boolean isEmpty = restaurant.isEmpty();    // false
boolean isBlank = "   ".isBlank();        // true (Java 11+) — whitespace-only bhi blank
```

### String Formatting — Template Literals Ka Java Version

TypeScript mein:
```typescript
const name = "Rahul";
const amount = 499;
console.log(`Order placed for ${name}, amount: Rs. ${amount}`);
```

Java mein `.formatted()` (Java 15+):
```java
String name = "Rahul";
int amount = 499;

// Method 1: .formatted()
String msg = "Order placed for %s, amount: Rs. %d".formatted(name, amount);

// Method 2: String.format() — purana tarika, bhi valid hai
String msg2 = String.format("Order placed for %s, amount: Rs. %d", name, amount);

// Common format specifiers:
// %s — String
// %d — integer (int, long)
// %f — decimal (float, double)
// %.2f — 2 decimal places tak
// %n — newline

double price = 299.50;
System.out.println("Price: Rs. %.2f".formatted(price));  // "Price: Rs. 299.50"
```

### Text Blocks — Multi-line Strings (Java 15+)

TypeScript mein backtick template literals hote hain. Java mein **text blocks** hain (Java 15+):

```java
// JSON body banani hai API request ke liye
String requestBody = """
        {
          "restaurantId": "R123",
          "items": [
            {"name": "Biryani", "qty": 2}
          ],
          "paymentMethod": "UPI"
        }
        """;

// SQL query likhni hai
String query = """
        SELECT o.id, o.status, r.name as restaurant_name
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE o.customer_id = %d
        AND o.status = 'DELIVERED'
        """.formatted(customerId);
```

> [!tip] Text blocks aur formatting
> Text blocks mein variable interpolation nahi hoti (TypeScript ke `${}` jaisa). Iske liye `.formatted()` use karo jaise upar example mein diya hai. Indentation text block automatically handle karta hai — closing `"""` ki position se determine hota hai.

### StringBuilder — Heavy Concatenation Ke Liye

Agar loop mein bahut strings join karne hain, `+` operator expensive hai kyunki har baar naya String object banta hai:

```java
// SLOW — har iteration mein naya String object banta hai (1000 restaurants hain toh 1000 objects!)
String result = "";
for (String restaurant : restaurants) {
    result += restaurant + ", ";  // Avoid this in loops
}

// FAST — StringBuilder ek hi object mein sab append karta hai
StringBuilder sb = new StringBuilder();
for (String restaurant : restaurants) {
    sb.append(restaurant).append(", ");
}
String result = sb.toString();

// Chaate ho toh last ", " trim karo
if (sb.length() > 2) {
    sb.setLength(sb.length() - 2);  // Last 2 characters remove karo
}
```

---

## Arrays — Fixed-Size Collections

```java
// Array declare karna aur initialize karna
int[] orderIds = {101, 102, 103, 104, 105};
String[] statuses = new String[5];  // 5 nulls ka array

// Access karna
System.out.println(orderIds[0]);    // 101 (0-indexed, TypeScript jaisa hi)
orderIds[0] = 999;                  // Modify karo

// Length — property hai, method nahi (TypeScript ka .length jaisa hi, but parens nahi)
System.out.println(orderIds.length);   // 5 — notice: length, not length()

// 2D array
int[][] matrix = {
    {1, 2, 3},
    {4, 5, 6},
    {7, 8, 9}
};
System.out.println(matrix[1][2]);  // 6

// Arrays utility class
import java.util.Arrays;
int[] nums = {5, 2, 8, 1, 9};
Arrays.sort(nums);                          // Sort in place
System.out.println(Arrays.toString(nums));  // [1, 2, 5, 8, 9]
```

> [!warning] Arrays fixed-size hote hain
> Java ka array ek baar create hone ke baad resize nahi ho sakta — bilkul TypeScript ke typed arrays jaisa. Dynamic size chahiye toh `ArrayList` use karo. Collections ke baare mein ek alag file hai.

---

## TypeScript vs Java — Side-by-Side Comparison

| TypeScript                              | Java                                        |
| --------------------------------------- | ------------------------------------------- |
| `let x: number = 1`                     | `int x = 1;`                                |
| `const PI = 3.14`                       | `final double PI = 3.14;`                   |
| `null` and `undefined`                  | `null` only (sirf reference types pe)       |
| `===` value + type compare              | `==` primitives ke liye, `.equals()` objects ke liye |
| `string`, `number`, `boolean`           | `String`, `int`/`double`, `boolean`         |
| `[1, 2, 3]`                             | `int[] x = {1,2,3}` ya `List.of(1,2,3)`    |
| `` `x=${n}` `` template literals        | `"x=%d".formatted(n)` ya text blocks        |
| Top-level code valid hai                | Sab kuch class ke andar hona chahiye        |
| `import { foo } from "./bar"`           | `import com.acme.Bar;`                      |
| `console.log(x)`                        | `System.out.println(x)`                     |
| `.length` (arrays aur strings dono pe) | `.length` arrays ke liye, `.length()` strings ke liye |
| `typeof x === "string"`                 | `x instanceof String`                       |
| Optional chaining `obj?.field`          | Java mein nahi, `Optional` use karte hain   |

---

## Complete Code Example — Sab Ek Saath

```java
package com.example.basics;

import java.util.List;
import java.util.ArrayList;

public class SwiggyOrderDemo {

    public static void main(String[] args) {

        // --- Variables aur Types ---
        var restaurantName = "Biryani Blues";   // var se type infer hoga (String)
        final int MAX_DELIVERY_TIME = 60;        // final = immutable
        int orderAmount = 599;
        double deliveryCharge = 29.99;
        boolean isPremiumUser = true;

        // --- String Formatting ---
        System.out.println("Restaurant: %s, Max Time: %d min".formatted(
            restaurantName, MAX_DELIVERY_TIME
        ));

        // --- if-else logic ---
        if (isPremiumUser || orderAmount > 500) {
            deliveryCharge = 0.0;
            System.out.println("Free delivery! Total: Rs. %.2f".formatted((double) orderAmount));
        } else {
            System.out.println("Delivery charge: Rs. %.2f".formatted(deliveryCharge));
        }

        // --- for-each loop ---
        List<String> menuItems = List.of("Biryani", "Raita", "Lassi", "Gulab Jamun");
        System.out.println("\n--- Menu Items ---");
        for (String item : menuItems) {
            System.out.println("  > " + item);
        }

        // --- Classic for loop with index ---
        System.out.println("\n--- Numbered Menu ---");
        String[] itemArray = {"Biryani", "Raita", "Lassi"};
        for (int i = 0; i < itemArray.length; i++) {
            System.out.println((i + 1) + ". " + itemArray[i]);
        }

        // --- Switch Expression (modern) ---
        String orderStatus = "OUT_FOR_DELIVERY";
        String userMessage = switch (orderStatus) {
            case "PLACED"           -> "Order mil gaya! Prepare ho raha hai";
            case "ACCEPTED"         -> "Restaurant ne accept kar liya";
            case "OUT_FOR_DELIVERY" -> "Bhaiya aa raha hai! Ghar pe raho";
            case "DELIVERED"        -> "Order aa gaya! Enjoy karo";
            case "CANCELLED"        -> "Cancelled. Refund 5-7 days mein aayega";
            default                 -> "Status check karo";
        };
        System.out.println("\nStatus Update: " + userMessage);

        // --- String comparison gotcha ---
        String status1 = new String("DELIVERED");
        String status2 = new String("DELIVERED");

        System.out.println("\n--- String Comparison Gotcha ---");
        System.out.println("== result: " + (status1 == status2));         // false — alag references
        System.out.println(".equals(): " + status1.equals(status2));      // true — value same hai

        // --- Integer division gotcha ---
        int totalBill = 500;
        int numPeople = 3;
        int splitAmount = totalBill / numPeople;               // 166 — decimal cut!
        double exactSplit = (double) totalBill / numPeople;    // 166.666...

        System.out.println("\n--- Bill Split ---");
        System.out.println("Integer split: Rs. " + splitAmount);           // 166
        System.out.println("Exact split: Rs. %.2f".formatted(exactSplit)); // 166.67

        // --- StringBuilder for concatenation ---
        List<String> orderedItems = new ArrayList<>();
        orderedItems.add("Biryani x2");
        orderedItems.add("Raita x1");
        orderedItems.add("Lassi x2");

        StringBuilder receipt = new StringBuilder("Your Order:\n");
        for (String item : orderedItems) {
            receipt.append("  - ").append(item).append("\n");
        }
        receipt.append("Total: Rs. ").append(orderAmount);
        System.out.println("\n" + receipt);

        // --- Text Block (Java 15+) ---
        String apiPayload = """
                {
                  "restaurantId": "BLR_001",
                  "customerId": 12345,
                  "items": [{"name": "Biryani", "qty": 2}],
                  "orderAmount": %d
                }
                """.formatted(orderAmount);
        System.out.println("\nAPI Payload:\n" + apiPayload);
    }
}
```

---

## Gotchas — Ye Mistakes Mat Karna

> [!warning] `==` on Strings/Objects — Reference Compare Karta Hai
> ```java
> new String("hi") == new String("hi")           // false — alag objects!
> new String("hi").equals(new String("hi"))       // true — value same
>
> // String literals ka case alag hai (string pool ki wajah se):
> "hi" == "hi"     // true — lucky, but RELY MAT KARO
> ```
> **Rule**: Objects ke liye hamesha `.equals()` use karo. Hamesha. Bina exception ke.

> [!warning] Integer Overflow — Silently Wrap Ho Jaata Hai
> ```java
> int max = Integer.MAX_VALUE;  // 2,147,483,647
> int overflow = max + 1;       // -2,147,483,648 — koi error nahi, silently wrap!
>
> // Fix:
> long safe = (long) max + 1;           // Cast karo long mein pehle
> Math.addExact(max, 1);                // Exception throw karta hai overflow pe
> ```
> Paytm ka transaction amount `int` mein store kiya aur 2 billion cross ho gaya? Overflow ho jaayega. **Large numbers ke liye hamesha `long` use karo.**

> [!warning] Null Integer Unboxing — NullPointerException
> ```java
> Integer score = null;     // Valid — Integer is a reference type
> int val = score;          // NullPointerException! null ko int mein unbox nahi kar sakte
>
> // Safe tarika:
> int val = (score != null) ? score : 0;
> ```

> [!warning] `var` Sirf Local Variables Ke Liye Hai
> ```java
> var x = 10;  // Valid — local variable
>
> // Yeh nahi chalega:
> public var name = "test";        // Compile Error — class field mein var nahi
> public void method(var x) {}     // Compile Error — parameter mein var nahi
> ```

> [!tip] Text Block Use Karo Multi-line Strings Ke Liye
> Triple-quoted `"""` strings indentation aur embedded JSON/SQL beautifully handle karte hain. Yeh TypeScript ke backtick template literals ke closest hain — lekin variable interpolation nahi hoti (uske liye `.formatted()` use karo):
> ```java
> String json = """
>         {"key": "value", "number": %d}
>         """.formatted(42);
> ```

> [!warning] `length` vs `length()`
> ```java
> int[] arr = {1, 2, 3};
> arr.length;          // SAHI — array ka length, field hai (no parentheses)
>
> String s = "hello";
> s.length();          // SAHI — String ka length, method hai (parentheses chahiye)
> s.length;            // Compile Error!
> ```
> Ek common confusion: arrays mein `.length` (no parens), String mein `.length()` (with parens).

---

## Key Takeaways

- **Primitive vs Reference**: `int`, `double`, `boolean` primitives hain — directly value store hoti hai, null nahi ho sakti. `String`, `Integer`, `List` reference types hain — heap pe object banta hai, null ho sakti hai.
- **`final` = `const`**: Immutable variable chahiye toh `final` use karo. Convention: constants ke liye `UPPER_SNAKE_CASE`.
- **`var` = smart inference**: Local variables mein type inference ke liye `var` use karo, but method parameters aur class fields mein nahi.
- **`==` ka trap**: Primitives ke liye `==` value compare karta hai. Objects/Strings ke liye `==` reference (memory address) compare karta hai — hamesha `.equals()` use karo objects ke liye.
- **Integer division**: `5 / 2 = 2` Java mein — `2.5` nahi. Double result chahiye toh ek operand `double` hona chahiye ya cast karo: `(double) 5 / 2`.
- **String immutable hai**: Har String operation naya String return karta hai. Loop mein heavy concatenation ke liye `StringBuilder` use karo.
- **Modern switch expression**: `->` syntax use karo `case X:` + `break` ki jagah — cleaner aur safer (fall-through nahi hoti).
- **`length` vs `length()`**: Arrays pe `.length` (field), Strings pe `.length()` (method) — yeh trip karta hai beginners ko.
- **Autoboxing/Unboxing**: Java automatically `int` ↔ `Integer` convert karta hai, but `null Integer` ko `int` mein unbox karne pe `NullPointerException` aata hai.
- **Har cheez class ke andar**: TypeScript ki tarah top-level code nahi likh sakte — program `public static void main(String[] args)` se start hota hai.
