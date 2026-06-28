# Common shadcn/ui Components

Learn how to use the most popular shadcn/ui components with TypeScript and React.

## What You'll Learn

- Button component with variants and sizes
- Card layouts for content organization
- Dialog and Alert Dialog for modals
- Alert and Badge for notifications
- Avatar component with status badges
- Dropdown Menu for navigation
- Tabs and Accordion for content organization
- Sheet (Drawer) for side panels
- Toast notifications

## 1. Button Component

### Basic Button Variants

```typescript
import { Button } from '@/components/ui/button';

function ButtonDemo() {
  return (
    <div className="flex flex-wrap gap-4">
      {/* Default variant */}
      <Button>Default</Button>

      {/* Secondary variant */}
      <Button variant="secondary">Secondary</Button>

      {/* Outline variant */}
      <Button variant="outline">Outline</Button>

      {/* Ghost variant */}
      <Button variant="ghost">Ghost</Button>

      {/* Destructive variant */}
      <Button variant="destructive">Destructive</Button>

      {/* Link variant */}
      <Button variant="link">Link</Button>
    </div>
  );
}

export default ButtonDemo;
```

### Button Sizes

```typescript
function ButtonSizes() {
  return (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <SearchIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### Buttons with Icons

```typescript
import { ArrowRight, Download, Loader2 } from 'lucide-react';

function ButtonWithIcons() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Icon on the left */}
      <Button>
        <Download className="mr-2 h-4 w-4" />
        Download
      </Button>

      {/* Icon on the right */}
      <Button>
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      {/* Loading state */}
      <Button disabled={isLoading} onClick={() => setIsLoading(true)}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? 'Processing...' : 'Submit'}
      </Button>

      {/* Icon only */}
      <Button size="icon" variant="outline">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

## 2. Card Component

### Basic Card

```typescript
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <img
          src={product.image}
          alt={product.name}
          className="h-48 w-full object-cover rounded-t-lg"
        />
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">${product.price}</span>
          <span className="text-sm text-muted-foreground">In Stock</span>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button className="flex-1">Add to Cart</Button>
        <Button variant="outline">View Details</Button>
      </CardFooter>
    </Card>
  );
}

export default ProductCard;
```

### Interactive Card with Actions

```typescript
import { Heart, Share2, MoreVertical } from 'lucide-react';

function InteractiveCard() {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Amazing Article Title</CardTitle>
            <CardDescription>Published 2 days ago</CardDescription>
          </div>
          <CardAction>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardAction>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is a sample article description that provides context about the
          content. It should be concise and informative.
        </p>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button
          variant={isLiked ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsLiked(!isLiked)}
        >
          <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          {isLiked ? 'Liked' : 'Like'}
        </Button>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </CardFooter>
    </Card>
  );
}
```

## 3. Dialog Component

### Basic Dialog

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ProfileDialog() {
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    // Save logic here
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Edit Profile</Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" defaultValue="John Doe" className="col-span-3" />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              defaultValue="john@example.com"
              className="col-span-3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProfileDialog;
```

### Alert Dialog (Confirmation)

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function DeleteConfirmation({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Yes, delete my account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## 4. Alert Component

### Alert Variants

```typescript
import { Alert, AlertDescription, AlertTitle, AlertAction } from '@/components/ui/alert';
import { InfoIcon, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

function AlertDemo() {
  return (
    <div className="flex flex-col gap-4">
      {/* Default Alert */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>
          You can add components to your app using the CLI.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm">
            Learn More
          </Button>
        </AlertAction>
      </Alert>

      {/* Success Alert */}
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle>Success!</AlertTitle>
        <AlertDescription>Your changes have been saved.</AlertDescription>
      </Alert>

      {/* Warning Alert */}
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Your session will expire in 5 minutes.
        </AlertDescription>
      </Alert>

      {/* Destructive Alert */}
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Something went wrong. Please try again.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default AlertDemo;
```

## 5. Badge Component

```typescript
import { Badge } from '@/components/ui/badge';

type Status = 'active' | 'pending' | 'inactive' | 'error';

interface StatusBadgeProps {
  status: Status;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<Status, { label: string; className: string }> = {
    active: {
      label: 'Active',
      className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    },
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    },
    inactive: {
      label: 'Inactive',
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200',
    },
    error: {
      label: 'Error',
      className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    },
  };

  const config = variants[status];

  return <Badge className={config.className}>{config.label}</Badge>;
}

// Usage in a table or list
function UserList() {
  const users = [
    { id: 1, name: 'John Doe', status: 'active' as Status, role: 'Admin' },
    { id: 2, name: 'Jane Smith', status: 'pending' as Status, role: 'User' },
  ];

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div key={user.id} className="flex items-center gap-4 p-4 border rounded">
          <span className="flex-1">{user.name}</span>
          <Badge variant="outline">{user.role}</Badge>
          <StatusBadge status={user.status} />
        </div>
      ))}
    </div>
  );
}

export default UserList;
```

## 6. Avatar Component

```typescript
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from '@/components/ui/avatar';

