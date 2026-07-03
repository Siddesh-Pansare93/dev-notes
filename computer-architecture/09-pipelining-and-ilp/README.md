# Pipelining & Instruction-Level Parallelism

Socho tum Swiggy delivery ka order manage kar rahe ho ek chhoti si cloud kitchen mein. Order aata hai, phir cooking hoti hai, phir packing hoti hai, phir delivery boy ko handover hota hai. Agar tumhare paas sirf **ek** banda hai jo cooking bhi karta hai, packing bhi karta hai, aur handover bhi khud jaake karta hai — to har order poora "end-to-end" complete hone ke baad hi agla order start hoga. Slow, right?

Ab socho tumne kaam **specialize** kar diya: ek banda sirf cooking karta hai, doosra sirf packing, teesra sirf handover. Jaise hi cook ne order #1 ka khana bana ke aage bheja, wo turant order #2 pakana shuru kar sakta hai — while packer order #1 pack kar raha hai. Teeno log **parallel** mein kaam kar rahe hain, alag-alag orders pe, alag-alag stage mein.

Yehi **pipelining** hai — aur CPU bilkul isi tarah instructions process karta hai. Is chapter mein hum dekhenge ki modern processors kaise ek time mein "ek instruction" ke bajaye, ek saath **multiple instructions ko alag-alag stages mein overlap** karke chalate hain — aur is overlap mein kya-kya panga (hazards) ho sakta hai, aur CPU designers ne unko kaise solve kiya.

> [!info]
> Pichle chapter (`07-instruction-cycle`) mein humne dekha tha ki ek single instruction Fetch → Decode → Execute → Memory → Writeback cycle se guzarta hai. Ye chapter usi cycle ko **pipeline** banane ke baare mein hai — matlab multiple instructions ko simultaneously alag stages mein daudana.

---

## Kya hota hai Pipelining? (Dabbawala Analogy)

Mumbai ke dabbawalas ka system duniya bhar mein famous hai apni efficiency ke liye. Ek dabba (tiffin) ghar se office tak pahunchane mein kai stages hoti hain:

1. Ghar se dabba collect karna
2. Local train station tak le jaana
3. Train mein sahi bogie mein rakhna
4. Destination station pe utaarna
5. Office tak final delivery

Agar **ek hi dabbawala** pura process akela karta — ek dabba ghar se utha ke seedha office tak khud pahunchata, phir wapas agla dabba uthane jaata — to Mumbai ke lakhon dabbe kabhi time pe nahi pahunchte.

Real system mein **alag-alag dabbawale alag-alag stage handle karte hain**. Jab dabba #1 train mein hota hai, dabbawala #1 already dabba #2 collect kar raha hota hai ghar se. Sab log **hamesha busy** rehte hain, apne-apne stage mein, different dabbo par kaam karte hue.

CPU pipelining bilkul yehi karta hai — instructions "dabbe" hain, aur CPU ke andar ke stages (Fetch, Decode, Execute, Memory, Writeback) "dabbawale" hain.

### Non-pipelined vs Pipelined — Zomato Kitchen se samjho

Socho ek order banane ke 5 steps hain, har step 1 minute leta hai:

```
Order banane ke steps:
  [Take Order] -> [Chop/Prep] -> [Cook] -> [Plate] -> [Pack for delivery]
```

**Non-pipelined (sequential) approach** — agla order tabhi start hoga jab pichla poora khatam ho jaaye:

```
Time (minutes) ->   1    2    3    4    5    6    7    8    9   10
Order 1:          [TO] [CH] [CK] [PL] [PK]
Order 2:                                  [TO] [CH] [CK] [PL] [PK]
```

3 orders complete karne mein lagenge = 3 × 5 = **15 minutes**.

**Pipelined approach** — jaise hi step-1 wala banda order 1 se free hota hai, wo order 2 pe lag jaata hai:

```
Time (minutes) ->    1    2    3    4    5    6    7
Order 1:           [TO] [CH] [CK] [PL] [PK]
Order 2:                [TO] [CH] [CK] [PL] [PK]
Order 3:                     [TO] [CH] [CK] [PL] [PK]
```

3 orders complete = sirf **7 minutes** mein! Pehla order to abhi bhi 5 minute mein banega (latency same hai), lekin **throughput** (kitne orders per minute ban rahe hain) bahut badh gaya.

> [!tip]
> **Latency** = ek single order/instruction poora hone mein kitna time lagta hai (ye pipelining se kam nahi hota, thoda badh bhi sakta hai overhead ki wajah se).
> **Throughput** = per unit time kitne orders/instructions complete ho rahe hain (ye pipelining se dramatically badhta hai).

### Kyun zaruri hai pipelining CPU ke liye?

CPU ek second mein billions instructions execute karta hai. Agar har instruction apna poora 5-stage cycle sequentially complete kare tabhi agla start ho, to CPU ki effective speed bahut kam ho jaayegi — jaise wo ek time pe sirf ek hi cheez kar sakta hai, baaki sab units khali baithi hain.

Pipelining ka fayda: CPU ke andar jo alag-alag hardware units hain (fetch unit, decode unit, ALU, memory unit, register-write unit), wo sab **hamesha kaam mein lagi rehti hain**, alag-alag instructions par. Isse **instruction throughput** (instructions per second/cycle) bahut improve hota hai bina clock speed badhaye.

---

## Classic 5-Stage Pipeline (RISC style — jaise MIPS)

Zyadatar textbook pipelines is classic 5-stage model pe based hote hain:

| Stage | Naam | Kya hota hai |
|-------|------|--------------|
| **IF** | Instruction Fetch | Memory se instruction fetch hota hai (jahan PC point kar raha hai) |
| **ID** | Instruction Decode | Instruction ko decode karke samjha jaata hai — konsa opcode hai, konse registers chahiye. Register file se operands bhi read hote hain |
| **EX** | Execute | ALU yahan actual computation karta hai (add, subtract, compare, address calculate) |
| **MEM** | Memory Access | Agar load/store instruction hai to memory access yahan hota hai |
| **WB** | Writeback | Result wapas register file mein likha jaata hai |

```
   ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
   │   IF   │ --> │   ID   │ --> │   EX   │ --> │  MEM   │ --> │   WB   │
   │ Fetch  │     │ Decode │     │Execute │     │ Memory │     │ Write  │
   └────────┘     └────────┘     └────────┘     └────────┘     └────────┘
```

Ye Node.js developer ke liye ek middleware chain jaisa hai — ek `req` object 5 middlewares se guzarta hai (`fetch -> decode -> execute -> memory -> writeback`), aur agli request already pehle middleware mein enter kar chuki hoti hai jab pehli request doosre middleware mein pahunchti hai.

### Overlapping Instructions — Pipeline Diagram

Yahan asli maza hai. Neeche 4 instructions (I1, I2, I3, I4) dekho — har row ek instruction hai, har column ek clock cycle hai:

```
Clock Cycle ->     1     2     3     4     5     6     7     8
I1 (add)         [IF] [ID] [EX] [MEM] [WB]
I2 (sub)               [IF] [ID] [EX] [MEM] [WB]
I3 (load)                   [IF] [ID] [EX] [MEM] [WB]
I4 (store)                        [IF] [ID] [EX] [MEM] [WB]
```

Dekho — **cycle 4 mein** ek saath 4 alag kaam ho rahe hain:
- I1 memory access kar raha hai (MEM)
- I2 execute ho raha hai (EX)
- I3 decode ho raha hai (ID)
- I4 fetch ho raha hai (IF)

Ye hai instruction-level parallelism ka sabse basic form — **ek hi cycle mein 4 alag instructions ke 4 alag parts CPU ke alag hardware units mein chal rahe hain**.

