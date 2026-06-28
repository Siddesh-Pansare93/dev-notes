# Forms with shadcn/ui and React Hook Form

Learn how to build robust, type-safe forms with validation using shadcn/ui and React Hook Form.

## What You'll Learn

- Setting up React Hook Form with TypeScript
- Form validation with Zod schemas
- Integrating shadcn/ui form components
- Handling form submissions and errors
- Advanced form patterns (dynamic fields, multi-step)
- Async validation and server-side errors

## Prerequisites

Install required packages:

```bash
npm install react-hook-form @hookform/resolvers zod
npx shadcn@latest add form input label select textarea checkbox radio-group switch button
```

## 1. Basic Form with React Hook Form

### Simple Registration Form

```typescript
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
}

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegistrationData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      age: 18,
    },
  });

  const onSubmit = async (data: RegistrationData) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      console.log('Form submitted:', data);
      reset();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          {...register('firstName', {
            required: 'First name is required',
            minLength: { value: 2, message: 'Minimum 2 characters' },
          })}
        />
        {errors.firstName && (
          <p className="text-sm text-red-600">{errors.firstName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          {...register('lastName', { required: 'Last name is required' })}
        />
        {errors.lastName && (
          <p className="text-sm text-red-600">{errors.lastName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="age">Age</Label>
        <Input
          id="age"
          type="number"
          {...register('age', {
            required: 'Age is required',
            min: { value: 18, message: 'Must be at least 18' },
            valueAsNumber: true,
          })}
        />
        {errors.age && (
          <p className="text-sm text-red-600">{errors.age.message}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
        <Button type="button" variant="outline" onClick={() => reset()}>
          Reset
        </Button>
      </div>
    </form>
  );
}

export default RegistrationForm;
```

## 2. Form Validation with Zod

### Zod Schema Definition

```typescript
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// Define validation schema
const userSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username cannot exceed 20 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores'
      ),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    age: z
      .number({ invalid_type_error: 'Age must be a number' })
      .min(18, 'Must be at least 18 years old')
      .max(120, 'Invalid age'),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    role: z.enum(['admin', 'user', 'moderator'], {
      errorMap: () => ({ message: 'Please select a valid role' }),
    }),
    terms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type UserFormData = z.infer<typeof userSchema>;

function ZodValidationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      age: 18,
      website: '',
      role: 'user',
      terms: false,
    },
  });

  const onSubmit = async (data: UserFormData) => {
    console.log('Valid data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" {...register('username')} />
        {errors.username && (
          <p className="text-sm text-red-600">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="age">Age</Label>
        <Input
          id="age"
          type="number"
          {...register('age', { valueAsNumber: true })}
        />
        {errors.age && (
          <p className="text-sm text-red-600">{errors.age.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website (optional)</Label>
        <Input id="website" {...register('website')} placeholder="https://" />
        {errors.website && (
          <p className="text-sm text-red-600">{errors.website.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          {...register('role')}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Role</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        {errors.role && (
          <p className="text-sm text-red-600">{errors.role.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input id="terms" type="checkbox" {...register('terms')} />
        <Label htmlFor="terms">I accept the terms and conditions</Label>
        {errors.terms && (
          <p className="text-sm text-red-600">{errors.terms.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Register'}
      </Button>
    </form>
  );
}

export default ZodValidationForm;
```

## 3. shadcn/ui Form Components with Controller

