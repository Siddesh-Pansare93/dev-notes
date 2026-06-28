# pytest Basics: Testing in Python

> **Coming from Node.js/TypeScript?** pytest is Python's most popular testing framework,
> and it shares a lot of philosophy with Jest. If anything, you'll find pytest *simpler*
> because Python's built-in `assert` replaces Jest's entire `expect()` API.

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

| Feature | Jest (Node.js/TS) | pytest (Python) |
|---|---|---|
| Install | `npm install --save-dev jest` | `pip install pytest` |
| Config file | `jest.config.js` | `pyproject.toml` or `pytest.ini` |
| Test file naming | `*.test.js`, `*.spec.js` | `test_*.py`, `*_test.py` |
| Test function naming | `test('name', () => {})` or `it()` | `def test_name():` |
| Assertions | `expect(x).toBe(y)` | `assert x == y` |
| Setup/Teardown | `beforeEach`, `afterEach` | Fixtures (covered in next chapter) |
| Mocking | `jest.mock()`, `jest.fn()` | `unittest.mock` / `pytest-mock` |
| Parameterized tests | `test.each([...])` | `@pytest.mark.parametrize` |
| Skip tests | `test.skip()`, `xtest()` | `@pytest.mark.skip` |
| Async tests | Built-in (`async/await`) | `pytest-asyncio` plugin |
| Watch mode | `jest --watch` | `pytest-watch` plugin |
| Coverage | `jest --coverage` | `pytest-cov` plugin |
| Snapshot testing | Built-in | `pytest-snapshot` plugin |

**Key insight:** Jest tries to be an all-in-one solution. pytest has a lean core with a
rich plugin ecosystem. You install only what you need.

---

## Installing and Running pytest

### Installation

```bash
# In Node.js you'd do:
# npm install --save-dev jest @types/jest ts-jest

# In Python, just:
pip install pytest

# Or better, add it to your project dependencies:
# In pyproject.toml:
# [project.optional-dependencies]
# dev = ["pytest>=8.0"]
```

### Running Tests

```bash
# Jest equivalents:
# npx jest                    -> Run all tests
# npx jest path/to/file       -> Run specific file
# npx jest -t "test name"     -> Run tests matching name
# npx jest --watch            -> Watch mode

# pytest equivalents:
pytest                         # Run all tests
pytest tests/test_math.py      # Run specific file
pytest tests/test_math.py::test_addition  # Run specific test
pytest -k "addition"           # Run tests matching keyword expression
pytest -k "addition or subtract"  # Boolean keyword matching
pytest -x                      # Stop on first failure (like --bail)
pytest --lf                    # Re-run only last failed tests
pytest --ff                    # Run failed tests first, then the rest
```

### Your First Test

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

Compare with Jest:

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

Notice: In Python, the test function name IS the test description. There is no separate
string argument. Name your functions descriptively: `test_add_returns_sum_of_two_positive_integers`.

---

## Test Discovery

pytest automatically finds your tests using these conventions:

### File Discovery

```
my_project/
    src/
        calculator.py
    tests/
        __init__.py          # Can be empty, helps with imports
        test_calculator.py   # Discovered! (test_ prefix)
        calculator_test.py   # Discovered! (_test suffix)
        helper.py            # NOT discovered (no test_ or _test)
```

**Jest comparison:**
- Jest looks for `*.test.js`, `*.spec.js`, or files in `__tests__/` directories.
- pytest looks for `test_*.py` or `*_test.py` files.
- Both search recursively from the project root.

### Function and Class Discovery

```python
# test_example.py

# Discovered - starts with test_
def test_something():
    assert True

# NOT discovered - doesn't start with test_
def helper_function():
    return 42

# Discovered - class starts with Test, methods start with test_
class TestCalculator:
    def test_add(self):
        assert 1 + 1 == 2

    def test_subtract(self):
        assert 5 - 3 == 2

    # NOT discovered - doesn't start with test_
    def helper(self):
        return "I'm a helper"

# NOT discovered - class doesn't start with Test
class CalculatorTests:
    def test_add(self):
        assert 1 + 1 == 2
```

