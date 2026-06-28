# 🔀 Control Flow in Solidity

> **Chapter 5** | Solidity for Smart Contract Developers
> Difficulty: Beginner | Estimated Reading Time: ~20 minutes

Control flow is how your program decides **what to do next**. In Solidity, you use familiar constructs — `if`, `for`, `while` — but with blockchain-specific constraints that can cost real money if ignored. This chapter covers every control flow tool available in Solidity, along with the gotchas that trip up developers coming from JavaScript, Python, or other high-level languages.

---

## 🧠 Before You Start: The Gas Reality

Every line of code in Solidity costs **gas** — a fee paid to the Ethereum network for computation. Loops are the biggest source of unexpected gas bills and even transaction failures. Keep this in mind throughout the chapter; we will revisit it specifically in the loops sections.

---

## 🔢 Comparison Operators

Before writing conditionals, you need to compare values. Solidity supports the standard set:

| Operator | Meaning              | Example         |
|----------|----------------------|-----------------|
| `==`     | Equal to             | `x == 10`       |
| `!=`     | Not equal to         | `x != 0`        |
| `<`      | Less than            | `x < 100`       |
| `>`      | Greater than         | `x > 0`         |
| `<=`     | Less than or equal   | `x <= limit`    |
| `>=`     | Greater than or equal| `x >= minimum`  |

```solidity
uint256 balance = 50;
bool canWithdraw = balance >= 10;  // true
bool isZero = balance == 0;        // false
```

---

## ⚙️ Logical Operators

Combine multiple conditions with logical operators:

| Operator | Meaning | Example                    |
|----------|---------|----------------------------|
| `&&`     | AND     | `x > 0 && x < 100`        |
| `\|\|`   | OR      | `x == 0 \|\| x > 1000`    |
| `!`      | NOT     | `!isActive`                |

### Short-Circuit Evaluation

Solidity evaluates `&&` and `||` using **short-circuit logic**:

- For `A && B`: if `A` is `false`, `B` is **never evaluated**.
- For `A || B`: if `A` is `true`, `B` is **never evaluated**.

This matters for gas efficiency. Place the cheapest or most-likely-to-resolve condition first:

```solidity
// Good: cheap check first, expensive check only if needed
if (isActive && expensiveCheck()) { ... }

// Wasteful: expensiveCheck() runs even when !isActive
if (expensiveCheck() && isActive) { ... }
```

---

## ⚠️ Solidity-Specific: No Floating Point

Solidity has **no floating point numbers**. There is no `float`, `double`, or `decimal` type. All numbers are integers.

This means **integer division truncates** — it drops the remainder completely:

```solidity
uint256 a = 7;
uint256 b = 2;
uint256 result = a / b;  // result is 3, NOT 3.5

uint256 percent = (75 * 100) / 200;  // 37, not 37.5
```

**Best practice:** Multiply before dividing to preserve precision:

```solidity
// Wrong order — loses precision
uint256 bad  = (1 / 3) * 300;  // 0! (1/3 = 0 in integer math)

// Correct order — multiply first
uint256 good = (1 * 300) / 3;  // 100
```

---

## 🔀 if / else if / else Statements

The most fundamental control flow. The syntax is identical to JavaScript or C:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GradeChecker {
    function getGrade(uint256 score) public pure returns (string memory) {
        if (score >= 90) {
            return "A";
        } else if (score >= 80) {
            return "B";
        } else if (score >= 70) {
            return "C";
        } else if (score >= 60) {
            return "D";
        } else {
            return "F";
        }
    }
}
```

**Rules to remember:**
- Curly braces `{}` are optional for single-line bodies, but always use them — omitting braces is a common source of bugs.
- Conditions must evaluate to a `bool`. Solidity does **not** treat non-zero integers as truthy (unlike JavaScript or C).

```solidity
uint256 x = 1;
if (x) { }        // COMPILE ERROR — x is not a bool
if (x != 0) { }   // Correct
```

---

## ❓ Ternary Operator

A compact way to write a simple `if/else` that returns a value:

```solidity
// syntax: condition ? valueIfTrue : valueIfFalse
uint256 fee = isVIP ? 0 : 100;

string memory label = (balance > 1000) ? "whale" : "regular";
```

Use the ternary for simple assignments. For anything more complex, use a full `if/else` block for readability.

---

## 🔁 for Loops

The `for` loop is the workhorse of Solidity iteration. Syntax:

```solidity
for (initialization; condition; update) {
    // body
}
```

### Basic Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ControlFlow {
    uint256[] public numbers;

    function addNumbers(uint256 count) public {
        for (uint256 i = 0; i < count; i++) {
            numbers.push(i);
        }
    }

    function sumArray() public view returns (uint256 total) {
        for (uint256 i = 0; i < numbers.length; i++) {
            total += numbers[i];
        }
    }

    function findFirst(uint256 target) public view returns (int256 index) {
        for (uint256 i = 0; i < numbers.length; i++) {
            if (numbers[i] == target) {
                return int256(i);
            }
        }
        return -1;  // not found
    }
}
```

