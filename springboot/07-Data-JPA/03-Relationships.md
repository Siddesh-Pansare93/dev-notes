# JPA Relationships — Entities Ko Saath Jodte Hain

Socho ek second — Zomato ka database kaisa hoga? Ek **Customer** hai, uske kai **Orders** hain, har Order mein kai **OrderItems** hain, aur har OrderItem ek **Restaurant** aur **MenuItem** se link hai. Yeh sab real data hota hai — tables mein foreign keys, join tables, parent-child relationships. Bilkul waise hi jaise IRCTC mein ek **Passenger** ka ek **PNR** hota hai, aur us PNR ke andar kai **Tickets** hoti hain — sab kuch aapas mein juda hua.

Yahi hai JPA Relationships ka kaam. Alag-alag entities ko ek doosre se connect karna — bilkul waise jaise real duniya mein objects connected hote hain.

Agar tum Prisma (TypeScript) se aaye ho, toh tumne yeh cheezein likhi hongi:

```prisma
model Order {
  customerId Int
  customer   Customer @relation(fields: [customerId], references: [id])
  items      OrderItem[]
}
```

JPA mein bhi same kaam hota hai — bas annotations ke through. Lekin ek critical concept hai jo Prisma tumse chhupa leta hai: **Owning Side**. Yahi cheez beginners ko sabse zyada confuse karti hai, toh isko dhyan se samjho.

---

## Owning Side — Yeh Concept Kya Hai?

Database mein relationship ka matlab hota hai: ek table mein doosri table ka **foreign key** hai.

JPA mein do entities hoti hain — ek jiske paas **actual FK column** hai (owning side), aur ek jo sirf mapping track karti hai (inverse side). **Sirf owning side ki changes database mein save hoti hain.**

| Relationship | Owning Side | Inverse Side |
| --- | --- | --- |
| `@ManyToOne` ↔ `@OneToMany` | `@ManyToOne` side (FK column yahan hota hai) | `@OneToMany` side (`mappedBy` use karta hai) |
| `@OneToOne` ↔ `@OneToOne` | Jiske paas FK column hai | Doosra side (`mappedBy` use karta hai) |
| `@ManyToMany` ↔ `@ManyToMany` | Koi bhi ek (jo `@JoinTable` define kare) | Doosra (`mappedBy` use kare) |

> [!warning] Sirf Owning Side Matter Karta Hai
> Agar tum sirf **inverse side** update karo — matlab `customer.getOrders().add(order)` karo lekin `order.setCustomer(customer)` na karo — toh Hibernate kuch save **nahi** karega. FK null rahega. Hamesha **owning side** update karo.

---

## Default Fetch Types — EAGER vs LAZY

Yeh ek aur critical topic hai jo performance ko directly affect karta hai:

| Annotation | Default Fetch | Best Practice |
| --- | --- | --- |
| `@ManyToOne` | **EAGER** | Override karke **LAZY** banao |
| `@OneToOne` | **EAGER** | Override karke **LAZY** banao |
| `@OneToMany` | LAZY | As-is rakho |
| `@ManyToMany` | LAZY | As-is rakho |

EAGER ka matlab hai — jab bhi parent entity load karo, automatically sab children bhi load ho jaenge. Swiggy ke case mein: sirf ek `Order` load karo, toh puri `Customer` bhi aa jayegi, uske saath poora address, poore past orders... 🤯 Yeh bilkul aisa hai jaise IRCTC pe sirf apna PNR status check karo, aur system chupke se pura train ka passenger manifest bhi fetch kar le — bilkul useless aur slow.

Hamesha explicitly `fetch = FetchType.LAZY` likho `@ManyToOne` aur `@OneToOne` pe.

---

## Code Example — Zomato Style: Customer → Order → OrderItem

Chalo ek real example dekhte hain. Ek Customer ke kai Orders hote hain. Har Order mein kai OrderItems hote hain.

### Customer Entity — "One" Side

```java
@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // Customer ke paas multiple Orders ho sakte hain — OneToMany
    // mappedBy = "customer" matlab: Order entity mein "customer" field owning side hai
    // cascade = ALL matlab: Customer save/delete karoge toh Orders bhi automatically save/delete honge
    // orphanRemoval = true matlab: Order ko customer ki list se nikalo toh DB se bhi delete hoga
    @OneToMany(
        mappedBy = "customer",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    private List<Order> orders = new ArrayList<>(); // hamesha initialize karo — NullPointerException se bachao

    // Helper method — dono sides ko sync mein rakhta hai
    // Sirf customer.addOrder(order) kaho — yeh automatically order.setCustomer(this) bhi karega
    public void addOrder(Order order) {
        orders.add(order);
        order.setCustomer(this); // owning side set karo!
    }

    public void removeOrder(Order order) {
        orders.remove(order);
        order.setCustomer(null); // owning side clear karo
    }

    // getters/setters...
}
```

