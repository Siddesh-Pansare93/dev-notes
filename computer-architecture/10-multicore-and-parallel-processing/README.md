# Multicore & Parallel Processing

## Ek chhota sa scene socho

Tum Node.js mein ek Express server likh rahe ho. Traffic badh raha hai, response slow ho raha hai. Tumhara pehla instinct kya hoga? "Chal server ka CPU upgrade kar dete hain, faster processor le lete hain." Lekin 2005 ke baad se, chip banane wali companies (Intel, AMD) yeh trick chhod chuki hain. Unhone single processor ko aur tez banane ke bajaye, **ek hi chip ke andar do, chaar, athhara processors thoons diye**. Isi ko bolte hain **multicore**.

Yeh chapter samjhayega:
- Clock speed badhana kyun band ho gaya (power wall)
- Core actually hota kya hai
- Multicore vs Hyperthreading/SMT — dono alag cheezein hain, log confuse karte hain
- Symmetric Multiprocessing (SMP) kya hota hai
- Amdahl's Law — number ke saath, kyun "4 core = 4x fast" jhooth hai
- Tumhara Node.js code multicore ka fayda kyun automatically nahi uthata

---

## Part 1: Clock Speed Race kyun khatam hui? (The Power Wall)

### Purana zamana: "Bas MHz badhao"

1980s se 2004 tak, CPU industry ka ek hi mantra tha: **clock speed badhao**. Har saal processor 25-50% tez ho jata tha — 1 MHz se 4.77 MHz (original IBM PC), phir 100 MHz, phir Pentium 4 tak 3.8 GHz. Yeh Moore's Law ka "golden era" tha — transistors chhote hote gaye, aur chhote transistor ka matlab hai **tez switching, tez clock**.

Socho jaise ek dabbawala apni cycle chalata hai. Pehle wo 10 km/h chalata tha, phir engineering better hui, gearing better hui, wo 15, 20, 25 km/h chala sakta hai. Bas speed badhate jao — customer ko fast tiffin milega.

### Phir deewar aa gayi: Power Wall

2004-2005 ke aas paas, Intel ne apna khud ka **Pentium 4 "Tejas"** chip cancel kar diya jo 4+ GHz target kar raha tha. Kyun? Kyunki uska power consumption aur heat itni zyada thi ki usse thanda karna practically namumkin ho gaya tha normal cooling ke saath.

Yahan physics ka ek formula samajhna zaruri hai:

```
Dynamic Power  ∝  C × V² × f

C = capacitance (chip ka design, transistor count)
V = voltage
f = clock frequency (speed)
```

Yeh formula bata raha hai: **power, frequency ke साथ linearly badhta hai, lekin voltage ke saath SQUARE mein badhta hai**. Aur frequency badhane ke liye usually voltage bhi badhani padti hai (higher freq ke liye transistors ko stable switch karne ke liye zyada voltage chahiye). Toh practically:

```
Power  ∝  f³   (approximately, kyunki V bhi f ke saath badhta hai)
```

Matlab agar tum clock speed 20% badhao, power consumption ~70% badh sakta hai! Aur zyada power = zyada garmi (heat). Garmi nikalne ka ek limit hai — normal air cooling se chip ki heat density ek point ke baad **nuclear reactor ke barabar** ho jati (yeh comparison Intel engineers ne khud diya tha presentations mein — "chip ki power density rocket nozzle jaisi ho rahi hai agar hum yeh trend continue karte").

> [!info]
> Isko **Power Wall** kehte hain — ek invisible deewar jahan clock speed badhana practically ruk gaya kyunki power aur heat control se bahar ho jate. Aaj bhi consumer CPUs mostly 3-5.5 GHz range mein hi hain, jabki 2005 mein logon ko laga tha 2010 tak hum 10 GHz dekh lenge.

### Solution: Ek chip, multiple chhote cores

