# 05 - Nested Models

## Kya hota hai jab ek Model ke andar doosra Model hota hai?

Socho TypeScript interfaces ki tarah — ek interface doosre ko use kar sakta hai, bilkul vaise hi Pydantic models bhi karte hain. Jab ek Pydantic model ke andar doosra Pydantic model field hota hai, toh Pydantic poore nested structure ko validate kar deta hai recursively. Matlab agar kuch galat hai nested data mein, tu error aa jayegi straight away.

```python
from pydantic import BaseModel

class Address(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str

class User(BaseModel):
    name: str
    email: str
    address: Address  # nested model
```

Socho Zomato app ki tarah — ek `Order` model hota hai jo `Delivery Address` model contain karta hai. Pydantic ensure karta hai ke dono proper tarah se validate ho jayein.

### TypeScript Equivalent

```typescript
interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

interface User {
  name: string;
  email: string;
  address: Address;
}
```

### Nested Models ko Create Kaise Karein?

```python
# Pehla tarika — Address ka instance pehle banao, phir User mein daalo
addr = Address(street="123 Main St", city="Springfield", state="IL", zip_code="62704")
user = User(name="Alice", email="alice@example.com", address=addr)

# Doosra tarika — (zyada common) API se aya data directly dict mein hota hai
data = {
    "name": "Bob",
    "email": "bob@example.com",
    "address": {
        "street": "456 Oak Ave",
        "city": "Portland",
        "state": "OR",
        "zip_code": "97201"
    }
}
user = User.model_validate(data)

# Nested fields ko access kaise karein?
print(user.address.city)      # "Portland"
print(user.address.zip_code)  # "97201"
```

---

## Lists of Models — Kyun ek ke bajaaye Multiple Objects Chahiye

Imagine Swiggy order mein multiple items hote hain. Toh ek `Order` model hota hai jo multiple `OrderItem` objects contain karta hai — ek list mein.

```python
from pydantic import BaseModel

class OrderItem(BaseModel):
    product_name: str
    quantity: int
    unit_price: float

class Order(BaseModel):
    order_id: str
    customer_name: str
    items: list[OrderItem]     # list of nested models
    notes: list[str] = []     # list of simple types

order = Order.model_validate({
    "order_id": "ORD-001",
    "customer_name": "Alice",
    "items": [
        {"product_name": "Laptop", "quantity": 1, "unit_price": 999.99},
        {"product_name": "Mouse", "quantity": 2, "unit_price": 29.99},
    ]
})

for item in order.items:
    print(f"{item.product_name}: ${item.unit_price * item.quantity:.2f}")
# Laptop: $999.99
# Mouse: $59.98
```

Pydantic har item ko validate karta hai list mein. Agar kisi item ka `quantity` invalid ho, ya `unit_price` negative ho, toh error aa jayegi immediately.

### TypeScript/Zod Equivalent

```typescript
// TypeScript
interface Order {
  orderId: string;
  customerName: string;
  items: OrderItem[];
}

// Zod
const OrderSchema = z.object({
  orderId: z.string(),
  customerName: z.string(),
  items: z.array(OrderItemSchema),
});
```

### Dict of Models — Jab Key-Value Mapping Chahiye

Kabhi kabhi tujhe models ko dictionary format mein store karna hota hai — jaise inventory mein product SKU ho key, aur product model ho value.

```python
class Inventory(BaseModel):
    # key is product SKU, value is the product model
    products: dict[str, OrderItem]

inv = Inventory.model_validate({
    "products": {
        "SKU-001": {"product_name": "Laptop", "quantity": 10, "unit_price": 999.99},
        "SKU-002": {"product_name": "Mouse", "quantity": 50, "unit_price": 29.99},
    }
})
print(inv.products["SKU-001"].product_name)  # "Laptop"
```

---

## Optional Nested Models — Jab Poori Nested Model Hi Optional Ho

Kya toh hota hai jab user ne apna social media profile nahi diya? Toh poore `SocialLinks` model ko optional banao.

```python
from pydantic import BaseModel

class SocialLinks(BaseModel):
    twitter: str | None = None
    github: str | None = None
    linkedin: str | None = None

class UserProfile(BaseModel):
    name: str
    bio: str = ""
    social: SocialLinks | None = None  # entire nested model is optional

# Agar social links nahi diye
user1 = UserProfile(name="Alice")
print(user1.social)  # None

# Agar social links diye
user2 = UserProfile(
    name="Bob",
    social={"twitter": "@bob", "github": "bob"}
)
print(user2.social.twitter)  # "@bob"
print(user2.social.linkedin)  # None (default ho gaya)
```