### Order Entity — Middle Child

```java
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Yeh OWNING SIDE hai — customer_id FK column yahan hai
    // fetch = LAZY explicitly set karo (default EAGER hai, jo bad hai)
    // optional = false matlab: Order bina Customer ke ho hi nahi sakta
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false) // actual FK column ka naam
    private Customer customer;

    // Order ke paas multiple OrderItems hain
    @OneToMany(
        mappedBy = "order",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    private List<OrderItem> items = new ArrayList<>();

    // OneToOne: har Order ka ek Shipment hoga
    @OneToOne(
        mappedBy = "order",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY // explicitly LAZY — default EAGER hai!
    )
    private Shipment shipment;

    @Column(nullable = false)
    private Instant placedAt;

    // Helper method
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this); // owning side set karna mat bhoolo!
    }

    // getters/setters...
}
```

### OrderItem Entity — Leaf Node

```java
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Owning side of Order ↔ OrderItem relationship
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // Owning side of Product ↔ OrderItem relationship
    // (Product entity se link hai — MenuItem jaisa socho)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private int quantity;

    private BigDecimal unitPrice; // snapshot price — menu price baad mein change ho sakta hai

    // getters/setters...
}
```

### Shipment Entity — OneToOne Example

```java
@Entity
@Table(name = "shipments")
public class Shipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Owning side — shipment table mein order_id FK hai
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    private String trackingNumber;
    private Instant estimatedDelivery;

    // getters/setters...
}
```

---

## ManyToMany — Tags/Categories Example

Socho Swiggy pe restaurants aur cuisines: ek Restaurant kai Cuisines serve karta hai (Indian, Chinese, Italian), aur ek Cuisine kai Restaurants pe available hai. Yeh classic **ManyToMany** hai. Ya phir socho CRED app pe: ek **User** ke kai **Cards** ho sakte hain reward ke liye eligible, aur ek **Reward Offer** kai alag **Users** ko mil sakta hai — dono taraf se "many" hai.

### Simple Approach — Jab Join Table Pe Extra Columns Na Chahiye

```java
@Entity
public class Restaurant {

    @Id
    @GeneratedValue
    private Long id;

    private String name;

    // Owning side — @JoinTable yahan define karein
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "restaurant_cuisines",           // join table ka naam
        joinColumns = @JoinColumn(name = "restaurant_id"),
        inverseJoinColumns = @JoinColumn(name = "cuisine_id")
    )
    private Set<Cuisine> cuisines = new HashSet<>(); // Set use karo, List nahi!
}

@Entity
public class Cuisine {

    @Id
    @GeneratedValue
    private Long id;

    private String name; // "North Indian", "Chinese", etc.

    // Inverse side — mappedBy points to owning side ka field name
    @ManyToMany(mappedBy = "cuisines")
    private Set<Restaurant> restaurants = new HashSet<>();
}
```

### Better Approach — Explicit Join Entity (Recommended)

Agar join table pe extra data chahiye — jaise "restaurant ne yeh cuisine kab add ki", ya "is cuisine ka restaurant pe special discount hai" — toh `@ManyToMany` chhodo aur explicit entity banao. Yeh production-grade apps mein hamesha better hota hai.

```java
// Join entity — article_tags table ko explicitly represent karta hai
@Entity
@Table(name = "article_tags")
public class ArticleTag {

    @EmbeddedId // composite primary key
    private ArticleTagId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("articleId") // ArticleTagId ke articleId field ko map karo
    private Article article;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("tagId") // ArticleTagId ke tagId field ko map karo
    private Tag tag;

    // Extra columns jo @ManyToMany mein possible nahi hote
    private Instant addedAt;
    private String addedBy; // kaun ne yeh tag add kiya

    // constructor, getters/setters...
}

// Composite Key — @Embeddable aur Serializable dono zaroori hain
@Embeddable
public record ArticleTagId(Long articleId, Long tagId) implements Serializable {
    // Java record automatically equals() aur hashCode() provide karta hai
}

// Article entity
@Entity
public class Article {

    @Id
    @GeneratedValue
    private Long id;

    private String title;

    // Ab @ManyToMany nahi — ArticleTag ke through jaate hain
    @OneToMany(mappedBy = "article", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ArticleTag> articleTags = new HashSet<>();
}

// Tag entity
@Entity
public class Tag {

    @Id
    @GeneratedValue
    private Long id;

    private String name;

    @OneToMany(mappedBy = "tag")
    private Set<ArticleTag> articleTags = new HashSet<>();
}
```

