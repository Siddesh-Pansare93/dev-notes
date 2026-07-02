# 13 - Error Handling in Solidity

> "Traditional software mein bugs embarrassing hote hain. Smart contracts mein bugs catastrophic ho sakte hain — aur permanent."

---

## Error Handling Kyun Itna Zaruri Hai? ⚠️

Socho tum ek normal web app bana rahe ho — kuch galat hua, tumne error log kiya, error page dikhaya, database rollback kiya, aur move on kar gaye. Damage usually fix ho jaata hai.

Smart contracts is tarah kaam nahi karte.

Ek baar transaction Ethereum blockchain pe mine ho gaya, toh woh **permanent** hai. Koi undo button nahi hai. Koi customer support line nahi hai. Backup se rollback bhi nahi hoga. Agar tumhara contract missing validation ki wajah se 10 ETH galat address pe bhej deta hai, toh woh ETH gaya — jab tak recipient khud wapas na bheje (jo almost kabhi nahi hota, sochke dekho koi apna paisa wapas kyun karega).

Isiliye Solidity mein error handling ek aisi skill hai jo tumhe shuru mein hi seekh leni chahiye. Smart contracts mein proper error handling teen kaam karta hai:

1. **Invalid state transitions rokta hai** — contract ko broken ya exploitable state mein jaane se rokta hai.
2. **Unused gas refund karta hai** — jab transaction revert hota hai, caller ko woh gas wapas milta hai jo usne spend nahi kiya. Matlab galat input dene ki punishment kam ho jaati hai.
3. **Intent clearly communicate karta hai** — descriptive error messages se contract debug karna, audit karna, aur correctly use karna aasan ho jaata hai.

Chalo dekhte hain Solidity error handling ke liye kya kya tools deta hai.

---

## Teen Core Error Mechanisms 🔧

### a) `require` — Inputs aur Conditions Validate Karna

`require` sabse zyada use hone wala error-handling tool hai. Isse tum **conditions validate karte ho jo external inputs ya runtime state pe depend karti hain**. Agar condition false hai, execution turant ruk jaata hai, saare state changes revert ho jaate hain, aur diya gaya error message caller ko wapas mil jaata hai. Unused gas bhi refund hota hai.

Socho ye ek bouncer hai jo Zomato delivery boy ko society ke gate pe check kar raha hai — agar ID card nahi hai, andar nahi ghusne dega. Simple gate check.

**Syntax:**
```solidity
require(condition, "Human-readable error message");
```

**Kab use karein:**
- Function arguments validate karne ke liye (jaise amount > 0)
- Caller ki permissions check karne ke liye (jaise msg.sender == owner)
- External state verify karne ke liye (jaise balance sufficient hai ya nahi)
- Logic execute karne se pehle contract preconditions ensure karne ke liye

**Example:**
```solidity
function deposit() public payable {
    require(msg.value > 0, "Must send ETH");
    // Yahan tabhi pahunchega jab msg.value > 0 ho
    balances[msg.sender] += msg.value;
}
```

Agar koi `deposit()` call karta hai bina ETH bheje, toh transaction `"Must send ETH"` message ke saath revert ho jaata hai aur usko woh gas wapas mil jaata hai jo usne use nahi kiya.

**Key rule:** `require` un cheezon ke liye hai jo *legitimately fail ho sakti hain* user input ya current state ke basis pe. Ye ek gate hai, internal sanity check nahi.

---

### b) `revert` — Explicitly Execution Abort Karna

`revert` tumhe zyada control deta hai ki kab aur kaise abort karna hai. Isko tum string message ke saath use kar sakte ho (require jaisa), ya **custom error** ke saath (agla section dekhna). `require` ki tarah, ye bhi saare state changes revert karta hai aur unused gas refund karta hai.

**Syntax:**
```solidity
revert("Error message");           // string-based (kam gas efficient)
revert CustomError(arg1, arg2);    // custom error (recommended)
```

**Kab use karein:**
- Complex `if/else` branches ke andar jahan `require` awkward lagega
- Jab tumhe custom errors use karne hain (jo zyada gas efficient hain)
- Jab revert condition simple boolean check nahi hai