> [!tip]
> Agar pipeline na hota, to 4 instructions complete hone mein 4 × 5 = 20 cycles lagte. Pipeline ke saath sirf 8 cycles lagte hain. General formula: `N instructions, K stages` ko pipeline mein complete karne ke liye lagte hain **`K + (N - 1)`** cycles (perfect/ideal case mein, koi hazard na ho to).

### Ideal Speedup

Ideal case mein (no hazards), pipelining ka speedup roughly pipeline stages ki sankhya ke barabar hota hai. 5-stage pipeline → theoretically ~5x speedup throughput mein, lekin practically hazards ki wajah se ye kam hota hai (aage dekhenge).

---

## Pipeline Hazards — Jab Assembly Line Mein Panga Ho Jaaye

Real dabbawala system mein bhi kabhi-kabhi dikkat aati hai — train late ho jaaye, do dabbe same slot mein fit karne ho, ya agla dabba abhi tak collect hi nahi hua. Pipeline mein bhi aise hi 3 tarah ke **hazards** (rukawatein) hoti hain jo pipeline ko "stall" (ruk jaana) karwa deti hain.

```
┌─────────────────────────────────────────────────────────────┐
│                    PIPELINE HAZARDS                          │
├─────────────────────┬───────────────────┬───────────────────┤
│  Structural Hazard   │   Data Hazard     │  Control Hazard   │
│  (resource clash)    │ (value dependency)│ (branch/jump)     │
└─────────────────────┴───────────────────┴───────────────────┘
```

### 1. Structural Hazard — "Ek hi kadhai, do cook"

**Kya hai:** Jab do instructions ko **same hardware resource** ek hi time pe chahiye ho, lekin resource sirf ek hi hai.

**Analogy:** Zomato cloud kitchen mein sirf ek tandoor hai. Agar order #1 aur order #3 dono ko ek hi cycle mein tandoor chahiye, to ek ko wait karna padega — chahe dono cook ready ho kaam karne ke liye.

**Classic example:** Purane designs mein agar instruction memory aur data memory **same memory unit** share karte the (unified memory), to jab I1 "MEM" stage mein data fetch kar raha ho, us exact cycle mein I4 ka "IF" (jo bhi instruction memory se hi aata hai) same memory port maangega. Dono ek saath nahi ho sakte agar sirf ek memory port hai.

```
Clock Cycle ->     1     2     3     4     5
I1 (load)        [IF] [ID] [EX] [MEM] [WB]
I4 (any)                     [IF] <-- yahan clash! same memory unit chahiye
```

**Solution:** Modern CPUs mein **separate instruction cache aur data cache** hoti hai (Harvard-style memory access despite Von Neumann architecture overall) — isse ye specific clash avoid ho jaata hai. Baaki resource conflicts ke liye extra hardware units duplicate kiye jaate hain (jaise multiple ALUs).

### 2. Data Hazard — "Ye ingredient abhi ready hi nahi hua"

**Kya hai:** Jab ek instruction ko us result ki zaroorat ho jo pichhli instruction **abhi tak compute hi nahi kar payi**.

**Analogy:** Order mein "paneer tikka pizza" banana hai. Pehle paneer tikka cook karna hai (step A), phir usko pizza pe daalke bake karna hai (step B). Agar step B waala banda paneer uthane jaaye tab tak jab paneer abhi kadhai mein hi pak raha hai — to usse "kaccha paneer" mil jaayega. Wait karna padega.

**Example code:**
```assembly
ADD  R1, R2, R3      ; R1 = R2 + R3
SUB  R4, R1, R5       ; R4 = R1 - R5   <-- R1 chahiye, jo abhi ready nahi!
```

Pipeline mein:
```
Clock Cycle ->        1     2     3     4     5     6
ADD R1,R2,R3        [IF] [ID] [EX] [MEM] [WB]
SUB R4,R1,R5               [IF] [ID] [EX] [MEM] [WB]
                                   ^
                                   SUB ko R1 chahiye ID stage mein (cycle 3),
                                   lekin ADD ka result WB mein cycle 5 tak
                                   register file mein likha hi nahi jaata!
```

