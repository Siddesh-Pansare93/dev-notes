# Getting Started with React + TypeScript

Learn how to set up a modern React development environment with TypeScript, Vite, and essential tools.

## What You'll Learn

- Setting up a React + TypeScript project with Vite
- Understanding the project structure
- Installing and configuring essential tools
- Running your first development server

## Prerequisites

```bash
# Check Node.js version (16.x or higher required)
node --version

# Check npm version
npm --version
```

## Creating a New Project

### Using Vite (Recommended)

Vite is the modern, fast build tool recommended for React projects.

```bash
# Create a new React + TypeScript project
npm create vite@latest my-react-app -- --template react-ts

# Navigate to the project directory
cd my-react-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

Your app will be running at `http://localhost:5173`

### Alternative: Create React App

```bash
# Using Create React App (older, slower but still supported)
npx create-react-app my-react-app --template typescript
cd my-react-app
npm start
```

## Initial Project Structure

```
my-react-app/
├── node_modules/          # Dependencies
├── public/                # Static assets
│   └── vite.svg
├── src/                   # Source code
│   ├── assets/           # Images, fonts, etc.
│   ├── App.tsx           # Main component
│   ├── App.css           # Component styles
│   ├── main.tsx          # Entry point
│   ├── index.css         # Global styles
│   └── vite-env.d.ts     # Vite type definitions
├── .gitignore            # Git ignore rules
├── index.html            # HTML template
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

## Installing Essential Tools

```bash
# Zustand - State management
npm install zustand

# TanStack Query - Data fetching
npm install @tanstack/react-query

# Axios - HTTP client
npm install axios

# React Router - Routing
npm install react-router-dom
npm install -D @types/react-router-dom

# Date handling
npm install date-fns
```

## Setting Up Tailwind CSS

```bash
# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p
```

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Update `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## TypeScript Configuration

Your `tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  }
}
```

## Useful VS Code Extensions

- **ES7+ React/Redux/React-Native snippets**: Quick component snippets
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: Tailwind autocomplete
- **Error Lens**: Inline error display

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## Verifying Your Setup

Create a simple component in `src/App.tsx`:

```typescript
import { useState } from 'react';

function App() {
  const [count, setCount] = useState<number>(0);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-4">React + TypeScript</h1>
        <p className="mb-4">Count: {count}</p>
        <button 
          onClick={() => setCount(count + 1)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Increment
        </button>
      </div>
    </div>
  );
}

export default App;
```

## Common Issues and Solutions

### Port Already in Use

```bash
# Vite will automatically try the next available port
# Or specify a custom port in vite.config.ts
export default defineConfig({
  server: {
    port: 3000
  }
})
```

### TypeScript Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Hot Module Replacement Not Working

Ensure your component is exported correctly and using proper React hooks.

## Next Steps

- [Project Structure Best Practices](./02_project_structure.md)
- [Your First Component](./03_first_component.md)

## Summary

You now have a modern React + TypeScript development environment with:
- ✅ Vite for fast development
- ✅ TypeScript for type safety
- ✅ Tailwind CSS for styling
- ✅ Essential libraries installed
- ✅ Proper configuration files