**Example:**
```solidity
function withdraw(uint256 amount) public {
    uint256 userBalance = balances[msg.sender];

    if (amount == 0) revert InvalidInput("Amount cannot be zero");
    if (userBalance < amount) revert InsufficientBalance(msg.sender, amount, userBalance);

    balances[msg.sender] -= amount;
    // ... ETH bhejo
}
```

Ye pattern — `if (condition) revert CustomError(...)` — modern, idiomatic tarika hai Solidity mein error handling likhne ka.

---

### c) `assert` — Invariants Check Karna (Internal Sanity)

`assert` `require` aur `revert` se fundamentally alag hai. Ye user input validate karne ke liye **nahi** hai. Ye **invariants** check karne ke liye hai — un conditions ke liye jo *hamesha* true honi chahiye agar tumhara code sahi likha gaya hai.

Agar `assert` fail ho jaaye, toh iska matlab hai tumhare contract logic mein kuch bahut galat ho gaya hai. Ye ek bug signal karta hai, bad user input nahi.

**Syntax:**
```solidity
assert(condition);
```

**`require` se key differences:**
- Error message **accept nahi karta** (ye `Panic` error deta hai ek code ke saath)
- Historically saara remaining gas consume kar leta tha (0.8.0 se pehle), ab gas refund bhi karta hai
- Correctly likhe gaye code mein **kabhi false nahi hona chahiye**

**Kab use karein:**
- Arithmetic operations ke baad result sane hai ya nahi verify karne ke liye
- Internal accounting sahi add ho rahi hai ya nahi check karne ke liye (jaise sum of balances = total supply)
- State transitions ke baad jo deterministically correct hone chahiye

**Example:**
```solidity
function invariantCheck(uint256 a, uint256 b) public pure returns (uint256) {
    uint256 result = a + b;
    assert(result >= a); // Solidity 0.8+ mein overflow toh waise bhi revert hoga, par ye intent express karta hai
    return result;
}
```

**Aise samjho:** Agar `require` fail hone ka matlab hai "user ne kuch galat kiya", toh `assert` fail hone ka matlab hai "developer ne kuch galat kiya."

---

## Custom Errors — Gas Efficient aur Informative 💡

**Solidity 0.8.4** mein introduce hue custom errors, modern aur recommended tarika hain errors handle karne ka. Ye string messages se zyada gas efficient hain kyunki on-chain string data store aur return karna mehenga padta hai.

**Custom errors gas kyun bachate hain:**
- String error message poore UTF-8 byte array ke roop mein ABI-encode hota hai transaction revert data mein.
- Custom error ek 4-byte selector se identify hota hai (error signature ka keccak256 hash), bilkul function call ki tarah.
- Kam data = kam gas cost.

### Custom Errors Define Karna

Custom errors file ya contract level pe `error` keyword se define hote hain:

```solidity
// File level pe defined (multiple contracts mein accessible)
error InsufficientBalance(address user, uint256 required, uint256 available);
error TransferFailed(address from, address to, uint256 amount);
error Unauthorized(address caller, address required);
error InvalidInput(string reason);
```

Custom errors **typed parameters** carry kar sakte hain, jo inhe string messages se sasta aur zyada informative banata hai. Jab koi tool ya dApp revert ko catch karta hai, woh parameters decode karke user ko meaningful context de sakta hai.

### Custom Errors Use Karna

```solidity
function withdraw(uint256 amount) public {
    uint256 userBalance = balances[msg.sender];

    if (amount == 0) {
        revert InvalidInput("Amount cannot be zero");
    }

    if (userBalance < amount) {
        revert InsufficientBalance(msg.sender, amount, userBalance);
    }

    balances[msg.sender] -= amount;

    (bool success, ) = payable(msg.sender).call{value: amount}("");
    if (!success) {
        revert TransferFailed(address(this), msg.sender, amount);
    }
}
```

Jab `InsufficientBalance` throw hota hai, caller ka tool `user`, `required`, aur `available` decode kar sakta hai — precise diagnostic information deta hai. Isko compare karo `revert("Insufficient balance")` se, jo tumhe actual values ke baare mein kuch nahi batata.

**Custom errors modern Solidity mein best practice hain. String messages se `require` aur `revert` mein inhe prefer karo.**

---

## try/catch — External Contracts Ko Safely Call Karna 🛡️

