# GPU Architecture Basics

## Kya hota hai GPU, aur ye chapter kyun zaruri hai?

Tum ek Node.js/TypeScript developer ho — roz `npm run build`, API calls, database queries, ye sab CPU pe chalte hain. Lekin jab tum apna laptop kholte ho aur koi 3D game khelte ho, ya jab koi ML engineer ChatGPT jaisa model train karta hai, tab ek doosra chip kaam pe lag jaata hai — **GPU (Graphics Processing Unit)**.

Socho aisा: tumhare paas ek restaurant hai.

- **CPU** ek **master chef** hai — bahut skilled, complex dishes bana sakta hai, decisions lene mein fast hai, lekin ek time pe limited dishes hi bana sakta hai (4, 8, 16 cores — modern CPUs mein).
- **GPU** ek **1000 helpers ki army** hai jo sabzi kaatne jaisa simple, repetitive kaam **ek saath (parallel)** kar sakte hain. Ek helper akela chef jitna smart nahi hai, lekin jab kaam ye ho ki "10,000 pyaaz kaato" — to 1000 helpers milke ye kaam seconds mein khatam kar denge, jabki akela master chef ghanto laga dega.

Yahi fundamental difference hai CPU aur GPU ka — aur isi wajah se GPU graphics, gaming, aur aajkal AI/ML training ke liye itna critical ban gaya hai.

> [!info]
> Agar tumne kabhi socha hai ki "NVIDIA GPU banata hai, to AI companies NVIDIA ke peeche kyun pagal hain?" — is chapter ke end tak tumhe iska poora answer mil jaayega.

---

## CPU vs GPU: Fundamental Design Difference

### Chef vs Army analogy ko thoda technical banate hain

| Property | CPU (Chef) | GPU (Army of Helpers) |
|---|---|---|
| Number of cores | Kam (4 - 64 typical) | Bahut zyada (thousands — 5000 to 16000+) |
| Core complexity | Bahut complex — branch prediction, out-of-order execution, deep pipelines | Simple — basic ALU (arithmetic unit), limited control logic |
| Clock speed per core | High (3-5+ GHz) | Comparatively low (1-2 GHz) |
| Cache per core | Bahut bada (L1, L2, L3 — MBs) | Chota, shared zyada |
| Best for | Sequential, decision-heavy tasks | Parallel, repetitive, math-heavy tasks |
| Control logic | Bahut zyada (jaisa ek smart manager) | Minimal — sab cores same instruction follow karte hain |
| Example task | Ek complex if-else heavy algorithm, database query planning | Har pixel ka color calculate karna, matrix multiplication |

Yahan CPU aur GPU ke chip ka rough layout dekhte hain — control aur cache kitni jagah lete hain vs actual compute (ALU) units:

```
CPU Chip Layout (simplified):
┌─────────────────────────────────────┐
│  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │ ALU  │  │ ALU  │  │ ALU  │  ...   │   <- Sirf 4-16 cores
│  └──────┘  └──────┘  └──────┘        │
│  [ Control Logic - BAHUT BADA ]      │   <- branch prediction,
│  [ Cache (L1/L2/L3) - BAHUT BADA ]   │      out-of-order exec,
│                                       │      speculative exec
└─────────────────────────────────────┘

GPU Chip Layout (simplified):
┌─────────────────────────────────────────────────┐
│ [C][C][C][C][C][C][C][C][C][C][C][C][C][C][C]... │   <- Thousands of
│ [C][C][C][C][C][C][C][C][C][C][C][C][C][C][C]... │      chhote simple
│ [C][C][C][C][C][C][C][C][C][C][C][C][C][C][C]... │      ALU cores
│ [C][C][C][C][C][C][C][C][C][C][C][C][C][C][C]... │
│ [ Control ]   [ Cache - chota, shared ]          │
└───────────────────────────────────────────────────┘
C = ek simple ALU / CUDA core
```

Dekho — CPU apni chip ki bahut saari jagah **control logic aur cache** ko deta hai (taaki ek instruction ko super-optimize kar sake, branch predict kar sake, out of order execute kar sake). GPU apni jagah **raw compute units (ALUs)** banane mein lagata hai — kyunki usko complex decision-making nahi karni, usko bas "same operation, alag-alag data pe, baar baar" karna hai.

