# Pydantic Data Validation

Pydantic Python ka sabse famous runtime data validation library hai — basically type annotations ko validators, parsers, aur serializers mein convert kar deta hai, aur sab kuch zero boilerplate mein hota hai. Agar tum TypeScript/Node.js se aate ho aur Zod, Joi, ya class-validator use kiye ho, toh ye section tumhare liye likha gaya hai — samjhoge ke Pydantic wo sab problems ko kaisy ek unified tarike se solve karta hai.

## Table of Contents

### Part 1 — Foundations
1. [Introduction to Pydantic](./01_introduction.md) — Pydantic kya hai, Zod se comparison, v1 vs v2 ke differences, aur installation
2. [Basic Models](./02_basic_models.md) — `BaseModel`, field declarations, defaults, type coercion, aur dicts se instances banana

### Part 2 — Validation
3. [Field Validation](./03_field_validation.md) — `Field()` constraints, `@field_validator`, `@model_validator`, `ValidationError` structure, aur reusable `Annotated` types
4. [Advanced Types](./04_advanced_types.md) — `EmailStr`, `HttpUrl`, `Optional`, `Union`, `Literal`, `Enum`, aur aur specialized type annotations

### Part 3 — Data Modeling
5. [Nested Models](./05_nested_models.md) — models ko compose karna, recursive structures, aur list/dict of models

### Part 4 — Production Patterns
6. [Settings Management](./06_settings_management.md) — `BaseSettings`, environment variables aur `.env` files se padna, nested config, secrets, priority hierarchy
7. [Serialization](./07_serialization.md) — `model_dump()`, `model_dump_json()`, `model_validate()`, include/exclude, custom serializers, aur round-trip JSON

---

## Learning Path

### Beginner — shuru karo agar Pydantic naya hai
1. Chapter 01 — Introduction (TS/Pydantic comparison table ko carefully padho)
2. Chapter 02 — Basic Models (ek do models banao aur validate karo)
3. Chapter 03 — Field Validation, sirf `Field()` aur `ValidationError` wale sections

### Intermediate — jab basic models comfortable lagney lage
4. Chapter 03 — `@field_validator` aur `@model_validator`
5. Chapter 04 — Advanced Types (`EmailStr`, `HttpUrl`, `Literal` add karo models mein)
6. Chapter 05 — Nested Models (TypeScript interfaces ki tarah models ko nest karo)

### Advanced — production-grade Pydantic
7. Chapter 06 — Settings Management (apne dotenv + Zod config ko `BaseSettings` se replace karo)
8. Chapter 07 — Serialization (exact control karo ke kya model se bahar nikle aur kaise)

---

## Kya Seekhoge

- Kaise Pydantic ke type hints runtime validators ke roop mein kaam karte hain — ek declaration, koi duplication nahi
- Pydantic v1 aur v2 ke syntax mein difference (`.dict()` vs `.model_dump()`, `@validator` vs `@field_validator`)
- `Field()` use karke numeric, string, aur regex constraints kaise add karein
- Custom single-field validators `@field_validator` se aur cross-field validators `@model_validator` se likho
- `Annotated` use karke reusable constrained types banao (Zod schema ka Pydantic version)
- Complex nested data structures ko model karo with automatic deep validation
- `EmailStr`, `HttpUrl`, `SecretStr`, `Literal`, `Enum` jaise specialized types
- `.env` files aur environment variables se application configuration manage karo `BaseSettings` se
- Models ko dicts aur JSON mein serialize karo, including field inclusion/exclusion aur custom serialization logic
- Pydantic `ValidationError` output ko padho aur API error responses banao

---

## Prerequisites

- Python classes aur type hints (`str`, `int`, `list[str]`, `dict[str, int]`) comfortable ho
- Python virtual environments aur `pip` ka basic knowledge
- TypeScript/JavaScript validation library (Zod, Joi, class-validator) ka experience helpful hai but zaruri nahi hai — comparisons poore guide mein diye hue hain

---

## Iska Use Kaise Karo

1. **Har ek code example ko khud run karo.** Pydantic ka feedback instant hota hai — validation seekhne ka best tareeka `ValidationError` ko deliberately trigger karna hai aur output ko padna hai.
2. **Har chapter ke end mein practice exercises karo.** Wo real scenarios ke around design kiye hue hain (registration forms, product catalogs, app config) jo tumhe actual projects mein milenge.
3. **Chapter 01 ka v1-to-v2 table hamesha paas rakho.** Internet par aur Stack Overflow mein jo tutorials aur answers hain wo mostly v1 syntax use karte hain — equivalents pata hone se confusion nahin hoga.
4. **Chapter 06 ko ek separate mini-project ki tarah treat karo.** Ek real `.env` file banao, kisi small app ke liye ek `Settings` class likho jo tum use kar rahe ho, aur dekho ke kitna boilerplate ye replace karta hai.
5. **Chapter 07 database ya API ke saath Pydantic use karne se pehle padho.** Serialization edge cases (datetime formatting, excluding None fields, aliased keys) — yahi wo jagah hain jahan real-world surprises aate hain.

---

Good data in, good data out — jab Pydantic ka model-first approach samajh jao, tab tum har jagah reach karogey when data crosses a boundary in your Python code.