> [!tip] Production Mein Hamesha Explicit Join Entity Use Karo
> Shuru mein `@ManyToMany` simple lagti hai, lekin jaise hi tumhe join table pe ek bhi extra column chahiye (audit trail, ordering, metadata), tum phans jaate ho. Explicit entity se start karo — future self tumhara shukriya adaa karega.

---

## Cascading — Operations Propagate Kaise Hote Hain

Cascade ka matlab hai: **parent pe operation karo, children pe automatically bhi ho jaaye.**

Zomato analogy: Customer ka account delete karo → uske saare Orders bhi delete ho jaayein. Yeh `CascadeType.REMOVE` ya `CascadeType.ALL` karta hai. Ya OYO ka example lo: ek Hotel ko listing se hatao → uske saare Rooms bhi automatically inactive ho jaane chahiye, kyunki Room bina Hotel ke exist hi nahi kar sakta.

| CascadeType | Kya Hota Hai |
| --- | --- |
| `PERSIST` | Parent save karo → unsaved children bhi save ho jaenge |
| `MERGE` | Parent update karo → detached children bhi merge ho jaenge |
| `REMOVE` | Parent delete karo → children bhi delete ho jaenge |
| `DETACH` | Parent detach karo → children bhi detach ho jaenge |
| `REFRESH` | Parent refresh karo → children bhi DB se refresh ho jaenge |
| `ALL` | Upar ke sab operations |

### OrphanRemoval — Cascade REMOVE Se Alag Hai

Yeh concept confuse karta hai beginners ko. Farq samjho:

- `CascadeType.REMOVE`: Parent **delete** karo toh children delete hote hain
- `orphanRemoval = true`: Child ko parent ki **collection se remove** karo toh child delete hota hai

```java
// CascadeType.REMOVE demo:
entityManager.remove(order); // → OrderItems bhi delete honge (agar cascade = ALL/REMOVE hai)

// orphanRemoval demo:
Order order = orderRepo.findById(1L).get();
OrderItem item = order.getItems().get(0);

order.getItems().remove(item); // → orphanRemoval=true hai toh yeh item DB se DELETE hoga
// item.setOrder(null) karne ki zaroorat nahi (Hibernate khud handle karta hai)

orderRepo.save(order); // save/flush pe DELETE query chalegi
```

> [!info] OrphanRemoval Kab Use Karein
> `orphanRemoval = true` sirf tab use karo jab child entity sirf usi parent ke saath exist kar sakta ho. `OrderItem` bina `Order` ke meaningless hai — toh `orphanRemoval = true` sahi hai. Lekin `Tag` (`Article` ke saath ManyToMany) independent exist kar sakta hai — toh `orphanRemoval` mat lagao.

---

## Prisma vs JPA — TypeScript Developer Ke Liye

Agar tum Prisma se aaye ho, yeh comparison helpful hoga:

```prisma
// Prisma schema
model Customer {
  id     Int     @id @default(autoincrement())
  name   String
  orders Order[]
}

model Order {
  id         Int         @id @default(autoincrement())
  customerId Int
  customer   Customer    @relation(fields: [customerId], references: [id])
  items      OrderItem[]
}
```

| Prisma | JPA/Hibernate |
| --- | --- |
| `orders Order[]` (inverse) | `@OneToMany(mappedBy="customer")` |
| `customer Customer @relation(...)` | `@ManyToOne @JoinColumn(name="customer_id")` |
| `onDelete: Cascade` in schema | `cascade = CascadeType.REMOVE` |
| Implicit M2M (Prisma handles join table) | `@ManyToMany @JoinTable(...)` — tum define karo |
| Explicit join model | `@EmbeddedId` + `@MapsId` |
| `include: { orders: true }` | `JOIN FETCH` ya `@EntityGraph` |
| Prisma hides owning side concept | JPA mein explicitly owning side manage karo |

**Sabse Bada Farq**: Prisma mein tum dono sides update karo ya na karo — Prisma internally handle karta hai. JPA mein agar owning side update nahi kiya, **change persist nahi hogi**. Helper methods is problem ka solution hain.

---