> [!tip]
> Yaad rakhne ka trick: **CPU = Latency Optimized** (ek kaam jaldi se jaldi khatam karo), **GPU = Throughput Optimized** (bahut saara kaam total mein jaldi khatam karo, chahe ek individual kaam thoda slow ho).

### Real world numbers

- Intel Core i9 (consumer CPU): ~24 cores, ~5.8 GHz boost clock
- NVIDIA RTX 4090 (consumer GPU): **16,384 CUDA cores**, ~2.5 GHz clock
- NVIDIA H100 (datacenter AI GPU): **16,896 CUDA cores** + specialized Tensor Cores, designed purely for AI training/inference

Ek GPU ke core CPU ke core jitne "smart" nahi — woh sirf basic multiply-add jaisi operations fast kar sakta hai. Lekin jab tumhe 10 million pixels ka color ek saath calculate karna ho, ya ek 70-billion-parameter neural network ka matrix multiplication karna ho, tab "1000 chhote workers" "16 super-smart chefs" se kahin zyada fast hote hain.

---

## SIMD: Single Instruction, Multiple Data

Ye GPU architecture ka **sabse core concept** hai — isko samjhe bina GPU samajh hi nahi aayega.

### Kya hota hai SIMD?

**SIMD** ka matlab: **ek hi instruction, alag-alag data pieces pe ek saath apply hota hai.**

Ismein compare karte hain do models:

**SISD (Single Instruction, Single Data)** — normal CPU jaisa (per core):
```
Instruction: ADD
Data: a[0] + b[0] = c[0]     <- ek cycle mein sirf ek addition
```

**SIMD (Single Instruction, Multiple Data)** — GPU jaisa:
```
Instruction: ADD  (ek hi baar diya gaya)
Data:  a[0] + b[0] = c[0]  ┐
       a[1] + b[1] = c[1]  ├─  Sab EK HI CYCLE mein, parallel!
       a[2] + b[2] = c[2]  │
       a[3] + b[3] = c[3]  ┘
       ... (aur bhi hundreds/thousands parallel)
```

### Dabbawala analogy

Mumbai ke dabbawalas ko socho. Agar ek hi dabbawala ko 1000 tiffins Andheri se Nariman Point deliver karne ho, to woh ek-ek karke jaayega — bahut time lagega (ye hai CPU/sequential approach).

Lekin agar tumhare paas 1000 dabbawalas hain aur sabko **same instruction** di gayi hai — "apna tiffin lo aur Nariman Point jao" — to sab ek saath nikal jaate hain aur poora kaam ek trip ke time mein khatam ho jaata hai. **Instruction sabke liye same hai** ("jao Nariman Point"), lekin **data alag hai** (har dabbawala apna alag tiffin le ja raha hai). Yahi hai SIMD.

### Ye graphics ke liye perfect kyun hai?

Ek screen socho — 1920×1080 resolution matlab **~2 million pixels**. Har frame (30-60 baar per second!) har pixel ka color calculate karna padta hai — lighting, shadows, textures, sab kuch. Lekin formula (instruction) **sabhi pixels ke liye same hota hai** — sirf input data (position, texture, light angle) alag hota hai.

```
Pixel (0,0): color = light_formula(position, texture, angle)
Pixel (0,1): color = light_formula(position, texture, angle)
Pixel (0,2): color = light_formula(position, texture, angle)
...
Pixel (1919,1079): color = light_formula(position, texture, angle)
```

Same formula, 2 million alag data points — **ye textbook SIMD problem hai.** Isiliye GPU graphics ke liye bana tha originally — naam hi hai "Graphics Processing Unit."

### ML/AI training mein SIMD kaise fit hota hai?

Neural network training mein sabse zyada time jaata hai **matrix multiplication** mein — ek layer ke outputs ko dusri layer ke weights se multiply karna.

```
[Input Vector]  x  [Weight Matrix]  =  [Output Vector]

Ye multiplication mein LAKHO chhote multiply-add operations
hote hain — aur wo sab ek-dusre pe depend nahi karte!
```

Ek matrix multiplication mein har cell ka calculation independent hota hai dusre cells se (formula same: row × column ka dot product). Ye bhi SIMD-friendly hai — isiliye GPU deep learning training mein CPU se 10-100x tak fast ho sakta hai.

