# FastAPI — Web Framework Jo Ek Dam Zyada Smart Hai

FastAPI ek modern Python web framework hai jo sochta-samajhta hai — automatic documentation deta hai, data validation built-in hota hai, aur structure NestJS jaisa advanced lekin simplicity Express jaisi. Agar tum JavaScript/Node.js janate ho aur Python se production APIs banana chahte ho, yeh guide tumhare liye likha gaya hai.

Socho ek second: Zomato ke backend team ko har restaurant order handle karna padta hai. Har order ka data format sahi hona chahiye, har user authenticated hona chahiye, aur real-time updates bhejna padta hai. FastAPI exactly yeh sab kaam ko simple aur fast banata hai — Express.js ka simplicity, lekin Python ki taaqat ke saath.

## Table of Contents

### Part 1 — Shuru Se Chhote Stepsme
1. [Introduction to FastAPI](./01_introduction.md) — FastAPI kya hai, installation, hello world, async support, project structure
2. [Routing](./02_routing.md) — path parameters, query parameters, APIRouter, route grouping

### Part 2 — Requests Aur Data Ko Handle Karna
3. [Request & Response](./03_request_response.md) — Pydantic models, request bodies, response models, status codes, headers
4. [Dependency Injection](./04_dependency_injection.md) — `Depends()`, class-based deps, nested chains, yield deps with cleanup, testing ke liye overrides

### Part 3 — Security Aur Middleware
5. [Middleware & CORS](./05_middleware_and_cors.md) — custom middleware, CORS configuration, request/response lifecycle
6. [Authentication](./06_authentication.md) — JWT tokens, OAuth2 password flow, protected routes, refresh tokens

### Part 4 — Database Aur Background Kaam
7. [Database Integration](./07_database.md) — SQLAlchemy setup, models, sessions, async database, Alembic migrations
8. [Background Tasks](./08_background_tasks.md) — `BackgroundTasks`, Celery integration, async work ko schedule karna

### Part 5 — Real-Time Aur Testing
9. [WebSockets](./09_websockets.md) — WebSocket endpoints, connection managers, rooms, broadcasting
10. [Testing](./10_testing.md) — `TestClient`, dependency overrides, fixtures, async test patterns

### Part 6 — Production Ke Liye Advanced Patterns
11. [Error Handling](./11_error_handling.md) — `HTTPException`, custom exception handlers, consistent error responses
12. [Advanced Patterns](./12_advanced_patterns.md) — modular routers, sub-applications, lifespan hooks, streaming responses, SSE, API versioning, rate limiting, pagination, CRUD factories, Pydantic Settings

## Learning Path — Aapke Level Ke Hisaab Se

### Beginner — Aapka Pehla FastAPI App Banao
Agar FastAPI ya Python web development mein naaye ho toh yahan se shuru karo. Bilkul basics.

1. Chapter 1 — Introduction (installation, hello world, auto-docs)
2. Chapter 2 — Routing (path aur query parameters)
3. Chapter 3 — Request & Response (Pydantic models, validation)
4. Chapter 11 — Error Handling (HTTPException ki basics)

Yeh path ke baad tumhara ek working API hoga jo data validate kar sakta hai aur proper errors return kar sakta hai.

### Intermediate — Real API Banao: Database + Authentication Ke Saath
Jab tum basic endpoints likha sako Pydantic models se, tab yeh chapters padho. Yahan Zomato/Swiggy jaisa real thing samne aata hai.

5. Chapter 4 — Dependency Injection (`Depends()` pattern jo Express middleware jaisa kaam karta hai)
6. Chapter 5 — Middleware & CORS (global middleware, CORS config)
7. Chapter 6 — Authentication (JWT, OAuth2 password flow — user authentication)
8. Chapter 7 — Database (SQLAlchemy, sessions, migrations — exactly Django ORM ki tarah)
9. Chapter 10 — Testing (`TestClient`, dependency overrides)

Is level ke baad tumhare paas ek complete API hoga: users login kar sakte hain, data database mein store hota hai, aur sab kuch tested hota hai.

### Advanced — Real-Time, Scheduling, Aur Production Architecture
Jab tumhara API working ho aur isko scale karna ho, toh yeh chapters karo. Yeh production-level complexity handle karti hain.

10. Chapter 8 — Background Tasks (deferred work, Celery — jaise Swiggy background notification bhejta hai)
11. Chapter 9 — WebSockets (real-time bidirectional communication — live order tracking jaisa)
12. Chapter 12 — Advanced Patterns (modular structure, SSE, rate limiting, API versioning)

## Kya Seekhoge Tum

- FastAPI project setup karna — uvicorn aur virtual environments ke saath
- Type-safe request/response models banane Pydantic se — separate validation library ki zarurat nahi
- `Depends()` use karna dependency injection ke liye: auth guards, DB sessions, pagination, service layers
- `yield` dependencies likhnaa jo cleanup automatically handle karti hain request ke baad
- CORS configure karna, custom middleware add karna, request/response lifecycle mein hook karna
- JWT authentication implement karna: protected routes aur role-based access
- SQLAlchemy se database integration: sessions per-request, Alembic migrations
- Background tasks run karna bina response ko block kiye
- WebSocket connections open karna real-time features ke liye
- Endpoints test karna `TestClient` se aur real dependencies ko fake se replace karna — mocking library ki zarurat nahi
- Errors ko consistently handle karna custom exception handlers se
- Large APIs ko structure karna `APIRouter`, sub-applications, aur service/repository pattern se
- Large responses stream karna aur live updates push karna Server-Sent Events ke through
- APIs version karna, rate limiting apply karna, cursor-based pagination implement karna

## Prerequisites — Yeh Pata Hona Chahiye Pehle

- Python basics comfortable honi chahiye: functions, classes, type hints, `async/await`
- Kisi na kisi backend framework ka experience: Express.js, NestJS, Django, ya koi aur similar
- REST concepts pata honge: HTTP methods, status codes, JSON request/response bodies
- Relational databases aur SQL ka basic understanding (database chapter ke liye helpful hai)

FastAPI ya Pydantic ka pehle se kuch pata hona zaruri nahi. Ye notes har jagah Express.js aur NestJS se comparisons deti hain, toh Node.js developers ko bilkul oriented feel hoga. Tum already ek backend framework janate ho, toh transitions easy hoga.

## Guide Ko Kaise Use Karo

1. **Apne level ke learning path ko follow karo.** Chapters ek-dusre pe build hoti hain — Beginner path ek solid foundation deta hai, phir Intermediate path real-world complexity add karta hai. Aur Advanced path production ke liye hardening karti hai.

2. **Code ko run karo jab padh rahe ho.** FastAPI install karo (`pip install "fastapi[standard]"`), uvicorn se server chalao (`uvicorn main:app --reload`), aur `/docs` pe visit karo — auto-generated Swagger UI dekh kar concepts bilkul samaj aate hain.

3. **Har chapter ke end mein practice exercises karo.** Har file 4-5 progressively harder exercises se close hoti hai. Agar skip karo toh bhoolte dekh hoge.

4. **Express/NestJS comparisons ko anchors samjho.** Har chapter JavaScript pattern dikhata hai — agar koi concept abstract lage, comparison wala block padho pehle. Phir Python version bilkul clear ho jayega.

5. **Chapter 12 ko last mein padho.** Advanced Patterns woh topics cover karti hain jo sirf tab appreciated hote hain jab tum flat `main.py` ki limitations hit kar chuko. Jab zarurat feel ho tab aao.

Tum already soch rahe ho kya — tum production-ready se zyada close ho. Chapter 1 se shuru karo aur kuch real banao.