### Complete Form with All Input Types

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  country: z.string().min(1, 'Please select a country'),
  notifications: z.boolean(),
  plan: z.enum(['free', 'pro', 'enterprise']),
  interests: z.array(z.string()).min(1, 'Select at least one interest'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfileForm() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      bio: '',
      country: '',
      notifications: true,
      plan: 'free',
      interests: [],
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    console.log('Profile data:', data);
  };

  const countries = ['United States', 'United Kingdom', 'Canada', 'Australia'];
  const interestOptions = ['Technology', 'Design', 'Business', 'Marketing'];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Text Input */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Textarea */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Controller
          name="bio"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="bio"
              placeholder="Tell us about yourself..."
              className="min-h-[120px]"
            />
          )}
        />
        {errors.bio && (
          <p className="text-sm text-red-600">{errors.bio.message}</p>
        )}
      </div>

      {/* Select */}
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Controller
          name="country"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.country && (
          <p className="text-sm text-red-600">{errors.country.message}</p>
        )}
      </div>

      {/* Switch */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="notifications">Enable Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Receive email notifications about updates
          </p>
        </div>
        <Controller
          name="notifications"
          control={control}
          render={({ field }) => (
            <Switch
              id="notifications"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Radio Group */}
      <div className="space-y-3">
        <Label>Plan</Label>
        <Controller
          name="plan"
          control={control}
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="free" id="free" />
                <Label htmlFor="free">Free</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pro" id="pro" />
                <Label htmlFor="pro">Pro - $10/month</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="enterprise" id="enterprise" />
                <Label htmlFor="enterprise">Enterprise - Contact us</Label>
              </div>
            </RadioGroup>
          )}
        />
        {errors.plan && (
          <p className="text-sm text-red-600">{errors.plan.message}</p>
        )}
      </div>

      {/* Checkbox Group */}
      <div className="space-y-3">
        <Label>Interests</Label>
        <Controller
          name="interests"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              {interestOptions.map((interest) => (
                <div key={interest} className="flex items-center space-x-2">
                  <Checkbox
                    id={interest}
                    checked={field.value?.includes(interest)}
                    onCheckedChange={(checked) => {
                      const newValue = checked
                        ? [...(field.value || []), interest]
                        : field.value?.filter((val) => val !== interest) || [];
                      field.onChange(newValue);
                    }}
                  />
                  <Label htmlFor={interest}>{interest}</Label>
                </div>
              ))}
            </div>
          )}
        />
        {errors.interests && (
          <p className="text-sm text-red-600">{errors.interests.message}</p>
        )}
      </div>

      <Button type="submit">Save Profile</Button>
    </form>
  );
}

export default ProfileForm;
```

## 4. Dynamic Form Fields

### Field Array Example

```typescript
import { useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';

interface FormData {
  contacts: {
    name: string;
    email: string;
    phone: string;
  }[];
}

function DynamicContactsForm() {
  const { register, control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      contacts: [{ name: '', email: '', phone: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contacts',
  });

  const onSubmit = (data: FormData) => {
    console.log('Contacts:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="text-lg font-semibold">Emergency Contacts</h3>

      {fields.map((field, index) => (
        <div key={field.id} className="p-4 border rounded space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Contact {index + 1}</h4>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              {...register(`contacts.${index}.name`, {
                required: 'Name is required',
              })}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              {...register(`contacts.${index}.email`, {
                required: 'Email is required',
              })}
              type="email"
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              {...register(`contacts.${index}.phone`)}
              placeholder="+1 234 567 8900"
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => append({ name: '', email: '', phone: '' })}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Contact
      </Button>

      <Button type="submit">Save Contacts</Button>
    </form>
  );
}

export default DynamicContactsForm;
```

## 5. Multi-Step Form

```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const step1Schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
});

const step2Schema = z.object({
  company: z.string().min(2),
  position: z.string().min(2),
});