> [!info]
> Isi wajah se ChatGPT jaise LLMs train karne ke liye companies **thousands of GPUs** ka cluster use karti hain, na ki CPUs ka. Training essentially "bahut saari matrix multiplications, baar baar" hai — jo GPU ka home ground hai.

---

## CUDA Cores / Shader Cores — Basic Concept

Jab tum GPU specs padhte ho ("RTX 4090 has 16,384 CUDA cores"), to ye kya cheez hai?

- **CUDA Core** (NVIDIA ki terminology) ya **Shader Core** (generic/AMD terminology) GPU ka **sabse chhota compute unit** hai.
- Ek CUDA core basic arithmetic kar sakta hai — add, multiply, multiply-add (FMA) — floating point ya integer numbers pe.
- Ye CPU core jaisa **independent, smart** nahi hai. Ye **groups mein organize** hote hain jinhe NVIDIA "Streaming Multiprocessors (SMs)" kehta hai — aur ek SM ke andar ke saare cores **usually same instruction ek saath execute karte hain** (SIMD style, jise NVIDIA "SIMT — Single Instruction Multiple Threads" kehta hai).

```
GPU
 └── Streaming Multiprocessor (SM) #1
       ├── CUDA Core 1  ┐
       ├── CUDA Core 2  ├── Sab same instruction chalate hain,
       ├── CUDA Core 3  │   alag-alag data pe (SIMT)
       ├── ...          │
       └── CUDA Core 32 ┘
 └── Streaming Multiprocessor (SM) #2
       └── ... (32 aur cores)
 ... (RTX 4090 mein ~128 SMs, har ek mein 128 cores)
```

### Analogy: Railway Reservation Counter

Socho Indian Railways ke 1000 reservation clerks hain (CUDA cores), lekin unko group mein baanta gaya hai — har group (SM) ka ek supervisor unhe ek hi type ka form fill karne ka instruction deta hai ek time pe. Sab clerks alag-alag passenger ka form bharte hain, lekin same instruction follow karte hain ("PNB status check karo" ya "ticket confirm karo"). Agar kisi clerk ko alag kaam karna pade (jaise "if-else" — kuch clerks ko path A follow karna hai, kuch ko path B), to poora group thoda inefficient ho jaata hai kyunki sabko wait karna padta hai jab tak dono paths sequentially cover na ho jaayen. Isko **"warp divergence"** kehte hain GPU terminology mein — jab ek group ke andar threads different code paths lete hain, performance girti hai.

> [!warning]
> Common misconception: "GPU mein 16,000 cores hain, matlab 16,000 completely independent tasks parallel chala sakta hai jaise 16,000 CPUs." — Ye **galat** hai. GPU cores groups mein kaam karte hain aur **ek group ke andar sab same instruction follow karte hain** (SIMT model). Agar tumhara code mein bahut zyada branching (if-else) hai jo different threads ko different paths pe le jaata hai, GPU utna efficient nahi rahega. GPU **tabhi** shine karta hai jab kaam massively parallel **aur** uniform ho (jaise sab pixels same formula follow karte hain).

### Tensor Cores (bonus — AI-specific)

Modern NVIDIA GPUs (jaise H100, RTX 40-series) mein CUDA cores ke alawa **Tensor Cores** bhi hote hain — ye specifically matrix multiplication (jo AI/ML ka core operation hai) ke liye optimize kiye gaye hain, aur normal CUDA cores se bhi zyada fast hote hain is specific kaam ke liye. Isiliye AI training GPUs (H100 jaisa) gaming GPUs se bhi zyada expensive aur specialized hote hain.

---

## Host aur Device: CPU + GPU Milkar Kaam Kaise Karte Hain

Ek GPU **akela** kaam nahi kar sakta — usko instructions kahin se milni chahiye. Yahan CPU aur GPU ka relationship samajhte hain.

- **Host** = CPU (aur uski RAM) — ye "boss" hai jo decide karta hai kya karna hai
- **Device** = GPU (aur uski dedicated VRAM/graphics memory) — ye "worker army" hai jo bulk compute karta hai

### High-level flow (jaise koi Node.js dev ko easily samajh aaye)

Socho ye ek async job queue jaisa hai (agar tum Node.js mein background job kisi worker ko bhejte ho — Bull queue, jaisa):

