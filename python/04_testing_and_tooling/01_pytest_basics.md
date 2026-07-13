# pytest Basics: Testing in Python

> **Node.js/TypeScript se aa rahe ho?** pytest Python ka sabse popular testing framework hai,
> aur iska philosophy Jest se kaafi milta-julta hai. Actually pytest thoda *simpler* lagega
> kyunki Python ka built-in `assert` hi Jest ke pure `expect()` API ka kaam kar deta hai.

---

## Table of Contents

1. [pytest vs Jest: Quick Comparison](#pytest-vs-jest-quick-comparison)
2. [Installing and Running pytest](#installing-and-running-pytest)
3. [Test Discovery](#test-discovery)
4. [The Power of assert](#the-power-of-assert)
5. [Parametrize: Data-Driven Tests](#parametrize-data-driven-tests)
6. [Markers: Skipping, Expected Failures, and More](#markers)
7. [Testing Exceptions with pytest.raises()](#testing-exceptions)
8. [Test Output and Verbose Mode](#test-output-and-verbose-mode)
9. [Configuration: pyproject.toml vs jest.config.js](#configuration)
10. [Practice Exercises](#practice-exercises)

---

## pytest vs Jest: Quick Comparison

Socho tumne Jest use kiya hai — ab bas naam badal rahe hain, concept wahi hai. Table dekh lo:

| Feature | Jest (Node.js/TS) | pytest (Python) |
|---|---|---|
| Install | `npm install --save-dev jest` | `pip install pytest` |
| Config file | `jest.config.js` | `pyproject.toml` ya `pytest.ini` |
| Test file naming | `*.test.js`, `*.spec.js` | `test_*.py`, `*_test.py` |
| Test function naming | `test('name', () => {})` ya `it()` | `def test_name():` |
| Assertions | `expect(x).toBe(y)` | `assert x == y` |
| Setup/Teardown | `beforeEach`, `afterEach` | Fixtures (agle chapter mein cover karenge) |
| Mocking | `jest.mock()`, `jest.fn()` | `unittest.mock` / `pytest-mock` |
| Parameterized tests | `test.each([...])` | `@pytest.mark.parametrize` |
| Skip tests | `test.skip()`, `xtest()` | `@pytest.mark.skip` |
| Async tests | Built-in (`async/await`) | `pytest-asyncio` plugin |
| Watch mode | `jest --watch` | `pytest-watch` plugin |
| Coverage | `jest --coverage` | `pytest-cov` plugin |
| Snapshot testing | Built-in | `pytest-snapshot` plugin |

**Key insight:** Jest ek all-in-one solution banne ki koshish karta hai — Zomato Gold jaisa, sab kuch ek subscription mein. pytest ka core lean rakha gaya hai, aur uske upar rich plugin ecosystem hai. Jo chahiye wahi install karo, extra bloat nahi.

---

## Installing and Running pytest

### Installation

```bash
# Node.js mein tum karte:
# npm install --save-dev jest @types/jest ts-jest

# Python mein bas itna kaafi hai:
pip install pytest

# Ya behtar, project dependencies mein add karo:
# pyproject.toml mein:
# [project.optional-dependencies]
# dev = ["pytest>=8.0"]
```

### Tests Run Karna

```bash
# Jest ke equivalents:
# npx jest                    -> Saare tests chalao
# npx jest path/to/file       -> Specific file chalao
# npx jest -t "test name"     -> Name match karne wale tests chalao
# npx jest --watch            -> Watch mode

# pytest ke equivalents:
pytest                         # Saare tests chalao
pytest tests/test_math.py      # Specific file chalao
pytest tests/test_math.py::test_addition  # Specific test chalao
pytest -k "addition"           # Keyword expression match karne wale tests
pytest -k "addition or subtract"  # Boolean keyword matching
pytest -x                      # Pehli failure pe stop (jaise --bail)
pytest --lf                    # Sirf last failed tests dobara chalao
pytest --ff                    # Pehle failed tests, phir baaki sab
```

### Tumhara Pehla Test

```python
# tests/test_calculator.py

def add(a: int, b: int) -> int:
    return a + b

def test_add_positive_numbers():
    assert add(2, 3) == 5

def test_add_negative_numbers():
    assert add(-1, -1) == -2

def test_add_zero():
    assert add(5, 0) == 5
```

Jest se compare karo:

```typescript
// calculator.test.ts
function add(a: number, b: number): number {
    return a + b;
}

test('adds positive numbers', () => {
    expect(add(2, 3)).toBe(5);
});

test('adds negative numbers', () => {
    expect(add(-1, -1)).toBe(-2);
});

test('adds zero', () => {
    expect(add(5, 0)).toBe(5);
});
```

Ek cheez notice karo: Python mein test function ka naam hi test ka description hai. Alag se koi string argument nahi dena padta. Isliye function names descriptive rakho: `test_add_returns_sum_of_two_positive_integers`.

---

## Test Discovery

pytest apne aap tumhare tests dhoond leta hai, in conventions ke through — bilkul waise jaise Swiggy delivery boy tumhara address dhoond leta hai bina tumhe call kiye, agar naming sahi ho.

### File Discovery

```
my_project/
    src/
        calculator.py
    tests/
        __init__.py          # Empty ho sakta hai, imports mein help karta hai
        test_calculator.py   # Mil gaya! (test_ prefix)
        calculator_test.py   # Mil gaya! (_test suffix)
        helper.py            # NAHI milega (na test_ hai na _test)
```

**Jest se comparison:**
- Jest `*.test.js`, `*.spec.js`, ya `__tests__/` directories ke andar ki files dhoondta hai.
- pytest `test_*.py` ya `*_test.py` files dhoondta hai.
- Dono project root se recursively search karte hain.

### Function aur Class Discovery

```python
# test_example.py

# Discover hoga - test_ se start hota hai
def test_something():
    assert True

# NAHI hoga discover - test_ se start nahi hota
def helper_function():
    return 42

# Discover hoga - class Test se start, methods test_ se
class TestCalculator:
    def test_add(self):
        assert 1 + 1 == 2

    def test_subtract(self):
        assert 5 - 3 == 2

    # NAHI hoga discover - test_ se start nahi hota
    def helper(self):
        return "I'm a helper"

# NAHI hoga discover - class Test se start nahi hoti
class CalculatorTests:
    def test_add(self):
        assert 1 + 1 == 2
```

> [!warning]
> Test classes mein `__init__` method NAHI hona chahiye. pytest plain classes ka use sirf grouping ke liye karta hai — unittest ki tarah inheritance ki zaroorat nahi.

### Jest ke describe() ka Equivalent

```typescript
// Jest: Nested describe blocks
describe('Calculator', () => {
    describe('add', () => {
        test('adds two numbers', () => { /* ... */ });
    });
    describe('subtract', () => {
        test('subtracts two numbers', () => { /* ... */ });
    });
});
```

```python
# pytest: Grouping ke liye classes (flat, nesting nahi)
class TestCalculatorAdd:
    def test_adds_two_numbers(self):
        assert add(1, 2) == 3

class TestCalculatorSubtract:
    def test_subtracts_two_numbers(self):
        assert subtract(5, 3) == 2

# Ya bas descriptive function names use karo (zyada Pythonic):
def test_calculator_add_returns_sum():
    assert add(1, 2) == 3

def test_calculator_subtract_returns_difference():
    assert subtract(5, 3) == 2
```

---

## The Power of assert

Yahan pytest sach mein chamakta hai. Dozens matcher methods yaad karne ki bajaye
(`toBe`, `toEqual`, `toContain`, `toHaveLength`, waghera), bas Python ka `assert` use karo.

### Kya hota hai? Basic Assertions

```python
# pytest - koi bhi Python expression ke saath assert use karo

def test_equality():
    assert 1 + 1 == 2

def test_not_equal():
    assert 1 + 1 != 3

def test_truthy():
    assert "hello"        # Non-empty strings truthy hote hain
    assert [1, 2, 3]      # Non-empty lists truthy hote hain
    assert 42              # Non-zero numbers truthy hote hain

def test_falsy():
    assert not ""          # Empty string falsy hai
    assert not []          # Empty list falsy hai
    assert not 0           # Zero falsy hai
    assert not None        # None falsy hai

def test_identity():
    assert None is None    # None/True/False check ke liye 'is' use karo

def test_containment():
    assert 3 in [1, 2, 3]
    assert "hello" in "hello world"
    assert "key" in {"key": "value"}

def test_comparison():
    assert 5 > 3
    assert 3 <= 3

def test_type_checking():
    assert isinstance(42, int)
    assert isinstance("hello", str)
```

Jest se compare karo:

```typescript
// Jest - specific matchers yaad rakhne padte hain
test('various assertions', () => {
    expect(1 + 1).toBe(2);
    expect(1 + 1).not.toBe(3);
    expect("hello").toBeTruthy();
    expect("").toBeFalsy();
    expect(null).toBeNull();
    expect([1, 2, 3]).toContain(3);
    expect(5).toBeGreaterThan(3);
    expect(3).toBeLessThanOrEqual(3);
    expect(42).toEqual(expect.any(Number));
});
```

### pytest ka Secret Weapon: Assert Rewriting

Jab assert fail hota hai, pytest tumhe bohot detailed output deta hai:

```python
def test_list_equality():
    result = [1, 2, 3, 4, 5]
    expected = [1, 2, 3, 4, 6]
    assert result == expected
```

Output:
```
FAILED test_example.py::test_list_equality
    assert [1, 2, 3, 4, 5] == [1, 2, 3, 4, 6]
      At index 4 diff: 5 != 6
      Full diff:
      - [1, 2, 3, 4, 6]
      ?                ^
      + [1, 2, 3, 4, 5]
      ?                ^
```

pytest import time pe tumhare `assert` statements ko rewrite karta hai taaki intermediate values capture karke exactly dikha sake kya galat hua. Yeh magic vanilla Python ke `assert` mein NAHI milega — yeh pure pytest-specific feature hai.

> [!tip]
> Isi wajah se pytest mein `assertEquals`, `assertTrue` jaisi koi separate method yaad rakhne ki zaroorat nahi — bas plain `assert` likho aur pytest baaki sambhaal lega.

### Custom Messages

```python
def test_with_message():
    value = calculate_something()
    assert value > 0, f"Expected positive value, got {value}"
```

### Complex Objects Compare Karna

```python
def test_dict_comparison():
    result = {"name": "Alice", "age": 30, "city": "NYC"}
    expected = {"name": "Alice", "age": 31, "city": "NYC"}
    assert result == expected
    # Output dikhata hai: E       'age': 30 != 31

def test_set_comparison():
    result = {1, 2, 3, 4}
    expected = {1, 2, 3, 5}
    assert result == expected
    # Output dikhata hai: Extra items in the left set: {4}
    #                     Extra items in the right set: {5}
```

### Approximate Comparisons (Floating Point)

```python
# Jest ke toBeCloseTo ki jagah:
def test_floating_point():
    assert 0.1 + 0.2 == pytest.approx(0.3)
    assert [0.1 + 0.2, 0.2 + 0.4] == pytest.approx([0.3, 0.6])
    assert 2.0 == pytest.approx(2.02, abs=0.1)  # Absolute tolerance
    assert 2.0 == pytest.approx(2.02, rel=0.02)  # Relative tolerance
```

---

## Parametrize: Data-Driven Tests

Kyun zaruri hai? Socho tumhe same test, alag-alag inputs ke saath baar-baar likhna pad raha hai —
Zomato pe ek hi order 10 different addresses pe deliver karna ho toh tum function call baar baar copy-paste nahi karoge, loop chalaoge na? Parametrize wahi karta hai. Jest ke `test.each()` jaisa, bas cleaner decorator syntax ke saath.

### Basic Parametrize

```python
import pytest

@pytest.mark.parametrize("input_val, expected", [
    (1, 1),
    (2, 4),
    (3, 9),
    (4, 16),
    (-2, 4),
    (0, 0),
])
def test_square(input_val, expected):
    assert input_val ** 2 == expected
```

Jest equivalent:
```typescript
test.each([
    [1, 1],
    [2, 4],
    [3, 9],
    [4, 16],
    [-2, 4],
    [0, 0],
])('square of %i is %i', (input, expected) => {
    expect(input ** 2).toBe(expected);
});
```

### IDs ke saath Parametrize

```python
@pytest.mark.parametrize("input_val, expected", [
    pytest.param(1, 1, id="one"),
    pytest.param(2, 4, id="two"),
    pytest.param(0, 0, id="zero"),
    pytest.param(-3, 9, id="negative"),
])
def test_square_with_ids(input_val, expected):
    assert input_val ** 2 == expected
```

Run karne pe milta hai:
```
test_math.py::test_square_with_ids[one] PASSED
test_math.py::test_square_with_ids[two] PASSED
test_math.py::test_square_with_ids[zero] PASSED
test_math.py::test_square_with_ids[negative] PASSED
```

### Multiple Parametrize Decorators (Cartesian Product)

```python
@pytest.mark.parametrize("x", [0, 1, 2])
@pytest.mark.parametrize("y", [10, 20])
def test_addition_combinations(x, y):
    """Yeh 6 tests chalata hai: (0,10), (0,20), (1,10), (1,20), (2,10), (2,20)"""
    result = x + y
    assert result == x + y
```

### Expected Failures ke saath Parametrize

```python
@pytest.mark.parametrize("input_val, expected", [
    (2, 4),
    (3, 9),
    pytest.param(-1, -1, marks=pytest.mark.xfail(reason="Negative square not negative")),
])
def test_square_with_xfail(input_val, expected):
    assert input_val ** 2 == expected
```

### Real-World Example: API Validator Test Karna

```python
import pytest

def validate_email(email: str) -> bool:
    """Simple email validation."""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

@pytest.mark.parametrize("email, is_valid", [
    # Valid emails
    ("user@example.com", True),
    ("user.name@example.com", True),
    ("user+tag@example.co.uk", True),
    ("user123@test.org", True),

    # Invalid emails
    ("", False),
    ("not-an-email", False),
    ("@example.com", False),
    ("user@", False),
    ("user@.com", False),
    ("user space@example.com", False),
])
def test_validate_email(email: str, is_valid: bool):
    assert validate_email(email) == is_valid, f"Failed for email: {email!r}"
```

---

## Markers

Markers labels jaise hote hain jo tum tests pe laga sakte ho — kuch built-in hain, kuch khud define karte ho.

### @pytest.mark.skip - Hamesha Skip Karo

```python
import pytest

@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature():
    pass

# Jest equivalent:
# test.skip('future feature', () => { ... });
# ya: xtest('future feature', () => { ... });
```

### @pytest.mark.skipif - Conditional Skip

```python
import sys
import pytest

@pytest.mark.skipif(sys.platform == "win32", reason="Unix-only test")
def test_unix_permissions():
    import os
    assert os.access("/tmp", os.W_OK)

@pytest.mark.skipif(
    sys.version_info < (3, 12),
    reason="Requires Python 3.12+ features"
)
def test_new_python_feature():
    pass
```

Jest mein iska direct equivalent nahi hai — normally tum test ke andar `if` use karoge ya manually skip karoge.

### @pytest.mark.xfail - Expected Failure

```python
@pytest.mark.xfail(reason="Known bug in calculation engine, see issue #42")
def test_known_bug():
    assert buggy_function() == expected_value

# Agar test unexpectedly PASS ho jaye, pytest ise XPASS (unexpected pass) report karta hai.
# Yeh known bugs track karne ke liye zabardast hai - pata chal jayega jab bug fix ho jaye!

@pytest.mark.xfail(strict=True)
def test_strict_xfail():
    """strict=True ke saath, unexpected pass ko FAILURE treat kiya jaata hai.
    Isse use karo jab tumhe turant pata chalna ho ki bug fix ho gaya."""
    assert buggy_function() == expected_value
```

### Custom Markers

```python
# pyproject.toml mein custom markers define karo:
# [tool.pytest.ini_options]
# markers = [
#     "slow: marks tests as slow (deselect with '-m \"not slow\"')",
#     "integration: marks integration tests",
#     "unit: marks unit tests",
# ]

@pytest.mark.slow
def test_large_dataset_processing():
    """30 seconds lagte hain run hone mein."""
    process_million_records()

@pytest.mark.integration
def test_database_connection():
    """Running database chahiye."""
    db = connect_to_db()
    assert db.is_connected()
```

```bash
# Sirf fast tests chalao (slow exclude karke):
pytest -m "not slow"

# Sirf integration tests chalao:
pytest -m integration

# Unit tests chalao par integration nahi:
pytest -m "unit and not integration"
```

---

## Testing Exceptions

### pytest.raises()

Socho tumhara IRCTC app agar tatkal booking mein balance kam ho toh error throw karta hai — tumhe test karna hai ki wo error sahi se throw ho raha hai ya nahi. Yahi kaam `pytest.raises()` karta hai.

```python
import pytest

def divide(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

# Basic usage
def test_divide_by_zero_raises():
    with pytest.raises(ValueError):
        divide(10, 0)

# Exception message check karo
def test_divide_by_zero_message():
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(10, 0)

# Exception object access karo
def test_divide_by_zero_details():
    with pytest.raises(ValueError) as exc_info:
        divide(10, 0)
    assert "zero" in str(exc_info.value)
    assert exc_info.type is ValueError
```

Jest equivalent:
```typescript
function divide(a: number, b: number): number {
    if (b === 0) throw new Error('Cannot divide by zero');
    return a / b;
}

test('divide by zero throws', () => {
    expect(() => divide(10, 0)).toThrow();
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
    expect(() => divide(10, 0)).toThrow(Error);
});
```

### Multiple Exception Types Test Karna

```python
def test_type_errors():
    with pytest.raises(TypeError):
        divide("not", "numbers")  # type: ignore

def test_does_not_raise():
    """Kabhi-kabhi verify karna hota hai ki koi exception RAISE nahi hua."""
    # Bas function call karo - agar raise hua toh test automatically fail ho jayega
    result = divide(10, 2)
    assert result == 5.0
```

### match Parameter Regex Use Karta Hai

```python
def test_exception_message_pattern():
    with pytest.raises(ValueError, match=r"Cannot divide .* zero"):
        divide(10, 0)

    with pytest.raises(ValueError, match=r"(?i)cannot"):  # Case insensitive
        divide(10, 0)
```

---

## Test Output and Verbose Mode

### Output Levels

```bash
# Default: pass ke liye dots, fail ke liye F
pytest
# Output: ...F..

# Verbose: har test ka naam dikhao
pytest -v
# Output:
# test_calc.py::test_add PASSED
# test_calc.py::test_subtract PASSED
# test_calc.py::test_divide FAILED

# Extra verbose: full assertion details dikhao
pytest -vv

# Quiet: minimal output
pytest -q

# print statements dikhao (default mein pytest stdout capture kar leta hai)
pytest -s

# Combine: verbose + prints dikhao
pytest -vs

# Tracebacks mein local variables dikhao
pytest -l

# Short traceback format
pytest --tb=short

# Koi traceback nahi
pytest --tb=no

# Sirf pehli failure ki details dikhao
pytest --tb=line
```

### Debugging ke liye print() Use Karna

```python
def test_debugging_example():
    data = fetch_some_data()
    print(f"DEBUG: Got data = {data}")  # Sirf -s flag ke saath dikhega
    assert data["status"] == "ok"
```

```bash
# -s ke bina: print output capture ho jaata hai, sirf failure pe dikhta hai
# -s ke saath: print output hamesha dikhega
pytest -s test_example.py
```

### Test Durations Dikhana

```bash
# 10 sabse slow tests dikhao:
pytest --durations=10

# Saari test durations dikhao:
pytest --durations=0
```

---

## Configuration

### pyproject.toml (Recommended)

```toml
# pyproject.toml

[tool.pytest.ini_options]
# jest.config.js options ke equivalent

# Tests kahan dhoondein (jest ke testMatch/roots jaisa)
testpaths = ["tests"]

# Minimum pytest version
minversion = "8.0"

# Default command-line options (jest ke CLI flags jaisa)
addopts = [
    "-ra",          # Saare non-passing tests ka summary dikhao
    "-q",           # Quiet mode
    "--strict-markers",  # Unknown markers pe error do
]

# Test file pattern (jest ke testRegex jaisa)
python_files = ["test_*.py", "*_test.py"]

# Test function pattern
python_functions = ["test_*"]

# Test class pattern
python_classes = ["Test*"]

# Custom markers
markers = [
    "slow: marks tests as slow",
    "integration: marks integration tests",
    "unit: marks unit tests",
]

# Warnings filter karo
filterwarnings = [
    "error",                              # Warnings ko error treat karo
    "ignore::DeprecationWarning",         # Deprecation warnings ke alawa
]
```

### jest.config.js se Comparison

```javascript
// jest.config.js - reference ke liye
module.exports = {
    testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
    transform: { '^.+\\.tsx?$': 'ts-jest' },
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.ts'],
    testTimeout: 10000,
    verbose: true,
};
```

```toml
# pyproject.toml equivalent
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = ["-v", "--timeout=10"]  # pytest-timeout chahiye
# Transform ki zaroorat nahi - Python ko compilation nahi chahiye
# Coverage pytest-cov plugin handle karta hai
```

### Doosre Config Files (Kam Common)

```ini
# pytest.ini (purana style, ab bhi kaam karta hai)
[pytest]
testpaths = tests
addopts = -ra -q

# setup.cfg (purana style)
[tool:pytest]
testpaths = tests
addopts = -ra -q
```

> [!tip]
> **Recommendation:** Hamesha `pyproject.toml` use karo. Yeh modern standard hai aur tumhari saari project configuration ek hi file mein rakhta hai.

---

## Practice Exercises

### Exercise 1: String Utilities

In functions ke tests likho. Do files banao:

```python
# src/string_utils.py

def capitalize_words(text: str) -> str:
    """Har word ka pehla letter capitalize karo."""
    return " ".join(word.capitalize() for word in text.split())

def truncate(text: str, max_length: int, suffix: str = "...") -> str:
    """Text ko max_length tak truncate karo, agar truncate hua toh suffix add karo."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix

def is_palindrome(text: str) -> bool:
    """Check karo ki text palindrome hai ya nahi (case aur spaces ignore karke)."""
    cleaned = text.lower().replace(" ", "")
    return cleaned == cleaned[::-1]

def count_vowels(text: str) -> int:
    """Text mein vowels count karo."""
    return sum(1 for char in text.lower() if char in "aeiou")
```

```python
# tests/test_string_utils.py
# YAHAN TUMHARA CODE:
# 1. Har function ke liye kam se kam 3 tests likho
# 2. is_palindrome aur count_vowels ke liye @pytest.mark.parametrize use karo
# 3. Edge cases test karo: empty strings, None input, unicode characters
# 4. Test karo ki truncate non-string input ke liye TypeError raise karta hai
```

### Exercise 2: Shopping Cart

```python
# src/cart.py

class ShoppingCart:
    def __init__(self):
        self.items: list[dict] = []

    def add_item(self, name: str, price: float, quantity: int = 1) -> None:
        if price < 0:
            raise ValueError("Price cannot be negative")
        if quantity < 1:
            raise ValueError("Quantity must be at least 1")
        self.items.append({"name": name, "price": price, "quantity": quantity})

    def remove_item(self, name: str) -> None:
        self.items = [item for item in self.items if item["name"] != name]

    def get_total(self) -> float:
        return sum(item["price"] * item["quantity"] for item in self.items)

    def get_item_count(self) -> int:
        return sum(item["quantity"] for item in self.items)

    def apply_discount(self, percentage: float) -> float:
        if not 0 <= percentage <= 100:
            raise ValueError("Discount must be between 0 and 100")
        total = self.get_total()
        return total * (1 - percentage / 100)
```

```python
# tests/test_cart.py
# YAHAN TUMHARA CODE:
# 1. Items add karne aur totals check karne ke tests likho
# 2. Items remove karne ka test likho
# 3. Discount calculations test karo (float comparison ke liye pytest.approx use karo!)
# 4. pytest.raises ke saath error cases test karo
# 5. Discount edge cases ke liye @pytest.mark.parametrize use karo
# 6. Related tests ko classes mein group karo (TestAddItem, TestDiscount, waghera)
```

### Exercise 3: FizzBuzz (Classic TDD)

Test-driven development practice karo — Flipkart ke dabbe ki tarah, pehle packing list banao (tests), phir saaman pack karo (implementation):

```python
# tests/test_fizzbuzz.py
# Pehle yeh tests likho, phir function implement karo.

import pytest

# Step 1: Parametrized tests likho
@pytest.mark.parametrize("number, expected", [
    (1, "1"),
    (2, "2"),
    (3, "Fizz"),
    (5, "Buzz"),
    (15, "FizzBuzz"),
    (30, "FizzBuzz"),
    (9, "Fizz"),
    (10, "Buzz"),
    (7, "7"),
])
def test_fizzbuzz(number, expected):
    from src.fizzbuzz import fizzbuzz
    assert fizzbuzz(number) == expected

# Step 2: Edge cases test karo
def test_fizzbuzz_zero():
    from src.fizzbuzz import fizzbuzz
    with pytest.raises(ValueError):
        fizzbuzz(0)

def test_fizzbuzz_negative():
    from src.fizzbuzz import fizzbuzz
    with pytest.raises(ValueError):
        fizzbuzz(-1)

# Step 3: Ab src/fizzbuzz.py implement karo taaki saare tests pass ho jayein!
```

### Exercise 4: pytest Configuration

Ek `pyproject.toml` banao jisme ho:
1. `tests/` directory ke liye test discovery configure ho
2. Default verbose output
3. `slow`, `integration`, aur `unit` ke liye custom markers
4. Strict marker enforcement
5. Warning filters jo DeprecationWarnings ko errors mein convert karein

Fir har custom marker use karke kam se kam ek test likho aur verify karo ki tum unhe
`-m` flags se select kar sakte ho.

---

## Key Takeaways

1. **assert hi kaafi hai.** Jest ke dozens matchers bhool jao -- `assert` + Python operators
   sab kuch cover kar deta hai.
2. **pytest assert ko rewrite karta hai.** Detailed failure messages free mein milte hain.
3. **Parametrize > copy-paste.** Data-driven tests ke liye `@pytest.mark.parametrize` use karo.
4. **Markers tests ko organize karte hain.** Built-in markers (`skip`, `xfail`) aur custom markers dono use karo.
5. **Configuration simple hai.** `pyproject.toml` ka ek section `jest.config.js` ki jagah le leta hai.
6. **Jo chahiye wahi run karo.** Specific tests jaldi chalane ke liye `-k`, `-m`, aur node IDs use karo.

Next up: [Fixtures and Mocking](./02_fixtures_and_mocking.md) -- pytest ka killer feature
jo `beforeEach`/`afterEach` ko primitive bana dega.
