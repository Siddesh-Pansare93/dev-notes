# Jest vs Vitest: Modern TypeScript Testing

> **Coming from Python?** Jest is like pytest with built-in mocking, and Vitest is like pytest on steroids with instant watch mode. Both are excellent—Vitest is newer and faster, especially for Vite projects.

---

## Table of Contents

1. [Quick Comparison](#quick-comparison)
2. [When to Use Each](#when-to-use-each)
3. [Jest Setup and Configuration](#jest-setup-and-configuration)
4. [Vitest Setup and Configuration](#vitest-setup-and-configuration)
5. [Basic Testing Patterns](#basic-testing-patterns)
6. [Mocking in Jest vs Vitest](#mocking-in-jest-vs-vitest)
7. [Running Tests](#running-tests)
8. [Migration from Jest to Vitest](#migration-from-jest-to-vitest)
9. [Performance Comparison](#performance-comparison)
10. [Practice Exercises](#practice-exercises)

---

## Quick Comparison

| Feature | Jest | Vitest |
|---|---|---|
| **Speed** | Good (can be slow for large projects) | ⚡ Excellent (powered by Vite) |
| **Watch mode** | Good | ⚡ Instant (HMR) |
| **Configuration** | Separate config file | Uses vite.config.ts |
| **ESM support** | ⚠️ Requires experimental flag | ✅ Native ESM |
| **TypeScript** | Requires ts-jest | ✅ Built-in via esbuild |
| **API** | Mature, well-documented | Jest-compatible + extras |
| **Ecosystem** | Huge (React Testing Library, etc.) | Growing (works with Jest ecosystem) |
| **Parallelization** | ✅ Built-in | ✅ Built-in (faster) |
| **UI Mode** | ❌ No | ✅ Beautiful UI (`vitest --ui`) |
| **Coverage** | Istanbul | c8 (faster) or Istanbul |
| **Snapshot testing** | ✅ Yes | ✅ Yes |
| **Best for** | Established projects, React apps | New projects, Vite apps, speed |

**Python Equivalent:** Jest ≈ pytest, Vitest ≈ pytest + pytest-watch + faster

---

## When to Use Each

### Use Jest When:
- ✅ Working with Create React App (Jest is default)
- ✅ Large existing codebase already using Jest
- ✅ Need maximum ecosystem compatibility (some tools only work with Jest)
- ✅ Team is already familiar with Jest

### Use Vitest When:
- ✅ Starting a new project
- ✅ Using Vite as build tool
- ✅ Speed is critical (large test suites)
- ✅ Want modern ESM support without config hell
- ✅ Love fast HMR in tests

**Recommendation for 2024:** Use **Vitest** for new projects, stick with **Jest** if already using it (migration is easy if needed later).

---

## Jest Setup and Configuration

### Installation

```bash
# For TypeScript projects
npm install --save-dev jest @types/jest ts-jest

# For React projects
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Optional: coverage
npm install --save-dev @jest/globals
```

### Configuration (jest.config.ts)

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node', // or 'jsdom' for React
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Transform
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  }
};

export default config;
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:verbose": "jest --verbose"
  }
}
```

---

## Vitest Setup and Configuration

### Installation

```bash
# Core Vitest
npm install --save-dev vitest

# For React testing
npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom

# Optional: UI mode
npm install --save-dev @vitest/ui
```

### Configuration (vite.config.ts)

```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  test: {
    globals: true, // Use global test, expect, describe, etc.
    environment: 'jsdom', // or 'node'
    
    // Setup files
    setupFiles: ['./src/test/setup.ts'],
    
    // Coverage
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ]
    },
    
    // Include patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Basic Testing Patterns

### Example 1: Simple Function Tests (Both Jest and Vitest)

```typescript
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Cannot divide by zero');
  }
  return a / b;
}

export function factorial(n: number): number {
  if (n < 0) throw new Error('Negative numbers not allowed');
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}
```

```typescript
// src/utils/math.test.ts
import { describe, it, expect } from 'vitest'; // or '@jest/globals' for Jest
import { add, divide, factorial } from './math';

describe('Math utilities', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });
    
    it('should add negative numbers', () => {
      expect(add(-2, -3)).toBe(-5);
    });
    
    it('should handle zero', () => {
      expect(add(5, 0)).toBe(5);
    });
  });
  
  describe('divide', () => {
    it('should divide two numbers', () => {
      expect(divide(10, 2)).toBe(5);
    });
    
    it('should handle decimal results', () => {
      expect(divide(5, 2)).toBe(2.5);
    });
    
    it('should throw error when dividing by zero', () => {
      expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
    });
  });
  
  describe('factorial', () => {
    it('should calculate factorial of positive number', () => {
      expect(factorial(5)).toBe(120);
      expect(factorial(3)).toBe(6);
    });
    
    it('should return 1 for 0 and 1', () => {
      expect(factorial(0)).toBe(1);
      expect(factorial(1)).toBe(1);
    });
    
    it('should throw error for negative numbers', () => {
      expect(() => factorial(-5)).toThrow('Negative numbers not allowed');
    });
  });
});
```

**Compare with Python (pytest):**

```python
# Python equivalent
def test_add():
    assert add(2, 3) == 5

def test_divide_by_zero():
    with pytest.raises(ValueError):
        divide(10, 0)
```

### Example 2: Async Function Testing

```typescript
// src/api/users.ts
export async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('User not found');
  }
  return response.json();
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// src/api/users.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchUser, delay } from './users';

describe('Async functions', () => {
  it('should fetch user successfully', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, name: 'John' })
    });
    
    const user = await fetchUser(1);
    
    expect(user).toEqual({ id: 1, name: 'John' });
    expect(fetch).toHaveBeenCalledWith('/api/users/1');
  });
  
  it('should throw error when user not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false
    });
    
    await expect(fetchUser(999)).rejects.toThrow('User not found');
  });
  
  it('should wait for delay', async () => {
    const start = Date.now();
    await delay(100);
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});
```

---

## Mocking in Jest vs Vitest

### Jest Mocking

```typescript
// Jest mocking examples
import { jest } from '@jest/globals';

// Mock a module
jest.mock('./api/users', () => ({
  fetchUser: jest.fn()
}));

// Mock a function
const mockFn = jest.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ data: 'async' });

// Spy on method
const spy = jest.spyOn(console, 'log');

// Mock timers
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
jest.useRealTimers();

// Clear mocks
jest.clearAllMocks();
jest.resetAllMocks();
```

### Vitest Mocking (Almost Identical!)

```typescript
// Vitest mocking examples
import { vi } from 'vitest';

// Mock a module
vi.mock('./api/users', () => ({
  fetchUser: vi.fn()
}));

// Mock a function
const mockFn = vi.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ data: 'async' });

// Spy on method
const spy = vi.spyOn(console, 'log');

// Mock timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();

// Clear mocks
vi.clearAllMocks();
vi.resetAllMocks();
```

**Key Difference:** Replace `jest` with `vi` in Vitest!

### Example 3: Mocking External Dependencies

```typescript
// src/services/weather.ts
import axios from 'axios';

export async function getWeather(city: string): Promise<number> {
  const response = await axios.get(
    `https://api.weather.com/current?city=${city}`
  );
  return response.data.temperature;
}

// src/services/weather.test.ts (Vitest)
import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { getWeather } from './weather';

// Mock axios module
vi.mock('axios');

describe('Weather Service', () => {
  it('should fetch temperature for city', async () => {
    // Setup mock
    vi.mocked(axios.get).mockResolvedValue({
      data: { temperature: 72, conditions: 'sunny' }
    });
    
    const temp = await getWeather('San Francisco');
    
    expect(temp).toBe(72);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('San Francisco')
    );
  });
  
  it('should handle API errors', async () => {
    vi.mocked(axios.get).mockRejectedValue(
      new Error('API Error')
    );
    
    await expect(getWeather('Invalid')).rejects.toThrow('API Error');
  });
});
```

---

## Running Tests

### Jest Commands

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Run specific file
npm test -- src/utils/math.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should add"

# Coverage
npm test -- --coverage

# Verbose output
npm test -- --verbose

# Update snapshots
npm test -- --updateSnapshot
```

### Vitest Commands

```bash
# Run all tests
npm test

# Watch mode (default)
vitest

# Run once (CI mode)
vitest run

# UI mode
vitest --ui

# Run specific file
vitest src/utils/math.test.ts

# Run tests matching pattern
vitest -t "should add"

# Coverage
vitest run --coverage

# Update snapshots
vitest -u
```

---

## Migration from Jest to Vitest

### Step 1: Update Dependencies

```bash
# Remove Jest
npm uninstall jest @types/jest ts-jest

# Install Vitest
npm install --save-dev vitest
```

### Step 2: Update Configuration

```typescript
// Replace jest.config.ts with vite.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // or 'node'
  }
});
```

### Step 3: Update Imports

```typescript
// Before (Jest)
import { describe, it, expect, jest } from '@jest/globals';

// After (Vitest)
import { describe, it, expect, vi } from 'vitest';

// Or with globals: true in config, no imports needed!
```

### Step 4: Replace jest with vi

```bash
# Use find and replace in your editor
# Replace: jest.
# With: vi.

# Or use this script:
find src -name "*.test.ts" -exec sed -i 's/jest\./vi./g' {} +
```

### Step 5: Update package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

---

## Performance Comparison

### Real-World Example

**Project:** 500 test files, 2000 tests

| Operation | Jest | Vitest | Speedup |
|---|---|---|---|
| Initial run | 45s | 12s | 3.75x faster |
| Watch mode start | 8s | 0.5s | 16x faster |
| Single file change | 3s | 0.1s | 30x faster |
| Full coverage | 60s | 18s | 3.3x faster |

**Why Vitest is Faster:**
- Uses esbuild (written in Go) instead of Babel
- Native ESM support (no transpilation needed)
- Better parallelization
- Instant HMR in watch mode

---

## Example 4: Complete Test Suite (Works in Both)

```typescript
// src/services/userService.ts
export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

export class UserService {
  private users: User[] = [];
  private nextId = 1;
  
  create(name: string, email: string, age: number): User {
    if (!email.includes('@')) {
      throw new Error('Invalid email');
    }
    if (age < 0) {
      throw new Error('Age must be positive');
    }
    
    const user: User = {
      id: this.nextId++,
      name,
      email,
      age
    };
    
    this.users.push(user);
    return user;
  }
  
  findById(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
  
  findByEmail(email: string): User | undefined {
    return this.users.find(u => u.email === email);
  }
  
  getAll(): User[] {
    return [...this.users];
  }
  
  delete(id: number): boolean {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }
  
  getAdults(): User[] {
    return this.users.filter(u => u.age >= 18);
  }
}

// src/services/userService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from './userService';

describe('UserService', () => {
  let service: UserService;
  
  beforeEach(() => {
    service = new UserService();
  });
  
  describe('create', () => {
    it('should create a user with valid data', () => {
      const user = service.create('John Doe', 'john@example.com', 30);
      
      expect(user).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      });
      expect(user.id).toBeDefined();
    });
    
    it('should throw error for invalid email', () => {
      expect(() => {
        service.create('John', 'invalid-email', 30);
      }).toThrow('Invalid email');
    });
    
    it('should throw error for negative age', () => {
      expect(() => {
        service.create('John', 'john@example.com', -5);
      }).toThrow('Age must be positive');
    });
    
    it('should assign incremental IDs', () => {
      const user1 = service.create('User 1', 'user1@example.com', 25);
      const user2 = service.create('User 2', 'user2@example.com', 30);
      
      expect(user2.id).toBe(user1.id + 1);
    });
  });
  
  describe('findById', () => {
    it('should find user by ID', () => {
      const created = service.create('John', 'john@example.com', 30);
      const found = service.findById(created.id);
      
      expect(found).toEqual(created);
    });
    
    it('should return undefined for non-existent ID', () => {
      expect(service.findById(999)).toBeUndefined();
    });
  });
  
  describe('findByEmail', () => {
    it('should find user by email', () => {
      service.create('John', 'john@example.com', 30);
      const found = service.findByEmail('john@example.com');
      
      expect(found?.name).toBe('John');
    });
    
    it('should return undefined for non-existent email', () => {
      expect(service.findByEmail('nonexistent@example.com')).toBeUndefined();
    });
  });
  
  describe('getAll', () => {
    it('should return all users', () => {
      service.create('User 1', 'user1@example.com', 25);
      service.create('User 2', 'user2@example.com', 30);
      service.create('User 3', 'user3@example.com', 35);
      
      const all = service.getAll();
      expect(all).toHaveLength(3);
    });
    
    it('should return empty array when no users', () => {
      expect(service.getAll()).toEqual([]);
    });
    
    it('should return a copy of the array', () => {
      service.create('User', 'user@example.com', 25);
      const all = service.getAll();
      all.push({ id: 999, name: 'Fake', email: 'fake@example.com', age: 99 });
      
      // Original should not be affected
      expect(service.getAll()).toHaveLength(1);
    });
  });
  
  describe('delete', () => {
    it('should delete user by ID', () => {
      const user = service.create('John', 'john@example.com', 30);
      const deleted = service.delete(user.id);
      
      expect(deleted).toBe(true);
      expect(service.findById(user.id)).toBeUndefined();
    });
    
    it('should return false for non-existent ID', () => {
      expect(service.delete(999)).toBe(false);
    });
  });
  
  describe('getAdults', () => {
    it('should return only users 18 and older', () => {
      service.create('Minor', 'minor@example.com', 15);
      service.create('Adult 1', 'adult1@example.com', 18);
      service.create('Adult 2', 'adult2@example.com', 25);
      
      const adults = service.getAdults();
      
      expect(adults).toHaveLength(2);
      expect(adults.every(u => u.age >= 18)).toBe(true);
    });
  });
});
```

---

## Practice Exercises

### Exercise 1: Choose and Setup

```bash
# TODO: Choose Jest or Vitest for a new TypeScript project
# TODO: Set up configuration
# TODO: Write tests for a calculator class
# TODO: Add coverage reporting
```

### Exercise 2: Test Async Code

```typescript
// TODO: Create a service that fetches data from API
// TODO: Mock the API calls
// TODO: Test success and error cases
// TODO: Test timeout scenarios
```

### Exercise 3: Migration Exercise

```bash
# TODO: Take an existing Jest project
# TODO: Migrate to Vitest
# TODO: Verify all tests still pass
# TODO: Compare performance
```

---

## Summary

You've learned:

✅ Differences between Jest and Vitest  
✅ When to use each framework  
✅ Setup and configuration for both  
✅ Basic testing patterns  
✅ Mocking in Jest vs Vitest  
✅ Migration path from Jest to Vitest  
✅ Performance considerations

**Key Takeaway:** Vitest is mostly Jest-compatible but faster. Use Vitest for new projects, especially with Vite!

**Next Tutorial:** Unit testing with mocks and spies