```
┌─────────────┐                          ┌─────────────┐
│    HOST      │                          │   DEVICE     │
│    (CPU)     │                          │    (GPU)     │
│              │   1. Data copy karo      │              │
│  Main RAM    │ ───────────────────────> │  VRAM        │
│              │      (CPU RAM -> GPU     │  (GPU's own  │
│              │       VRAM over PCIe)    │   memory)    │
│              │                          │              │
│              │   2. "Ye kaam karo"      │              │
│  Program     │ ───────────────────────> │  Kernel      │
│  logic /     │      (kernel launch —    │  (parallel   │
│  sequential  │      instruction jo      │  function,   │
│  decisions   │      sabhi GPU threads   │  1000s of    │
│              │      pe chalegi)          │  threads pe  │
│              │                          │  ek saath)   │
│              │                          │              │
│              │   3. Result wapas bhejo   │              │
│  Result      │ <─────────────────────── │  Computed    │
│  use karo    │      (GPU VRAM -> CPU    │  Output      │
│              │       RAM)               │              │
└─────────────┘                          └─────────────┘
```

### Step-by-step (real example: ek 3D game frame render karna)

1. **CPU (Host)** game logic chalata hai — player kahan move hua, physics calculations, AI decisions, kya draw karna hai ye decide karna.
2. CPU ye saara data (positions, textures, camera angle) **GPU ki memory (VRAM)** mein copy karta hai — ye copy PCIe bus ke through hoti hai (jaise ek courier jo data CPU RAM se GPU RAM tak le jaata hai).
3. CPU GPU ko ek **"kernel"** (chhota parallel program, jaise "har pixel ka color calculate karo") launch karne ka instruction deta hai.
4. GPU apne thousands of cores use karke **sab pixels ek saath (ya batches mein) process** karta hai.
5. Result (final image / frame) GPU ki memory se screen pe display hota hai, ya CPU ko wapas bheja jaata hai agar zaruri ho.

### CUDA/Kernel concept — bahut brief

Jab developers GPU pe code likhte hain (CUDA, OpenCL, ya modern ML frameworks jaise PyTorch/TensorFlow ke through), woh ek chhota function likhte hain jise **kernel** kehte hain — ye function GPU ke **hazaaron threads pe ek saath** chalta hai, har thread apna alag data piece process karta hai.

```javascript
// Pseudo-code — Node.js dev ko relatable banane ke liye:
// Socho ye jaisa hai .map() lekin thousands of items 
// literally EK HI SAATH (parallel) process ho rahe hain,
// alag-alag "core" pe, na ki ek loop mein sequentially:

// CPU (sequential) — jaisa normal .forEach()
for (let i = 0; i < 1000000; i++) {
  result[i] = a[i] + b[i];   // ek-ek karke, 1 million baar
}

// GPU (conceptually) — sab EK SAATH:
kernel_add<<<blocks, threads>>>(a, b, result);
// Har thread apna "i" khud calculate karta hai aur
// APNA add operation independently, parallel mein karta hai.
```

> [!tip]
> Agar tumhe practical mein samajhna ho — jab tum PyTorch mein `model.to("cuda")` likhte ho, tum essentially bol rahe ho: "Host (CPU) se ye model/data Device (GPU) ki memory mein copy karo, aur computation wahi (GPU pe) karo." Yahi Host-Device pattern hai jo har GPU-accelerated framework follow karta hai.

### Data transfer ek bottleneck bhi ho sakta hai

Ek important gotcha: CPU RAM se GPU VRAM tak data copy karna **free nahi hai** — isme time lagta hai (PCIe bus ki speed pe depend karta hai). Isiliye achha GPU programming ye try karta hai ki:
- Data ko GPU pe **ek baar** copy karo, aur
- Jitna ho sake **zyada compute wahin GPU pe hi karo** (baar baar CPU-GPU ke beech data bhejna avoid karo)

Ye bilkul waisा hai jaise agar tumhe Zomato se baar-baar chhote-chhote orders bhejne ke bajaye ek bade order mein sab kuch bhej dena chahiye — kyunki har delivery trip (data transfer) ka apna overhead hota hai.

---

## GPU Kis Type Ke Kaam Ke Liye Best Hai (aur kis ke liye nahi)

