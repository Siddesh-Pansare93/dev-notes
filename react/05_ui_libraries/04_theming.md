# Theming and Customization with shadcn/ui

Learn how to customize shadcn/ui components, implement dark mode, and create your own design system.

## What You'll Learn

- Understanding shadcn/ui theming system
- CSS variables and design tokens
- Implementing dark mode
- Customizing component colors and styles
- Creating custom themes
- Theme switching strategies
- Tailwind CSS customization

## 1. Understanding the Theme System

shadcn/ui uses **CSS variables** for theming, making it easy to customize colors system-wide.

### Default Theme Structure

```css
/* app/globals.css or your main CSS file */

@layer base {
  :root {
    /* Background colors */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    /* Card colors */
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    /* Popover colors */
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* Primary brand color */
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;

    /* Secondary color */
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    /* Muted backgrounds */
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    /* Accent color */
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    /* Destructive/error color */
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    /* Border colors */
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;

    /* Border radius */
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
```

### HSL Color Format

Colors use HSL (Hue, Saturation, Lightness) format **without** the `hsl()` wrapper:

```css
/* ❌ Wrong */
--primary: hsl(222.2, 47.4%, 11.2%);

/* ✅ Correct */
--primary: 222.2 47.4% 11.2%;
```

This allows Tailwind to use alpha values: `bg-primary/50` (50% opacity).

## 2. Dark Mode Implementation

### Setup Dark Mode Provider

```typescript
// app/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
```

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Theme Toggle Component

```typescript
// components/theme-toggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Simple Toggle Button

```typescript
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SimpleThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="outline" size="icon" disabled />;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

## 3. Custom Color Themes

### Create Multiple Themes

```css
/* globals.css */

@layer base {
  /* Default theme */
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* ... other variables */
  }

  /* Blue theme */
  .theme-blue {
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
  }

  /* Green theme */
  .theme-green {
    --primary: 142.1 76.2% 36.3%;
    --primary-foreground: 355.7 100% 97.3%;
    --accent: 142.1 70.6% 45.3%;
    --accent-foreground: 144.9 80.4% 10%;
  }

  /* Purple theme */
  .theme-purple {
    --primary: 262.1 83.3% 57.8%;
    --primary-foreground: 210 40% 98%;
    --accent: 270 95.2% 75.3%;
    --accent-foreground: 262.1 90% 20%;
  }

  /* Orange theme */
  .theme-orange {
    --primary: 24.6 95% 53.1%;
    --primary-foreground: 60 9.1% 97.8%;
    --accent: 20.5 90.2% 48.2%;
    --accent-foreground: 60 9.1% 97.8%;
  }
}
```

### Theme Selector Component