Smart contract development mein sabse dangerous patterns mein se ek hai kisi **external contract** ko call karna bina failure ki possibility handle kiye. Agar external call fail ho jaaye aur tum use catch na karo, toh tumhara pura transaction revert ho jaayega — chahe tumne already important kaam complete kar liya ho.

Solidity `try/catch` deta hai external contract functions aur constructor calls ke liye.

### Basic try/catch Structure

```solidity
try someContract.someFunction(args) returns (ReturnType value) {
    // Success path: value use karo
} catch Error(string memory reason) {
    // String message ke saath revert catch hua (require ya revert("...") se)
} catch Panic(uint256 code) {
    // Panic catch hua (assert, overflow, etc. se)
} catch (bytes memory lowLevelData) {
    // Koi bhi aur error catch hua (custom errors, low-level failures)
}
```

### Token Transfers ke saath try/catch

```solidity
function safeTransferToken(address token, address to, uint256 amount) public {
    try IERC20(token).transfer(to, amount) returns (bool success) {
        require(success, "Transfer returned false");
        // Sab theek — token transfer ho gaya
    } catch Error(string memory reason) {
        // ERC20 contract string message ke saath revert hua
        revert(string(abi.encodePacked("Token transfer failed: ", reason)));
    } catch {
        // Catch-all: custom errors, panics, aur low-level failures handle karta hai
        revert("Token transfer failed: unknown reason");
    }
}
```

### Chaaron catch Clauses Samjho

| Clause | Kya Catch Karta Hai |
|--------|----------------|
| `catch Error(string memory reason)` | `revert("message")` ya `require(false, "message")` |
| `catch Panic(uint256 code)` | `assert` failures, arithmetic overflow, array out-of-bounds |
| `catch (bytes memory lowLevelData)` | Custom errors, koi bhi aur ABI-encoded revert data |
| `catch { }` (no parameters) | Sab kuch — generic fallback jo saare errors catch karta hai |

**try/catch ke important rules:**
- Ye sirf **external** function calls aur contract creation (`new`) pe kaam karta hai.
- Internal function calls pe kaam **nahi** karta.
- `try` ke andar bhi, agar tumhare khud ke code ka success block revert karta hai, toh pura transaction revert hoga (try/catch tumhare khud ke code ko wrap nahi karta).
- Agar external call succeed hoti hai but unexpected data return karti hai, try/catch decode karne mein fail ho sakta hai.

### Constructor Calls ke saath try/catch

```solidity
function deployChild(uint256 initialValue) public {
    try new ChildContract(initialValue) returns (ChildContract child) {
        // Deployment successful
        childAddress = address(child);
    } catch {
        revert("Child deployment failed");
    }
}
```

---

## Panic Codes — Assert Tumhe Kya Batata Hai 🔢

Jab `assert` fail hota hai (ya kuch critical internal errors hote hain), Solidity ek `Panic(uint256)` error deta hai numeric code ke saath. Ye codes jaan lena tumhe diagnose karne mein help karega ki galat kya hua.

| Panic Code | Hex | Cause |
|------------|-----|-------|
| 0 | `0x00` | Generic / compiler-inserted panic (production mein occur nahi hona chahiye) |
| 1 | `0x01` | `assert(false)` — assertion fail hua |
| 17 | `0x11` | Arithmetic overflow ya underflow (unchecked blocks mein, Solidity 0.8+) |
| 18 | `0x12` | Division ya modulo by zero |
| 33 | `0x21` | Invalid enum value mein conversion |
| 49 | `0x31` | Empty array pe `.pop()` |
| 50 | `0x32` | Array index out of bounds |
| 65 | `0x41` | Bahut zyada memory allocate ki gayi (memory allocation fail) |
| 81 | `0x51` | Zero-initialized function variable ko call karna (`address(0)` call) |

> [!tip]
> Solidity 0.8.0 aur usse aage, arithmetic overflow aur underflow automatically `Panic(0x11)` ke saath revert ho jaate hain — ab tumhe basic arithmetic ke liye SafeMath ki zarurat nahi. Aajkal `assert` mainly invariants document karne ke liye use hota hai, overflow catch karne ke liye nahi.

---

## Revert Pe Gas Refund ⛽

Error handling ka sabse zyada misunderstood part ye hai ki jab transaction revert hota hai gas ka kya hota hai.