### Common Patterns

```solidity
// Counting down
for (uint256 i = 10; i > 0; i--) {
    // i goes 10, 9, 8 ... 1
}

// Step by 2
for (uint256 i = 0; i < 100; i += 2) {
    // even numbers only
}

// Cache array length to save gas
uint256 len = myArray.length;
for (uint256 i = 0; i < len; i++) {
    // reading .length inside the loop re-reads storage each iteration
}
```

### Gas Considerations for for Loops

Every iteration costs gas. If your array grows unbounded, a `sumArray()` call that works today may **revert out of gas** next month when the array has 10,000 elements:

- Cache `array.length` outside the loop (avoids repeated storage reads).
- Prefer `uint256` for loop counters — it matches the EVM's native word size.
- Avoid writing to storage inside tight loops; accumulate in memory and write once.

---

## 🔄 while Loops

Use `while` when you do not know ahead of time how many iterations you need:

```solidity
function countDigits(uint256 number) public pure returns (uint256 count) {
    if (number == 0) return 1;
    while (number > 0) {
        count++;
        number /= 10;  // integer division drops the last digit
    }
}
```

### Infinite Loop Danger

A `while (true)` loop with no exit will consume all gas and revert. Always ensure your exit condition is reachable:

```solidity
// DANGEROUS — if target never found, runs forever until gas runs out
while (numbers[i] != target) {
    i++;
}

// SAFE — add a bounds check
while (i < numbers.length && numbers[i] != target) {
    i++;
}
```

The Ethereum block gas limit (currently ~30 million gas) acts as an automatic kill switch — the transaction reverts and all state changes are rolled back — but the user still **pays for the gas consumed up to the revert**. Do not rely on the gas limit as a safety net.

---

## 🔃 do-while Loops

A `do-while` loop always executes the body **at least once**, then checks the condition:

```solidity
uint256 i = 0;
do {
    i++;
} while (i < 5);
// i is now 5
```

In practice, `do-while` is rare in Solidity. Use it when your logic requires one guaranteed execution before the condition check — for example, processing a value before deciding whether to repeat.

---

## ⏭️ break and continue

**`break`** exits the loop immediately:

```solidity
function hasValue(uint256[] memory arr, uint256 target) public pure returns (bool) {
    for (uint256 i = 0; i < arr.length; i++) {
        if (arr[i] == target) {
            return true;  // early exit via return
        }
    }
    return false;
}

// Using break explicitly
for (uint256 i = 0; i < arr.length; i++) {
    if (arr[i] == target) {
        found = true;
        break;  // stop looping, jump past the for block
    }
}
```

**`continue`** skips the rest of the current iteration and moves to the next one:

```solidity
function sumEvenOnly(uint256[] memory arr) public pure returns (uint256 total) {
    for (uint256 i = 0; i < arr.length; i++) {
        if (arr[i] % 2 != 0) {
            continue;  // skip odd numbers
        }
        total += arr[i];
    }
}
```

Both are useful for keeping loop bodies clean and avoiding deeply nested `if` blocks.

---

## 📋 Loops Over Arrays: Patterns and Best Practices

| Pattern | Use Case | Notes |
|---------|----------|-------|
| Simple iteration | Read all elements | Cache `.length`; avoid writes inside loop |
| Early exit with `return` | Search / find first | Most gas-efficient when match is early |
| Filter with `continue` | Sum/process subset | Cleaner than nested `if` |
| Reverse iteration | Safe removal from end | Avoids index shifting issues |

```solidity
// Reverse iteration — safe for deleting the last element
for (uint256 i = arr.length; i > 0; i--) {
    uint256 element = arr[i - 1];
    // process element
}
```

**Never modify an array's length while forward-iterating** — it creates off-by-one bugs.

---

## ⛽ Why Long Loops Can Fail: The Block Gas Limit

Every Ethereum block has a gas limit (~30 million gas). A single transaction cannot exceed this. If your loop body costs 5,000 gas and your array has 10,000 elements, you need 50 million gas — **impossible in one transaction**.

The transaction reverts. Your users get no result and still pay gas fees. This is a real production failure mode, not a theoretical concern.

**Rule:** Never write an unbounded loop that operates on user-supplied or ever-growing data in a single transaction.

---