Ab Intel/AMD ne socha: agar hum single core ko aur fast nahi bana sakte bina power wall todhe, toh kyun na **do medium-speed cores** rakh lein ek hi chip pe? Do cores 2x kaam kar sakte hain (theoretically) usi ya thodi zyada power budget mein, kyunki har core apni original speed pe hi chal raha hai — hum frequency nahi badha rahe, **parallelism** badha rahe hain.

```
EK BADA FAST CORE (3.8 GHz)          DO MEDIUM CORES (2.8 GHz each)
┌────────────────────────┐           ┌───────────┐  ┌───────────┐
│                        │           │  Core 1   │  │  Core 2   │
│      CPU CORE          │    VS     │  2.8 GHz  │  │  2.8 GHz  │
│      3.8 GHz           │           │           │  │           │
│  Power: 130W, bohot     │           │  Power: 65W│  │Power: 65W│
│  garam, cooling hard    │           │  each = 130W total       │
└────────────────────────┘           └───────────┘  └───────────┘
    Single-thread: FAST                  Total throughput: zyada
    Multi-task: bekaar                   (agar kaam parallel ho)
```

Yeh trade-off hai: har individual core thoda "slow" hai purane single-core se, lekin combined throughput zyada hai — **agar** tumhara software us parallelism ka use kar sake (isi pe baad mein Amdahl's Law mein aayenge).

> [!tip]
> Isi wajah se 2006 ke baad "GHz race" marketing khatam ho gayi. Ab CPU ads mein "Dual Core", "Quad Core", "Octa Core" dikhta hai, "5 GHz!" nahi. Apple, Intel, AMD sab core count badha rahe hain, clock speed nahi.

---

## Part 2: Core kya hota hai actually?

### Analogy: Ek office ka structure

Socho ek CPU chip ek **office building** hai, aur:

- **Core** = ek independent employee jo apna khud ka kaam kar sakta hai — uske paas apna calculator (ALU), apna kaam yaad rakhne ki jagah (registers), apni chhoti notebook (L1/L2 cache) hai.
- Purane single-core CPU mein poore building mein sirf EK employee tha. Chahe kitna bhi kaam aaye, wahi employee sab kuch sequentially karta — email check karo, phir report likho, phir call lo, ek ek karke.
- Multicore CPU mein building mein 4, 8, 16 employees (cores) hain, har koi apna alag kaam parallel mein kar sakta hai.

### Technically, ek core mein kya hota hai?

```
┌─────────────────────────────────────────────┐
│                  CPU CORE                    │
│                                               │
│   ┌─────────┐   ┌─────────┐   ┌──────────┐  │
│   │   ALU   │   │ Control │   │Registers │  │
│   │(Arithme-│   │  Unit   │   │ (fast    │  │
│   │tic Logic│   │ (fetch- │   │ storage) │  │
│   │  Unit)  │   │ decode- │   │          │  │
│   │         │   │ execute)│   │          │  │
│   └─────────┘   └─────────┘   └──────────┘  │
│   ┌───────────────────────────────────────┐ │
│   │      L1 Cache (instruction + data)      │ │
│   │      ~32-64 KB, sabse fast              │ │
│   └───────────────────────────────────────┘ │
│   ┌───────────────────────────────────────┐ │
│   │      L2 Cache (per-core usually)        │ │
│   │      ~256 KB - 1 MB                     │ │
│   └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
              (Yeh EK core hai)

Poori chip mein aise 4/8/16 cores hote hain, jo share karte
hain ek L3 cache (bada, sabse slow, saare cores ke liye common)
aur RAM tak ka rasta (memory controller).
```

Har core apna khud ka **instruction stream** independently fetch-decode-execute kar sakta hai. Matlab core-1 kisi Chrome tab ka JavaScript chala sakta hai, core-2 usi waqt tumhara Spotify ka audio decode kar sakta hai — dono bilkul independent, ek dusre ka wait nahi karte.

> [!info]
> Deeper detail — instruction fetch-decode-execute cycle (pipeline, hazards, branch prediction) is already covered in the earlier CPU/datapath chapters of this course. Multicore basically **replicates** poora datapath N times on one chip.

### Real world numbers

| Saal | Typical Consumer CPU | Cores |
|------|----------------------|-------|
| 2001 | Pentium 4 | 1 |
| 2006 | Core 2 Duo | 2 |
| 2010 | Core i7 (first gen) | 4 |
| 2017 | Ryzen 7 | 8 |
| 2023 | Ryzen 9 7950X | 16 |
| 2023 | Apple M2 Ultra | 24 (16P + 8E) |
| Server (AWS/GCP) | AMD EPYC | 64-128 |

Notice karo — clock speed 2001 se 2023 tak sirf ~1.5-2x badhi (3.8 GHz se ~5.7 GHz boost), lekin core count 1 se 128 tak gaya. Yeh hi hai power wall ka direct result.

---

## Part 3: Multicore vs Hyperthreading (SMT) — Sabse Common Confusion

Yeh section carefully padhna kyunki 90% developers isko confuse karte hain, including job interviews mein.

### Multicore = Physically alag hardware

Jaisa Part 2 mein dekha — har core ka apna **poora physical hardware** hai: apna ALU, apna register set, apna L1/L2 cache. Do cores literally do independent computing units hain jo ek hi silicon chip pe baithe hain. Ismein **true parallelism** hai — dono core ek hi nanosecond mein do alag instructions execute kar sakte hain, kyunki unke paas apna-apna ALU hai.

### Hyperthreading / SMT (Simultaneous Multithreading) = Ek core ka time-sharing trick

Ab yeh interesting part hai. Modern Intel CPUs mein "Hyperthreading" hota hai (Intel ka brand name), AMD mein isko "SMT" (Simultaneous Multithreading) kehte hain — same concept hai.

**Kya hota hai:** Ek single physical core apne aap ko OS ko **do logical cores** ki tarah dikhata hai (jaise Task Manager mein tum "8 cores, 16 threads" dekhte ho — wahan 8 physical cores hain but 16 logical processors dikhte hain).

**Kyun kaam karta hai:** Ek core ke andar bhi bohot saare execution units hote hain (multiple ALUs actually, floating point unit, load/store units) jo ek single thread poori tarah use nahi kar pata. Jab ek thread cache miss ka wait kar raha ho ya kisi memory operation ka, tab core ke resources **idle** baithe rehte. Hyperthreading isi idle time ko doosre thread ko dene deta hai.

```
BINA HYPERTHREADING (1 core, 1 thread):
Time →  [Thread A: ALU busy][A: waiting for memory...][A: ALU busy]
                              ↑ yahan core IDLE hai, waste

HYPERTHREADING (1 physical core, 2 logical threads):
Time →  [A: ALU][B: ALU][A: waiting][B: ALU][A: ALU][B: waiting]
                              ↑ jab A wait kar raha, B ka kaam chal jata
```

Analogy: socho ek chef (core) ke paas ek hi tandoor hai. Ek roti dalo, tandoor mein woh khud hi paakti rahegi 2 minute — is 2 minute mein chef doosri roti belan se bel sakta hai. Chef do rotiyan "parallel" jaisa handle kar raha hai, lekin actually usके paas ek hi tandoor hai — agar dono rotiyan ek hi second mein tandoor mein daalni ho, nahi ho sakta.

### Table: Difference clearly

| | **Multicore** | **Hyperthreading / SMT** |
|---|---|---|
| Hardware | Har core: alag ALU, registers, cache | Ek hi core ke resources share hote hain |
| True parallelism? | Haan, 100% | Nahi — resource-sharing simulation hai |
| Speedup kitna milta hai | ~Linear (2 cores ≈ ~1.8-2x, real workload pe) | Typically 15-30% extra throughput, kabhi kabhi negative bhi (contention) |
| OS ko dikhta kaisा hai | N physical cores | 2N logical processors |
| Cost/chip area | Zyada — poora core duplicate karna padta hai | Bohot kam — sirf kuch extra registers/state |
| Best case | Dono thread heavy CPU computation kar rahe | Ek thread CPU-heavy, dusra memory-wait-heavy (complementary) |
| Worst case | N/A (dono independent hain) | Dono thread same execution unit chahte hain — ek dusre ko slow karte hain |

> [!warning]
> **Misconception**: "8 logical processors matlab 8 cores ka kaam." Galat! Agar tumhare paas 4 physical cores + hyperthreading = 8 logical processors, toh yeh **4 real cores + ek boost trick** hai, 8 real cores nahi. CPU-bound heavy tasks (jaise video encoding, ML training) mein hyperthreading se sirf 15-30% extra milta hai, kabhi kabhi negative bhi ho sakta hai agar dono threads ek hi execution unit ke liye fight karein.

> [!tip]
> `nproc` (Linux) ya Task Manager (Windows) jo number dikhata hai wo **logical processors** hote hain, physical cores nahi. Node.js ka `os.cpus().length` bhi logical count deta hai — agar tum worker threads spawn kar rahe ho CPU-bound kaam ke liye, physical core count use karna better hota hai warna diminishing returns milenge.

---

## Part 4: Symmetric Multiprocessing (SMP)

**SMP** ek architecture model hai jahan:
1. Multiple identical cores/processors hain
2. Sab **same shared memory** (RAM) ko access karte hain
3. Sab cores ko OS equally treat karta hai — koi bhi core, koi bhi task run kar sakta hai
4. Ek single copy of OS poore system ko control karta hai

```
              SHARED MAIN MEMORY (RAM)
        ┌──────────────────────────────────┐
        │         same address space         │
        └──────────────────────────────────┘
              ↑         ↑         ↑         ↑
         ┌────┴───┐┌────┴───┐┌────┴───┐┌────┴───┐
         │ Core 0 ││ Core 1 ││ Core 2 ││ Core 3 │
         └────────┘└────────┘└────────┘└────────┘
         Sab cores equal hain, sab RAM equally access
         karte hain, OS kisi bhi core pe kisi bhi
         process ko schedule kar sakta hai.
```

Aaj tumhare laptop/desktop/phone ka har CPU **SMP** hai — chahe wo 4-core Intel ho ya 8-core Apple M-series. Jab tum Task Manager mein dekhte ho ki Chrome ka ek tab core 2 pe chal raha hai aur doosra tab core 5 pe — yeh OS ka scheduler decide karta hai, dynamically, aur kabhi bhi thread ek core se dusre core pe "migrate" ho sakta hai.

Isse contrast karo purana **Asymmetric Multiprocessing (AMP)** model se, jahan alag-alag processors ke alag roles fixed hote the (ek processor sirf I/O handle karta, doosra sirf compute) — yeh aajkal rare hai general-purpose computers mein, lekin embedded systems mein abhi bhi milta hai.

> [!info]
> **OS scheduling ka gehra detail** (context switching, run queues, load balancing across cores, CPU affinity) already cover ho chuka hai operating_systems notes mein — Process Scheduling chapter dekho. Yahan hum sirf itna samajh rahe hain ki SMP hardware ka model kya hai jispe wo scheduler kaam karta hai.

---

## Part 5: Amdahl's Law — "4 Cores = 4x Fast" Kyun Jhooth Hai

Yeh is poore chapter ka sabse important, most-asked-in-interview concept hai.

### Intuition pehle

Socho tumhe ek 100-page ka document translate karna hai Hindi se English mein. Tum 4 dost bulate ho madad ke liye, sochte ho "4 log, matlab 4x fast hoga, 1/4 time lagega."

Lekin translation start karne se pehle, **ek** insaan ko poora document padhkar chapters divide karne padenge (yeh sequential hai — 4 log yeh kaam parallel nahi kar sakte, kyunki decide karne ke liye poora document dekhna padega). Phir translation khatam hone ke baad, **ek** insaan ko sab jodkar consistency check karni padegi (yeh bhi sequential hai).

```
Total kaam = [Setup: divide chapters] + [Translation: parallel] + [Merge: combine & check]
              (sequential — kisi              (yeh part 4 logon           (sequential —
               ek ko karna padega)             mein baant sakte ho)        ek hi karega)
```

Chahe tum 4 log lagao ya 40, **Setup aur Merge ka time kabhi kam nahi hoga** — sirf middle wala "Translation" part fast hota hai. Isi phenomenon ko formal banaya **Gene Amdahl** ne 1967 mein, aur isko **Amdahl's Law** kehte hain.

### Formula

```
Speedup(N) = ────────────────────────
                  P
             (1 - P) + ───
                        N

Jahan:
  P = program ka wo fraction jo PARALLELIZE ho sakta hai (0 se 1 ke beech)
  (1-P) = program ka wo fraction jo SEQUENTIAL rehna hi padega
  N = number of processors/cores
```

### Numeric Example (jaisa brief mein maanga gaya)

Maan lo tumhara program hai: **90% parallelizable (P = 0.9)**, baaki **10% strictly sequential (1-P = 0.1)**.

**Case 1: N = 2 cores**
```
Speedup = 1 / (0.1 + 0.9/2) = 1 / (0.1 + 0.45) = 1 / 0.55 = 1.82x
```

**Case 2: N = 4 cores**
```
Speedup = 1 / (0.1 + 0.9/4) = 1 / (0.1 + 0.225) = 1 / 0.325 = 3.08x
```

**Case 3: N = 16 cores**
```
Speedup = 1 / (0.1 + 0.9/16) = 1 / (0.1 + 0.05625) = 1 / 0.15625 = 6.4x
```

**Case 4: N = infinity (imagine unlimited cores!)**
```
Speedup = 1 / (0.1 + 0.9/∞) = 1 / (0.1 + 0) = 1 / 0.1 = 10x  (MAXIMUM possible, hamesha)
```

### Table se dekho pattern

| Cores (N) | Speedup | "Per-core efficiency" |
|-----------|---------|------------------------|
| 1 | 1.0x | 100% |
| 2 | 1.82x | 91% |
| 4 | 3.08x | 77% |
| 8 | 4.7x | 59% |
| 16 | 6.4x | 40% |
| 64 | 8.77x | 14% |
| ∞ | **10x** | 0% (theoretical ceiling) |

```
Speedup
  10 |                                    ●────●────● (ceiling = 10x)
   9 |                            ●
   8 |                       ●
   7 |                  ●
   6 |             ●
   5 |          ●
   4 |       ●
   3 |    ●
   2 |  ●
   1 |●
   0 └──────────────────────────────────────────────
     1   2   4   8   16   32   64  128  256  Cores →

     Dekho: shuru mein tez badhta hai, phir FLATTEN
     ho jata hai. Chahe tum 1000 cores laga do,
     10x se zyada speedup KABHI nahi milega
     (jab tak 10% sequential part hai).
```

> [!warning]
> Yehi wajah hai ki "hum 128-core server le lete hain, app 128x fast ho jayega" — yeh soch **fundamentally galat** hai. Agar tumhare code ka koi bhi hissa sequential hai (database lock, single-threaded initialization, shared resource pe waiting), toh us hisse ki wajah se poora speedup cap ho jata hai, chahe kitne bhi cores lagao.

### Yaad rakhne wali cheez: Chhota sa sequential part bhi bada nuksaan karta hai

Agar sirf **5%** part sequential hai (P = 0.95), toh bhi max speedup sirf **20x** hai (1/0.05), chahe infinite cores ho. Agar **1%** sequential hai, max speedup **100x** hai. Matlab, jitna zyada tum parallelize kar sakte ho, utna better ceiling — lekin ek chhota sa sequential bottleneck bhi asymptote ko bura tarike se limit karta hai.

---

## Part 6: Software Automatically Multicore ka Fayda Kyun Nahi Uthata?

Ab yahan Node.js developer ke perspective se sochte hain, jo tumhare liye sabse relevant hai.

### 1. Programs by default single-threaded likhe jate hain

Tumhara normal JavaScript/Node.js code ek hi thread pe chalta hai (Node ka famous "single-threaded event loop"). Chahe tumhare server pe 32 cores ho, ek plain `node server.js` process by default **sirf ek core use karega** — baaki 31 cores idle baithe rahenge, jab tak tum explicitly kuch nahi karte (jaise `cluster` module ya `worker_threads`).

```
32-core machine pe simple "node server.js":

Core 0: [████████████ node process busy █████████]
Core 1: [                    idle                  ]
Core 2: [                    idle                  ]
...
Core 31:[                    idle                  ]
```

Isliye Node.js apps production mein **PM2 cluster mode** ya Node ka built-in `cluster` module use karte hain — multiple Node processes fork karke, har ek alag core pe, aur load balancer (jaise nginx ya Node ka internal round-robin) requests baant deta hai. Yeh **multi-process parallelism** hai, multi-threading nahi — kyunki JavaScript ka single-threaded model hai per-process.

### 2. Sab problems parallelize nahi ho sakti (data dependencies)

Kuch kaam **inherently sequential** hote hain — step 2 shuru hi nahi ho sakta jab tak step 1 khatam na ho:

```javascript
// Yeh sequential hai, parallelize nahi kar sakte:
let balance = 1000;
balance = balance - 200;   // step 1
balance = balance * 1.05;  // step 2 depends on step 1's result
balance = balance - 50;    // step 3 depends on step 2's result
```

Iske against, agar kaam **independent** hai:

```javascript
// Yeh parallelize ho sakta hai — koi dependency nahi:
processImage(image1);
processImage(image2);
processImage(image3);
processImage(image4);
```

Har real-world program dono types ka mix hota hai — kuch parts independent (parallelize-able, yehi hai Amdahl's "P"), kuch parts sequential dependency wale (yehi hai "1-P"). Database transactions, shared state updates, ek dusre pe depend karne wale calculations — yeh sab sequential rehte hain chahe tum kitne bhi cores de do.

### 3. Locks aur Shared State — parallelism ka dushman

Jab multiple threads/cores **same data** ko modify karna chahte hain (jaise ek shared counter, ek shared cache, ek database row), unhe **locks** use karne padte hain taaki data corrupt na ho. Lock ka matlab hai — ek waqt mein sirf ek thread us resource ko touch kar sakta hai, baaki ko **wait** karna padta hai.

```
Thread A: [lock] --- modify shared_counter --- [unlock]
Thread B:                    [WAITING for lock...........][lock] -- modify -- [unlock]
Thread C:                                                          [WAITING........]
```

Zyada cores add karne se yeh waiting **aur badh sakti hai** (contention), speedup nahi milta — kabhi kabhi ulta slow ho jata hai zyada threads lagane se, kyunki lock ke liye ladai (contention) badh jati hai. Isko "lock contention" bolte hain.

### 4. Overhead — parallelism free nahi hai

Kaam ko divide karna, results ko wapas combine karna, threads/processes banana — yeh sab khud ek cost hai (jaise translation wale example mein "divide chapters" aur "merge" steps). Agar actual kaam chhota hai (jaise ek chhota sa array sort karna), toh parallelize karne ka overhead khud kaam se zyada ho sakta hai — result: **slower**, not faster.

> [!tip]
> Isliye Node.js mein `worker_threads` sirf tab use karo jab kaam **CPU-intensive aur bada** ho (jaise image processing, crypto hashing, large JSON parsing). Chhote kaam ke liye worker thread spawn karna khud ek overhead hai jo fayde se zyada nuksaan karta hai.

### 5. Amdahl's Law ka bottom line yahan

Agar tumhara Express API mostly **I/O-bound** hai (database query ka wait, network call ka wait), toh multicore uska seedha fayda nahi deta — kyunki wo already "wait" kar raha hai, CPU busy nahi hai. Node ka event loop already isko efficiently handle karta hai single thread pe (async/await, non-blocking I/O). Multicore ka real fayda tab milta hai jab kaam **CPU-bound** ho aur usko independent chunks mein todha ja sake — jaise:

- Multiple incoming HTTP requests ko alag cores pe handle karna (cluster mode) — yeh "embarrassingly parallel" hai, requests ek dusre se independent hain
- Video/image encoding, ML inference — data ko chunks mein baant ke parallel process karna
- Bulk cryptographic hashing (password hashing jaise bcrypt) — worker pool

---

## Quick Recap Table

| Concept | One-liner |
|---|---|
| Power Wall | Clock speed badhane se power ∝ f³ badhta hai — heat control se bahar chala gaya, isliye GHz race ruk gayi |
| Core | Chip ke andar ek independent computing unit — apna ALU, registers, L1/L2 cache |
| Multicore | Multiple physically alag cores ek chip pe — true parallelism |
| Hyperthreading/SMT | Ek hi core ke idle resources doosre thread ko dena — simulation of extra cores, ~15-30% boost |
| SMP | Sab cores equal, sab shared RAM access karte hain, ek OS instance control karta hai |
| Amdahl's Law | Speedup = 1 / ((1-P) + P/N) — sequential part hamesha ek hard ceiling lagata hai speedup pe |
| Why software doesn't auto-speed-up | Default single-threaded execution, data dependencies, locks/contention, parallelization overhead |

---

## Key Takeaways

- 2004-05 ke baad CPU clock speeds plateau ho gayi kyunki power ∝ frequency³ hai — isse zyada garmi paida hoti jo cool karna practically namumkin tha ("Power Wall"). Isi wajah se industry ne single fast core ki jagah multiple medium-speed cores banana shuru kiya.
- Ek **core** apna independent ALU, registers, aur (usually) apna L1/L2 cache rakhta hai — matlab do cores literally do separate mini-CPUs hain ek hi chip pe, jo truly parallel kaam kar sakte hain.
- **Multicore** (physically alag hardware, true parallelism) aur **Hyperthreading/SMT** (ek hi core ke idle execution units doosre thread ko dena) bilkul alag cheezein hain — logical processor count physical core count se zyada dikhta hai, lekin utna powerful nahi hota.
- **SMP (Symmetric Multiprocessing)** wo standard architecture hai jismein sab cores equal treat hote hain aur shared RAM access karte hain — aaj ke sab consumer/server CPUs isi model pe chalte hain.
- **Amdahl's Law** (`Speedup = 1 / ((1-P) + P/N)`) batata hai ki program ka jo hissa sequential hai wo speedup ka hard ceiling lagata hai — 90% parallel code bhi max ~10x speedup de sakta hai chahe infinite cores lagao.
- Software **automatically** multicore ka fayda nahi uthata kyunki: (1) programs default single-threaded chalte hain, (2) kuch kaam inherently sequential/dependent hote hain, (3) shared data ke liye locks lagti hain jo contention paida karti hain, (4) parallelization ka khud overhead hota hai jo chhote kaamon ke liye nuksaandeh hai.
- Node.js jaisa single-threaded runtime multicore ka fayda uthane ke liye explicit tools maangta hai — `cluster` module (multi-process) ya `worker_threads` (CPU-bound kaam ke liye) — plain `node server.js` sirf ek core use karta hai.
- OS-level scheduling (kaunsa thread kis core pe chalega, context switching, load balancing) ka gehra detail operating_systems notes ke Process Scheduling chapter mein already covered hai.