SUB cycle 3 mein register file se R1 padhna chahta hai, lekin ADD ka result tab tak register file mein save hi nahi hua (wo cycle 5 mein hoga). Ye ek **Read-After-Write (RAW)** hazard hai — sabse common data hazard.

**Solutions:**

- **Forwarding / Bypassing** (sabse common fix): ALU ka result seedha **agli instruction ke ALU input tak "forward"** kar diya jaata hai, register file se hokar wait kiye bina. Jaise ADD ka EX stage output turant SUB ke EX stage input mein bhej diya jaata hai — ek internal shortcut wire se.

```
ADD R1,R2,R3   [IF][ID][EX]--------> (result forward hota hai)
                                  \
SUB R4,R1,R5       [IF][ID][EX]  <-- yahan seedha use ho jaata hai
```

- **Stalling / Bubble insert karna**: Agar forwarding possible na ho (jaise load instruction ka result, jo MEM stage ke baad hi milta hai), to pipeline mein ek "bubble" (khaali no-op cycle) insert karke wait karwaya jaata hai jab tak value ready na ho.

- **Compiler/Instruction Reordering**: Compiler smartly instructions ko reorder kar sakta hai taaki dependent instructions ke beech gap ho.

> [!warning]
> **Load-use hazard** ek special tricky case hai — jab ek load instruction ke turant baad wahi register use ho:
> ```assembly
> LOAD R1, 0(R2)     ; R1 memory se load ho raha hai
> ADD  R3, R1, R4    ; turant R1 use kar rahe hain
> ```
> Yahan forwarding se bhi kaam nahi chalta kyunki data MEM stage ke end tak available hi nahi hota. Ek stall cycle (bubble) daalna hi padta hai — isse "load delay slot" bhi kehte hain.

### 3. Control Hazard — "Pata hi nahi agla order kaunsa hai"

**Kya hai:** Jab CPU ko pata nahi hota ki **agla instruction fetch kahan se karna hai** — kyunki current instruction ek **branch/jump/if-condition** hai, aur uska result (true/false) abhi decide nahi hua.

**Analogy:** Socho Zomato ka delivery boy ek chowk pe pahuncha jahan use decide karna hai left jaana hai ya right — depend karta hai app ka GPS kya bolta hai. Lekin GPS signal thoda late aata hai. Ab bina result ke wo kya kare? Agar galat direction mein chal pada aur baad mein pata chala galat tha, to wapas aake sahi route lena padega — time waste!

**Example:**
```assembly
CMP  R1, R2          ; compare R1 aur R2
BEQ  LABEL           ; agar equal hai to LABEL pe jump karo
ADD  R3, R4, R5      ; ye tabhi chalna chahiye agar branch NAHI liya gaya
...
LABEL:
SUB  R6, R7, R8      ; ye tabhi chalna chahiye agar branch LIYA gaya
```

Jab tak `BEQ` ka result (branch liya ya nahi) EX stage mein pata na chale, CPU ko nahi pata **agla instruction fetch kahan se kare** — `ADD` wala (sequential next) ya `SUB` wala (jump target)?

```
Clock Cycle ->     1     2     3     4     5
BEQ LABEL        [IF] [ID] [EX] [MEM] [WB]
    ???                [IF?] <-- kaunsa instruction fetch karein?? pata nahi!
```

**Solutions:**

1. **Stall karo** (pipeline ko freeze kar do jab tak branch resolve na ho) — simplest but slowest approach, bahut cycles waste hote hain.
2. **Branch Prediction** — CPU **guess** karta hai ki branch liya jaayega ya nahi, aur us guess ke basis pe aage se instructions speculatively fetch karta rehta hai.
3. **Delayed Branching** (purane RISC designs mein) — compiler ek "harmless" instruction branch ke turant baad rakh deta tha jo hamesha execute hoti, chahe branch liya jaaye ya na jaaye.

