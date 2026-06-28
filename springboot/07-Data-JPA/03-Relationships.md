---
tags: [data-jpa, relationships, associations, cascading]
aliases: [OneToMany, ManyToOne, ManyToMany, Cascade, OrphanRemoval]
stage: intermediate
---

# Relationships

> [!info] For the Express/TS dev
> Prisma describes relations declaratively (`posts Post[]` and `author User @relation(fields: [authorId])`). JPA does the same with annotations, but with one critical concept Prisma hides: the **owning side**. Whichever side has the foreign-key column owns the relationship. Forgetting to update the owning side means changes don't persist.

## Concept / How it works

| Relationship | Owning side | Annotation pair |
| --- | --- | --- |
| `@ManyToOne` ↔ `@OneToMany` | The `@ManyToOne` side (FK column) | `mappedBy` on `@OneToMany` |
| `@OneToOne` ↔ `@OneToOne` | Whichever has the FK | `mappedBy` on the inverse |
| `@ManyToMany` ↔ `@ManyToMany` | Either; the other uses `mappedBy` | Join table |

Default fetch types matter:

| Annotation | Default fetch | Recommendation |
| --- | --- | --- |
| `@ManyToOne` | EAGER | Override to LAZY |
| `@OneToOne` | EAGER | Override to LAZY |
| `@OneToMany` | LAZY | Keep LAZY |
| `@ManyToMany` | LAZY | Keep LAZY |

See [[06-N-Plus-One-and-Fetching]].

## Code example — Order / Customer / OrderItem

```java
@Entity
@Table(name = "customers")
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false) private String name;

    @OneToMany(mappedBy = "customer",          // inverse side — see Order.customer
              cascade = CascadeType.ALL,
              orphanRemoval = true,
              fetch = FetchType.LAZY)
    private List<Order> orders = new ArrayList<>();

    // helper to keep both sides in sync
    public void addOrder(Order o) {
        orders.add(o);
        o.setCustomer(this);
    }
    public void removeOrder(Order o) {
        orders.remove(o);
        o.setCustomer(null);
    }
}
```

```java
@Entity
@Table(name = "orders")
public class Order {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)   // OWNING side — has the FK
    private Customer customer;

    @OneToMany(mappedBy = "order",
               cascade = CascadeType.ALL,
               orphanRemoval = true,
               fetch = FetchType.LAZY)
    private List<OrderItem> items = new ArrayList<>();

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private Shipment shipment;

    @Column(nullable = false)
    private Instant placedAt;

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }
}
```

```java
@Entity
@Table(name = "order_items")
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private int quantity;
    private BigDecimal unitPrice;
}
```

### `@ManyToMany` (with explicit join table — usually preferred)

The "implicit" approach:

```java
@Entity
public class Tag {
    @Id @GeneratedValue private Long id;
    private String name;

    @ManyToMany(mappedBy = "tags")
    private Set<Article> articles = new HashSet<>();
}

@Entity
public class Article {
    @Id @GeneratedValue private Long id;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "article_tags",
               joinColumns = @JoinColumn(name = "article_id"),
               inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();
}
```

### Better: explicit association entity (when you need attributes on the join)

```java
@Entity
@Table(name = "article_tags")
public class ArticleTag {
    @EmbeddedId
    private ArticleTagId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("articleId")
    private Article article;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("tagId")
    private Tag tag;

    private Instant addedAt;
}

@Embeddable
public record ArticleTagId(Long articleId, Long tagId) implements Serializable {}
```

## Cascading

`CascadeType` propagates ops from parent to children:

| Cascade | Effect |
| --- | --- |
| `PERSIST` | Save children when parent saved |
| `MERGE` | Update children when parent merged |
| `REMOVE` | Delete children when parent deleted |
| `DETACH` | Detach children with parent |
| `REFRESH` | Refresh children with parent |
| `ALL` | All of the above |

`orphanRemoval = true` deletes a child when it's removed from the parent's collection (not the same as `CascadeType.REMOVE`, which fires only when the parent itself is deleted).

```java
order.getItems().remove(item);   // with orphanRemoval=true → DELETE FROM order_items
```

## Express/TS comparison

```prisma
model Customer {
  id     Int     @id @default(autoincrement())
  name   String
  orders Order[]
}

model Order {
  id         Int       @id @default(autoincrement())
  customerId Int
  customer   Customer  @relation(fields: [customerId], references: [id])
  items      OrderItem[]
}
```

| Prisma | JPA |
| --- | --- |
| `orders Order[]` | `@OneToMany(mappedBy="customer")` |
| `customer Customer @relation(...)` | `@ManyToOne @JoinColumn(name="customer_id")` |
| `onDelete: Cascade` | `cascade = CascadeType.REMOVE` |
| Implicit M2M | `@ManyToMany @JoinTable(...)` |
| Explicit join model | `@EmbeddedId` + `@MapsId` |
| `include: { orders: true }` | `JOIN FETCH` / `EntityGraph` ([[06-N-Plus-One-and-Fetching]]) |

## Gotchas

> [!danger] EAGER fetch by default on `@ManyToOne`
> Loading an `Order` will EAGERLY load its `Customer`. Stack 5 of these and `findAll()` becomes a query nightmare. Always set `fetch = FetchType.LAZY` on `@ManyToOne` and `@OneToOne`.

> [!danger] Updating only the inverse side does nothing
> If you `customer.getOrders().add(newOrder)` but never set `newOrder.setCustomer(customer)`, the FK is `null` and the insert fails — or worse, succeeds with a NULL FK. Use helper methods (`addOrder`).

> [!warning] `CascadeType.REMOVE` + `@ManyToMany` deletes the wrong things
> Removing an `Article` with `cascade=REMOVE` on a M2M `tags` relation will try to delete the **Tag rows** (probably not what you want). Tag deletion should be independent. Don't cascade through M2M.

> [!warning] `@OneToMany` collection of size 100,000
> Don't `customer.getOrders()` if there are millions. Use a paginated `JpaRepository.findByCustomer(customer, Pageable)` instead.

> [!warning] `@ManyToMany` with `Set` vs `List`
> Use `Set` — duplicates aren't meaningful, and `List` causes Hibernate to delete + re-insert the entire join table on update.

> [!tip] Lazy + DTO projection
> The cleanest pattern: keep all relations LAZY, return DTOs from queries (constructor expressions or `Projections`). See [[10-Native-Queries-Projections]].

> [!warning] `equals`/`hashCode` on collection types
> Putting an entity into a `HashSet` BEFORE its ID is assigned gives one hash; after `flush()` and ID assignment, a different hash. Use a UUID generated up-front, or override carefully.

## Related

- [[02-Entity-Basics]]
- [[04-Repositories]]
- [[06-N-Plus-One-and-Fetching]]
- [[10-Native-Queries-Projections]]