## Real Usage — Service Layer Mein Kaise Use Karein

```java
@Service
@Transactional
public class OrderService {

    private final CustomerRepository customerRepo;
    private final OrderRepository orderRepo;
    private final ProductRepository productRepo;

    public OrderService(CustomerRepository customerRepo,
                        OrderRepository orderRepo,
                        ProductRepository productRepo) {
        this.customerRepo = customerRepo;
        this.orderRepo = orderRepo;
        this.productRepo = productRepo;
    }

    // Naya order place karna — Zomato style
    public Order placeOrder(Long customerId, List<OrderItemRequest> itemRequests) {
        // 1. Customer fetch karo
        Customer customer = customerRepo.findById(customerId)
            .orElseThrow(() -> new CustomerNotFoundException("Customer nahi mila: " + customerId));

        // 2. Naya Order banao
        Order order = new Order();
        order.setPlacedAt(Instant.now());

        // 3. Helper method use karo — yeh dono sides sync karta hai
        customer.addOrder(order);

        // 4. OrderItems add karo
        for (OrderItemRequest req : itemRequests) {
            Product product = productRepo.findById(req.productId())
                .orElseThrow(() -> new ProductNotFoundException("Product nahi mila"));

            OrderItem item = new OrderItem();
            item.setProduct(product);
            item.setQuantity(req.quantity());
            item.setUnitPrice(product.getPrice()); // current price snapshot

            order.addItem(item); // helper method — owning side set hoga
        }

        // 5. Customer save karo — cascade = ALL hai toh Order aur OrderItems bhi save honge
        customerRepo.save(customer);

        return order;
    }

    // Order se ek item remove karna
    public void removeItemFromOrder(Long orderId, Long itemId) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException("Order nahi mila"));

        OrderItem itemToRemove = order.getItems().stream()
            .filter(item -> item.getId().equals(itemId))
            .findFirst()
            .orElseThrow(() -> new ItemNotFoundException("Item nahi mila"));

        order.removeItem(itemToRemove);
        // orphanRemoval = true hai toh itemToRemove DB se DELETE hoga
        // save() explicitly nahi karna transaction ke andar — @Transactional handle karega
    }
}
```

---

## Gotchas — Beginner Ki Sabse Badi Galtiyan

> [!danger] Galti #1: EAGER Fetch By Default On @ManyToOne
> `@ManyToOne` ka default `EAGER` hai. Iska matlab: ek `Order` load karo → `Customer` automatically load hoga. 100 orders fetch karo → 100 alag Customer queries. Yahi **N+1 problem** ka root cause hai.
>
> Fix: Hamesha explicitly `fetch = FetchType.LAZY` likho.
> ```java
> @ManyToOne(fetch = FetchType.LAZY) // yeh likhna mat bhoolo!
> @JoinColumn(name = "customer_id")
> private Customer customer;
> ```

> [!danger] Galti #2: Sirf Inverse Side Update Karna
> ```java
> // GALAT — kuch save nahi hoga!
> customer.getOrders().add(newOrder); // inverse side update hua
> // newOrder.setCustomer(customer); — yeh line missing hai!
> customerRepo.save(customer);
> // Result: order row mein customer_id NULL hoga ya error aayega
>
> // SAHI — helper method use karo
> customer.addOrder(newOrder); // dono sides sync hote hain
> customerRepo.save(customer);
> ```

> [!warning] Galti #3: @ManyToMany Pe CascadeType.REMOVE
> ```java
> // GALAT aur DANGEROUS!
> @ManyToMany(cascade = CascadeType.REMOVE)
> private Set<Tag> tags;
>
> // Agar Article delete karo → Tags bhi delete ho jaenge!
> // Lekin Tags doosre Articles ke saath bhi associated ho sakte hain
> // Result: Dusre Articles ke tags gayab ho jaayenge — data corruption!
>
> // SAHI: @ManyToMany pe kabhi REMOVE cascade mat karo
> @ManyToMany(fetch = FetchType.LAZY) // sirf itna
> private Set<Tag> tags;
> ```

> [!warning] Galti #4: @OneToMany Collection Pe Sab Kuch Load Karna
> ```java
> // GALAT — 1 million orders hain toh?
> Customer bigCustomer = customerRepo.findById(1L).get();
> List<Order> allOrders = bigCustomer.getOrders(); // OutOfMemoryError ready hai
>
> // SAHI — paginated query use karo
> Page<Order> recentOrders = orderRepo.findByCustomerId(customerId,
>     PageRequest.of(0, 20, Sort.by("placedAt").descending()));
> ```