---

## Branch Prediction — CPU Ka "Andaza Lagane Ka Hunar"

Modern CPUs control hazards ko handle karne ke liye branch prediction ka use karte hain — matlab CPU **pehle se guess kar leta hai** ki if-condition ka result kya hoga, aur us guess ke basis pe aage ke instructions ka fetch/execute speculatively start kar deta hai.

### Simple analogy

Socho tumhara ek regular Swiggy customer hai jo roz raat 9 baje order karta hai — 90% din biryani order karta hai, 10% din kuch aur. Ek smart delivery partner already andaza laga leta hai "aaj bhi biryani hi hoga" aur pehle se apne aap ko us restaurant ke paas position kar leta hai. Agar guess sahi nikla — time bacha. Agar galat nikla, to thoda extra chakkar lagana padega, lekin overall average mein fayda hi hota hai.

### Types of Branch Prediction

1. **Static Prediction**: Simple rules jaise "hamesha assume karo branch NAHI liya jaayega" ya "backward branches (loops) usually liye jaate hain, forward branches nahi". Compile-time pe decide hota hai, kabhi nahi badalta.

2. **Dynamic Prediction**: CPU runtime mein har branch ka **history track** karta hai (ek "Branch History Table" / "Branch Prediction Buffer" mein) aur past behavior dekh kar predict karta hai. Jaise agar ek loop ka branch pichli 100 baar "liya gaya" tha, to agli baar bhi "liya jaayega" predict karega.

3. **Misprediction Penalty**: Agar guess galat nikla, to jo speculative instructions pipeline mein fetch/decode ho chuke the, unko **flush** (cancel) karna padta hai, aur sahi jagah se fresh fetch karna padta hai. Ye ek costly operation hai — deep pipelines (jaise Intel ke 14-20 stage pipelines) mein misprediction penalty 15-20 cycles tak ho sakti hai!

```
Correct prediction:          Misprediction:
IF ID EX MEM WB               IF ID EX MEM WB
   IF ID EX MEM WB               IF ID EX  X  (flush! galat path tha)
      IF ID EX MEM WB                        IF ID EX MEM WB (fresh restart)
      (koi bubble nahi,             (kai cycles waste ho gaye)
       smooth chalta raha)
```

> [!tip]
> Modern branch predictors 95%+ accuracy achieve karte hain real-world code par — bahut sophisticated algorithms use hote hain (two-level predictors, neural branch predictors in high-end CPUs). Ye ek poora research field hai apne aap mein!

---

## Superscalar Execution — "Ek Se Bhale Do"

Ab tak humne dekha ki ek pipeline ek time pe **ek instruction ko har stage mein** le jaata hai (bas alag-alag instructions alag stages mein overlap hoti hain). Lekin agar CPU ke paas **do ALUs**, do decoders, ya multiple execution units hon, to CPU **ek hi clock cycle mein 2 ya usse zyada instructions fetch/decode/execute** kar sakta hai — parallel mein, na ki sirf overlap karke.

Isse **superscalar architecture** kehte hain.

**Analogy:** Pehle humare paas ek hi tandoor tha (single pipeline). Ab socho cloud kitchen ne **do tandoor** laga diye, aur do independent cooking stations bana diye. Ab ek saath 2 orders completely parallel cook ho sakte hain — bas cook, packer sab duplicate karne padenge.

```
Superscalar (2-way) — ek cycle mein 2 instructions fetch/decode/execute:

Clock Cycle ->      1        2        3        4        5
Pipeline A:        [IF]    [ID]    [EX]    [MEM]    [WB]     <- I1
Pipeline B:        [IF]    [ID]    [EX]    [MEM]    [WB]     <- I2
Pipeline A:                [IF]    [ID]    [EX]    [MEM]     <- I3
Pipeline B:                [IF]    [ID]    [EX]    [MEM]     <- I4
```

