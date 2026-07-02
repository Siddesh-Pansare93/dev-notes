# Encapsulation and Verification

[[02-Application-Modules|Application Modules]] define kar dena ek baat hai, lekin un boundaries ko respect karwana ek alag baat hai. Socho tumne apne Zomato jaisi app mein `order`, `inventory`, `payment` modules bana diye — lekin agar koi bhi module kisi bhi dusre module ke internal classes ko directly import kar sakta hai, toh yeh sirf naam ke liye modules hain, practically sab kuch ek hi bada spaghetti codebase hai.

Yahi problem solve karne ke liye Spring Modulith do cheezein deta hai:
1. **Package-private visibility** — compile-time par hi rok do galat access ko.
2. **`ApplicationModules.verify()`** — automated test jo boundaries todne pe fail ho jaye.

Node.js background se aaye ho toh isko aise socho: TypeScript mein tum `index.ts` se sirf kuch cheezein `export` karte ho, baaki sab internal rehta hai. Java mein wahi kaam access modifiers aur Modulith ke ArchUnit-based checks karte hain.

## Package-Private Visibility

**Kya hota hai?** Java mein agar tum kisi class, interface, ya method ke aage `public` nahi lagate, toh woh **package-private** ban jaata hai — matlab sirf usi package ke andar accessible hota hai, bahar se koi import hi nahi kar sakta.

Yeh Java ka sabse simple aur sabse powerful tool hai encapsulation enforce karne ke liye — bina kisi extra library ke, sirf ek keyword hata do (`public` mat likho) aur compiler khud enforce kar dega.

> [!important] Package-Private ki Power
> Apne internal classes, interfaces, aur methods ko package-private rakho (koi access modifier mat lagao) `public` ki jagah. Isse dusre packages (modules) unhe import tak nahi kar payenge, use karna toh door ki baat hai.

Sochiye Swiggy ka `inventory` module hai jisme `InventoryRepository` naam ki class hai jo directly database se baat karti hai. Agar yeh class `public` hai, toh `order` module ka koi bhi developer kal ko directly `new InventoryRepository()` bana ke seedha DB query maar sakta hai — inventory module ki saari business logic, validation, caching sab bypass ho jayegi. Yeh bilkul waisा hi hai jaise koi Express app mein controller se seedha `mongoose` model import karke DB hit kar de, bina service layer use kiye.

**Solution?** Sirf woh cheezein `public` banao jo tumhare module ka **API** hain — jaise `OrderService`, `Order` (DTO), etc. Baaki sab (`InventoryRepository`, internal helper classes, mapper classes) ko package-private rakho ya `internal` sub-package mein daal do.

```
inventory/
  InventoryService.java        // public — yeh hai module ka API
  Inventory.java                // public — yeh bhi expose hoga
  internal/
    InventoryRepository.java    // package-private — sirf inventory module use kar sakta hai
    InventoryMapper.java        // package-private
```

> [!tip] Node.js Analogy
> Yeh bilkul waisa hai jaise tum `barrel exports` (`index.ts`) use karte ho — sirf jo `export` karte ho wahi bahar dikhta hai. Farak sirf itna hai ki Java mein yeh convention nahi, compiler-enforced rule hai.

## Structural Verification with `ApplicationModules`

Ab sawaal yeh hai — access modifiers toh manually discipline maangte hain. Agar kisi developer ne galti se class `public` bana di, toh kaise pakdoge?

**Yahi kaam ArchUnit karta hai**, aur Spring Modulith usse integrate karta hai taaki tumhare application ki structure analyze ho aur module boundaries ka violation automatically pakda jaaye — jaise ek CI test.

Isko socho apne pipeline mein ek "architecture linter" jaisa — jaise ESLint code style check karta hai, waise hi yeh module boundaries check karta hai.

Tum typically apne root package mein ek test class banate ho:

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

Isko run karo aur agar kisi ne bhi kahin bhi module boundary tod di, test **fail** ho jayega — bilkul waise jaise ek unit test fail hota hai. Ab yeh sirf "convention" nahi raha, yeh ek **enforced contract** ban gaya jo har PR/CI run pe check hota hai.

