# Advanced CI/CD Workflows

> Master complex CI/CD patterns: matrix builds, reusable workflows, conditional execution, and optimization techniques.

## Table of Contents
1. [Matrix Builds](#matrix-builds)
2. [Reusable Workflows](#reusable-workflows)
3. [Conditional Execution](#conditional-execution)
4. [Caching & Performance](#caching--performance)
5. [Artifact Management](#artifact-management)
6. [Workflow Composition](#workflow-composition)
7. [Complex Patterns](#complex-patterns)

---

## Matrix Builds

Test against multiple versions in parallel.

### Basic Matrix

```yaml
test:
  strategy:
    matrix:
      node-version: [16, 18, 20]
      os: [ubuntu-latest, macos-latest, windows-latest]
  runs-on: ${{ matrix.os }}
  steps:
    - uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm test
```

**Result:** 9 parallel jobs (3 versions × 3 OSes)

### Matrix with Include/Exclude

```yaml
test:
  strategy:
    matrix:
      include:
        # Test Node 16 on all OS
        - node-version: 16
          os: ubuntu-latest
        - node-version: 16
          os: macos-latest
        - node-version: 16
          os: windows-latest

        # Test Node 18 on Linux only
        - node-version: 18
          os: ubuntu-latest

        # Test Node 20 on Linux only
        - node-version: 20
          os: ubuntu-latest

    exclude:
      # Skip problematic combinations
      - node-version: 16
        os: windows-latest
```

### Matrix with Custom Variables

```yaml
test:
  strategy:
    matrix:
      test-suite:
        - { name: "Unit", script: "test:unit" }
        - { name: "Integration", script: "test:integration", db: postgres }
        - { name: "E2E", script: "test:e2e", db: postgres }

  services:
    postgres:
      image: postgres:15
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5

  steps:
    - run: npm run ${{ matrix.test-suite.script }}
```

### Failing Matrix Jobs Continue

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20]
  fail-fast: false  # Don't cancel other jobs if one fails
```

---

## Reusable Workflows

Share workflow logic across repositories.

### Define Reusable Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  workflow_call:
    inputs:
      node-version:
        required: false
        type: string
        default: '18'
      test-command:
        required: false
        type: string
        default: 'npm test'

    secrets:
      npm-token:
        required: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: ${{ inputs.node-version }}
          cache: npm

      - run: npm ci

      - name: Run tests
        run: ${{ inputs.test-command }}
        env:
          NPM_TOKEN: ${{ secrets.npm-token }}
```

### Call Reusable Workflow

```yaml
# .github/workflows/main.yml
name: CI

on: [push]

jobs:
  test:
    uses: ./.github/workflows/test.yml
    with:
      node-version: '20'
      test-command: 'npm run test:ci'
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }}
```

### Reusable Workflow in Another Repository

```yaml
# In repository B, calling workflow from repository A
test:
  uses: company/shared-workflows/.github/workflows/test.yml@main
  with:
    node-version: '18'
  secrets:
    npm-token: ${{ secrets.NPM_TOKEN }}
```

---

## Conditional Execution

Control when jobs run.

### If Conditions

```yaml
jobs:
  build:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy-staging.sh

  deploy-prod:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: ./deploy-production.sh
```

### Skip CI

```bash
# Skip pipeline with commit message
git commit -m "Update docs [skip ci]"

# Pipeline won't run
```

```yaml
# Or in workflow
if: "!contains(github.event.head_commit.message, '[skip ci]')"
```

### Deploy Only on Tags

```yaml
deploy:
  if: startsWith(github.ref, 'refs/tags/')
  steps:
    - run: ./deploy.sh
```

### Approve Before Deploy

```yaml
deploy-production:
  environment:
    name: production
    # Requires approval from CODEOWNERS
  needs: test
  steps:
    - run: ./deploy.sh
```

---

## Caching & Performance

### Cache Dependencies

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/cache@v3
        with:
          path: node_modules
          key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-npm-

      - run: npm ci
      - run: npm run build
```

### Cache Docker Layers

```yaml
build-docker:
  steps:
    - uses: docker/setup-buildx-action@v2

    - uses: docker/build-push-action@v4
      with:
        context: .
        cache-from: type=gha
        cache-to: type=gha,mode=max
        push: true
```

### Incremental Testing

```yaml
test:
  steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0

    - name: Get changed files
      id: changed
      run: |
        CHANGED=$(git diff --name-only origin/main...)
        echo "files=$CHANGED" >> $GITHUB_OUTPUT

    - name: Run relevant tests
      run: |
        if echo "${{ steps.changed.outputs.files }}" | grep -q "src/"; then
          npm run test:unit
        fi
        if echo "${{ steps.changed.outputs.files }}" | grep -q "api/"; then
          npm run test:integration
        fi
```

---

## Artifact Management

### Upload Artifacts

```yaml
build:
  steps:
    - run: npm run build

    - uses: actions/upload-artifact@v3
      with:
        name: build-${{ github.sha }}
        path: dist/
        retention-days: 30
        if-no-files-found: error
```

### Download Artifacts

```yaml
deploy:
  needs: build
  steps:
    - uses: actions/download-artifact@v3
      with:
        name: build-${{ github.sha }}
        path: dist/

    - run: ./deploy.sh
```

### Artifact Storage Management

```yaml
cleanup:
  runs-on: ubuntu-latest
  steps:
    - name: Delete old artifacts
      uses: jimschubert/delete-artifacts-action@v1
      with:
        min-rows-retained: 10
        artifact-retention-days: 30
```

---

## Workflow Composition

### Orchestrate Multiple Workflows

```yaml
# main.yml - orchestrates everything
name: Full CI/CD

on: [push, pull_request]

jobs:
  # Lint step
  lint:
    uses: ./.github/workflows/lint.yml

  # Test step (depends on lint)
  test:
    needs: lint
    uses: ./.github/workflows/test.yml
    with:
      node-version: '18'

  # Build step (depends on test)
  build:
    needs: test
    uses: ./.github/workflows/build.yml

  # Deploy step (only on main, depends on build)
  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    uses: ./.github/workflows/deploy.yml
    secrets:
      deploy-token: ${{ secrets.DEPLOY_TOKEN }}
```

### Parallel with Convergence

```yaml
jobs:
  # Parallel jobs
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit

  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint

  security:
    runs-on: ubuntu-latest
    steps:
      - run: npm audit

  # Convergence job (waits for all)
  deploy:
    needs: [unit-test, lint, security]
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

---

## Complex Patterns

### Dynamic Job Generation

```yaml
test:
  runs-on: ubuntu-latest
  outputs:
    matrix: ${{ steps.set-matrix.outputs.matrix }}

  steps:
    - uses: actions/checkout@v3

    - id: set-matrix
      run: |
        MATRIX=$(cat test-matrix.json)
        echo "matrix=$MATRIX" >> $GITHUB_OUTPUT

run-tests:
  needs: test
  strategy:
    matrix: ${{ fromJson(needs.test.outputs.matrix) }}
  steps:
    - run: npm run test -- ${{ matrix.test-suite }}
```

```json
// test-matrix.json
{
  "test-suite": ["unit", "integration", "e2e"]
}
```

### Workflow Dispatch with Inputs

```yaml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        type: choice
        options:
          - staging
          - production

      version:
        description: 'Version to deploy'
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - run: |
          echo "Deploying version ${{ github.event.inputs.version }}"
          echo "To environment ${{ github.event.inputs.environment }}"
```

### Polling External Checks

```yaml
deploy:
  steps:
    - name: Wait for external system
      run: |
        for i in {1..30}; do
          if curl -f https://external-system/ready; then
            echo "System ready!"
            exit 0
          fi
          echo "Waiting... attempt $i/30"
          sleep 10
        done
        exit 1
```

### Multi-Stage with Approvals

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  deploy-staging:
    needs: build
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy-staging.sh

  deploy-production:
    needs: [build, deploy-staging]
    environment:
      name: production
      # Requires approval
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy-production.sh
```

---

## Best Practices for Advanced Workflows

### 1. Document Complex Workflows

```yaml
# Clear comments explaining complex logic
jobs:
  test:
    # Only run tests on PRs and commits to main/develop
    if: github.event_name == 'pull_request' || github.ref in ('refs/heads/main', 'refs/heads/develop')
    runs-on: ubuntu-latest
    steps:
      - run: npm test
```

### 2. Use Consistent Output Names

```yaml
jobs:
  build:
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      version: ${{ steps.version.outputs.version }}
    steps:
      - id: meta
        run: echo "tags=myapp:latest" >> $GITHUB_OUTPUT
      - id: version
        run: echo "version=1.0.0" >> $GITHUB_OUTPUT
```

### 3. Fail Fast on Critical Issues

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
      # Fails entire workflow if lint fails

  test:
    needs: lint  # Won't run if lint fails
    runs-on: ubuntu-latest
    steps:
      - run: npm test
```

### 4. Provide Clear Feedback

```yaml
steps:
  - name: Run tests
    id: tests
    run: npm test
    continue-on-error: true

  - name: Report results
    run: |
      if [ "${{ steps.tests.outcome }}" == "failure" ]; then
        echo "❌ Tests failed"
        exit 1
      else
        echo "✅ Tests passed"
      fi
```

---

## Practical Example: Complete Advanced Workflow

```yaml
name: Advanced CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]

jobs:
  # Matrix testing
  test:
    strategy:
      matrix:
        node-version: [18, 20]
        os: [ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci && npm test

  # Reusable workflow
  build:
    needs: test
    uses: ./.github/workflows/build.yml

  # Deploy with conditions
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: build
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh

  deploy-production:
    if: |
      github.ref == 'refs/heads/main' ||
      github.event_name == 'workflow_dispatch'
    needs: build
    environment: production
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

---

## Summary

- **Matrix builds** test against multiple versions efficiently
- **Reusable workflows** reduce duplication across repositories
- **Conditional execution** controls job flow with precision
- **Caching** dramatically reduces build times
- **Artifacts** enable stage-to-stage data passing
- **Workflow composition** orchestrates complex pipelines
- **Advanced patterns** handle sophisticated requirements

Next: [AWS Essentials](../03_aws_essentials/01_aws_overview.md) - cloud infrastructure