const step3Schema = z.object({
  bio: z.string().min(10).max(500),
  website: z.string().url().optional().or(z.literal('')),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type FormData = Step1Data & Step2Data & Step3Data;

function MultiStepForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<FormData>>({});

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: formData,
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: formData,
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: formData,
  });

  const onStep1Submit = (data: Step1Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(2);
  };

  const onStep2Submit = (data: Step2Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(3);
  };

  const onStep3Submit = (data: Step3Data) => {
    const finalData = { ...formData, ...data };
    console.log('Final form data:', finalData);
    // Submit to API
  };

  const progress = (step / 3) * 100;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Registration</h2>
        <p className="text-muted-foreground">Step {step} of 3</p>
        <Progress value={progress} className="mt-2" />
      </div>

      {step === 1 && (
        <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input {...step1Form.register('firstName')} />
            {step1Form.formState.errors.firstName && (
              <p className="text-sm text-red-600">
                {step1Form.formState.errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input {...step1Form.register('lastName')} />
            {step1Form.formState.errors.lastName && (
              <p className="text-sm text-red-600">
                {step1Form.formState.errors.lastName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...step1Form.register('email')} />
            {step1Form.formState.errors.email && (
              <p className="text-sm text-red-600">
                {step1Form.formState.errors.email.message}
              </p>
            )}
          </div>

          <Button type="submit">Next</Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Company</Label>
            <Input {...step2Form.register('company')} />
            {step2Form.formState.errors.company && (
              <p className="text-sm text-red-600">
                {step2Form.formState.errors.company.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Position</Label>
            <Input {...step2Form.register('position')} />
            {step2Form.formState.errors.position && (
              <p className="text-sm text-red-600">
                {step2Form.formState.errors.position.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit">Next</Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea {...step3Form.register('bio')} className="min-h-[120px]" />
            {step3Form.formState.errors.bio && (
              <p className="text-sm text-red-600">
                {step3Form.formState.errors.bio.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Website (optional)</Label>
            <Input {...step3Form.register('website')} placeholder="https://" />
            {step3Form.formState.errors.website && (
              <p className="text-sm text-red-600">
                {step3Form.formState.errors.website.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default MultiStepForm;
```

## 6. Server-Side Validation

```typescript
import { useForm } from 'react-hook-form';
import { useState } from 'react';

interface LoginData {
  email: string;
  password: string;
}

function LoginForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>();

  const onSubmit = async (data: LoginData) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Set server-side errors
        if (error.field === 'email') {
          setError('email', { message: error.message });
        } else if (error.field === 'password') {
          setError('password', { message: error.message });
        } else {
          // General error
          setError('root.server', { message: error.message });
        }
        return;
      }

      const result = await response.json();
      console.log('Login successful:', result);
    } catch (error) {
      setError('root.server', {
        message: 'Network error. Please try again.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root?.server && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.server.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email', { required: 'Email is required' })}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register('password', { required: 'Password is required' })}
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </Button>
    </form>
  );
}

export default LoginForm;
```

## Best Practices

### ✅ Do's

- Use Zod for schema validation - type-safe and declarative
- Use `Controller` for complex components (Select, RadioGroup, Switch)
- Use `register` for simple inputs for better performance
- Provide clear, user-friendly error messages
- Handle both client-side and server-side errors
- Reset forms after successful submission
- Show loading states during submission
- Use `mode: 'onBlur'` for better UX (validate on blur, not on every keystroke)

### ❌ Don'ts

- Don't forget `valueAsNumber` for number inputs
- Don't validate on every keystroke unless necessary
- Don't ignore accessibility (use labels, aria attributes)
- Don't forget to handle network errors
- Don't submit forms with validation errors
- Don't use inline validation for password fields (annoying UX)
- Don't forget to clear errors after successful submission
- Don't nest forms - use field arrays instead

## Common Validation Patterns

| Validation | Pattern |
|------------|---------|
| **Required** | `z.string().min(1, 'Required')` |
| **Email** | `z.string().email('Invalid email')` |
| **URL** | `z.string().url('Invalid URL')` |
| **Min Length** | `z.string().min(3, 'Min 3 chars')` |
| **Max Length** | `z.string().max(100, 'Max 100 chars')` |
| **Number Range** | `z.number().min(0).max(100)` |
| **Regex** | `z.string().regex(/^[A-Z]/, 'Must start with uppercase')` |
| **Optional** | `z.string().optional()` or `z.literal('')` |
| **Enum** | `z.enum(['a', 'b', 'c'])` |
| **Custom** | `z.string().refine((val) => condition, 'Error message')` |

## Next Steps

- **[Theming](./04_theming.md)** - Customize form styles and themes
- **[Error Handling](../07_clean_code/03_error_handling.md)** - Advanced error handling patterns
- **[Testing](../07_clean_code/04_testing.md)** - Test your forms
- **[TanStack Query Mutations](../04_data_fetching/03_useMutation.md)** - Form submissions with React Query