**Kya refund hota hai:**
- Saara **unused** gas caller ko wapas milta hai.
- Agar tumhare paas 100,000 gas tha, revert se pehle 30,000 use hua, toh tumhe ~70,000 wapas milta hai.

**Kya refund NAHI hota:**
- Woh gas jo revert point tak code execute karne mein already consume ho chuka hai.
- Base transaction fee (minimum 21,000 gas).

Isiliye inputs ko **early** (function ke top pe) validate karna good practice hai — agar input invalid hai, toh tum fail-fast karna chahte ho, expensive computation ya storage operations pe gas kharch karne se pehle.

Bilkul waise hi jaise Swiggy order place karne se pehle address validate kar leta hai — agar address invalid hai toh restaurant ko order bhejne se pehle hi reject kar do, warna ulta kharcha ho jaayega.

```solidity
function processLargeOperation(uint256 amount) public {
    // Sabse pehle validate karo — expensive kaam se pehle sasta check
    require(amount > 0, "Amount must be positive");
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // Expensive logic tabhi chalao jab validation pass ho
    _runExpensiveComputation(amount);
    _updateMultipleStorageSlots(amount);
}
```

`require` vs `assert` gas behavior compare karo:
- `require(false, "msg")` — revert hota hai aur remaining gas refund karta hai.
- `assert(false)` — Solidity 0.8+ mein, ye bhi revert hota hai aur remaining gas refund karta hai (older versions mein, ye saara gas consume kar leta tha — isi liye user-facing checks ke liye `require` use karna better hai).

---

## Full Example 📄

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Custom errors (gas efficient)
error InsufficientBalance(address user, uint256 required, uint256 available);
error TransferFailed(address from, address to, uint256 amount);
error Unauthorized(address caller, address required);
error InvalidInput(string reason);