```typescript
'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const themes = [
  { name: 'Default', value: '', color: 'bg-slate-900' },
  { name: 'Blue', value: 'theme-blue', color: 'bg-blue-600' },
  { name: 'Green', value: 'theme-green', color: 'bg-green-600' },
  { name: 'Purple', value: 'theme-purple', color: 'bg-purple-600' },
  { name: 'Orange', value: 'theme-orange', color: 'bg-orange-600' },
];

export function ThemeSelector() {
  const [selectedTheme, setSelectedTheme] = useState('');

  const handleThemeChange = (themeValue: string) => {
    setSelectedTheme(themeValue);
    
    // Remove all theme classes
    document.documentElement.classList.remove(
      ...themes.map((t) => t.value).filter(Boolean)
    );
    
    // Add new theme class
    if (themeValue) {
      document.documentElement.classList.add(themeValue);
    }
    
    // Save to localStorage
    localStorage.setItem('color-theme', themeValue);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Theme Colors</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => handleThemeChange(theme.value)}
          >
            <div className="flex items-center gap-2 w-full">
              <div className={`w-4 h-4 rounded-full ${theme.color}`} />
              <span className="flex-1">{theme.name}</span>
              {selectedTheme === theme.value && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## 4. Customizing Component Styles

### Override Default Styles

```typescript
// components/custom-button.tsx
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CustomButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function CustomButton({
  children,
  variant = 'primary',
  className,
  ...props
}: CustomButtonProps) {
  return (
    <Button
      className={cn(
        // Base styles
        'rounded-lg font-semibold transition-all',
        // Variant styles
        {
          'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800':
            variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100':
            variant === 'secondary',
          'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800':
            variant === 'danger',
        },
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
```

### Create Themed Cards

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemedCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export function ThemedCard({
  title,
  description,
  icon: Icon,
  variant = 'default',
}: ThemedCardProps) {
  const variants = {
    default: 'border-gray-200 dark:border-gray-800',
    primary: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950',
    success: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950',
    warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950',
    danger: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950',
  };

  const iconVariants = {
    default: 'text-gray-600 dark:text-gray-400',
    primary: 'text-blue-600 dark:text-blue-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card className={cn('transition-colors', variants[variant])}>
      <CardHeader className="flex flex-row items-center gap-4">
        <div
          className={cn(
            'p-2 rounded-lg',
            variant === 'default' && 'bg-gray-100 dark:bg-gray-800',
            variant === 'primary' && 'bg-blue-100 dark:bg-blue-900',
            variant === 'success' && 'bg-green-100 dark:bg-green-900',
            variant === 'warning' && 'bg-yellow-100 dark:bg-yellow-900',
            variant === 'danger' && 'bg-red-100 dark:bg-red-900'
          )}
        >
          <Icon className={cn('h-6 w-6', iconVariants[variant])} />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
```

## 5. Tailwind CSS Customization

### Extend Tailwind Config

```javascript
// tailwind.config.js
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Add custom animations
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-in',
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

## 6. Custom Radius System

### Adjust Border Radius

```css
/* globals.css */

:root {
  /* Sharp corners */
  --radius: 0rem;
}

.rounded-theme {
  /* Slightly rounded */
  --radius: 0.25rem;
}

.rounded-theme-md {
  /* Medium rounded */
  --radius: 0.5rem;
}

.rounded-theme-lg {
  /* Large rounded */
  --radius: 0.75rem;
}

.rounded-theme-full {
  /* Fully rounded */
  --radius: 9999px;
}
```

```typescript
// components/radius-selector.tsx
'use client';

export function RadiusSelector() {
  const radiusOptions = [
    { name: 'Sharp', value: '0rem' },
    { name: 'Small', value: '0.25rem' },
    { name: 'Medium', value: '0.5rem' },
    { name: 'Large', value: '0.75rem' },
    { name: 'Full', value: '9999px' },
  ];

  const handleRadiusChange = (value: string) => {
    document.documentElement.style.setProperty('--radius', value);
    localStorage.setItem('border-radius', value);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Border Radius</label>
      <div className="flex gap-2">
        {radiusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleRadiusChange(option.value)}
            className="px-3 py-2 text-sm border rounded hover:bg-accent"
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## 7. Complete Theme Customizer

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const colorThemes = [
    { name: 'Default', value: '', primary: '222.2 47.4% 11.2%' },
    { name: 'Blue', value: 'theme-blue', primary: '221.2 83.2% 53.3%' },
    { name: 'Green', value: 'theme-green', primary: '142.1 76.2% 36.3%' },
    { name: 'Purple', value: 'theme-purple', primary: '262.1 83.3% 57.8%' },
    { name: 'Orange', value: 'theme-orange', primary: '24.6 95% 53.1%' },
  ];

  const radiusOptions = [
    { name: 'None', value: '0' },
    { name: 'Small', value: '0.25rem' },
    { name: 'Medium', value: '0.5rem' },
    { name: 'Large', value: '0.75rem' },
  ];

  if (!mounted) return null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Customize Theme</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mode">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mode">Mode</TabsTrigger>
            <TabsTrigger value="color">Color</TabsTrigger>
            <TabsTrigger value="radius">Radius</TabsTrigger>
          </TabsList>

          <TabsContent value="mode" className="space-y-4">
            <div className="space-y-2">
              <Label>Theme Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="w-full"
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="w-full"
                >
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  onClick={() => setTheme('system')}
                  className="w-full"
                >
                  System
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="color" className="space-y-4">
            <div className="space-y-2">
              <Label>Color Theme</Label>
              <div className="grid grid-cols-2 gap-2">
                {colorThemes.map((colorTheme) => (
                  <Button
                    key={colorTheme.value}
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      document.documentElement.classList.remove(
                        ...colorThemes.map((t) => t.value).filter(Boolean)
                      );
                      if (colorTheme.value) {
                        document.documentElement.classList.add(colorTheme.value);
                      }
                      localStorage.setItem('color-theme', colorTheme.value);
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ background: `hsl(${colorTheme.primary})` }}
                    />
                    {colorTheme.name}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="radius" className="space-y-4">
            <div className="space-y-2">
              <Label>Border Radius</Label>
              <div className="grid grid-cols-2 gap-2">
                {radiusOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    onClick={() => {
                      document.documentElement.style.setProperty(
                        '--radius',
                        option.value
                      );
                      localStorage.setItem('border-radius', option.value);
                    }}
                  >
                    {option.name}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

## Best Practices

### ✅ Do's

- Use CSS variables for all theme values
- Implement SSR-friendly dark mode (avoid hydration issues)
- Persist theme preferences in localStorage
- Test all components in both light and dark modes
- Use semantic color names (primary, secondary, not blue, red)
- Provide sufficient color contrast for accessibility
- Use Tailwind's dark: prefix for dark mode styles
- Leverage `suppressHydrationWarning` on html tag

### ❌ Don'ts

- Don't hardcode color values in components
- Don't forget to handle system theme preference
- Don't use RGB/HEX colors - stick with HSL
- Don't forget the HSL format (no `hsl()` wrapper)
- Don't create themes that fail WCAG contrast requirements
- Don't access theme on server components
- Don't flash wrong theme on page load
- Don't forget to test all interactive states

## Color Palette Generator

Use tools to generate accessible color palettes:

- **[Realtime Colors](https://realtimecolors.com/)** - Preview colors in real UI
- **[Coolors](https://coolors.co/)** - Generate color schemes
- **[ColorBox](https://colorbox.io/)** - HSL color picker
- **[shadcn Themes](https://ui.shadcn.com/themes)** - Pre-made themes

## Next Steps

- **[TypeScript Generics](../06_typescript_patterns/02_generics.md)** - Type-safe themed components
- **[Component Design](../07_clean_code/01_component_design.md)** - Reusable component patterns
- **[Performance](../07_clean_code/05_performance.md)** - Optimize theme switching
- **[Testing](../07_clean_code/04_testing.md)** - Test themed components