### `.verify()` Kya Check Karta Hai?

Jab tum `verify()` call karte ho, Spring Modulith teen cheezein check karta hai:

1. **No Circular Dependencies**: Module A, Module B pe depend nahi kar sakta agar Module B pehle se Module A pe depend karta hai. Zomato ke example mein — agar `order` module `payment` module ko use karta hai, toh `payment` module wapas `order` module ko use nahi kar sakta. Circular dependency ka matlab hai tumhare modules asal mein modules hain hi nahi, ek dusre se tightly coupled blob hain.

2. **Encapsulation**: Modules sirf dusre modules ke exposed components (API) access kar sakte hain. Agar koi module kisi dusre module ke nested `.internal` package ko access karne ki koshish karega, toh exception throw hoga.

3. **Explicit Dependencies**: Agar tumne `@ApplicationModule(allowedDependencies = ...)` use karke explicitly bataya hai ki kaunse modules allowed hain, toh `verify()` check karega ki sirf wahi modules access ho rahe hain, koi extra nahi.

> [!failure] Example Violation
> Agar `OrderService` (jo `order` module mein hai) directly `InventoryRepository` ko inject karne ki koshish kare (jo `inventory.internal` sub-package mein located hai), toh `verify()` test **fail** ho jayega, yeh bataate hue ki architectural violation hui hai.
>
> Real-life mein yeh aisa hai jaise IRCTC ka "booking" module directly "payment" ke internal database tables ko query kare, bina payment ke exposed `PaymentGateway` API use kiye. Chalega abhi, lekin kal jab payment module apna internal schema refactor karega, poora booking module tootega — aur tumhe pata bhi nahi chalega jab tak production mein crash na ho.

**Kyun zaruri hai?** Kyunki bina is verification ke, module boundaries sirf "documentation" reh jaati hain — jo har naya developer padhega bhi nahi aur violate karega bina jaane. `verify()` isko ek **automated, unforgiving gatekeeper** bana deta hai.

## Printing the Module Structure

Kabhi kabhi tumhe sirf yeh dekhna hota hai ki Spring Modulith ne tumhare application ko kaise modules mein todha hai — debugging ke liye ya sirf confirm karne ke liye ki structure sahi detect hua.

Tum discovered module structure ko console pe print kar sakte ho:

```java
ApplicationModules modules = ApplicationModules.of(ShopApplication.class);
modules.forEach(System.out::println);
```

Yeh run karne pe tumhe har module ka naam, uske base package, aur uske exposed components ki list console mein dikh jayegi. Bahut useful hai jab tum debug kar rahe ho ki Modulith ne konsa package ek module maana aur konsa nahi.

> [!info] Common Mistake
> Agar tumhare packages ka structure Modulith ki expectation follow nahi karta (jaise, saare classes ek hi flat package mein hain, sub-packages nahi), toh Modulith shayad sirf ek hi "module" detect karega — poora application. Isliye directory structure disciplined rakhna zaruri hai: `com.example.shop.order`, `com.example.shop.inventory`, etc — har top-level package ek module banta hai by default.

## Key Takeaways

- **Package-private visibility** encapsulation ka pehla aur sabse simple layer hai — internal classes ko `public` mat banao, sirf module ka API expose karo.
- **`ApplicationModules.verify()`** ek ArchUnit-backed test hai jo automatically check karta hai: circular dependencies nahi hain, encapsulation break nahi hui, aur explicit allowed dependencies respect ho rahi hain.
- Violation hone par `verify()` **test fail** karega saaf exception message ke saath — yeh CI mein run karo taaki architecture drift jaldi pakda jaaye.
- `modules.forEach(System.out::println)` se tum discovered module structure debug ke liye print kar sakte ho.
- Yeh sab discipline manually enforce karne ke bajaye, Spring Modulith isko **automated aur enforceable** bana deta hai — jaise ek linter, lekin architecture ke liye.

Modules ko aur decouple karne ke liye, [[04-Events-and-Async]] explore karo.