**Important:** Test classes must NOT have an `__init__` method. pytest uses plain classes
purely for grouping, unlike unittest which requires inheritance.

### Jest's describe() Equivalent

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
# pytest: Classes for grouping (flat, no nesting)
class TestCalculatorAdd:
    def test_adds_two_numbers(self):
        assert add(1, 2) == 3

class TestCalculatorSubtract:
    def test_subtracts_two_numbers(self):
        assert subtract(5, 3) == 2

# Or just use descriptive function names (more Pythonic):
def test_calculator_add_returns_sum():
    assert add(1, 2) == 3

def test_calculator_subtract_returns_difference():
    assert subtract(5, 3) == 2
```

---

## The Power of assert

This is where pytest really shines. Instead of learning dozens of matcher methods
(`toBe`, `toEqual`, `toContain`, `toHaveLength`, etc.), you just use Python's `assert`.

### Basic Assertions

```python
# pytest - just use assert with any Python expression

def test_equality():
    assert 1 + 1 == 2

def test_not_equal():
    assert 1 + 1 != 3

def test_truthy():
    assert "hello"        # Non-empty strings are truthy
    assert [1, 2, 3]      # Non-empty lists are truthy
    assert 42              # Non-zero numbers are truthy

def test_falsy():
    assert not ""          # Empty string is falsy
    assert not []          # Empty list is falsy
    assert not 0           # Zero is falsy
    assert not None        # None is falsy

def test_identity():
    assert None is None    # Use 'is' for None/True/False checks

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

Compare with Jest:

```typescript
// Jest - need to remember specific matchers
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

### pytest's Secret Weapon: Assert Rewriting

When an assert fails, pytest gives you incredibly detailed output:

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

pytest rewrites your `assert` statements at import time to capture intermediate values
and show you exactly what went wrong. This is magic you do NOT get from vanilla Python
`assert` -- it is a pytest-specific feature.

### Custom Messages

```python
def test_with_message():
    value = calculate_something()
    assert value > 0, f"Expected positive value, got {value}"
```

### Comparing Complex Objects

```python
def test_dict_comparison():
    result = {"name": "Alice", "age": 30, "city": "NYC"}
    expected = {"name": "Alice", "age": 31, "city": "NYC"}
    assert result == expected
    # Output shows: E       'age': 30 != 31

def test_set_comparison():
    result = {1, 2, 3, 4}
    expected = {1, 2, 3, 5}
    assert result == expected
    # Output shows: Extra items in the left set: {4}
    #               Extra items in the right set: {5}
```

### Approximate Comparisons (Floating Point)

```python
# Instead of Jest's toBeCloseTo:
def test_floating_point():
    assert 0.1 + 0.2 == pytest.approx(0.3)
    assert [0.1 + 0.2, 0.2 + 0.4] == pytest.approx([0.3, 0.6])
    assert 2.0 == pytest.approx(2.02, abs=0.1)  # Absolute tolerance
    assert 2.0 == pytest.approx(2.02, rel=0.02)  # Relative tolerance
```

---

## Parametrize: Data-Driven Tests

Parametrize lets you run the same test with different inputs. This is like Jest's
`test.each()` but with a cleaner decorator syntax.

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

### Parametrize with IDs

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

Running gives you:
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
    """This runs 6 tests: (0,10), (0,20), (1,10), (1,20), (2,10), (2,20)"""
    result = x + y
    assert result == x + y
```

### Parametrize with Expected Failures

```python
@pytest.mark.parametrize("input_val, expected", [
    (2, 4),
    (3, 9),
    pytest.param(-1, -1, marks=pytest.mark.xfail(reason="Negative square not negative")),
])
def test_square_with_xfail(input_val, expected):
    assert input_val ** 2 == expected
```

### Real-World Example: Testing an API Validator

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