## 🗺️ The Mapping Iteration Problem

Solidity mappings (`mapping(address => uint256)`) are hash tables. Unlike arrays, they have **no internal list of keys**. The EVM stores values at deterministic storage slots but provides no way to enumerate them.

```solidity
mapping(address => uint256) public balances;

// THIS IS IMPOSSIBLE — you cannot do this natively:
// for each key in balances { ... }
```

Why? Because the mapping only knows how to look up a value by key. It stores nothing about which keys have been used. Asking "give me all keys" is like asking a hash table to reverse-enumerate itself — the information simply is not there.

**The workaround:** Maintain a separate array of keys alongside the mapping:

```solidity
mapping(address => uint256) public balances;
address[] public holders;   // track who has a balance

function deposit() public payable {
    if (balances[msg.sender] == 0) {
        holders.push(msg.sender);  // register new holder
    }
    balances[msg.sender] += msg.value;
}

// Now you can iterate holders[] and look up balances[holder]
```

This pattern adds storage cost per new key but makes iteration possible.

---

## 📄 Pattern: Pagination / Chunking for Large Datasets

When you need to process more data than fits in one transaction, break it into pages:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PaginatedProcessor {
    address[] public holders;
    mapping(address => uint256) public balances;

    /// @notice Process a slice of holders. Call repeatedly with increasing offset.
    /// @param offset  Starting index (0 for first page)
    /// @param limit   Number of items to process per call (e.g. 100)
    function processPage(uint256 offset, uint256 limit)
        public
        returns (uint256 processed)
    {
        uint256 end = offset + limit;
        if (end > holders.length) {
            end = holders.length;  // clamp to actual length
        }

        for (uint256 i = offset; i < end; i++) {
            address holder = holders[i];
            // do something with balances[holder]
            processed++;
        }
    }

    /// @notice How many holders exist — caller uses this to know when to stop.
    function totalHolders() public view returns (uint256) {
        return holders.length;
    }
}
```

The caller (a script, a UI, or another contract) calls `processPage(0, 100)`, then `processPage(100, 100)`, and so on until `offset >= totalHolders()`. Each call stays well within the block gas limit.

---

## ✅ Key Takeaways

1. **Conditions must be `bool`** — Solidity does not coerce integers to true/false.
2. **No floating point** — integer division truncates; multiply before dividing to preserve precision.
3. **Short-circuit evaluation** — put cheap or likely-to-resolve conditions first in `&&` and `||`.
4. **Every iteration costs gas** — cache `array.length`, avoid storage writes inside loops.
5. **Unbounded loops fail** — if your array can grow forever, your loop will eventually hit the block gas limit and revert.
6. **Mappings cannot be iterated natively** — track keys in a parallel array.
7. **Use pagination** — for large datasets, process in fixed-size chunks across multiple transactions.
8. **`break` and `continue`** clean up loop logic and can save gas by exiting early.

---

## 📝 Quiz

**Question 1:** What does the following expression evaluate to, and why?

```solidity
uint256 result = (1 / 3) * 300;
```

<details>
<summary>Answer</summary>

`result` is `0`. Integer division happens left-to-right: `1 / 3` evaluates to `0` (truncated), then `0 * 300 = 0`. The fix is to multiply first: `(1 * 300) / 3 = 100`.

</details>

---

**Question 2:** You have a `mapping(address => uint256) public scores` with 5,000 entries. You want to find the highest score. What is wrong with the following approach, and how would you fix it?

```solidity
function highestScore() public view returns (uint256 max) {
    for (uint256 i = 0; i < scores.length; i++) { ... }
}
```

<details>
<summary>Answer</summary>

Two problems: (1) Mappings have no `.length` property — this will not compile. (2) Even if it did, iterating 5,000 entries may exceed the block gas limit. The fix: maintain a parallel `address[] public participants` array and track the max score off-chain or via a paginated on-chain function that reads `scores[participants[i]]`.

</details>

---

**Question 3:** Given this loop, under what condition will the transaction revert even if the logic is correct?

```solidity
function distributeRewards(address[] memory recipients) public {
    for (uint256 i = 0; i < recipients.length; i++) {
        balances[recipients[i]] += 100;
    }
}
```

<details>
<summary>Answer</summary>

If `recipients` is large enough that the total gas consumed exceeds the block gas limit (~30 million gas). Each iteration writes to storage (an expensive operation, ~5,000–20,000 gas per write). With thousands of recipients, the transaction runs out of gas and reverts — all state changes are rolled back and the caller still pays the gas used. Fix: use a paginated approach or process in off-chain batches.

</details>

---

*Next Chapter: Functions and Modifiers in Solidity*
