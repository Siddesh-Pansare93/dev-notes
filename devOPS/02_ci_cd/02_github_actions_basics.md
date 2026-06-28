# GitHub Actions Basics

## What You'll Learn

- GitHub Actions concepts and terminology
- Creating your first workflow
- Triggers, jobs, steps, and runners
- Common CI/CD patterns
- Practical examples for Node.js, Python, and Docker

---

## What is GitHub Actions?

**GitHub Actions** is GitHub's built-in CI/CD platform that automates software workflows directly from your repository.

### Why GitHub Actions?

✅ **Integrated with GitHub** - No external CI/CD tool needed  
✅ **Free for public repos** - 2000 minutes/month for private repos  
✅ **Massive marketplace** - Thousands of pre-built actions  
✅ **Self-hosted runners** - Run on your own infrastructure  
✅ **Matrix builds** - Test across multiple versions/OS simultaneously

---

## Core Concepts

### 1. **Workflow**
An automated process defined in a YAML file (`.github/workflows/`).

### 2. **Event (Trigger)**
Something that starts a workflow:
- `push` - Code pushed to repo
- `pull_request` - PR opened/updated
- `schedule` - Cron schedule
- `workflow_dispatch` - Manual trigger

### 3. **Job**
A set of steps that run on the same runner. Jobs run in parallel by default.

### 4. **Step**
An individual task (run a command or use an action).

### 5. **Action**
A reusable unit of code (from marketplace or custom).

### 6. **Runner**
A server that runs your workflows (GitHub-hosted or self-hosted).

---

## Workflow Structure

```yaml
name: CI Pipeline

# When to run this workflow
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

# Jobs to run
jobs:
  build:
    runs-on: ubuntu-latest  # Runner
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Run tests
        run: npm test
```

---

## Your First Workflow

### Example: Node.js CI Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: Node.js CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      # Step 1: Checkout code
      - name: Checkout repository
        uses: actions/checkout@v3
      
      # Step 2: Setup Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # Step 3: Install dependencies
      - name: Install dependencies
        run: npm ci
      
      # Step 4: Run linter
      - name: Run ESLint
        run: npm run lint
      
      # Step 5: Run tests
      - name: Run tests
        run: npm test
      
      # Step 6: Upload coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Triggers (Events)

### Push Events
```yaml
on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'src/**'        # Only run if files in src/ changed
      - '!docs/**'      # Ignore docs changes
```

### Pull Request Events
```yaml
on:
  pull_request:
    types: [ opened, synchronize, reopened ]
    branches: [ main ]
```

### Schedule (Cron)
```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # Every day at midnight UTC
    - cron: '0 */6 * * *'  # Every 6 hours
```

### Manual Trigger
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
```

### Multiple Events
```yaml
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:
```

---

## Jobs and Steps

### Single Job
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test
```

### Multiple Jobs (Parallel)
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run lint
  
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
  
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run build
```

### Sequential Jobs (Dependencies)
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run build
  
  test:
    needs: build  # Waits for build to complete
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
  
  deploy:
    needs: [build, test]  # Waits for both
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: ./deploy.sh
```

---

## Using Actions from Marketplace

### Checkout Code
```yaml
- name: Checkout code
  uses: actions/checkout@v3
```

### Setup Node.js
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'
    cache: 'npm'  # Cache node_modules
```

### Setup Python
```yaml
- name: Setup Python
  uses: actions/setup-python@v4
  with:
    python-version: '3.11'
    cache: 'pip'
```

### Cache Dependencies
```yaml
- name: Cache node_modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Upload/Download Artifacts
```yaml
# Upload
- name: Upload build artifacts
  uses: actions/upload-artifact@v3
  with:
    name: dist-files
    path: dist/

# Download (in another job)
- name: Download build artifacts
  uses: actions/download-artifact@v3
  with:
    name: dist-files
    path: dist/
```

---

## Environment Variables and Secrets

### Environment Variables
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: production
      API_URL: https://api.example.com
    steps:
      - run: echo "Environment: $NODE_ENV"
      - run: echo "API URL: ${{ env.API_URL }}"
```

### Secrets
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: ./deploy.sh
```

**Add secrets**: Repository Settings → Secrets and variables → Actions → New repository secret

---

## Matrix Builds

Test across multiple Node.js versions and operating systems:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - run: npm ci
      - run: npm test
```

**Result**: 9 jobs run (3 OS × 3 Node versions)

---

## Conditional Execution

### Run step only on specific branch
```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: ./deploy.sh
```

### Run on success/failure
```yaml
- name: Notify on failure
  if: failure()
  run: curl -X POST $SLACK_WEBHOOK -d '{"text":"Build failed!"}'

- name: Notify on success
  if: success()
  run: echo "Build succeeded!"
```

### Skip jobs
```yaml
jobs:
  deploy:
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

---

## Real-World Examples

### Complete Node.js CI/CD Pipeline

```yaml
name: Node.js CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - name: Upload coverage
        if: matrix.node-version == '18'
        uses: codecov/codecov-action@v3

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: build-files
          path: dist/
      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: ./scripts/deploy.sh
```

### Python FastAPI CI

```yaml
name: Python CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python ${{ matrix.python-version }}
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov black ruff
      
      - name: Format check
        run: black --check .
      
      - name: Lint
        run: ruff check .
      
      - name: Run tests
        run: pytest --cov=app tests/
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Best Practices

✅ **Cache dependencies** (npm, pip) to speed up builds  
✅ **Use matrix builds** for testing across versions/platforms  
✅ **Fail fast** - Run linting/fast tests before slow integration tests  
✅ **Use secrets** for sensitive data, never commit them  
✅ **Pin action versions** (`actions/checkout@v3`, not `@main`)  
✅ **Add status badges** to README for visibility  
✅ **Set timeouts** to prevent hung jobs

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10  # Fail if takes longer than 10 minutes
```

---

## Exercise

### Task 1: Create Your First Workflow

1. Create a new GitHub repository
2. Add a `.github/workflows/ci.yml` file:

```yaml
name: CI

on: [push, pull_request]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Hello, GitHub Actions!"
      - run: echo "Event: ${{ github.event_name }}"
      - run: echo "Branch: ${{ github.ref }}"
```

3. Push and check the Actions tab

### Task 2: Add a Real CI Pipeline

Add a workflow for your Node.js/Python project with:
- Dependency installation
- Linting
- Testing
- Build (if applicable)

---

**Next**: [Building & Testing](./03_building_and_testing.md) → Automate tests and code quality checks