Yani ek cycle mein 2 instructions ka fetch, 2 ka decode, 2 ka execute — sab simultaneously. Modern CPUs (Intel Core, Apple M-series, AMD Ryzen) typically **4 to 8-way superscalar** hote hain — matlab ek cycle mein 4-8 instructions tak issue kar sakte hain (agar dependencies allow karein).

> [!info]
> Superscalar hardware complexity kaafi badha deta hai — CPU ko dynamically decide karna padta hai ki kaunse instructions parallel chal sakte hain (dependencies check karke), aur multiple execution units (ALU, FPU, load/store units) hardware mein duplicate karne padte hain.

---

## Out-of-Order Execution — "Jo Ready Hai Pehle Wahi Chalao"

Programs mein instructions ek particular (program) order mein likhe jaate hain, lekin zaroori nahi ki wo exact order mein hi execute ho. Agar instruction #2 kisi cheez (jaise memory se data) ka wait kar raha hai, aur instruction #3 independent hai aur ready hai, to CPU **instruction #3 ko pehle execute** kar sakta hai, phir baad mein #2 ko — jaise hi uska data ready ho.

**Analogy — Railway reservation counter:** Socho ek counter pe log queue mein khade hain. Person A ka form incomplete hai (usse extra document laane bola gaya, wo wait kar raha hai). Agar counter clerk sirf strict order follow kare, to sab log peeche wait karte rahenge jab tak A ka form complete na ho. Lekin ek smart clerk kehta hai — "A, tum side mein wait karo, B tumhara kaam pehle kar deta hoon" — aur B, C, D ka kaam nipta deta hai jab tak A ready nahi hota. Jaise hi A ready hota hai, uska kaam bhi ho jaata hai. Result: **sabka overall kaam jaldi khatam**, lekin final "output" (jaise token number allotment) sahi order mein hi diya jaata hai taaki koi confusion na ho.

CPU mein isko implement karne ke liye:
- **Reservation Stations**: Instructions yahan "park" hote hain jab tak unke operands ready nahi ho jaate.
- **Reorder Buffer (ROB)**: Instructions chahe kisi bhi order mein execute hui hon, unka **final result commit (writeback)** hamesha original program order mein hi hota hai — taaki program ka logical behavior sahi rahe.

```
Program order:        I1 (slow, memory wait)  I2 (fast, independent)  I3 (fast, independent)

Out-of-order execute: I2 executes first --> I3 executes next --> I1 executes jab data ready ho

Commit (writeback):   I1 --> I2 --> I3   (hamesha original order maintain, taaki correctness bani rahe)
```

Ye bahut complex hardware hai lekin isse CPU "stalls" ka bahut better use kar paata hai — jo bhi kaam ready hai wo turant kiya jaata hai, CPU idle nahi baithta.

> [!warning]
> Common misconception: "Out-of-order execution ka matlab hai program ka result bhi kabhi bhi order mein aa sakta hai." **Galat!** Final results/side-effects hamesha program order mein hi commit hote hain (Reorder Buffer isi ko ensure karta hai) — sirf internal execution order badalta hai, taaki programmer ko koi farak na pade aur program deterministically sahi chale.

---

## In-Order vs Out-of-Order — Quick Comparison

| Feature | In-Order Pipeline | Out-of-Order Pipeline |
|---|---|---|
| Instruction execution order | Strict program order | Jo ready ho pehle wahi |
| Hardware complexity | Simple | Bahut complex (ROB, reservation stations) |
| Stalls ka effect | Pura pipeline stall ho sakta hai | Baaki independent instructions chalte rehte hain |
| Power consumption | Kam | Zyada (extra logic ki wajah se) |
| Examples | ARM Cortex-A53, in-order simple cores | Intel Core i-series, AMD Ryzen, Apple M-series |