> [!warning] Galti #5: @ManyToMany Mein List Use Karna
> ```java
> // GALAT — List use karna
> @ManyToMany
> private List<Tag> tags; // duplicates ho sakte hain, aur Hibernate ENTIRE join table delete + re-insert karta hai on update
>
> // SAHI — Set use karo
> @ManyToMany
> private Set<Tag> tags; // no duplicates, Hibernate sirf diff update karta hai
> ```

> [!warning] Galti #6: equals/hashCode Bina Business Key Ke Override Karna
> ```java
> // PROBLEM: Agar tum entity ko Set mein daalo BEFORE flush (jab ID null hai)
> // toh hash ek hoga. After flush (ID assign hone ke baad), hash badal jaata hai.
> // Entity "lost" ho jaati hai Set mein.
>
> // SOLUTION 1: UUID use karo jo @PrePersist pe generate hoti hai
> @Column(updatable = false, nullable = false)
> private UUID uuid = UUID.randomUUID(); // object creation pe hi assign hoti hai
>
> @Override
> public boolean equals(Object o) {
>     if (this == o) return true;
>     if (!(o instanceof Order other)) return false;
>     return uuid.equals(other.uuid);
> }
>
> @Override
> public int hashCode() {
>     return uuid.hashCode();
> }
>
> // SOLUTION 2: Sirf database ID pe — lekin Set mein persist se pehle mat daalo
> ```

> [!tip] Best Practice: Lazy + DTO Projection
> Sabse clean pattern yeh hai: sab relations LAZY rakho, aur queries se directly DTOs return karo — poori entity nahi. Yeh N+1 problem avoid karta hai aur sirf wahi data fetch hota hai jo chahiye.
>
> ```java
> // Repository mein
> @Query("SELECT new com.example.dto.OrderSummaryDto(o.id, o.placedAt, c.name) " +
>        "FROM Order o JOIN o.customer c WHERE o.placedAt > :since")
> List<OrderSummaryDto> findRecentOrderSummaries(@Param("since") Instant since);
> ```

---

## Relationship Quick Reference

```
Zomato DB structure:
                                          
  Customer ──────────────── Order
  (1)          OneToMany    (Many)
                             │
                     ┌───────┴────────┐
                     │                │
                 OrderItem        Shipment
                 (Many)           (One) 
                     │
                 Product ──────── Category
                 (Many)  ManyToMany (Many)
```

| Scenario | Annotation | FK Kahan |
| --- | --- | --- |
| Customer has many Orders | `@OneToMany` (Customer) + `@ManyToOne` (Order) | `orders.customer_id` |
| Order has one Shipment | `@OneToOne` dono pe | `shipments.order_id` |
| Product has many Categories | `@ManyToMany` + `@JoinTable` | Separate join table |
| Order ka har OrderItem | `@OneToMany` (Order) + `@ManyToOne` (OrderItem) | `order_items.order_id` |

---

## Key Takeaways

- **Owning Side Rule**: Jiske paas FK column hai woh owning side hai. Sirf owning side ki changes persist hoti hain. `@ManyToOne` hamesha owning side hota hai.
- **mappedBy**: Yeh inverse side pe lagta hai. Iska value owning side ka field name hota hai.
- **Helper Methods**: Dono sides ko sync mein rakhne ke liye `addChild()` / `removeChild()` methods banao. Yeh best practice hai.
- **Fetch Type**: `@ManyToOne` aur `@OneToOne` pe hamesha `fetch = FetchType.LAZY` explicitly likho. Default EAGER hai — yeh performance killer hai.
- **CascadeType.ALL**: Parent-owned children pe use karo (e.g., `OrderItem` bina `Order` ke exist nahi karta). Independent entities pe mat karo.
- **orphanRemoval = true**: Collection se remove karne pe DB delete chahiye toh use karo. `CascadeType.REMOVE` se alag hai.
- **ManyToMany pe REMOVE Cascade mat lagao**: Data corruption ka seedha raasta hai.
- **Set vs List**: `@ManyToMany` aur `@OneToMany` mein `Set` prefer karo jab order matter na kare — Hibernate ka behavior better hota hai.
- **Explicit Join Entity**: Jab bhi join table pe extra columns chahiye (ya future mein chahiye ho sakte hain), `@ManyToMany` chhodo aur explicit entity banao.
- **Large Collections**: `entity.getChildren()` mat karo agar millions of records ho sakte hain. Paginated repository query use karo.
