# TypeScript Testing

A practical guide to testing TypeScript and Node.js applications using modern tooling — covering everything from choosing the right test runner to writing unit tests, mocking dependencies, testing REST APIs, and wiring up CI/CD pipelines.

## Table of Contents

### Part 1: Choosing Your Test Runner
- [Jest vs Vitest](./01_jest_vs_vitest.md) — Side-by-side comparison, setup, configuration, and when to use each

### Part 2: Writing Tests in TypeScript
- [Node.js Testing](./01_nodejs_testing.md) — Unit tests, mocks, spies, async testing, Express, NestJS, and E2E with supertest

---

## Learning Path

### Beginner
Start here if you are new to testing in TypeScript:
1. [Node.js Testing](./01_nodejs_testing.md) — Setup instructions, your first unit test, and basic mocking patterns
2. [Jest vs Vitest](./01_jest_vs_vitest.md) — Understand the tools you are using and pick the right one for your project

### Intermediate
Once comfortable with the basics:
1. [Jest vs Vitest — Mocking section](./01_jest_vs_vitest.md) — Module mocks, function mocks, spies, fake timers
2. [Node.js Testing — Express section](./01_nodejs_testing.md) — Test Express routes and middleware with `supertest`

### Advanced
For production-grade testing setups:
1. [Node.js Testing — NestJS section](./01_nodejs_testing.md) — Test providers, controllers, and guards using the NestJS testing module
2. [Node.js Testing — E2E section](./01_nodejs_testing.md) — Full application E2E tests with `supertest`
3. [Jest vs Vitest — Migration section](./01_jest_vs_vitest.md) — Migrate an existing Jest codebase to Vitest step-by-step
4. [Node.js Testing — CI/CD section](./01_nodejs_testing.md) — Integrate test coverage into GitHub Actions

---

## What You'll Learn

- How Jest and Vitest compare in speed, configuration, ESM support, and TypeScript integration
- When to choose Vitest over Jest (and when not to)
- How to configure Jest with `ts-jest` and Vitest via `vite.config.ts` for TypeScript projects
- Writing unit tests for synchronous and asynchronous functions using `describe`, `it`, and `expect`
- Mocking modules, spying on functions, and using fake timers with `vi` (Vitest) and `jest`
- Testing Express.js routes and middleware in isolation using `supertest`
- Testing NestJS services, controllers, and guards with `Test.createTestingModule`
- End-to-end API testing without spinning up a real server
- Testing best practices: isolating state, clearing mocks, using factories, and avoiding over-mocking
- Integrating test coverage reporting into a CI/CD pipeline with GitHub Actions
- Migrating an existing Jest test suite to Vitest with minimal changes

---

## Prerequisites

Before diving in, you should be comfortable with:

- **TypeScript fundamentals** — types, interfaces, async/await, classes, and modules
- **Node.js and npm** — running scripts, installing packages, understanding `package.json`
- **Basic JavaScript** — functions, promises, and ES modules
- **Express.js basics** (optional but helpful for the backend testing sections)

No prior testing experience is required — this guide starts from the ground up.

---

## How to Use This Guide

1. **Pick your test runner first.** Read the [Jest vs Vitest comparison](./01_jest_vs_vitest.md) early — understanding the tradeoffs will inform every other decision you make. For new projects, Vitest is the recommendation.
2. **Follow the setup instructions exactly.** Both files include copy-paste setup commands and config files. Use them as your starting point before writing any tests.
3. **Run the examples yourself.** The code examples are complete and self-contained — drop them into a project and run `npm test` to see them pass. Hands-on practice sticks better than reading alone.
4. **Read the best practices section.** The anti-patterns listed in [Node.js Testing](./01_nodejs_testing.md) describe mistakes developers commonly make. Reading them now will save you debugging time later.
5. **Use the practice exercises.** Each file ends with exercises that progressively increase in difficulty. Work through them to solidify each concept before moving on.

---

Good tests are not just about finding bugs — they give you the confidence to ship changes quickly. Start small, test the critical paths first, and build from there.
