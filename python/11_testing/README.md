# Python Testing: Tera Code Solid Kaise Bane

Socho ek second — Zomato ka API jab order place karte ho, uska code test kaise rehta hoga? Ya Swiggy ka delivery tracking? Ye sab production mein live jaane se pehle testing ke through jaate hain. Yeh guide hai *hands-on*, jisme tum sikhoge FastAPI ka integration testing, advanced mocking, async code testing, database isolation, aur LLM apps ka testing kaise karte hain. End mein tum likha aur likha tests likhaoge jo **actually bugs pakda ke** rakh de.

## Table of Contents

- [Comprehensive Testing Guide](./01_comprehensive_testing.md)
  - E2E Testing with FastAPI TestClient
  - Mocking External APIs (`respx`, `responses`)
  - Database Testing Strategies
  - Testing Async Code with `pytest-asyncio`
  - Testing LangChain / LLM Applications
  - Best Practices and Anti-Patterns
  - CI/CD Integration with GitHub Actions
  - Practice Exercises

## Learning Path

### Beginner
Agar testing ke dunia mein nayi ho, idhar shuru kar.

1. **Setup Instructions** — `01_comprehensive_testing.md` (Setup section) — basics setup karo pehle
2. **E2E Testing with FastAPI TestClient** — simple endpoint tests likho, POST requests check karo
3. **Best Practices: AAA Pattern** — Arrange, Act, Assert — basically tum setup karo, action karo, check karo

### Intermediate
pytest basics ata hai aur ab tum chaho zyada solid tests likho. Database aur mocking k saath comfortable hona chaiye.

4. **Mocking External APIs** — `respx` for httpx, `responses` for requests — jab API ka response fake karna ho
5. **Database Testing Strategies** — In-memory SQLite, pytest fixtures, FastAPI dependency overrides — apna test database banao
6. **Testing Async Code** — `pytest-asyncio`, `httpx.AsyncClient` for async endpoints — async functions kaise test karte hain

### Advanced
Production-grade APIs ya AI-powered applications bana rahe ho aur tests solid hone chahiye.

7. **Testing LangChain / LLM Applications** — OpenAI calls mock karo, `FakeListLLM` use karo — deterministic LLM tests likho
8. **CI/CD Integration** — GitHub Actions workflow with coverage reporting — tests automatically chalein deployments mein
9. **Practice Exercises** — Parametrize inputs, seed databases, test file uploads — real-world scenarios

## Kya Sikhoge

- **FastAPI endpoints ka E2E testing** — `TestClient` use karke server spin up kiye bina test likho
- **FastAPI dependencies override karna** — auth, DB sessions, sab cleanly test karo
- **External APIs ko mock karna** — `respx` (httpx ke liye) aur `responses` (requests ke liye) se fake responses dedo
- **Isolated test databases** — SQLite in-memory setup karo, pytest fixtures se manage karo
- **Async Python functions test karna** — `pytest-asyncio` se async endpoints ko test karo
- **OpenAI API calls mock karna** — LangChain ka `FakeListLLM` use karke deterministic tests likho
- **AAA pattern apply karna** — Arrange-Act-Assert se readable, maintainable code likho
- **`@pytest.mark.parametrize` use karna** — ek hi test mein multiple inputs check karo, duplication na ho
- **Coverage reports generate karna** — pura test suite GitHub Actions mein automate karo

## Zaruri Cheezon Ka Pata Hona

- Python functions aur classes likha sakte ho
- FastAPI basics pata ho (routes, request/response models, dependencies)
- `pytest` se test chalana aata ho — basic `assert` statements likha sakte ho
- Async/await syntax Python mein samajh mein aaye (async sections ke liye helpful)
- Mocking ka pehle se experience nahi zaruri — yahan par seekhenge

## Is Guide Ko Kaise Use Karo

1. **Pehle setup karo.** `01_comprehensive_testing.md` ke top par jo command likha hai, vo pehle run karo. Baaki sab examples uspe depend karte hain.

2. **Examples ko order mein follow karo.** Har example se pehle wale se build hota hai — jaise database fixture example, vo directly FastAPI dependency override mein feed hota hai.

3. **Code khud type karo.** Copy-paste karne se tez chalega, lekin typing se har line padega aur samajh mein aayega ki har argument kya kar raha hai.

4. **Har example ke baad tests chalao.** `pytest -v` use karo taaki dekh sake kaun se tests pass/fail ho rahe hain aur output kya hai — green feedback se mental model banegi.

5. **Practice exercises try karo.** End mein jo exercises hain, vo intentionally gaps chhod kar likhi gyi hain (file uploads, seeded databases, parametrized validation) — ye best tareeka hai solidify karne ka.

> [!tip]
> Testing ही ve difference है जो tumhe confident code ship karne deta hai. Jab coverage achha ho, tab safely refactor kar sakte ho, safely deploy kar sakte ho. Likhte raho tests, refactor karte raho, aur suite tumhara backup rahe.