contract ErrorHandling {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function deposit() public payable {
        require(msg.value > 0, "Must send ETH");
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public {
        uint256 userBalance = balances[msg.sender];

        if (amount == 0) revert InvalidInput("Amount cannot be zero");
        if (userBalance < amount) revert InsufficientBalance(msg.sender, amount, userBalance);

        balances[msg.sender] -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed(address(this), msg.sender, amount);
    }

    // try/catch example
    function safeTransferToken(address token, address to, uint256 amount) public {
        try IERC20(token).transfer(to, amount) returns (bool success) {
            require(success, "Transfer returned false");
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Token transfer failed: ", reason)));
        } catch {
            revert("Token transfer failed: unknown reason");
        }
    }

    function invariantCheck(uint256 a, uint256 b) public pure returns (uint256) {
        uint256 result = a + b;
        assert(result >= a); // Ye HAMESHA true hona chahiye (overflow 0.8+ mein checked hai)
        return result;
    }
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}
```

---

## require vs revert vs assert — Quick Comparison 📊

| Feature | `require` | `revert` | `assert` |
|---------|-----------|----------|----------|
| **Primary use** | Inputs aur preconditions validate karna | Control ke saath explicitly abort karna | Internal invariants check karna |
| **Error type** | `Error(string)` | `Error(string)` ya custom error | `Panic(uint256)` |
| **Message accept karta hai** | Haan (string) | Haan (string ya custom error) | Nahi |
| **Unused gas refund karta hai** | Haan | Haan | Haan (0.8.0 se) |
| **Kya caller kabhi trigger kar sakta hai?** | Haan — bad input | Haan — invalid state | Nahi — bug indicate karta hai |
| **Idiomatic modern usage** | Simple boolean gates | Custom errors ke saath complex branches | Invariant documentation |
| **Gas efficiency** | Moderate (string ke saath) | Best (custom errors ke saath) | Low (Panic, no message) |

---

## Error Flow Diagram 🗺️

```mermaid
flowchart TD
    A([Transaction Submitted]) --> B{Input Valid?}

    B -- No --> C[require fails\nor revert called]
    C --> D[State reverted\nUnused gas refunded\nError returned to caller]

    B -- Yes --> E{Execute Logic}

    E --> F{External Call?}
    F -- Yes --> G[try/catch block]
    G --> H{External Call\nSucceeds?}
    H -- No, string error --> I[catch Error\nhandle gracefully]
    H -- No, panic --> J[catch Panic\nlog panic code]
    H -- No, other --> K[catch generic\nfallback handler]
    H -- Yes --> L[Continue execution]

    I --> M{Recover or re-revert?}
    J --> M
    K --> M
    M -- re-revert --> D
    M -- recover --> L

    L --> N{Invariant Check\nassert}
    N -- Passes --> O([Transaction Succeeds\nState committed\nEvent emitted])
    N -- Fails --> P[Panic emitted\nBug in contract logic!\nState reverted]

    E -- Internal error --> P
```

---

## Key Takeaways ✅

- **Blockchain transactions irreversible hote hain.** Error handling optional nahi hai — ye safe smart contract development ki foundation hai.
- **`require` use karo input validation ke liye** functions ke top pe. Fail fast karo, gas early refund karwao.
- **`revert` custom errors ke saath use karo** complex branching logic ke liye. Custom errors zyada gas efficient hain aur typed data carry karte hain.
- **`assert` sparingly use karo** — sirf un invariants ko express karne ke liye jo *hamesha* hold hone chahiye. `assert` fail hone ka matlab hai tumhare contract mein bug hai, user ne kuch galat nahi kiya.
- **External calls ko `try/catch` mein wrap karo** taaki koi failing external contract tumhara pura transaction silently na maar de.
- **Apne Panic codes jaano** — `0x01` matlab assert fail, `0x11` matlab overflow, `0x32` matlab array out-of-bounds.
- **Custom errors (Solidity 0.8.4+) modern best practice hain.** Naye code mein string messages se inhe prefer karo.
- **Revert pe gas partially refund hota hai** — unused portion caller ko wapas mil jaata hai. Jitna zyada validation upfront hoga, utna zyada gas bachega jab inputs invalid honge.

---

## Quiz — Apna Understanding Test Karo 🧠

**Question 1:**

Tum ek function likh rahe ho jo users ko NFT purchase karne deta hai. Function ko check karna chahiye ki user ne exactly sahi amount ETH bheja hai. Kaunsa statement sabse appropriate hai?

```solidity
// Option A
require(msg.value == price, "Wrong ETH amount");

// Option B
assert(msg.value == price);

// Option C
if (msg.value != price) revert();
```

**A)** Option A — `require` sahi hai user-provided value (msg.value) ko expected price ke against validate karne ke liye. `assert` kabhi bhi user inputs ke liye use nahi karna chahiye. Option C kaam toh karta hai lekin koi error information nahi deta.

---

**Question 2:**

Ek custom error is tarah define hai:
```solidity
error InsufficientBalance(address user, uint256 required, uint256 available);
```

Ye isse zyada gas efficient kyun hai:
```solidity
require(balance >= amount, "Insufficient balance: user does not have enough funds");
```

**A)** Custom error ek 4-byte selector se identify hota hai (signature ka keccak256 hash). String message revert data mein raw UTF-8 bytes ke roop mein store hota hai. Kam revert data = caller ke liye aur poore transaction ke liye kam gas cost. Iske alawa, custom error typed parameters ko compactly ABI encoding use karke encode karta hai.

---

**Question 3:**

Ye code dekho:
```solidity
function riskyCall(address token, address to, uint256 amount) public {
    IERC20(token).transfer(to, amount);
    emit TransferCompleted(to, amount);
}
```

Problem kya hai, aur tum ise kaise fix karoge?

**A)** External call `IERC20(token).transfer(to, amount)` `try/catch` mein wrap nahi hai. Agar token contract kisi bhi reason se revert karta hai (bad token, insufficient allowance, paused contract, reentrancy guard, etc.), toh pura `riskyCall` transaction bina kisi diagnostic information ke aur bina graceful handling ke opportunity ke revert ho jaata hai. Fix ye hai ki call ko wrap karo:

```solidity
function riskyCall(address token, address to, uint256 amount) public {
    try IERC20(token).transfer(to, amount) returns (bool success) {
        require(success, "Transfer returned false");
        emit TransferCompleted(to, amount);
    } catch Error(string memory reason) {
        revert(string(abi.encodePacked("Transfer failed: ", reason)));
    } catch {
        revert("Transfer failed: unknown error");
    }
}
```

---

*Agla chapter: Reentrancy Attacks aur Checks-Effects-Interactions Pattern — Solidity ka sabse important security pattern.*