---

## Sab Concepts Ek Saath — Complete Picture

```
                         MODERN CPU EXECUTION PIPELINE
   ┌───────────────────────────────────────────────────────────────┐
   │  Branch Predictor  -->  decides next fetch address speculatively │
   └───────────────────────────────────────────────────────────────┘
                              |
                              v
   ┌────────┐  ┌────────┐  ┌───────────────┐  ┌────────┐  ┌────────┐
   │   IF    │->│   ID   │->│  Issue/Rename │->│   EX   │->│   WB   │
   │ (multi) │  │ (multi)│  │ (out-of-order)│  │(multi) │  │(commit)│
   └────────┘  └────────┘  └───────────────┘  └────────┘  └────────┘
       ^                                                        |
       |________________ misprediction => flush & retry ________|

   - Multiple instructions fetched/decoded per cycle (superscalar)
   - Data hazards handled via forwarding + stalls
   - Control hazards handled via branch prediction + speculative execution
   - Out-of-order engine executes whatever is ready, commits in-order
```

> [!info]
> Ye sab concepts — pipelining, hazards, branch prediction, superscalar, out-of-order — mile-julke modern CPU ki **Instruction-Level Parallelism (ILP)** banate hain: ek single CPU core apne andar hi bahut saara parallelism nikaal leta hai, bina programmer ko multi-threading likhne ki zaroorat ke. Agle chapter (`10-multicore-and-parallel-processing`) mein hum dekhenge ki jab ek core ka ILP limit ho jaata hai, to CPU designers **multiple cores** hi laga dete hain — wahan parallelism programmer ko explicitly (threads/processes ke through) manage karni padti hai. Wo software-level scheduling ka detail OS notes (`operating_systems`) mein already cover ho chuka hai — yahan hum sirf hardware ka ILP dekh rahe hain.

---

## Key Takeaways

- **Pipelining** ek assembly-line technique hai jahan ek instruction ke poora hone ka wait kiye bina agla instruction fetch/process start ho jaata hai — jaise dabbawala system mein har banda apna specific stage handle karta hai.
- Classic **5-stage pipeline**: Fetch (IF) → Decode (ID) → Execute (EX) → Memory (MEM) → Writeback (WB). Ideal case mein N instructions, K stages ke pipeline mein `K + (N-1)` cycles lagte hain.
- Pipelining se **latency** kam nahi hoti (ek instruction ka apna time same rehta hai), lekin **throughput** dramatically badh jaata hai.
- **Structural hazard**: do instructions ko same hardware resource chahiye ek saath (jaise memory port) — extra hardware duplicate karke fix hota hai.
- **Data hazard**: ek instruction ko pichli instruction ka result chahiye jo abhi ready nahi hua (RAW hazard) — **forwarding/bypassing** se fix hota hai, load-use case mein stall/bubble insert karna padta hai.
- **Control hazard**: branch/jump ka result pata nahi hota jab tak wo execute na ho — CPU ko pata nahi agla instruction kahan se fetch kare.
- **Branch prediction** (static ya dynamic) CPU ko andaza lagane deta hai ki branch liya jaayega ya nahi, aur speculatively aage badhne deta hai; galat guess pe pipeline **flush** hoti hai (misprediction penalty).
- **Superscalar execution**: ek clock cycle mein multiple instructions fetch/decode/execute karna, multiple execution units (ALUs) ki madad se — jaise ek saath 2+ tandoor use karna.
- **Out-of-order execution**: instructions jo ready hain unhe pehle execute karo (dependencies allow karte hue), lekin final results hamesha **program order mein hi commit** hote hain (Reorder Buffer ke through) — correctness maintain rehti hai.
- Ye sab techniques mil ke ek single CPU core ke andar **Instruction-Level Parallelism (ILP)** create karti hain — bina explicitly multi-threaded code likhe CPU khud hi parallelism nikaal leta hai.