Markers are like labels you attach to tests. Some are built-in, others you define yourself.

### @pytest.mark.skip - Always Skip

```python
import pytest

@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature():
    pass

# Jest equivalent:
# test.skip('future feature', () => { ... });
# or: xtest('future feature', () => { ... });
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

No direct Jest equivalent for conditional skipping -- you would normally use `if` inside
the test or skip manually.

### @pytest.mark.xfail - Expected Failure

```python
@pytest.mark.xfail(reason="Known bug in calculation engine, see issue #42")
def test_known_bug():
    assert buggy_function() == expected_value

# If the test unexpectedly PASSES, pytest reports it as XPASS (unexpected pass).
# This is great for tracking known bugs - you'll know when they're fixed!

@pytest.mark.xfail(strict=True)
def test_strict_xfail():
    """With strict=True, an unexpected pass is treated as a FAILURE.
    Use this when you want to be notified the moment a bug is fixed."""
    assert buggy_function() == expected_value
```

### Custom Markers

```python
# Define custom markers in pyproject.toml:
# [tool.pytest.ini_options]
# markers = [
#     "slow: marks tests as slow (deselect with '-m \"not slow\"')",
#     "integration: marks integration tests",
#     "unit: marks unit tests",
# ]

@pytest.mark.slow
def test_large_dataset_processing():
    """Takes 30 seconds to run."""
    process_million_records()

@pytest.mark.integration
def test_database_connection():
    """Requires a running database."""
    db = connect_to_db()
    assert db.is_connected()
```

```bash
# Run only fast tests (exclude slow):
pytest -m "not slow"

# Run only integration tests:
pytest -m integration

# Run unit tests but not integration:
pytest -m "unit and not integration"
```

---

## Testing Exceptions

### pytest.raises()

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

# Check the exception message
def test_divide_by_zero_message():
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(10, 0)

# Access the exception object
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

### Testing Multiple Exception Types

```python
def test_type_errors():
    with pytest.raises(TypeError):
        divide("not", "numbers")  # type: ignore

def test_does_not_raise():
    """Sometimes you want to verify NO exception is raised."""
    # Just call the function - if it raises, the test fails automatically
    result = divide(10, 2)
    assert result == 5.0
```

### match Parameter Uses Regex

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
# Default: dots for pass, F for fail
pytest
# Output: ...F..

# Verbose: show each test name
pytest -v
# Output:
# test_calc.py::test_add PASSED
# test_calc.py::test_subtract PASSED
# test_calc.py::test_divide FAILED

# Extra verbose: show full assertion details
pytest -vv

# Quiet: minimal output
pytest -q

# Show print statements (by default, pytest captures stdout)
pytest -s

# Combine: verbose + show prints
pytest -vs

# Show local variables in tracebacks
pytest -l

# Short traceback format
pytest --tb=short

# No traceback
pytest --tb=no

# Only show first failure details
pytest --tb=line
```

### Using print() for Debugging

```python
def test_debugging_example():
    data = fetch_some_data()
    print(f"DEBUG: Got data = {data}")  # Only visible with -s flag
    assert data["status"] == "ok"
```

```bash
# Without -s: print output is captured and only shown on failure
# With -s: print output always shown
pytest -s test_example.py
```

### Show Test Durations

```bash
# Show the 10 slowest tests:
pytest --durations=10

# Show all test durations:
pytest --durations=0
```

---

## Configuration

### pyproject.toml (Recommended)

```toml
# pyproject.toml

[tool.pytest.ini_options]
# Equivalent to jest.config.js options

# Where to find tests (like jest's testMatch/roots)
testpaths = ["tests"]

# Minimum pytest version
minversion = "8.0"

# Default command-line options (like jest's CLI flags)
addopts = [
    "-ra",          # Show summary of all non-passing tests
    "-q",           # Quiet mode
    "--strict-markers",  # Error on unknown markers
]

# Test file pattern (like jest's testRegex)
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

# Filter warnings
filterwarnings = [
    "error",                              # Treat warnings as errors
    "ignore::DeprecationWarning",         # Except deprecation warnings
]
```

