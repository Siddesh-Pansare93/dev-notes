# Pydantic Data Validation

Pydantic is Python's most widely-used runtime data validation library — it turns type annotations into validators, parsers, and serializers with zero boilerplate. This section is written for developers coming from TypeScript/Node.js who already know Zod, Joi, or class-validator, and want to understand how Pydantic solves the same problems in a more unified way.

## Table of Contents

### Part 1 — Foundations
1. [Introduction to Pydantic](./01_introduction.md) — what Pydantic is, how it compares to Zod, v1 vs v2 differences, and installation
2. [Basic Models](./02_basic_models.md) — `BaseModel`, field declarations, defaults, type coercion, and creating instances from dicts

### Part 2 — Validation
3. [Field Validation](./03_field_validation.md) — `Field()` constraints, `@field_validator`, `@model_validator`, `ValidationError` structure, and reusable `Annotated` types
4. [Advanced Types](./04_advanced_types.md) — `EmailStr`, `HttpUrl`, `Optional`, `Union`, `Literal`, `Enum`, and other specialized type annotations

### Part 3 — Data Modeling
5. [Nested Models](./05_nested_models.md) — composing models from other models, recursive structures, and list/dict of models

### Part 4 — Production Patterns
6. [Settings Management](./06_settings_management.md) — `BaseSettings`, reading from environment variables and `.env` files, nested config, secrets, priority hierarchy
7. [Serialization](./07_serialization.md) — `model_dump()`, `model_dump_json()`, `model_validate()`, include/exclude, custom serializers, and round-trip JSON

---

## Learning Path

### Beginner — start here if Pydantic is new to you
1. Chapter 01 — Introduction (read the TS/Pydantic comparison table carefully)
2. Chapter 02 — Basic Models (build and validate your first few models)
3. Chapter 03 — Field Validation, sections on `Field()` and `ValidationError`

### Intermediate — once basic models feel comfortable
4. Chapter 03 — `@field_validator` and `@model_validator`
5. Chapter 04 — Advanced Types (add `EmailStr`, `HttpUrl`, `Literal` to your models)
6. Chapter 05 — Nested Models (compose models the same way you nest TypeScript interfaces)

### Advanced — production-grade Pydantic
7. Chapter 06 — Settings Management (replace your dotenv + Zod config with `BaseSettings`)
8. Chapter 07 — Serialization (control exactly what leaves your models and how)

---

## What You'll Learn

- How Pydantic's type hints double as runtime validators — one declaration, no duplication
- The difference between Pydantic v1 and v2 syntax (`.dict()` vs `.model_dump()`, `@validator` vs `@field_validator`)
- How to add numeric, string, and regex constraints using `Field()`
- Writing custom single-field validators with `@field_validator` and cross-field validators with `@model_validator`
- Using `Annotated` to create reusable constrained types (the Pydantic equivalent of a named Zod schema)
- Modeling complex nested data structures with automatic deep validation
- Specialized types like `EmailStr`, `HttpUrl`, `SecretStr`, `Literal`, and `Enum`
- Managing application configuration from `.env` files and environment variables with `BaseSettings`
- Serializing models to dicts and JSON, including field inclusion/exclusion and custom serialization logic
- Reading and structuring Pydantic `ValidationError` output for API error responses

---

## Prerequisites

- Comfortable with Python classes and type hints (`str`, `int`, `list[str]`, `dict[str, int]`)
- Basic familiarity with Python virtual environments and `pip`
- Experience with a TypeScript/JavaScript validation library (Zod, Joi, class-validator) is helpful but not required — comparisons are included throughout

---

## How to Use This Guide

1. **Run every code example yourself.** Pydantic's feedback is immediate — the best way to learn validation is to trigger `ValidationError` on purpose and read the output.
2. **Do the practice exercises at the end of each chapter.** They are designed around real scenarios (registration forms, product catalogs, app config) that you will encounter in actual projects.
3. **Keep the v1-to-v2 table from Chapter 01 handy.** Most tutorials and Stack Overflow answers you find online use v1 syntax — knowing the equivalents saves a lot of confusion.
4. **Treat Chapter 06 as its own mini-project.** Create a real `.env` file, write a `Settings` class for a small app you are working on, and observe how much boilerplate it replaces.
5. **Read Chapter 07 before using Pydantic with a database or API.** Serialization edge cases (datetime formatting, excluding None fields, aliased keys) are where most real-world surprises happen.

---

Good data in, good data out — once you internalize Pydantic's model-first approach, you will find yourself reaching for it every time data crosses a boundary in your Python code.