| Task Type | CPU Better | GPU Better |
|---|---|---|
| Sequential logic, lots of if-else/branching | ✅ | ❌ |
| Database query planning, API request handling | ✅ | ❌ |
| Running your Node.js/Express server | ✅ | ❌ |
| Rendering 3D graphics / game frames | ❌ | ✅ |
| Training neural networks (matrix math) | ❌ | ✅ |
| Video encoding/decoding | ❌ | ✅ |
| Cryptocurrency mining (hashing, parallel) | ❌ | ✅ |
| Scientific simulations (weather, physics) | ❌ | ✅ (often) |
| Single complex recursive algorithm | ✅ | ❌ |

Simple rule of thumb: **agar kaam ko hazaaron chhote independent, similar sub-tasks mein todа ja sakta hai — GPU jeetega. Agar kaam sequential decisions aur complex branching pe depend karta hai — CPU jeetega.**

---

## Common Misconceptions

> [!warning]
> **"Zyada CUDA cores = hamesha zyada fast"** — Galat hai poori tarah se nahi, lekin incomplete hai. Clock speed, memory bandwidth, aur architecture generation (jaise Ampere vs Ada Lovelace vs Hopper) bhi utna hi matter karta hai jitna core count.

> [!warning]
> **"GPU CPU ko replace kar dega"** — Nahi. GPU CPU ke bina start hi nahi ho sakta — usko instructions, data orchestration, OS-level scheduling sab CPU (Host) hi deta hai. Ye ek **team** hai, replacement nahi.

> [!warning]
> **"GPU sirf gaming ke liye hai"** — 2012 ke baad se (jab AlexNet jaisa deep learning model GPU pe train hua aur traditional CPU-based approaches se kaafi behtar result diya), GPU AI/ML training ka backbone ban gaya. Aaj NVIDIA ka sabse bada revenue gaming se nahi, **datacenter/AI GPUs** se aata hai.

---

## OS-Level Connection

Agar tumhe ye samajhna hai ki operating system GPU ko kaise "device" ke roop mein manage karta hai — driver loading, memory-mapped I/O, DMA (Direct Memory Access) jisse GPU CPU ko bina disturb kiye directly RAM se data uठा sakta hai — ye sab detail tumhe `operating_systems` notes ke device drivers aur I/O management wale chapters mein milega. Yahan hum sirf ye samajhe ki architecture level pe CPU aur GPU **kya** hain aur unka relationship kaisa hai.

---

## Key Takeaways

- **CPU** = few, complex, powerful cores → optimized for **latency** (ek kaam jaldi khatam karna), sequential aur branching-heavy logic ke liye best.
- **GPU** = thousands of simple cores → optimized for **throughput** (bahut saara kaam total mein jaldi khatam karna), massively parallel, uniform tasks ke liye best.
- **SIMD (Single Instruction, Multiple Data)** GPU architecture ka core concept hai — ek hi instruction, hazaaron data pieces pe ek saath apply hota hai. NVIDIA isko **SIMT** (Single Instruction Multiple Threads) kehta hai.
- Graphics rendering (pixels) aur ML training (matrix multiplication) dono **inherently parallel aur uniform** tasks hain — isiliye GPU dono ke liye perfect fit hai.
- **CUDA Cores / Shader Cores** GPU ke sabse chhote compute units hain, jo groups (Streaming Multiprocessors) mein organize hote hain aur ek group ke andar usually same instruction chalate hain.
- **Warp divergence** — jab ek hi group ke threads different code paths (if-else) lete hain, GPU ki efficiency girti hai. GPU sabse zyada fast tab hota hai jab code uniform ho.
- **Host (CPU)** aur **Device (GPU)** milke kaam karte hain — CPU decision-making aur orchestration karta hai, data ko GPU ki VRAM mein bhejta hai, aur GPU par ek "kernel" (parallel function) launch karta hai jo thousands of threads pe ek saath chalta hai.
- Host-Device data transfer (PCIe ke through) **free nahi hai** — isliye efficient GPU programming mein data ko baar-baar copy karne se bachna chahiye.
- Modern AI GPUs (jaise NVIDIA H100) mein **Tensor Cores** bhi hote hain, jo specifically matrix multiplication (deep learning ka core operation) ke liye optimize hote hain.
- GPU CPU ka **replacement nahi**, balki ek **specialized teammate** hai — dono milke complete system banate hain.
