# 🔧 Functions in Solidity

> **Chapter 4** | Solidity for Smart Contract Developers
> Difficulty: Beginner | Estimated reading time: 20–25 minutes

---

## 📖 Introduction

Functions are the backbone of every smart contract. They define what your contract *can do* — from transferring tokens to calculating interest rates to minting NFTs. Unlike JavaScript or Python functions, Solidity functions carry extra metadata that the Ethereum Virtual Machine (EVM) needs: visibility rules, state mutation permissions, and ETH-handling capabilities.

By the end of this chapter you will:
- Write functions using the full Solidity syntax
- Choose the right visibility and mutability modifier
- Handle ETH inside functions
- Understand special functions like `constructor`, `receive`, and `fallback`
- Know what a function selector is and why it matters

---

## 1. 🧱 Function Syntax

Every Solidity function follows this skeleton:

```solidity
function functionName(parameterTypes parameterNames)
    visibility
    mutability
    returns (returnTypes)
{
    // body
}
```

Here is a minimal working example that brings all pieces together:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FunctionDemo {
    uint256 private balance;

    constructor(uint256 _initialBalance) {
        balance = _initialBalance;
    }

    function deposit() public payable {
        balance += msg.value;
    }

    receive() external payable {
        balance += msg.value;
    }

    function getBalance() public view returns (uint256) {
        return balance;
    }

    function calculate(uint256 a, uint256 b)
        public
        pure
        returns (uint256 sum, uint256 product)
    {
        sum = a + b;
        product = a * b;
    }
}
```

Each keyword is deliberate. Let's break them all down.

---

## 2. 👁️ Visibility Modifiers

Visibility controls *who* can call a function. There are four options.

### 2.1 `public`

Anyone can call it — external accounts (EOAs), other contracts, or the contract itself.

```solidity
contract Token {
    uint256 public totalSupply = 1_000_000;

    // Readable from outside AND callable from inside
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
}
```

> Note: When you mark a *state variable* as `public`, Solidity auto-generates a free getter function for it. Writing `uint256 public totalSupply` is equivalent to also writing `function totalSupply() external view returns (uint256)`.

### 2.2 `private`

Only the defining contract itself can call it. Not even child contracts that inherit from it.

```solidity
contract Vault {
    uint256 private secretPin = 1234;

    // Only this contract can call _checkPin
    function _checkPin(uint256 pin) private view returns (bool) {
        return pin == secretPin;
    }

    function unlock(uint256 pin) public view returns (string memory) {
        if (_checkPin(pin)) return "Access granted";
        return "Access denied";
    }
}
```

Use `private` for internal helper logic that must never be exposed or overridden.

### 2.3 `internal`

Callable by the contract itself *and* any contract that inherits from it. This is the default visibility for state variables.

```solidity
contract Animal {
    string internal species;

    function _setSpecies(string memory _species) internal {
        species = _species;
    }
}