> [!tip]
> Optional nested model `None` bhi ho sakta hai, ya valid model instance. Pydantic dono cases handle karta hai.

### TypeScript Equivalent

```typescript
interface UserProfile {
  name: string;
  bio?: string;
  social?: SocialLinks | null;
}
```

---

## Recursive / Self-Referencing Models — Tree Structures

Kabhi model apne aap ko reference karta hai — jaise file system tree mein ek directory ke andar directories hote hain, jinka phir andar aur directories hote hain. Hinglish mein kehte hain — "apne aap se hi related hona".

### TypeScript Recursive Type

```typescript
interface TreeNode {
  value: string;
  children: TreeNode[];
}

interface Comment {
  id: number;
  text: string;
  replies: Comment[];
}
```

### Pydantic Recursive Model

```python
from pydantic import BaseModel

class TreeNode(BaseModel):
    value: str
    children: list["TreeNode"] = []

# Pydantic v2 automatically handles forward references
tree = TreeNode.model_validate({
    "value": "root",
    "children": [
        {
            "value": "child1",
            "children": [
                {"value": "grandchild1"},
                {"value": "grandchild2"},
            ]
        },
        {
            "value": "child2",
            "children": []
        }
    ]
})

def print_tree(node: TreeNode, indent: int = 0):
    print("  " * indent + node.value)
    for child in node.children:
        print_tree(child, indent + 1)

print_tree(tree)
# root
#   child1
#     grandchild1
#     grandchild2
#   child2
```

Notice: `list["TreeNode"]` — string mein quote kiya kyunki model abhi complete nahi hua jab define kar rahe ho. Pydantic v2 automatically samajh leta hai.

### Comment Thread Example — Real-World Use Case

YouTube ya Twitter pe comments mein replies hote hain, replies ke replies hote hain... toh recursive model bilkul perfect hai aise cases ke liye.

```python
from datetime import datetime
from pydantic import BaseModel, Field

class Comment(BaseModel):
    id: int
    author: str
    text: str
    created_at: datetime
    replies: list["Comment"] = []

thread = Comment.model_validate({
    "id": 1,
    "author": "alice",
    "text": "Great article!",
    "created_at": "2024-03-15T10:00:00",
    "replies": [
        {
            "id": 2,
            "author": "bob",
            "text": "Thanks! I agree.",
            "created_at": "2024-03-15T10:30:00",
            "replies": [
                {
                    "id": 3,
                    "author": "alice",
                    "text": "Let's discuss more.",
                    "created_at": "2024-03-15T11:00:00",
                    "replies": []
                }
            ]
        }
    ]
})
```

---

## model_rebuild() for Forward References — Jab Circular References Hote Hain

Kyun zaruri hota hai `model_rebuild()`? Socho — ek `Department` model mein `Employee` list chahiye, aur `Employee` model mein `Department` chahiye. Toh dono models ek doosre ko reference karte hain. Pydantic ko samajhna padta hai ke dono models ke beech kya relationship hai.

```python
from pydantic import BaseModel

class Department(BaseModel):
    name: str
    manager: "Employee | None" = None   # forward reference
    employees: list["Employee"] = []

class Employee(BaseModel):
    name: str
    department: Department | None = None

# Rebuild dono models taki forward references resolve ho jayein
Department.model_rebuild()
Employee.model_rebuild()

dept = Department.model_validate({
    "name": "Engineering",
    "manager": {"name": "Alice"},
    "employees": [
        {"name": "Bob"},
        {"name": "Charlie"},
    ]
})
```

> [!info]
> Pydantic v2 mein lazy forward references handle karta hai, toh zyada cases mein `model_rebuild()` nahi chahiye. Lekin agar `PydanticUndefinedAnnotation` error aaye, tab call kar do.

---

## Deep Validation and Error Paths — Errors ko Precisely Track Karna

Jab nested validation fail hota hai, Pydantic full path batata hai ke error kahan tha — bilkul Zod ki tarah. Imagine IRCTC booking mein passenger ka address galat ho toh error mein exact path milta hai: `passengers[2].address.zip_code`.

