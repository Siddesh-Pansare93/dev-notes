# 05 - Nested Models

## Models Containing Other Models

Just like TypeScript interfaces can reference other interfaces, Pydantic models can contain other Pydantic models as fields. When you do this, Pydantic validates the entire nested structure recursively.

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

### Creating Nested Models

```python
# From keyword arguments with a nested model instance
addr = Address(street="123 Main St", city="Springfield", state="IL", zip_code="62704")
user = User(name="Alice", email="alice@example.com", address=addr)

# From a nested dictionary (the common case for API data)
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

# Access nested fields
print(user.address.city)      # "Portland"
print(user.address.zip_code)  # "97201"
```

---

## Lists of Models

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

### Dict of Models

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

## Optional Nested Models

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

# Without social links
user1 = UserProfile(name="Alice")
print(user1.social)  # None

# With social links
user2 = UserProfile(
    name="Bob",
    social={"twitter": "@bob", "github": "bob"}
)
print(user2.social.twitter)  # "@bob"
print(user2.social.linkedin)  # None
```

### TypeScript Equivalent

```typescript
interface UserProfile {
  name: string;
  bio?: string;
  social?: SocialLinks | null;
}
```

---

## Recursive / Self-Referencing Models

Models can reference themselves for tree-like structures. This is like recursive TypeScript types.

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

# Pydantic v2 handles forward references automatically
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

### Comment Thread Example

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

## model_rebuild() for Forward References

In some cases (circular references between models in separate definitions), you need to call `model_rebuild()` to resolve forward references:

```python
from pydantic import BaseModel

class Department(BaseModel):
    name: str
    manager: "Employee | None" = None   # forward reference
    employees: list["Employee"] = []

class Employee(BaseModel):
    name: str
    department: Department | None = None

# Rebuild both models to resolve forward references
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

In practice, you rarely need `model_rebuild()` in Pydantic v2 because it resolves forward references lazily. But if you hit a `PydanticUndefinedAnnotation` error, `model_rebuild()` is the fix.

---

## Deep Validation and Error Paths

When nested validation fails, Pydantic provides the full path to the error -- just like Zod's error paths.

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
  Message: String should match pattern '^\\d{5}$'

  Path: ('emergency_contacts', 1, 'phone')
  Message: String should have at least 10 characters
```

Notice:
- `('company', 'address', 'zip_code')` -- full nested path
- `('emergency_contacts', 1, 'phone')` -- includes the list index (1)

### Zod Equivalent Error Path

```typescript
// Zod gives similar paths:
// error.issues[0].path = ["company", "address", "zipCode"]
// error.issues[1].path = ["emergencyContacts", 1, "phone"]
```

---

## Complex Real-World Example: GitHub-like API Response

Let us model a realistic API response -- like what you would get from the GitHub API:

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

# One call validates the entire nested structure
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

### The Express/Node.js Way (for Comparison)

In a Node.js project, you would typically:

```typescript
// 1. Define interfaces (no runtime validation)
interface Issue { ... }
interface IssueSearchResponse { ... }

// 2. Add Zod schemas (duplicates the interface definitions)
const IssueSchema = z.object({ ... });
const IssueSearchResponseSchema = z.object({ ... });

// 3. Fetch and validate
const response = await fetch("https://api.github.com/...");
const json = await response.json();
const result = IssueSearchResponseSchema.parse(json);
```

In Python with Pydantic, steps 1 and 2 are the same thing. Less code, less duplication, fewer bugs from types and schemas getting out of sync.

---

## Nested Model Serialization

### Controlling Depth

```python
# Serialize the entire nested structure to a dict
data = result.model_dump()

# Exclude nested fields
data = issue.model_dump(exclude={
    "user": {"avatar_url", "html_url"},
    "labels": {"__all__": {"id"}},  # exclude "id" from ALL labels
})

# Include only specific nested fields
data = issue.model_dump(include={
    "number": True,
    "title": True,
    "user": {"login"},           # only include user.login
    "labels": {"__all__": {"name"}},  # only include label.name from all labels
})
# {'number': 42, 'title': 'Fix login bug', 'user': {'login': 'alice'}, 'labels': [{'name': 'bug'}, {'name': 'priority:high'}]}
```

---

## Practice Exercises

### Exercise 1: E-Commerce Order
Create models for an e-commerce system: `Product` (name, price, category), `OrderItem` (product: Product, quantity: int), `ShippingAddress` (street, city, state, zip, country), `Order` (id, items: list of OrderItem, shipping: ShippingAddress, total: float). Add a model validator on `Order` that verifies `total` matches the sum of `item.product.price * item.quantity`. Parse an order from a JSON-like dict.

### Exercise 2: File System Tree
Create a recursive `FileNode` model with `name: str`, `type: Literal["file", "directory"]`, `size_bytes: int | None` (None for directories), `children: list[FileNode]` (empty for files). Write a function that takes a `FileNode` and prints it as an indented tree. Parse this structure from a dict.

### Exercise 3: API Error Response
Create models for a standard API error response: `FieldError` (field: str, message: str, code: str), `ApiError` (status_code: int, message: str, errors: list of FieldError, request_id: UUID). Create a helper function that converts a Pydantic `ValidationError` into your `ApiError` format.

### Exercise 4: Blog System
Model a blog system: `Author` (name, email, bio), `Tag` (name, slug), `Comment` (author: str, text: str, created_at: datetime, replies: list of Comment -- recursive!), `BlogPost` (title, slug, author: Author, tags: list of Tag, content: str, comments: list of Comment, published_at: datetime or None). Create a blog post with nested comments that have replies.

### Exercise 5: Deep Error Paths
Create a model structure at least 3 levels deep. Intentionally pass invalid data at different nesting depths. Catch the `ValidationError` and write a function that formats errors as `"path.to.field: message"` (joining the `loc` tuple with dots).

### Exercise 6: Selective Serialization
Using the blog system from Exercise 4, write three serialization functions: (1) `to_list_view()` -- just title, slug, author name, tag names, published date (for a blog listing page). (2) `to_full_view()` -- everything except comment replies deeper than 1 level. (3) `to_admin_view()` -- everything. Use `model_dump(include=...)` and `model_dump(exclude=...)`.