interface User {
  id: number;
  name: string;
  avatar?: string;
  isOnline: boolean;
}

function UserAvatar({ user }: { user: User }) {
  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Avatar>
      <AvatarImage src={user.avatar} alt={user.name} />
      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      {user.isOnline && (
        <AvatarBadge className="bg-green-600 dark:bg-green-800" />
      )}
    </Avatar>
  );
}

// Avatar group
function AvatarGroup({ users }: { users: User[] }) {
  const displayUsers = users.slice(0, 3);
  const remainingCount = users.length - 3;

  return (
    <div className="flex -space-x-2">
      {displayUsers.map((user) => (
        <UserAvatar key={user.id} user={user} />
      ))}
      
      {remainingCount > 0 && (
        <Avatar>
          <AvatarFallback>+{remainingCount}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export default AvatarGroup;
```

## 7. Dropdown Menu

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, CreditCard } from 'lucide-react';

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <User className="mr-2 h-4 w-4" />
          Account
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
```

## 8. Tabs Component

```typescript
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

function SettingsTabs() {
  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      
      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account settings and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue="John Doe" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="john@example.com" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save Changes</Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="current">Current Password</Label>
              <Input id="current" type="password" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new">New Password</Label>
              <Input id="new" type="password" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Update Password</Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Notification settings content here...
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default SettingsTabs;
```

## 9. Accordion Component

```typescript
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQItem {
  question: string;
  answer: string;
}

function FAQ() {
  const faqs: FAQItem[] = [
    {
      question: 'What is your return policy?',
      answer: 'We offer a 30-day return policy for all unused items in original packaging.',
    },
    {
      question: 'How long does shipping take?',
      answer: 'Standard shipping typically takes 5-7 business days. Express shipping is available.',
    },
    {
      question: 'Do you ship internationally?',
      answer: 'Yes, we ship to over 50 countries worldwide. Shipping costs vary by location.',
    },
  ];

  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger>{faq.question}</AccordionTrigger>
          <AccordionContent>{faq.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default FAQ;
```

## 10. Sheet (Drawer) Component

```typescript
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

function MobileMenu() {
  const menuItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Browse our website</SheetDescription>
        </SheetHeader>
        
        <div className="py-4">
          <nav className="flex flex-col gap-4">
            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-lg hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default MobileMenu;
```

## Component Combination Example

Here's a complete example combining multiple components:

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, MessageSquare, Heart } from 'lucide-react';

interface Post {
  id: number;
  title: string;
  excerpt: string;
  author: {
    name: string;
    avatar: string;
  };
  likes: number;
  comments: number;
  tags: string[];
}

function PostCard({ post }: { post: Post }) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback>
                {post.author.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{post.title}</CardTitle>
              <CardDescription>by {post.author.name}</CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Share</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{post.excerpt}</p>
        
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex items-center gap-4">
        <Button
          variant={isLiked ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsLiked(!isLiked)}
        >
          <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          {post.likes + (isLiked ? 1 : 0)}
        </Button>

        <Button variant="outline" size="sm">
          <MessageSquare className="mr-2 h-4 w-4" />
          {post.comments}
        </Button>

        <Button className="ml-auto">Read More</Button>
      </CardFooter>
    </Card>
  );
}

export default PostCard;
```

## Best Practices

### ✅ Do's

- Use `asChild` prop on triggers to avoid wrapper divs
- Leverage shadcn's built-in dark mode support
- Customize components with Tailwind utility classes
- Use proper semantic HTML with components
- Implement loading states for async operations
- Add proper ARIA labels for accessibility
- Combine components for complex UI patterns
- Use TypeScript for type safety with component props

### ❌ Don'ts

- Don't override component styles globally - use className
- Don't forget to handle edge cases (empty states, errors)
- Don't skip keyboard navigation support
- Don't use inline styles when Tailwind classes exist
- Don't hardcode colors - use CSS variables
- Don't nest dialogs or sheets excessively
- Don't forget to close dialogs/sheets programmatically
- Don't ignore mobile responsiveness

## Common Patterns

| Component | Use Case | Best Practice |
|-----------|----------|---------------|
| **Button** | Actions, navigation | Use appropriate variants for context |
| **Card** | Content containers | Keep content hierarchy clear |
| **Dialog** | Forms, confirmations | Use AlertDialog for destructive actions |
| **Alert** | Status messages | Match variant to message severity |
| **Badge** | Status indicators, tags | Use consistent color coding |
| **Avatar** | User profiles | Always provide fallback initials |
| **Dropdown** | Contextual menus | Group related items logically |
| **Tabs** | Content organization | Limit to 5-7 tabs max |
| **Sheet** | Mobile navigation, filters | Use appropriate side placement |

## Next Steps

- **[Forms with shadcn/ui](./03_forms.md)** - Build forms with validation
- **[Theming](./04_theming.md)** - Customize colors and dark mode
- **[Component Design](../07_clean_code/01_component_design.md)** - Best practices for components
- **[TypeScript Patterns](../06_typescript_patterns/01_props_patterns.md)** - Type-safe component props
