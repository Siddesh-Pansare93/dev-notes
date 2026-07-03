# Cache Memory

Socho tu Swiggy pe khana order karta hai. Agar restaurant tere ghar se 15 km door hai, delivery mein 40 minute lagenge. Lekin agar tere building ke bilkul neeche wala tiffin-wala roz wahi 2-3 cheezein banata hai jo tu baar baar order karta hai (dal-chawal, roti-sabzi), aur woh unhe already garam rakhta hai apne counter pe — toh delivery 5 minute mein ho jaati hai.

CPU ke saath bhi exactly yehi problem hai. CPU bahut fast hai, RAM bahut slow hai (relatively), aur beech mein ek "tiffin counter" chahiye jo frequently-used cheezein paas mein rakhe. Us tiffin counter ka naam hai — **Cache Memory**.

Yeh chapter [Memory Hierarchy](../12-memory-hierarchy/README.md) ka direct extension hai — agar wahan pyramid dekha tha, ab hum us pyramid ke sabse critical, sabse zyada engineering-heavy layer ko deep dive karenge.

---

## Kya problem solve kar raha hai cache?

**Kya hota hai?**

Modern CPU ek second mein **billions** of instructions execute kar sakta hai. Ek typical CPU 3-5 GHz pe chalta hai, matlab har second 3-5 billion clock cycles. Ek register access sirf **1 clock cycle** leta hai.

Lekin RAM (Main Memory)? Ek RAM access **~100-300 clock cycles** leta hai.

Socho iska matlab kya hai — agar CPU har baar directly RAM se data mangwaye, toh woh apna 99% time sirf **wait** karte hue bitayega, kaam kuch nahi karega. Yeh gap itna zyada hai ki iska ek naam bhi hai:

> [!info]
> Is gap ko **"Memory Wall"** ya **"Von Neumann Bottleneck"** kehte hain. Pichle 40 saalon mein CPU speed roughly **har 2 saal mein double** hui hai (Moore's Law ka asar), lekin RAM speed sirf **~10% per year** improve hui hai. Matlab yeh gap saal-dar-saal aur bada hota gaya hai.

```
CPU Speed vs RAM Speed — The Growing Gap

Speed
  ^
  |                                              ___/ CPU
  |                                        ___/‾‾
  |                                  ___/‾‾
  |                            ___/‾‾
  |                      ___/‾‾
  |                ___/‾‾
  |          __/‾‾‾              _______________ RAM
  |     __/‾‾            ________________
  |__/‾‾    _____________
  |_______/
  +----------------------------------------------> Time
   1980          2000              2020
```

**Kyun zaruri hai?**

Agar yeh gap fill nahi kiya jaata, toh saara CPU speed improvement bekaar chala jaata — kyunki CPU RAM ka wait karte-karte hi apna time waste kar deta. Cache memory isi gap ko cover karta hai — ek chhota, super-fast storage jo CPU aur RAM ke beech baithta hai, aur frequently/recently used data ko apne paas rakhta hai taaki RAM tak baar-baar jaana hi na pade.

```
   CPU (fastest, sabse mehenga, sabse chhota)
    |
    |  ~1 cycle
    v
  ┌─────────────┐
  │  Registers  │
  └─────────────┘
    |
    |  ~1-4 cycles
    v
  ┌─────────────┐
  │  L1 Cache   │  <-- yeh chapter isi pe focus karega
  └─────────────┘
    |
    |  ~10-20 cycles
    v
  ┌─────────────┐
  │  L2 Cache   │
  └─────────────┘
    |
    |  ~30-70 cycles
    v
  ┌─────────────┐
  │  L3 Cache   │
  └─────────────┘
    |
    |  ~100-300 cycles
    v
  ┌─────────────┐
  │  RAM (Main  │
  │   Memory)   │
  └─────────────┘  (slowest, sabse sasta per-byte, sabse bada)
```

> [!tip]
> Yaad rakhna — jitna **fast** memory, utna woh **mehenga** hota hai (per byte) aur utna hi **chhota** hota hai physically. Yehi wajah hai ki hum ek hi type ki bahut saari fast, bahut badi memory nahi bana sakte — cost aur physics dono allow nahi karte. Isliye layered approach chahiye.

---

## Cache Hit vs Cache Miss

Jab CPU ko koi data chahiye hota hai, sabse pehle woh cache mein check karta hai.

- **Cache Hit** ✅ — Jo data chahiye woh cache mein already maujood hai. CPU turant use utha leta hai. Fast!
- **Cache Miss** ❌ — Data cache mein nahi mila. Ab CPU ko RAM (ya next level cache) tak jaana padega, jo slow hai. Data milne ke baad, usse cache mein bhi copy kar liya jaata hai (kyunki ho sakta hai woh phir se chahiye ho).

**Real-world analogy — Almirah (cupboard):**

Socho tera study table hai (cache) aur ek badi almirah dusre room mein (RAM):
- Agar jo kitaab chahiye woh already table pe padi hai → **Hit**, turant utha lo.
- Agar table pe nahi hai → **Miss**, uthke almirah tak jaana padega, kitaab laani padegi, aur table pe rakh deni padegi (ho sakta hai phir se chahiye).

```
        CPU requests data X
              |
              v
      ┌───────────────┐
      │  Cache mein X  │
      │   hai kya?     │
      └───────┬────────┘
        Yes  /   \  No
            /     \
      ┌────v──┐  ┌─v─────────────────┐
      │  HIT   │  │  MISS               │
      │ turant │  │  RAM se X lao       │
      │ return │  │  cache mein copy    │
      └────────┘  │  karo, phir return  │
                  └─────────────────────┘
```

**Hit Rate aur Miss Rate:**

```
Hit Rate  = (Total Hits) / (Total Memory Accesses) × 100
Miss Rate = 1 - Hit Rate
```

Well-optimized code aur good CPU design ke saath, **L1 cache hit rate typically 90-98%** hota hai. Yeh number chhota lagta hai, lekin real impact bahut bada hai — kyunki miss hone par penalty (RAM tak jaana) hit se **50-100x zyada slow** hai.

**Average Memory Access Time (AMAT)** ka formula:

```
AMAT = Hit Time + (Miss Rate × Miss Penalty)
```

Example: Agar Hit Time = 1 cycle, Miss Rate = 5%, aur Miss Penalty = 200 cycles:

```
AMAT = 1 + (0.05 × 200) = 1 + 10 = 11 cycles
```

Dekha? Sirf 5% misses ne average time ko **11x** bada diya. Isi liye cache design (aur cache-friendly code likhna) itna critical hai.

---

## L1, L2, L3 — Multiple Levels Kyun?

Ek hi cache kaafi nahi hota — isliye modern CPUs mein **multiple levels** hote hain, har level pehle se bada lekin thoda slow.

| Level | Location | Typical Size (per core) | Speed (latency) | Kiske liye |
|---|---|---|---|---|
| **L1** | CPU core ke andar hi | 32-64 KB (split: data + instruction) | ~1-4 cycles (~1 ns) | Sabse zyada frequently used data |
| **L2** | Core ke paas (kabhi shared, kabhi per-core) | 256 KB - 1 MB | ~10-20 cycles (~3-5 ns) | L1 se overflow, thoda bada working set |
| **L3** | Poore CPU chip mein shared (saare cores ke beech) | 8-32 MB+ | ~30-70 cycles (~10-20 ns) | Cores ke beech shared data, bada cache |
| **RAM** | Motherboard pe alag chip | 8-64 GB (typical laptop/desktop) | ~100-300 cycles (~50-100 ns) | Poora program + data |

> [!info]
> **L1 cache** aksar do hisso mein bata hota hai:
> - **L1i (Instruction Cache)** — jo instructions execute honi hain unhe store karta hai
> - **L1d (Data Cache)** — jo actual data (variables) pe kaam ho raha hai unhe store karta hai
>
> Yeh split isliye kiya jaata hai taaki CPU **ek saath** instruction bhi fetch kar sake aur data bhi access kar sake, bina ek dusre ko block kiye (yeh pipelining ke liye bhi zaruri hai — uska detail [Pipelining chapter](../09-pipelining-and-ilp/README.md) mein hai).

**Real numbers example — Intel Core i7 (typical modern desktop CPU):**

```
Per Core:
  L1i: 32 KB
  L1d: 48 KB
  L2:  1.25 MB

Shared across all cores:
  L3:  24-30 MB
```

**Analogy — Kitchen setup:**

- **L1** = Cook ke haath ke paas rakhi cheezein (namak, mirch) — turant available, lekin bahut kam quantity.
- **L2** = Kitchen counter ka drawer — thoda door, thoda zyada cheezein.
- **L3** = Poore restaurant ka common storage room — sab cooks share karte hain, bada hai lekin counter se door.
- **RAM** = Bazaar/mandi — sab kuch milega, lekin jaana padega aur time lagega.

> [!warning]
> **Common Misconception:** Log sochte hain "bada cache hamesha better hota hai." Yeh sach nahi hai! Bada cache dhundhne (search karne) mein bhi thoda zyada time leta hai, aur chip pe zyada space + power consume karta hai. Isi liye engineers L1 ko chhota-fast, aur L3 ko bada-slow rakhte hain — ek balanced trade-off.

---

## Cache Line — Data ek-ek byte nahi, "block" mein aata hai

**Kya hota hai?**

Jab cache miss hota hai aur RAM se data lena padta hai, CPU sirf woh **ek byte/word** nahi leta jo chahiye tha. Woh us byte ke aas-paas ka ek pura **block** leta hai, jise **Cache Line** (ya **Cache Block**) kehte hain.

Typical cache line size = **64 bytes** (kuch systems mein 32 ya 128 bytes bhi hote hain).

**Kyun zaruri hai?**

Yeh **Principle of Locality** pe based hai — ek observation jo almost hamesha true hoti hai:

1. **Spatial Locality** — Agar tumne memory address `X` access kiya, toh chances hain ki tum jald hi `X+1`, `X+2` bhi access karoge (jaise array traversal).
2. **Temporal Locality** — Agar tumne `X` abhi access kiya, toh chances hain tum use **phir se** jald hi access karoge (jaise loop variable).

**Analogy — Sabzi mandi:**

Agar tumhe pyaaz chahiye, dukaandar sirf ek pyaaz nahi deta — pura ek kilo ka bunch deta hai, kyunki usse pata hai tumhe aur bhi lagenge. Isi tarah, CPU ek byte maangta hai, RAM controller pura 64-byte cache line uthata hai, kyunki usse "pata hai" ki aas-paas ka data bhi jald use hoga.

```
Memory (RAM)                          Cache Line fetched (64 bytes)
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ ... │ X  │X+1 │X+2 │X+3 │... │... │ ... │
└────┴────┴────┴────┴────┴────┴────┴────┘
        ^
   CPU ne sirf X maanga tha,
   lekin pura block cache mein aa gaya
```

Isi principle ki wajah se hi **cache-friendly code** likhna itna important ban jaata hai (neeche detail mein dekhenge).

---

## Cache Mapping Techniques — Data cache mein kahan rakhoge?

Yeh sabse important conceptual part hai. Cache RAM se bahut chhota hota hai (KB vs GB), toh jab RAM ka koi block cache mein laana ho, **cache mein kis jagah rakhein** — yeh decide karna padta hai. Iske teen tareeke hain.

### 1. Direct-Mapped Cache

**Kya hota hai?** Har RAM block ke liye **sirf ek fixed jagah** hoti hai cache mein — jaise railway reservation mein ek fixed seat number.

**Formula:** `Cache Line Number = (RAM Block Address) mod (Total Cache Lines)`

**Worked Example:**

Socho cache mein sirf **4 lines** hain (line 0, 1, 2, 3), aur RAM mein 16 blocks hain (block 0 se 15).

```
RAM Block → Cache Line (mod 4)

Block 0  → Line 0
Block 1  → Line 1
Block 2  → Line 2
Block 3  → Line 3
Block 4  → Line 0   (0 mod 4 = 0)
Block 5  → Line 1
Block 8  → Line 0
Block 12 → Line 0
```

**Analogy — Fixed seat allocation:** Railway ke general coach mein tumhara seat number tumhare ticket number ke last digit se decide hota hai. Agar 2 logon ka last digit same hai, dono ka seat clash karega — dusra aayega toh pehle wale ko utharna padega.

Yehi problem yahan bhi hai: Block 0, 4, 8, 12 — sab Line 0 mein hi jaayenge. Agar program baar-baar Block 0 aur Block 4 dono access kare, har baar **eviction** (purana data hata ke naya rakhna) hoga, chahe cache ke baaki lines khaali hi kyun na hon! Ise **Conflict Miss** kehte hain.

**Pros:** Simple, fast to check (ek hi jagah dekhni hai — hardware sasta).
**Cons:** Conflict misses zyada ho sakte hain, chahe cache underutilized ho.

### 2. Fully Associative Cache

**Kya hota hai?** RAM ka koi bhi block, cache ki **kisi bhi line** mein ja sakta hai. Koi fixed rule nahi.

**Analogy — Cinema hall with open seating:** Jaise kisi general-seating cinema show mein tum jahan chaho wahan baith sakte ho — koi fixed seat number nahi.

**Pros:** Maximum flexibility — conflict misses almost nahi hote, jab tak cache full na ho jaaye.
**Cons:** Data dhundhne ke liye **puri cache** search karni padti hai (parallel hardware comparators chahiye har line ke liye) — yeh mehenga aur power-hungry hai. Isliye sirf bahut chhoti caches (jaise TLB) mein practical hai.

### 3. Set-Associative Cache (Most Common — Real World Choice)

**Kya hota hai?** Yeh dono ka **best-of-both** hai. Cache ko **"sets"** mein baanta jaata hai, aur har set mein multiple lines ("ways") hote hain. Ek RAM block ek **fixed set** mein jaayega (direct-mapped jaisa), lekin us set ke andar **kisi bhi line** mein ja sakta hai (fully-associative jaisa).

Isse **N-way Set Associative** kehte hain (jaise 2-way, 4-way, 8-way).

**Worked Example — 2-way Set Associative:**

Socho cache mein 4 lines hain, lekin ab unhe **2 sets** mein group kiya, har set mein **2 ways**:

```
Set 0: [Way A] [Way B]
Set 1: [Way A] [Way B]

Set Number = (RAM Block Address) mod (Total Sets) = mod 2
```

```
Block 0  → Set 0 (0 mod 2)  → can go in Way A or Way B of Set 0
Block 1  → Set 1 (1 mod 2)  → can go in Way A or Way B of Set 1
Block 2  → Set 0            → can go in Way A or Way B of Set 0
Block 4  → Set 0            → can go in Way A or Way B of Set 0
```

Ab Block 0, 2, 4 — teeno Set 0 mein jaate hain, lekin Set 0 ke andar 2 jagah hain, toh kam-se-kam 2 blocks bina conflict ke saath reh sakte hain.

**Analogy — Railway coach with shared berths:** Tumhara coach (set) fixed hai ticket ke hisaab se, lekin coach ke andar tum apni berth khud choose kar sakte ho (jo bhi khaali ho) — dono duniya ka fayda.

```
                DIRECT-MAPPED          FULLY ASSOCIATIVE       SET-ASSOCIATIVE (2-way)
                (1 way)                (all ways = all lines)  (fixed set, choice within)

Block ---->  [Fixed Line]          [Line 0][Line 1]...[Line N]   [Set: Way A / Way B]
             No choice              Any line, full search        Fixed set, 2 choices

Conflict Misses:  High                Very Low                    Moderate/Low
Hardware Cost:    Cheap                Expensive                  Balanced
Search Speed:     Fastest              Slowest                    Fast
```

> [!tip]
> Real CPUs mostly **set-associative** use karte hain. Jaise Intel/AMD ke L1 cache typically **8-way set-associative** hote hain, L2 **4 se 16-way**, aur L3 **12-20 way** tak. Yeh sweet spot hai — na zyada conflict miss, na zyada hardware cost.

### Jab set/line full ho jaaye — Replacement Policy

Jab naya block cache mein laana ho lekin set/line already full ho, kise **evict** (nikaal) karein? Iske liye common policies:

- **LRU (Least Recently Used)** — jo sabse lambe time se use nahi hua, use nikaal do. Most common.
- **FIFO (First In First Out)** — jo sabse pehle aaya tha, use nikaal do.
- **Random** — random line choose karke nikaal do (simple hardware, surprisingly effective).

---

## Write Policies — Jab CPU data ko modify kare, toh kya ho?

Ab tak humne sirf **read** ki baat ki. Par jab CPU koi value **cache mein change** karta hai, toh yeh change **RAM tak kab pahunche** — iske liye do main policies hain.

### Write-Through

**Kya hota hai?** Jab bhi cache mein koi data write hota hai, **turant** RAM mein bhi wahi update kar diya jaata hai — dono hamesha sync mein rehte hain.

**Analogy:** Jaise tum apni diary mein kuch likhte ho aur turant uski photo khींchke Google Drive pe upload kar dete ho — dono jagah hamesha same rehta hai.

- ✅ Pros: Simple, data loss ka risk nahi (RAM hamesha up-to-date), consistency easy.
- ❌ Cons: Har write ke saath RAM tak jaana padta hai — slow, kyunki RAM access mehenga hai.

### Write-Back

**Kya hota hai?** Jab cache mein data write hota hai, RAM ko **turant update nahi kiya jaata**. Sirf cache line ko ek **"dirty bit"** se mark kar diya jaata hai (matlab "yeh data RAM se alag hai"). RAM ko tab update kiya jaata hai jab woh cache line **evict** honi ho (kisi naye block ke liye jagah banani ho).

**Analogy:** Jaise tum apni diary mein likhte rehte ho, aur sirf tab Google Drive pe upload karte ho jab diary ka page full ho jaaye aur naya page chahiye ho.

- ✅ Pros: Bahut fast — repeated writes RAM tak baar-baar nahi jaate.
- ❌ Cons: Complex (dirty bit tracking chahiye), agar power achanak chali jaaye toh un-saved changes (jo sirf cache mein the) **lost** ho sakte hain.

| | Write-Through | Write-Back |
|---|---|---|
| RAM update kab? | Har write pe turant | Sirf eviction ke time |
| Speed | Slower | Faster |
| Data safety | Zyada safe | Risk hai agar crash ho jaaye |
| Complexity | Simple | Zyada complex (dirty bit chahiye) |
| Real world use | Kam common (simple systems) | Modern CPUs mostly yeh use karte hain |

> [!info]
> Modern CPUs (Intel, AMD, ARM) **write-back** hi use karte hain kyunki performance critical hai. Isi wajah se sudden power loss ya crash ke baad kabhi-kabhi "data corruption" ho sakta hai agar OS ne properly flush/sync nahi kiya — [Operating Systems notes](../../operating_systems/README.md) mein file-system level pe iska aur detail milega (jaise `fsync()` calls kyun zaruri hote hain).

---

## Cache-Friendly Code — Row-Major Traversal Fast Kyun Hai?

Ab jo tumne seekha hai (cache lines + spatial locality) use ek real coding scenario mein apply karte hain — kuch jo tum khud apne Node.js/TS code mein experience kar sakte ho jab tum multi-dimensional arrays (ya matrices) pe kaam karte ho.

**Setup:** Ek 2D array socho — memory mein yeh actually ek **linear (1D) sequence** ki tarah store hota hai (Row-Major Order — C, JS, Python sab isi order mein store karte hain):

```
2D Array (logical view):        Actual memory layout (Row-Major):
┌───┬───┬───┐                   
│ A │ B │ C │  Row 0             ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
├───┼───┼───┤                    │ A │ B │ C │ D │ E │ F │ G │ H │ I │
│ D │ E │ F │  Row 1             └───┴───┴───┴───┴───┴───┴───┴───┴───┘
├───┼───┼───┤                     <-- Row 0 --> <-- Row 1 --> <-- Row 2 -->
│ G │ H │ I │  Row 2
└───┴───┴───┘
```

**Row-Major Traversal (row by row — CACHE FRIENDLY):**

```js
for (let i = 0; i < rows; i++) {
  for (let j = 0; j < cols; j++) {
    sum += matrix[i][j];   // A, B, C, D, E, F, G, H, I — sequential memory access
  }
}
```

Jab `matrix[0][0]` (A) access hota hai, CPU pura **cache line** (jisme A, B, C, D... bhi included hain, kyunki woh memory mein A ke bilkul paas hain) fetch kar leta hai. Ab jab loop `matrix[0][1]` (B) maangta hai, woh **already cache mein hai** — Cache Hit! Isi tarah C, D bhi already cache mein aa chuke honge.

**Column-Major Traversal (column by column — CACHE UNFRIENDLY):**

```js
for (let j = 0; j < cols; j++) {
  for (let i = 0; i < rows; i++) {
    sum += matrix[i][j];   // A, D, G, B, E, H, C, F, I — jumping around memory!
  }
}
```

Yahan pehle A access hota hai (cache line mein A,B,C aa jaate hain), lekin agla access **D** hai — jo memory mein bahut door hai (agli row mein). Yeh **naya cache miss** hai! Phir G, phir wapas B — har access ek naya cache miss trigger kar sakta hai bade arrays ke liye.

```
Row-Major access pattern:      Column-Major access pattern:
A -> B -> C -> D -> E -> F     A -> D -> G -> B -> E -> H -> C -> F -> I
(sequential, cache-friendly)   (jumping, cache-UNfriendly)

Memory:  [A][B][C][D][E][F][G][H][I]
Row:      1  2  3  4  5  6  7  8  9   (order of access — smooth left-to-right)
Column:   1  4  7  2  5  8  3  6  9   (order of access — zig-zag jumps)
```

> [!warning]
> Real benchmarks mein, bade matrices (jaise 1000x1000 ya bade) ke liye, row-major vs column-major traversal mein **5-10x ya usse zyada** ka speed difference dekha ja sakta hai — sirf memory access pattern badalne se, bina algorithm change kiye! Yeh interview mein bhi common question hai: "Why is this loop faster than that one, even though both do the same work?"

**Practical takeaway apne Node.js/TS code ke liye:**
- Jab large arrays/matrices process karo, andar wale loop mein **innermost dimension ko sequentially** access karo.
- Object-of-arrays vs array-of-objects jaisi choices bhi memory layout affect karti hain — cache locality ka impact JS engines (V8) mein bhi real hai, especially jab tum typed arrays (`Float64Array`, `Int32Array`) use karte ho jo memory mein contiguous hote hain (regular JS objects/arrays ke comparison mein).

---

## Sab kuch ek jagah — Full Picture

```
                         CPU Core
                            |
                 ┌──────────────────────┐
                 │   Registers (fastest) │
                 └──────────┬───────────┘
                            |
                 ┌──────────────────────┐
                 │  L1 Cache (32-64 KB)  │  <-- split: L1i + L1d
                 │  ~1-4 cycles          │      8-way set-associative (typical)
                 └──────────┬───────────┘
                            |  MISS
                 ┌──────────────────────┐
                 │  L2 Cache (256KB-1MB) │
                 │  ~10-20 cycles        │
                 └──────────┬───────────┘
                            |  MISS
                 ┌──────────────────────┐
                 │  L3 Cache (8-32 MB)   │  <-- shared across cores
                 │  ~30-70 cycles        │
                 └──────────┬───────────┘
                            |  MISS
                 ┌──────────────────────┐
                 │   RAM (8-64 GB)       │
                 │  ~100-300 cycles      │
                 └──────────────────────┘
```

---

## Key Takeaways

- **Cache memory** ek chhoti, super-fast memory hai CPU aur RAM ke beech, jo frequently/recently used data store karke "Memory Wall" (CPU vs RAM speed gap) ko cover karti hai.
- **Cache Hit** = data cache mein mil gaya (fast); **Cache Miss** = RAM tak jaana pada (slow). Miss penalty hit se 50-100x zyada slow ho sakti hai — isliye 90%+ hit rate bhi bahut fark daalta hai (AMAT formula).
- Modern CPUs mein **L1 (32-64 KB, ~1-4 cycles)**, **L2 (256KB-1MB, ~10-20 cycles)**, aur **L3 (8-32MB shared, ~30-70 cycles)** — teen levels hote hain, chhote-fast se bade-slow tak.
- Data hamesha **cache line** (typically 64 bytes) ke blocks mein aata hai, na ki single byte mein — yeh **spatial + temporal locality** ka fayda uthane ke liye hai.
- **Direct-Mapped** (fixed jagah, simple lekin conflict-prone), **Fully Associative** (kahin bhi, flexible lekin mehenga), aur **Set-Associative** (fixed set + choice within, real-world default) — teen mapping techniques hain.
- **Write-Through** (turant RAM update, safe but slow) vs **Write-Back** (sirf eviction pe RAM update, fast but crash-risk) — dono write policies ka trade-off consistency vs speed hai. Modern CPUs write-back use karte hain.
- **Cache-friendly code** (jaise row-major array traversal) sequential memory access karta hai jo cache lines ka pura fayda uthata hai — same algorithm, sirf access pattern change karne se 5-10x speedup mil sakta hai.
- Deeper OS-level detail (jaise page cache, `fsync`, virtual memory ka RAM/disk ke saath interaction) [operating_systems](../../operating_systems/README.md) notes mein cover hoga — yeh chapter sirf hardware-level cache pe focused hai.