```python
from pydantic import BaseModel, Field, ValidationError

class Address(BaseModel):
    street: str
    city: str
    zip_code: str = Field(pattern=r"^\d{5}$")

class Company(BaseModel):
    name: str
    address: Address

class Employee(BaseModel):
    name: str
    company: Company
    emergency_contacts: list["EmergencyContact"] = []

class EmergencyContact(BaseModel):
    name: str
    phone: str = Field(min_length=10)

try:
    Employee.model_validate({
        "name": "Alice",
        "company": {
            "name": "Acme",
            "address": {
                "street": "123 Main",
                "city": "Springfield",
                "zip_code": "bad"           # error here
            }
        },
        "emergency_contacts": [
            {"name": "Bob", "phone": "1234567890"},   # ok
            {"name": "Charlie", "phone": "123"},       # error here
        ]
    })
except ValidationError as e:
    for error in e.errors():
        print(f"  Path: {error['loc']}")
        print(f"  Message: {error['msg']}")
        print()
```

Output:
```
  Path: ('company', 'address', 'zip_code')
  Message: String should match pattern '^\d{5}$'

  Path: ('emergency_contacts', 1, 'phone')
  Message: String should have at least 10 characters
```

Dekho kaise error path exact batate hain:
- `('company', 'address', 'zip_code')` — poora nested path
- `('emergency_contacts', 1, 'phone')` — list index (1) bhi include ho raha hai

### Zod Equivalent Error Path

```typescript
// Zod bhi similar paths deta hai:
// error.issues[0].path = ["company", "address", "zipCode"]
// error.issues[1].path = ["emergencyContacts", 1, "phone"]
```

---

## Complex Real-World Example: GitHub-Like API Response

Real API responses ka structure kaafi nested hota hai. Socho GitHub issue ka API response — isme user info, labels, milestone, pull request references sab nested hain.

```python
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl, model_validator

class GitHubUser(BaseModel):
    login: str
    id: int
    avatar_url: HttpUrl
    html_url: HttpUrl

class Label(BaseModel):
    id: int
    name: str
    color: str = Field(pattern=r"^[0-9a-fA-F]{6}$")
    description: str | None = None

class Milestone(BaseModel):
    id: int
    title: str
    description: str | None = None
    due_on: datetime | None = None
    open_issues: int = 0
    closed_issues: int = 0

    @property
    def progress_percent(self) -> float:
        total = self.open_issues + self.closed_issues
        if total == 0:
            return 0.0
        return (self.closed_issues / total) * 100

class PullRequest(BaseModel):
    url: HttpUrl
    html_url: HttpUrl
    merged_at: datetime | None = None

class Issue(BaseModel):
    id: int
    number: int
    title: str
    body: str | None = None
    state: str  # "open" or "closed"
    user: GitHubUser
    labels: list[Label] = []
    assignees: list[GitHubUser] = []
    milestone: Milestone | None = None
    pull_request: PullRequest | None = None
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None
    comments: int = 0

    @property
    def is_pull_request(self) -> bool:
        return self.pull_request is not None

class IssueSearchResponse(BaseModel):
    total_count: int
    incomplete_results: bool
    items: list[Issue]

# Parse a realistic API response
response_data = {
    "total_count": 1,
    "incomplete_results": False,
    "items": [
        {
            "id": 1,
            "number": 42,
            "title": "Fix login bug",
            "body": "Users cannot log in with special characters in passwords.",
            "state": "open",
            "user": {
                "login": "alice",
                "id": 1001,
                "avatar_url": "https://avatars.githubusercontent.com/u/1001",
                "html_url": "https://github.com/alice"
            },
            "labels": [
                {"id": 1, "name": "bug", "color": "d73a4a"},
                {"id": 2, "name": "priority:high", "color": "ff0000", "description": "High priority"}
            ],
            "assignees": [
                {
                    "login": "bob",
                    "id": 1002,
                    "avatar_url": "https://avatars.githubusercontent.com/u/1002",
                    "html_url": "https://github.com/bob"
                }
            ],
            "milestone": {
                "id": 1,
                "title": "v2.0",
                "description": "Version 2.0 release",
                "due_on": "2024-06-01T00:00:00Z",
                "open_issues": 5,
                "closed_issues": 15
            },
            "pull_request": None,
            "created_at": "2024-03-01T10:00:00Z",
            "updated_at": "2024-03-15T14:30:00Z",
            "closed_at": None,
            "comments": 3
        }
    ]
}

# Ek hi call mein poora nested structure validate ho gaya!
result = IssueSearchResponse.model_validate(response_data)

issue = result.items[0]
print(f"Issue #{issue.number}: {issue.title}")
print(f"  Author: {issue.user.login}")
print(f"  Labels: {[l.name for l in issue.labels]}")
print(f"  Assignees: {[a.login for a in issue.assignees]}")
if issue.milestone:
    print(f"  Milestone: {issue.milestone.title} ({issue.milestone.progress_percent:.0f}% done)")
print(f"  Is PR: {issue.is_pull_request}")
```