contract Dog is Animal {
    constructor() {
        _setSpecies("Canis lupus familiaris"); // OK — Dog inherits Animal
    }

    function getSpecies() public view returns (string memory) {
        return species; // also accessible because species is internal
    }
}
```

Use `internal` for logic you want child contracts to reuse but not expose publicly.

### 2.4 `external`

Only callable from *outside* the contract. Cannot be called internally with a direct call — you'd need `this.functionName()`, which costs extra gas.

```solidity
contract Oracle {
    uint256 private price;

    // Only external callers (other contracts or wallets) can call this
    function updatePrice(uint256 _price) external {
        price = _price;
    }

    function getPrice() external view returns (uint256) {
        return price;
    }
}
```

`external` functions are slightly more gas-efficient than `public` for functions that accept large array parameters, because their arguments stay in `calldata` instead of being copied to `memory`.

### Visibility Quick-Reference Table

| Visibility | Same Contract | Derived Contract | Other Contracts | External Wallets |
|------------|:-------------:|:----------------:|:---------------:|:----------------:|
| `public`   | Yes           | Yes              | Yes             | Yes              |
| `private`  | Yes           | No               | No              | No               |
| `internal` | Yes           | Yes              | No              | No               |
| `external` | No*           | No*              | Yes             | Yes              |

*Can be called internally via `this.fn()` — but this costs extra gas.

---

## 3. ⚡ State Mutability Modifiers

Mutability controls *what* a function is allowed to do with blockchain state.

### 3.1 Default (no keyword)

A function with no mutability modifier can read *and* write state. These transactions cost gas.

```solidity
contract Counter {
    uint256 public count;

    // Reads and writes state — costs gas
    function increment() public {
        count += 1;
    }
}
```

### 3.2 `view`

Promises the function will *only read* state, never modify it. Calling a `view` function externally (off-chain, e.g., from ethers.js) costs zero gas. Calling it from another contract within a transaction costs gas.

```solidity
contract BankAccount {
    uint256 private balance = 500;
    uint256 private interestRate = 5; // percent

    function getBalance() public view returns (uint256) {
        return balance;
    }

    // Reads balance and interestRate, does not write anything
    function projectedBalance(uint256 years) public view returns (uint256) {
        return balance + (balance * interestRate * years) / 100;
    }
}
```

If you accidentally write to state inside a `view` function, the compiler raises an error.

### 3.3 `pure`

Promises the function will *neither read nor write* state. It only works with its own parameters. Like `view`, external `pure` calls are free.

```solidity
contract MathLib {
    // No state access at all — purely computation
    function add(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }

    function factorial(uint256 n) public pure returns (uint256 result) {
        result = 1;
        for (uint256 i = 2; i <= n; i++) {
            result *= i;
        }
    }
}
```

### 3.4 `payable`

Allows the function to receive ETH. Without this keyword, sending ETH to a function causes the transaction to revert.

```solidity
contract CrowdFund {
    mapping(address => uint256) public contributions;
    uint256 public totalRaised;

    function contribute() public payable {
        require(msg.value > 0, "Must send ETH");
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;
    }

    function getContribution(address contributor) public view returns (uint256) {
        return contributions[contributor];
    }
}
```

`msg.value` holds the amount of wei sent with the call — only accessible in `payable` functions.

### Mutability + Visibility Matrix

| Mutability | Reads State | Writes State | Receives ETH | External Gas Cost |
|------------|:-----------:|:------------:|:------------:|:-----------------:|
| (default)  | Yes         | Yes          | No           | Gas required      |
| `view`     | Yes         | No           | No           | Free (off-chain)  |
| `pure`     | No          | No           | No           | Free (off-chain)  |
| `payable`  | Yes         | Yes          | **Yes**      | Gas required      |

---

## 4. 📦 Parameters and Return Values

### 4.1 Multiple Return Values

Solidity supports returning multiple values in a single `returns` tuple.

```solidity
contract Calculator {
    function divmod(uint256 a, uint256 b)
        public
        pure
        returns (uint256 quotient, uint256 remainder)
    {
        quotient = a / b;
        remainder = a % b;
    }
}
```

Callers can destructure the result:

```solidity
(uint256 q, uint256 r) = calc.divmod(17, 5);
// q = 3, r = 2
```

### 4.2 Named Return Variables

Naming return variables lets you assign them directly without a `return` statement (implicit return). This is the style used in `calculate()` in the opening example.

```solidity
function minMax(uint256[] memory arr)
    public
    pure
    returns (uint256 min, uint256 max)
{
    min = arr[0];
    max = arr[0];
    for (uint256 i = 1; i < arr.length; i++) {
        if (arr[i] < min) min = arr[i];
        if (arr[i] > max) max = arr[i];
    }
    // Implicit return: min and max are already set
}
```

You can still use an explicit `return (min, max);` if you prefer — both styles compile.

### 4.3 `memory` vs `calldata` for Reference Types

When a function receives a reference type (string, bytes, arrays, structs), you must specify where that data lives.

| Location    | Who sets it       | Mutable? | Gas Cost  | Typical use                    |
|-------------|-------------------|----------|-----------|-------------------------------|
| `calldata`  | Caller's payload  | No       | Cheapest  | `external` input params        |
| `memory`    | EVM allocates     | Yes      | Moderate  | `public`/`internal` params     |
| `storage`   | Blockchain        | Yes      | Expensive | State variables                |

```solidity
contract StringDemo {
    // external + calldata: cheapest, read-only
    function lengthExternal(string calldata s) external pure returns (uint256) {
        return bytes(s).length;
    }

    // public + memory: slight copy overhead, but callable internally
    function lengthPublic(string memory s) public pure returns (uint256) {
        return bytes(s).length;
    }

    // Internal helper that mutates its copy
    function toUpperFirst(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        if (b[0] >= 0x61 && b[0] <= 0x7A) {
            b[0] -= 0x20; // lowercase → uppercase
        }
        return string(b);
    }
}
```

**Rule of thumb:** use `calldata` for `external` functions, `memory` for `public`/`internal`/`private` functions.

---

## 5. ✨ Special Functions

### 5.1 `constructor()`

Runs exactly once — at deployment. Used to initialise state variables and set up ownership.

```solidity
contract Owned {
    address public owner;
    string public name;

    constructor(string memory _name) {
        owner = msg.sender; // deployer's address
        name = _name;
    }
}
```

- Takes any parameters the deployer passes during deployment.
- Does **not** have a visibility modifier (it is implicitly `public` in modern Solidity).
- Cannot be called again after deployment.

### 5.2 `receive()`

A special, parameter-less function that handles plain ETH transfers — i.e., calls that send ETH with *no calldata*.

```solidity
contract EtherBox {
    uint256 public received;

    receive() external payable {
        received += msg.value;
        emit EtherReceived(msg.sender, msg.value);
    }

    event EtherReceived(address sender, uint256 amount);
}
```

Rules for `receive()`:
- Must be `external payable`.
- No parameters, no return value.
- Limited to 2300 gas when triggered by `.transfer()` or `.send()` (enough to log an event, not much else).

### 5.3 `fallback()`

A catch-all triggered when:
1. ETH is sent with calldata that doesn't match any function, **or**
2. A function is called that doesn't exist on the contract, **or**
3. ETH is sent with no calldata and there is *no* `receive()` defined.

```solidity
contract Proxy {
    address public implementation;

    constructor(address _impl) {
        implementation = _impl;
    }

    // Forwards all unknown calls to the implementation contract
    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
```

### 5.4 `receive()` vs `fallback()` — The Decision Tree

```mermaid
flowchart TD
    A["ETH transfer / external call arrives"] --> B{Has calldata?}
    B -- No calldata --> C{receive() defined?}
    C -- Yes --> D["receive() is called"]
    C -- No --> E{fallback() defined?}
    E -- Yes --> F["fallback() is called"]
    E -- No --> G["Transaction REVERTS"]
    B -- Has calldata --> H{Matches a function selector?}
    H -- Yes --> I["Matched function is called"]
    H -- No --> J{fallback() defined?}
    J -- Yes --> K["fallback() is called"]
    J -- No --> L["Transaction REVERTS"]
```

> Plain ETH (no data) hits `receive()` first. Unknown calls or ETH with unrecognised data hit `fallback()`.

---

## 6. 🔄 Function Overloading

Solidity allows multiple functions with the same name as long as their *parameter types* differ. The compiler picks the right one based on the argument types.

```solidity
contract Converter {
    // Overload 1: convert a single uint
    function toBytes(uint256 value) public pure returns (bytes memory) {
        return abi.encode(value);
    }

    // Overload 2: convert a string
    function toBytes(string memory value) public pure returns (bytes memory) {
        return bytes(value);
    }

    // Overload 3: convert an address
    function toBytes(address value) public pure returns (bytes memory) {
        return abi.encode(value);
    }
}
```

Calling `toBytes(42)` invokes the first. Calling `toBytes("hello")` invokes the second. The return type alone cannot distinguish overloads — parameter types must differ.

---

## 7. 🔑 Function Selectors

Every public/external function on a contract is identified by its **function selector** — the first 4 bytes of the keccak-256 hash of its *canonical signature*.

**Canonical signature** = `functionName(type1,type2,...)` — no spaces, no argument names.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SelectorDemo {
    // Selector = bytes4(keccak256("transfer(address,uint256)"))
    //          = 0xa9059cbb
    function transfer(address to, uint256 amount) public returns (bool) {
        // ...
        return true;
    }

    // Compute the selector on-chain (useful for debugging)
    function getSelector() public pure returns (bytes4) {
        return bytes4(keccak256("transfer(address,uint256)"));
    }

    // Manual low-level call using a selector
    function callTransfer(address target, address to, uint256 amount)
        public
        returns (bool success)
    {
        bytes memory data = abi.encodeWithSelector(
            bytes4(keccak256("transfer(address,uint256)")),
            to,
            amount
        );
        (success, ) = target.call(data);
    }
}
```

When your wallet sends a transaction, the first 4 bytes of the `data` field are the selector — that's how the EVM knows which function to route the call to.

> You can look up selectors for any function at [4byte.directory](https://www.4byte.directory/).

---

## 8. 📞 Internal vs External Calls

### Internal Calls (JUMP opcode)

When a function calls another function *within the same contract* directly by name, the EVM uses a simple `JUMP` instruction. No new execution context is created, no `msg.sender` or `msg.value` changes.

```solidity
contract InternalCallDemo {
    uint256 public result;

    function _double(uint256 x) internal pure returns (uint256) {
        return x * 2;
    }

    function compute(uint256 x) public {
        result = _double(x); // internal call — cheap JUMP
    }
}
```

### External Calls (CALL / STATICCALL opcode)

Calling another contract — or calling your own contract via `this.fn()` — creates a new message call. A new execution context starts, `msg.sender` becomes the calling contract's address, and gas is metered separately.

```solidity
interface IOracle {
    function getPrice() external view returns (uint256);
}

contract PriceConsumer {
    IOracle public oracle;

    constructor(address _oracle) {
        oracle = IOracle(_oracle);
    }

    function fetchPrice() public view returns (uint256) {
        // External call — creates a new message context
        return oracle.getPrice();
    }
}
```

### Key differences summarised

| Property              | Internal Call        | External Call               |
|-----------------------|----------------------|-----------------------------|
| EVM opcode            | `JUMP`               | `CALL` / `STATICCALL`       |
| New execution context | No                   | Yes                         |
| `msg.sender` changes  | No                   | Yes (becomes caller contract)|
| Gas overhead          | Minimal              | ~2100 gas base + execution  |
| Can call `private`    | Yes                  | No                          |
| Reentrancy risk       | No                   | Yes — apply checks-effects-interactions |

---

## 9. 🧩 Putting It All Together — Full Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SimpleBank — demonstrates all function concepts in one contract
contract SimpleBank {
    address public owner;
    mapping(address => uint256) private balances;
    uint256 public totalDeposited;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    // ─── Special Functions ────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    /// Plain ETH sent with no data is treated as a deposit
    receive() external payable {
        _recordDeposit(msg.sender, msg.value);
    }

    /// Unknown function calls are rejected
    fallback() external payable {
        revert("SimpleBank: unknown function");
    }

    // ─── Public / External Interface ─────────────────────────────────────

    /// Deposit ETH by calling this function
    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        _recordDeposit(msg.sender, msg.value);
    }

    /// Withdraw up to your balance
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;          // Effects before interaction
        totalDeposited -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    /// Read balance — free off-chain, costs gas inside a transaction
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    /// Named returns + pure computation (gas-free off-chain)
    function feeEstimate(uint256 amount, uint256 basisPoints)
        external
        pure
        returns (uint256 fee, uint256 net)
    {
        fee = (amount * basisPoints) / 10_000;
        net = amount - fee;
    }

    // ─── Overloaded helpers ───────────────────────────────────────────────

    /// Overload 1: check balance by address
    function isAbove(address user, uint256 threshold) public view returns (bool) {
        return balances[user] > threshold;
    }

    /// Overload 2: check a raw amount (no state read — pure)
    function isAbove(uint256 amount, uint256 threshold) public pure returns (bool) {
        return amount > threshold;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────

    /// Shared logic called by both deposit() and receive()
    function _recordDeposit(address user, uint256 amount) internal {
        balances[user] += amount;
        totalDeposited += amount;
        emit Deposited(user, amount);
    }

    // ─── Owner-only ───────────────────────────────────────────────────────

    function emergencyWithdraw() external {
        require(msg.sender == owner, "Not owner");
        uint256 contractBalance = address(this).balance;
        (bool ok, ) = owner.call{value: contractBalance}("");
        require(ok, "Transfer failed");
    }
}
```

---

## 🗝️ Key Takeaways

1. **Visibility** (`public`, `private`, `internal`, `external`) decides *who* can call a function. Use `external` for interface functions, `internal` for shared helpers, `private` for implementation details.

2. **Mutability** (`view`, `pure`, `payable`, or default) describes *what the function is allowed to do*. `view` and `pure` functions are free to call off-chain. `payable` is required to receive ETH.

3. **`constructor`** runs once at deploy time. **`receive`** handles plain ETH transfers. **`fallback`** is the catch-all for unknown calls.

4. **`calldata`** is read-only and cheaper for `external` function parameters. **`memory`** is mutable and used for `public`/`internal` parameters.

5. **Function selectors** are the first 4 bytes of `keccak256(signature)`. The EVM uses them to route every external call.

6. **Internal calls** are cheap `JUMP` instructions. **External calls** create a new message context, change `msg.sender`, and carry reentrancy risk — always apply checks-effects-interactions.

---

## 📝 Quiz

**Q1.** You have a function that computes a Fibonacci number using only its parameter and local variables. What is the correct mutability modifier?

<details>
<summary>Show answer</summary>

`pure` — no state is read or written.

</details>

---

**Q2.** A user sends 1 ETH directly to your contract address with no transaction data. Your contract defines both `receive()` and `fallback()`. Which function is triggered?

<details>
<summary>Show answer</summary>

`receive()` — plain ETH with no calldata always hits `receive()` first when it is defined.

</details>

---

**Q3.** What are the first 4 bytes of `keccak256("balanceOf(address)")`? (You can compute this in Remix or any Solidity REPL.)

<details>
<summary>Show answer</summary>

`0x70a08231` — this is the ERC-20 `balanceOf` selector, one of the most common selectors on Ethereum.

</details>

---

*Next chapter: Modifiers and Error Handling — writing robust, reusable guard logic.*