### Comparison with jest.config.js

```javascript
// jest.config.js - for reference
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
addopts = ["-v", "--timeout=10"]  # requires pytest-timeout
# No transform needed - Python doesn't need compilation
# Coverage is handled by pytest-cov plugin
```

### Other Config Files (Less Common)

```ini
# pytest.ini (older style, still works)
[pytest]
testpaths = tests
addopts = -ra -q

# setup.cfg (older style)
[tool:pytest]
testpaths = tests
addopts = -ra -q
```

**Recommendation:** Always use `pyproject.toml`. It is the modern standard and keeps
all your project configuration in one file.

---

## Practice Exercises

### Exercise 1: String Utilities

Write tests for these functions. Create two files:

```python
# src/string_utils.py

def capitalize_words(text: str) -> str:
    """Capitalize the first letter of each word."""
    return " ".join(word.capitalize() for word in text.split())

def truncate(text: str, max_length: int, suffix: str = "...") -> str:
    """Truncate text to max_length, adding suffix if truncated."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix

def is_palindrome(text: str) -> bool:
    """Check if text is a palindrome (ignoring case and spaces)."""
    cleaned = text.lower().replace(" ", "")
    return cleaned == cleaned[::-1]

def count_vowels(text: str) -> int:
    """Count the number of vowels in text."""
    return sum(1 for char in text.lower() if char in "aeiou")
```

```python
# tests/test_string_utils.py
# YOUR CODE HERE:
# 1. Write at least 3 tests for each function
# 2. Use @pytest.mark.parametrize for is_palindrome and count_vowels
# 3. Test edge cases: empty strings, None input, unicode characters
# 4. Test that truncate raises TypeError for non-string input
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
# YOUR CODE HERE:
# 1. Test adding items and checking totals
# 2. Test removing items
# 3. Test discount calculations (use pytest.approx for float comparison!)
# 4. Test error cases with pytest.raises
# 5. Use @pytest.mark.parametrize for discount edge cases
# 6. Group related tests in classes (TestAddItem, TestDiscount, etc.)
```

### Exercise 3: FizzBuzz (Classic TDD)

Practice test-driven development:

```python
# tests/test_fizzbuzz.py
# Write these tests FIRST, then implement the function.

import pytest

# Step 1: Write parametrized tests
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

# Step 2: Test edge cases
def test_fizzbuzz_zero():
    from src.fizzbuzz import fizzbuzz
    with pytest.raises(ValueError):
        fizzbuzz(0)

def test_fizzbuzz_negative():
    from src.fizzbuzz import fizzbuzz
    with pytest.raises(ValueError):
        fizzbuzz(-1)

# Step 3: Now implement src/fizzbuzz.py to make all tests pass!
```

### Exercise 4: pytest Configuration

Create a `pyproject.toml` with:
1. Test discovery configured for a `tests/` directory
2. Verbose output by default
3. Custom markers for `slow`, `integration`, and `unit`
4. Strict marker enforcement
5. Warning filters that convert DeprecationWarnings to errors

Then write at least one test using each custom marker and verify you can select them
with `-m` flags.

---

## Key Takeaways

1. **assert is all you need.** Forget the dozens of Jest matchers -- `assert` plus Python
   operators covers everything.
2. **pytest rewrites assert.** You get detailed failure messages for free.
3. **Parametrize > copy-paste.** Use `@pytest.mark.parametrize` for data-driven tests.
4. **Markers organize tests.** Use built-in markers (`skip`, `xfail`) and custom ones.
5. **Configuration is simple.** One section in `pyproject.toml` replaces `jest.config.js`.
6. **Run what you need.** Use `-k`, `-m`, and node IDs to run specific tests quickly.

Next up: [Fixtures and Mocking](./02_fixtures_and_mocking.md) -- pytest's killer feature
that makes `beforeEach`/`afterEach` look primitive.
