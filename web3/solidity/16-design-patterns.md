# 🏗️ Chapter 16: Design Patterns in Solidity

> **Yeh kiske liye hai:** Woh developers jo Solidity basics samajh chuke hain aur ab production-ready, secure, aur maintainable smart contracts likhna chahte hain.

Smart contracts permanent hote hain. Ek baar blockchain pe deploy ho gaye, toh code change nahi ho sakta (jab tak tumne specifically plan na kiya ho). Isliye yahan design decisions traditional web development se kahin zyada consequential hote hain. Is chapter ke patterns woh battle-tested solutions hain jinpe Solidity community saalon ke experience se — aur kabhi-kabhi painful mistakes se — pahunchi hai.

---

## 📋 Table of Contents

1. [Ownable Pattern](#ownable-pattern)
2. [Access Control / Role-Based Pattern](#access-control--role-based-pattern)
3. [Pausable Pattern](#pausable-pattern)
4. [Upgradeable Proxy Pattern](#upgradeable-proxy-pattern)
5. [Factory Pattern](#factory-pattern)
6. [Pull Payment Pattern](#pull-payment-pattern)
7. [Commit-Reveal Pattern](#commit-reveal-pattern)
8. [Circuit Breaker / Emergency Stop](#circuit-breaker--emergency-stop)
9. [Oracle Pattern (Chainlink)](#oracle-pattern-chainlink-integration)
10. [Key Takeaways](#key-takeaways)
11. [Quiz](#quiz)

---

## 👑 Ownable Pattern

### Kya Problem Hai?

Zyadatar contracts ko ek privileged account chahiye hota hai — koi jo settings configure kare, contract pause kare, ya fees withdraw kare. Bina kisi pattern ke, developers har jagah `require(msg.sender == owner)` copy-paste karte reh jaate hain, jo messy aur error-prone hai.

### Solution Kya Hai?

**Ownable** pattern ownership logic ko ek hi reusable contract mein centralize kar deta hai. Tum isse inherit karte ho, aur turant milta hai:

- Ek `owner` state variable.
- Ek `onlyOwner` modifier jo kisi bhi function pe laga sakte ho.
- `transferOwnership` — control kisi doosre address ko dene ke liye.
- `renounceOwnership` — contract ko permanently lock karne ke liye (koi bhi owner nahi rahega).

### Manual Implementation

Zomato ke restaurant admin panel jaisa socho — sirf restaurant owner hi menu edit kar sakta hai, discounts set kar sakta hai. Yahi idea hai `onlyOwner` ka.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // Returns the current owner address
    function owner() public view returns (address) {
        return _owner;
    }

    // Reverts if caller is not the owner
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    // Transfer ownership to a new account
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    // Permanently renounce ownership — no one can call onlyOwner functions again
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
}

// A token contract that uses Ownable
contract SimpleToken is Ownable {
    mapping(address => uint256) public balances;

    // Only the owner can mint new tokens
    function mint(address to, uint256 amount) public onlyOwner {
        balances[to] += amount;
    }
}
```

### OpenZeppelin Ownable Use Karo

Practically, apna khud ka likhne ke bajaye OpenZeppelin ka audited implementation use karo:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MyProtocol is Ownable {
    uint256 public fee;

    // Pass initial owner to Ownable constructor (OZ v5+)
    constructor(address initialOwner) Ownable(initialOwner) {
        fee = 100;
    }

    function setFee(uint256 newFee) public onlyOwner {
        fee = newFee;
    }
}
```

> **Warning:** `renounceOwnership()` irreversible hai. Ek baar call kar diya, toh koi bhi kabhi `onlyOwner` functions call nahi kar payega. Bohot soch samajh ke use karo.

---

## 🔐 Access Control / Role-Based Pattern

### Kya Problem Hai?

Ek single owner complex protocols ke liye kaafi granular nahi hota. Tumhe chahiye ho sakta hai:
- Ek **minter** jo tokens create kare (ek automated backend service).
- Ek **pauser** jo contract ko halt kar sake (security team ka banda).
- Ek **admin** jo upar wale roles grant/revoke kar sake.

### Solution Kya Hai?

OpenZeppelin ka `AccessControl` role identifiers (`bytes32`) ko addresses ke sets se map karta hai. Koi bhi address multiple roles hold kar sakta hai — bilkul Swiggy app mein jaise ek hi banda "delivery partner" bhi ho sakta hai aur "restaurant owner" bhi.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RoleBasedToken is ERC20, AccessControl {
    // Role identifiers are keccak256 hashes of role names
    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE  = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE  = keccak256("PAUSER_ROLE");

    bool public paused;

    constructor(address admin) ERC20("RoleToken", "RTK") {
        // Grant the deployer the admin role
        _grantRole(ADMIN_ROLE, admin);

        // Admins can manage both minters and pausers
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
    }

    // Only minters can create new tokens
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(!paused, "Contract is paused");
        _mint(to, amount);
    }

    // Only pausers can halt the contract
    function pause() public onlyRole(PAUSER_ROLE) {
        paused = true;
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        paused = false;
    }

    // Admins grant roles to new addresses
    function addMinter(address account) public onlyRole(ADMIN_ROLE) {
        grantRole(MINTER_ROLE, account);
    }

    function removeMinter(address account) public onlyRole(ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, account);
    }
}
```

### Kab Kaunsa Use Karein?

| Scenario | Pattern |
|---|---|
| Simple contracts, single owner | `Ownable` |
| Complex protocols, multiple teams | `AccessControl` |
| DAO governance chahiye | `AccessControl` + Governor |

---

## ⏸️ Pausable Pattern

### Kya Problem Hai?

Bugs hote rehte hain. Agar tumhara contract real funds handle karta hai aur koi vulnerability mil jaaye, toh tumhe saari activity turant rokni padegi jab tak fix taiyar nahi ho jaata.

### Solution Kya Hai?

**Pausable** pattern ek boolean flag add karta hai jise sensitive functions execute hone se pehle check karte hain. `AccessControl` ke saath combine karo, toh sirf authorized addresses hi pause trigger kar sakte hain — jaise IRCTC apni booking service maintenance ke time band kar deta hai, sirf authorized admin hi yeh switch flip kar sakta hai.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PausableVault is Ownable, Pausable {
    mapping(address => uint256) public deposits;

    constructor(address initialOwner) Ownable(initialOwner) {}

    // whenNotPaused modifier from OpenZeppelin Pausable
    function deposit() public payable whenNotPaused {
        deposits[msg.sender] += msg.value;
    }

    // Even withdrawals can be paused in an emergency
    function withdraw(uint256 amount) public whenNotPaused {
        require(deposits[msg.sender] >= amount, "Insufficient balance");
        deposits[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }

    // Only owner can flip the pause state
    function pause() public onlyOwner {
        _pause();   // emits Paused(account) event
    }

    function unpause() public onlyOwner {
        _unpause(); // emits Unpaused(account) event
    }
}
```

> **Design note:** Kuch protocols pause hone par bhi withdrawals allow karte hain (taaki users hamesha apna paisa nikaal sakein), lekin naye deposits block kar dete hain. Achhe se socho ki kaunsi operations gate karni hain.

---

## 🔄 Upgradeable Proxy Pattern

### Contracts Default Mein Immutable Kyun Hote Hain?

Jab tum Solidity contract deploy karte ho, bytecode blockchain pe permanently likh diya jaata hai. Koi built-in "update" mechanism nahi hota. Yeh intentional hai — immutability hi hai jo contracts ko trustworthy banati hai. Lekin real-world projects ko bug fixes aur new features bhi chahiye hote hain.

### Proxy Solution

Proxy pattern ek contract ko do parts mein split karta hai:

- **Proxy contract** — state (storage) aur ETH hold karta hai. Users hamesha isi address se interact karte hain.
- **Implementation contract** — logic (bytecode) hold karta hai. Isse replace kiya ja sakta hai naye version se.

Proxy `delegatecall` use karta hai — implementation ka code chalta hai, lekin proxy ke storage context mein.

```
┌─────────────────────────────────┐
│  User calls proxy address       │
└────────────────┬────────────────┘
                 │ delegatecall
                 ▼
┌─────────────────────────────────┐
│  Implementation Contract        │
│  (logic runs here, but reads/   │
│   writes proxy's storage)       │
└─────────────────────────────────┘
```

### Mermaid Diagram: Proxy Architecture

```mermaid
graph TD
    User(["👤 User"])
    Proxy["🔁 Proxy Contract\n(holds storage & ETH)"]
    ImplV1["📦 Implementation V1\n(original logic)"]
    ImplV2["📦 Implementation V2\n(updated logic)"]
    Admin(["🔑 Admin / Owner"])

    User -->|"calls contract address"| Proxy
    Proxy -->|"delegatecall"| ImplV1
    Admin -->|"upgradeTo(V2)"| Proxy
    Proxy -.->|"after upgrade"| ImplV2

    style Proxy fill:#4a90d9,color:#fff
    style ImplV1 fill:#7dbb7d,color:#fff
    style ImplV2 fill:#e8a838,color:#fff
```

### Transparent Proxy vs UUPS

| Feature | Transparent Proxy | UUPS |
|---|---|---|
| Upgrade logic kahan hai | Proxy contract | Implementation contract |
| Gas cost | Zyada (har call pe extra admin check) | Kam |
| Complexity | Samajhna aasan | Zyada flexible |
| Risk agar impl mein bug ho | Admin phir bhi upgrade kar sakta hai | Upgrade function survive karna chahiye |

### Storage Slot Collision Risk

Yeh proxies ka sabse dangerous pitfall hai. Proxy aur implementation dono ek hi storage share karte hain. Agar tumhara implementation slot 0 pe ek variable declare karta hai, aur proxy bhi slot 0 hi implementation address ke liye use kar raha hai — dono ek doosre ko overwrite kar denge.

```solidity
// DANGEROUS — storage collision example
contract ProxyBad {
    address public implementation; // slot 0
}

contract ImplementationBad {
    uint256 public value; // ALSO slot 0 — collision!
}
```

OpenZeppelin isko **EIP-1967 storage slots** se solve karta hai — ek random-dikhne wala slot jo hash se derive hota hai, jisse accidental collision practically impossible ho jaata hai:

```solidity
// EIP-1967 implementation slot
bytes32 constant IMPL_SLOT =
    bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
```

### Minimal UUPS Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// V1 of your logic contract
contract CounterV1 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public count;

    // Use initialize() instead of constructor() for upgradeable contracts
    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        count = 0;
    }

    function increment() public {
        count += 1;
    }

    // Only owner can authorize upgrades
    function _authorizeUpgrade(address newImplementation)
        internal override onlyOwner {}
}

// V2 adds a new function — storage layout of V1 must be preserved!
contract CounterV2 is CounterV1 {
    // NEW: count by a custom step
    function incrementBy(uint256 step) public {
        count += step;
    }
}
```

### Upgrades Kab NAHI Use Karne Chahiye

Upgrades trust assumptions le aati hain — jiske paas upgrade key hai, woh contract ka behavior change kar sakta hai. Inhe avoid karo jab:
- Tumhe fully trustless, immutable code chahiye (jaise core DeFi primitives).
- Contract user funds hold karta hai bina upgrades pe timelock ke.
- Tumne upgrade key ke liye multisig ya governance process implement nahi kiya.

> **Rule of thumb:** Agar upgrade karte ho, toh timelock use karo (minimum 24–48 ghante) taaki users changes lagu hone se pehle exit kar sakein.

---

## 🏭 Factory Pattern

### Kya Problem Hai?

Ek single contract ko kai baar same type ke bahut saare child contracts spawn karne padte hain — jaise ek DEX har token pair ke liye naya liquidity pool banata hai, ya ek NFT platform har artist ke liye naya collection banata hai.

### Solution Kya Hai?

**Factory** pattern `new ChildContract(...)` ko ek parent factory ke andar encapsulate karta hai, deployed addresses track karta hai, aur off-chain indexing ke liye events emit karta hai. Bilkul Zomato ke "restaurant onboarding" system jaisa — ek central system har naye restaurant ke liye alag profile create karta hai, lekin sabko track bhi karta hai.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Child contract — one deployed per NFT collection
contract NFTCollection {
    string public name;
    address public owner;
    uint256 public deployedAt;

    constructor(string memory _name, address _owner) {
        name = _name;
        owner = _owner;
        deployedAt = block.timestamp;
    }
}

// Factory — users call this to create their own NFTCollection
contract NFTFactory {
    address[] public deployedCollections;
    mapping(address => address[]) public ownerCollections;

    event CollectionCreated(
        address indexed owner,
        address indexed collection,
        string name
    );

    function createCollection(string memory name) public returns (address) {
        // Deploy a new child contract
        NFTCollection collection = new NFTCollection(name, msg.sender);

        // Track it globally and per owner
        deployedCollections.push(address(collection));
        ownerCollections[msg.sender].push(address(collection));

        emit CollectionCreated(msg.sender, address(collection), name);
        return address(collection);
    }

    function getOwnerCollections(address _owner)
        public view returns (address[] memory)
    {
        return ownerCollections[_owner];
    }

    function totalCollections() public view returns (uint256) {
        return deployedCollections.length;
    }
}
```

### Gas Optimization: Clone Factory (EIP-1167)

Har baar poora contract deploy karna mehenga padta hai. Bahut saare identical contracts ke liye, **minimal proxies** (clones) use karo:

```solidity
import "@openzeppelin/contracts/proxy/Clones.sol";

contract CheapFactory {
    address public implementation;

    constructor(address _impl) {
        implementation = _impl;
    }

    function createClone() external returns (address) {
        // Deploys a tiny 45-byte proxy pointing to implementation
        address clone = Clones.clone(implementation);
        // Initialize the clone (constructor doesn't run)
        NFTCollection(clone).initialize(msg.sender);
        return clone;
    }
}
```

Clones `new Contract()` se ~10x kam gas use karte hain, aur large-scale factory contracts ke liye standard approach hain.

---

## 💸 Pull Payment Pattern

### Kya Problem Hai: Push Payments Weaponize Ho Sakti Hain

Naive approach same transaction mein directly recipients ko ETH bhej deti hai:

```solidity
// DANGEROUS — push payment
function refundAll(address[] memory users) public {
    for (uint i = 0; i < users.length; i++) {
        payable(users[i]).transfer(refunds[users[i]]); // can revert!
    }
}
```

Agar koi recipient ek malicious contract hai jiska `receive()` function hamesha revert karta hai, toh poora loop fail ho jaata hai — kisi ko bhi refund nahi milta. Yeh ek **Denial of Service (DoS)** vulnerability hai — socho agar ek Paytm cashback batch payment mein ek galat account ke wajah se saare users ka cashback atak jaaye.

### Solution: Users Ko Khud Apna Paisa Pull Karne Do

ETH bahar bhejne ke bajaye, credits record karo aur users ko apni marzi se withdraw karne do:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Auction {
    mapping(address => uint256) public pendingWithdrawals;
    address public highestBidder;
    uint256 public highestBid;
    bool public ended;

    event NewHighestBid(address indexed bidder, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function bid() public payable {
        require(!ended, "Auction ended");
        require(msg.value > highestBid, "Bid too low");

        // PULL pattern: credit the outgoing highest bidder
        if (highestBidder != address(0)) {
            pendingWithdrawals[highestBidder] += highestBid;
        }

        highestBidder = msg.sender;
        highestBid = msg.value;
        emit NewHighestBid(msg.sender, msg.value);
    }

    function withdraw() public {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        // Zero out BEFORE transferring to prevent reentrancy
        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function endAuction() public {
        ended = true;
    }
}
```

**Yeh safe kyun hai:**
- Har user ka withdrawal ek independent transaction hai.
- Agar koi malicious recipient revert kare, toh sirf usko hi affect hoga.
- Check-effects-interactions pattern (transfer se pehle zero karna) reentrancy rokta hai.

---

## 🎭 Commit-Reveal Pattern

### Kya Problem Hai?

Blockchain data public hota hai. Agar players on-chain apne choices submit karte hain (jaise rock/paper/scissors), toh sabko sabke moves apna commit karne se pehle hi dikh jaate hain. Yahi problem lotteries mein bhi hoti hai — miners blocks front-run ya withhold karke outcomes influence kar sakte hain.

### Solution: Two-Phase Protocol

1. **Commit phase:** `(choice + secret_salt)` ka ek hash submit karo. Kisi ko bhi tumhara choice pata nahi chalta, sirf hash dikhta hai.
2. **Reveal phase:** Actual choice aur salt submit karo. Contract verify karta hai `keccak256(choice + salt) == stored_hash`.

Isko IRCTC Tatkal booking se jodo — sabko pata hai booking ek time pe khulegi, lekin koi nahi jaanta ki doosra kaun sa berth choose karega jab tak reveal na ho jaaye.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CommitRevealGame {
    enum Move { None, Rock, Paper, Scissors }
    enum Phase { Commit, Reveal, Done }

    struct Player {
        bytes32 commitment;   // hash stored during commit phase
        Move    move;         // revealed during reveal phase
        bool    revealed;
    }

    mapping(address => Player) public players;
    address[2] public participants;
    uint8 public commitCount;
    uint8 public revealCount;
    Phase public phase;

    event Committed(address indexed player);
    event Revealed(address indexed player, Move move);
    event Winner(address indexed winner);

    // --- PHASE 1: Commit ---
    // Call with: keccak256(abi.encodePacked(move, salt))
    function commit(bytes32 _commitment) external {
        require(phase == Phase.Commit, "Not in commit phase");
        require(players[msg.sender].commitment == bytes32(0), "Already committed");

        players[msg.sender].commitment = _commitment;
        participants[commitCount] = msg.sender;
        commitCount++;

        if (commitCount == 2) phase = Phase.Reveal;
        emit Committed(msg.sender);
    }

    // --- PHASE 2: Reveal ---
    // Call with actual move (1=Rock,2=Paper,3=Scissors) and your secret salt
    function reveal(Move _move, bytes32 _salt) external {
        require(phase == Phase.Reveal, "Not in reveal phase");
        require(!players[msg.sender].revealed, "Already revealed");
        require(_move != Move.None, "Invalid move");

        // Reconstruct the hash and verify it matches the commitment
        bytes32 expected = keccak256(abi.encodePacked(_move, _salt));
        require(expected == players[msg.sender].commitment, "Commitment mismatch");

        players[msg.sender].move = _move;
        players[msg.sender].revealed = true;
        revealCount++;

        emit Revealed(msg.sender, _move);

        if (revealCount == 2) {
            phase = Phase.Done;
            _determineWinner();
        }
    }

    function _determineWinner() internal {
        Move m0 = players[participants[0]].move;
        Move m1 = players[participants[1]].move;

        if (m0 == m1) {
            emit Winner(address(0)); // draw
        } else if (
            (m0 == Move.Rock     && m1 == Move.Scissors) ||
            (m0 == Move.Paper    && m1 == Move.Rock)     ||
            (m0 == Move.Scissors && m1 == Move.Paper)
        ) {
            emit Winner(participants[0]);
        } else {
            emit Winner(participants[1]);
        }
    }
}
```

**Off-chain commitment generation (JavaScript):**
```javascript
const { ethers } = require("ethers");

const move = 1;  // 1 = Rock
const salt = ethers.randomBytes(32);
const commitment = ethers.keccak256(
  ethers.solidityPacked(["uint8", "bytes32"], [move, salt])
);

console.log("Submit this commitment:", commitment);
console.log("Save your salt:", ethers.hexlify(salt));
```

---

## 🔴 Circuit Breaker / Emergency Stop

Circuit breaker Pausable pattern ka operational version hai — isse monitoring aur ek clear incident-response process ke saath pair kiya jaata hai. Ek achhe se design kiya gaya circuit breaker:

- Multisig se trigger hota hai (single EOA se nahi), taaki abuse na ho.
- Re-enable karne pe timelock hota hai, taaki investigation ho sake.
- Events emit karta hai jo off-chain monitoring catch kar sake.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CircuitBreaker {
    bool public stopped;
    address public admin;
    uint256 public pausedAt;
    uint256 public constant MIN_PAUSE_DURATION = 1 hours;

    event EmergencyStop(address indexed triggeredBy, uint256 timestamp);
    event Resumed(address indexed resumedBy, uint256 timestamp);

    modifier stopInEmergency() {
        require(!stopped, "EMERGENCY: contract is stopped");
        _;
    }

    modifier onlyInEmergency() {
        require(stopped, "Only callable in emergency");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function triggerStop() external onlyAdmin {
        stopped = true;
        pausedAt = block.timestamp;
        emit EmergencyStop(msg.sender, block.timestamp);
    }

    function resume() external onlyAdmin {
        require(
            block.timestamp >= pausedAt + MIN_PAUSE_DURATION,
            "Must wait minimum pause duration"
        );
        stopped = false;
        emit Resumed(msg.sender, block.timestamp);
    }

    // Normal operations are blocked during emergency
    function deposit() external payable stopInEmergency {
        // deposit logic
    }

    // Emergency-only: allow users to retrieve funds
    function emergencyWithdraw() external onlyInEmergency {
        // emergency exit logic
    }
}
```

---

## 🔮 Oracle Pattern (Chainlink Integration)

### Kya Problem Hai?

Smart contracts blockchain ke bahar ka data access nahi kar sakte — koi HTTP requests nahi, koi API calls nahi. Agar tumhe ETH/USD price, sports scores, ya weather data chahiye, toh tumhe ek **oracle** chahiye: ek trusted off-chain service jo real-world data on-chain likh de.

### Chainlink Price Feeds

Chainlink industry standard hai. Price feeds har major chain pe pehle se deployed hain — tumhe bas unse read karna hai.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Chainlink's standard interface for aggregator contracts
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,        // price (scaled by decimals)
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}

contract PriceConsumer {
    AggregatorV3Interface internal priceFeed;

    // ETH/USD feed on Ethereum mainnet: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
    // ETH/USD feed on Sepolia testnet: 0x694AA1769357215DE4FAC081bf1f309aDC325306
    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function getLatestEthPrice() public view returns (int256) {
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        // Staleness check: reject data older than 1 hour
        require(block.timestamp - updatedAt < 3600, "Stale price data");

        // Heartbeat check: ensure we have the latest round
        require(answeredInRound >= roundId, "Stale round");

        return price; // 8 decimals: 300000000000 = $3000.00
    }

    // Convert ETH amount to USD (returns USD with 8 decimal places)
    function ethToUsd(uint256 ethAmount) public view returns (uint256) {
        int256 price = getLatestEthPrice();
        require(price > 0, "Invalid price");

        // ethAmount is in wei (18 decimals), price has 8 decimals
        // Result: (wei * price) / 1e18 = USD with 8 decimals
        return (ethAmount * uint256(price)) / 1e18;
    }
}
```

### Chainlink VRF (Verifiable Random Function)

Randomness ke liye (lotteries, NFT traits), Chainlink VRF use karo — yeh provably fair, manipulation-resistant random numbers deta hai:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

contract Lottery is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface coordinator;
    bytes32 keyHash;
    uint64  subscriptionId;

    address[] public players;
    uint256 public lastRandomResult;
    address public lastWinner;

    mapping(uint256 => bool) public pendingRequests;

    event WinnerPicked(address indexed winner, uint256 randomNumber);

    constructor(
        address vrfCoordinator,
        bytes32 _keyHash,
        uint64  _subscriptionId
    ) VRFConsumerBaseV2(vrfCoordinator) {
        coordinator    = VRFCoordinatorV2Interface(vrfCoordinator);
        keyHash        = _keyHash;
        subscriptionId = _subscriptionId;
    }

    function enter() external payable {
        require(msg.value >= 0.01 ether, "Minimum entry fee");
        players.push(msg.sender);
    }

    function pickWinner() external {
        require(players.length >= 2, "Need at least 2 players");
        // Request randomness from Chainlink — async, callback below
        uint256 requestId = coordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            3,   // confirmations
            100000, // callback gas limit
            1    // number of random words
        );
        pendingRequests[requestId] = true;
    }

    // Chainlink calls this with the random result
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal override
    {
        require(pendingRequests[requestId], "Unknown request");
        delete pendingRequests[requestId];

        uint256 winnerIndex = randomWords[0] % players.length;
        lastWinner = players[winnerIndex];
        lastRandomResult = randomWords[0];

        // Pay the winner
        payable(lastWinner).transfer(address(this).balance);
        delete players;

        emit WinnerPicked(lastWinner, randomWords[0]);
    }
}
```

> **Kabhi bhi `block.timestamp`, `block.difficulty`, ya `blockhash` ko randomness source ke roop mein use mat karo** — miners/validators inhe manipulate kar sakte hain. Kisi bhi value wali cheez ke liye hamesha Chainlink VRF use karo.

---

## ✅ Key Takeaways

| Pattern | Core Idea | Kab Use Karein |
|---|---|---|
| **Ownable** | Single privileged owner | Simple admin controls |
| **AccessControl** | Multiple named roles | Complex permission hierarchies |
| **Pausable** | Emergency stop flag | Koi bhi contract jo funds hold kare |
| **Proxy/Upgradeable** | Logic ko storage se separate karna | Long-lived protocols jinhe iteration chahiye |
| **Factory** | Contract dusre contracts spawn karta hai | Ek hi type ke bahut saare instances banana |
| **Pull Payment** | Users khud withdraw karein, unhe bheja na jaaye | Multiple/unknown parties ko ETH bhejna |
| **Commit-Reveal** | Pehle hash, baad mein reveal | Hidden choices, randomness fairness |
| **Circuit Breaker** | Hard stop with recovery process | High-value production contracts |
| **Oracle** | Off-chain data ko on-chain laana | Prices, randomness, real-world events |

### Golden Rules

1. **Default immutability rakho.** Upgradeability tabhi add karo jab tumhare paas clear governance process ho.
2. **Hamesha Push ke bajaye Pull use karo** jab multiple ya unknown addresses ko ETH bhejna ho.
3. **Randomness ke liye khud ka crypto mat banao** — Chainlink VRF use karo.
4. **Inherit karo, copy mat karo.** OpenZeppelin ke implementations audited aur battle-tested hain.
5. **Har us cheez ke liye events emit karo** jo governance ya security monitoring ke liye important ho sakti hai.

---

## 📝 Quiz

Aage badhne se pehle apni samajh test karo.

**Question 1.**
Tum ek DeFi protocol bana rahe ho jahan ek security team ko exploit ke dauran deposits pause karne hain, lekin sirf ek DAO vote hi fee parameters permanently change kar sakta hai. Kaunsa pattern combination sabse appropriate hai?

- A) Sab kuch ke liye Ownable
- B) AccessControl with a PAUSER_ROLE for the security team and a separate governance role for fee changes
- C) Bina kisi access control ke Pausable
- D) Factory pattern

<details>
<summary>Answer</summary>

**B.** `AccessControl` tumhe fine-grained roles assign karne deta hai. Security team `PAUSER_ROLE` hold karti hai (turant act kar sakti hai), jabki fee changes ek governance role se hote hain jo DAO timelock se juda hota hai. `Ownable` ek hi key ko bohot zyada power de deta; option C mein koi access restriction hi nahi hai.

</details>

---

**Question 2.**
Ek developer ek upgradeable proxy likhta hai jahan proxy contract implementation address storage slot 0 pe store karta hai, aur implementation contract ek `uint256 balance` bhi slot 0 pe store karta hai. Kya hoga?

- A) Proxy dono values ko transparently bina conflict ke manage kar leta hai.
- B) Implementation address aur `balance` ek doosre ko overwrite kar denge, dono corrupt ho jaayenge.
- C) Solidity ise compile time pe detect karke error de deta hai.
- D) Sirf proxy ka slot 0 use hota hai; implementation ka slot 0 ignore ho jaata hai.

<details>
<summary>Answer</summary>

**B.** Yeh ek storage collision hai. Dono variables proxy ke storage mein ek hi physical slot occupy karte hain. `balance` likhne se implementation address corrupt ho jaayega aur vice versa. Isi wajah se EIP-1967 ek pseudo-random slot use karta hai jo collision zone se kaafi door hota hai.

</details>

---

**Question 3.**
Ek auction contract **push payment** pattern use karta hai, jo outbid bidders ko `bid()` ke andar hi turant ETH wapas bhej deta hai. Ek malicious bidder ek aisa contract deploy karta hai jiska `receive()` function hamesha revert karta hai. Iska impact kya hoga?

- A) Malicious bidder apna ETH permanently kho deta hai.
- B) Sirf malicious bidder ka refund fail hota hai; baaki bidders affect nahi hote.
- C) `bid()` ki har agli call revert ho jaati hai, effectively auction sab users ke liye freeze ho jaata hai.
- D) Contract self-destruct ho jaata hai.

<details>
<summary>Answer</summary>

**C.** Jab ek naya valid bid aata hai, contract malicious bidder (jo ab tak `highestBidder` hai) ko refund karne ki koshish karta hai. Refund revert hota hai, jisse poori `bid()` transaction revert ho jaati hai. Koi naya bid accept nahi ho pata — ek classic Denial of Service attack. **Pull Payment** pattern isse solve karta hai kyunki har user ka withdrawal independent hota hai.

</details>

---

*Next Chapter: Security Vulnerabilities and Audit Checklist →*