Output:
```
Issue #42: Fix login bug
  Author: alice
  Labels: ['bug', 'priority:high']
  Assignees: ['bob']
  Milestone: v2.0 (75% done)
  Is PR: False
```

### Express/Node.js Se Kya Difference Hai?

Express/Node.js mein kaafi duplication hota hai:

```typescript
// 1. Interfaces define karo (runtime validation nahi hota)
interface Issue { ... }
interface IssueSearchResponse { ... }

// 2. Zod schemas define karo (interfaces ko duplicate karna padta hai!)
const IssueSchema = z.object({ ... });
const IssueSearchResponseSchema = z.object({ ... });

// 3. Fetch aur validate karo
const response = await fetch("https://api.github.com/...");
const json = await response.json();
const result = IssueSearchResponseSchema.parse(json);
```

Python + Pydantic mein? Bas ek step — models define karo aur validation automatic. Kum code, kam bugs, zyada productivity!

---

## Nested Model Serialization — Serialization Ko Control Karna

Jab model ko back to dict ya JSON mein convert karna hota hai, toh Pydantic tujhe fine-grained control deta hai.

### Controlling Depth

```python
# Poora nested structure ko dict mein convert karo
data = result.model_dump()

# Kuch nested fields exclude karo
data = issue.model_dump(exclude={
    "user": {"avatar_url", "html_url"},
    "labels": {"__all__": {"id"}},  # exclude "id" from ALL labels
})

# Sirf specific nested fields include karo
data = issue.model_dump(include={
    "number": True,
    "title": True,
    "user": {"login"},           # only include user.login
    "labels": {"__all__": {"name"}},  # only include label.name from all labels
})
# {'number': 42, 'title': 'Fix login bug', 'user': {'login': 'alice'}, 'labels': [{'name': 'bug'}, {'name': 'priority:high'}]}
```

---

## Practice Exercises — Hath Karke Seekhenge!

### Exercise 1: E-Commerce Order
Models banao e-commerce system ke liye: `Product` (name, price, category), `OrderItem` (product: Product, quantity: int), `ShippingAddress` (street, city, state, zip, country), `Order` (id, items: list of OrderItem, shipping: ShippingAddress, total: float). `Order` pe model validator lagao taki `total` match kare sum of `item.product.price * item.quantity` ke. JSON-like dict se order parse karo.

### Exercise 2: File System Tree
Recursive `FileNode` model banao: `name: str`, `type: Literal["file", "directory"]`, `size_bytes: int | None` (directories ke liye None), `children: list[FileNode]` (files ke liye empty). Function likho jo `FileNode` ko indented tree format mein print kare. Dict se structure parse karo.

### Exercise 3: API Error Response
Standard API error response ke liye models banao: `FieldError` (field: str, message: str, code: str), `ApiError` (status_code: int, message: str, errors: list of FieldError, request_id: UUID). Helper function likho jo Pydantic `ValidationError` ko apke `ApiError` format mein convert kare.

### Exercise 4: Blog System
Blog system model karo: `Author` (name, email, bio), `Tag` (name, slug), `Comment` (author: str, text: str, created_at: datetime, replies: list of Comment — recursive!), `BlogPost` (title, slug, author: Author, tags: list of Tag, content: str, comments: list of Comment, published_at: datetime or None). Nested comments wale blog post banao jo replies have kare.

### Exercise 5: Deep Error Paths
Model banao 3+ levels deep nesting ke saath. Intentionally invalid data pass karo different nesting levels mein. `ValidationError` catch karo aur function likho jo errors ko `"path.to.field: message"` format mein print kare (loc tuple ko dots se join karke).

### Exercise 6: Selective Serialization
Exercise 4 ke blog system ko use karte hue, teen serialization functions likho: (1) `to_list_view()` — sirf title, slug, author name, tag names, published date (blog listing page ke liye). (2) `to_full_view()` — sab kuch except comment replies deeper than 1 level ke. (3) `to_admin_view()` — everything. `model_dump(include=...)` aur `model_dump(exclude=...)` use karo.
