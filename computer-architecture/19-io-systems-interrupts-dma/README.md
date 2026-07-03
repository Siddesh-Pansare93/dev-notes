# I/O Systems, Interrupts & DMA

Socho tu apna laptop use kar raha hai — keyboard pe type kar raha hai, mouse move kar raha hai, Wi-Fi se internet aa raha hai, aur SSD se file load ho rahi hai. Yeh sab **I/O devices** hain (Input/Output devices), aur inme se har ek CPU se "baat" karna chahta hai. Lekin CPU toh ek hi hai — woh billions instructions per second execute kar raha hai apne kaam mein. Toh sawaal yeh hai: **CPU ko kaise pata chale ki keyboard pe koi key dabi hai, ya disk se data aa gaya hai?**

Yeh poora chapter isi sawaal ka jawab hai — I/O devices CPU se kaise baat karte hain, CPU unhe kaise "sunta" hai (polling vs interrupts), aur bade data transfers (jaise disk se RAM mein file copy) ke liye CPU ko baar-baar disturb kiye bina kaam kaise hota hai (DMA).

> [!info]
> Yeh chapter hardware-level (Computer Organization) perspective se likha gaya hai — **kaise** CPU aur devices electrically/architecturally baat karte hain. OS-level perspective — jaise interrupt handlers OS scheduler ke saath kaise integrate hote hain, ya I/O scheduling algorithms — uska detail tujhe already `operating_systems/05_io_systems/` notes mein mil chuka hoga (`01_io_hardware.md`, `05_interrupt_handling.md`). Hum yahan us knowledge ko duplicate nahi karenge, balki uski **hardware foundation** banayenge.

---

## Part 1: I/O Devices CPU se Baat Kaise Karte Hain?

### Kya hota hai?

Har I/O device (keyboard, mouse, disk, network card, printer) apne aap CPU ki memory ya registers ko directly touch nahi kar sakta. Beech mein ek **I/O Controller** (ya **Device Controller**) hota hai — yeh ek chhota chip/circuit hai jo device aur system bus ke beech translator ka kaam karta hai.

```
┌──────────┐      ┌───────────────────┐      ┌─────────┐      ┌─────┐
│ Keyboard │──────│  Keyboard          │──────│ System  │──────│ CPU │
│ (device) │      │  Controller (chip) │      │  Bus    │      │     │
└──────────┘      └───────────────────┘      └─────────┘      └─────┘
                          │
                   ┌──────┴──────┐
                   │  Registers:  │
                   │  - Data Reg  │  ← key ka scan code yahan aata hai
                   │  - Status Reg│  ← "data ready hai kya?" flag
                   │  - Control Reg│ ← CPU device ko commands deta hai
                   └─────────────┘
```

Har controller ke andar kuch chhote registers hote hain:

| Register | Kaam |
|---|---|
| **Data Register** | Actual data yahan aata/jaata hai (jaise keyboard ka scan code, ya disk se ek byte) |
| **Status Register** | Device ki current state batata hai — "busy hoon", "data ready hai", "error aaya" |
| **Control Register** | CPU is register mein likh ke device ko command deta hai — "start karo", "stop karo", "yeh mode use karo" |

**Analogy — Railway Reservation Counter:**

Socho har device ek **counter clerk** hai apne chhote office (controller) mein baitha hua. Clerk ke paas ek **status board** hai jispe likha hota hai "FREE" ya "BUSY", aur ek **tray** hai jahan form (data) aata-jaata hai. CPU (jo ek bade manager jaisa hai, sabke saath kaam karta hai) is clerk se seedha baat nahi karta — woh us clerk ke status board aur tray (registers) ke through hi interact karta hai.

### CPU I/O registers ko access kaise karta hai?

Do main tareeke hain:

1. **Memory-Mapped I/O**: Device registers ko normal RAM addresses ki tarah hi memory address space mein map kar diya jaata hai. CPU normal `LOAD`/`STORE` instructions se hi in registers ko read/write kar sakta hai — usko pata bhi nahi chalta ki yeh RAM hai ya device register. (Modern systems — ARM, most embedded — yeh use karte hain)
2. **Isolated / Port-Mapped I/O**: Device registers ka apna alag address space hota hai ("I/O ports"), aur CPU ke paas special instructions hoti hain unhe access karne ke liye (x86 mein `IN` aur `OUT` instructions). RAM aur I/O address spaces completely separate rehte hain.

> [!tip]
> x86 processors (Intel/AMD, jispe teri machine chalti hogi) dono support karte hain — kuch legacy devices (jaise old keyboard controller) port-mapped I/O use karte hain (`IN`/`OUT` instructions), jabki modern devices (GPU, NVMe SSD) memory-mapped I/O use karte hain. Isko **MMIO (Memory-Mapped I/O)** bolte hain — tu jab kabhi driver code mein `readl()`/`writel()` jaisi functions dekhega Linux kernel mein, woh yehi MMIO access hai.

---

## Part 2: Polling vs Interrupt-Driven I/O

Ab asli sawaal: CPU ko kaise pata chale ki device "ready" hai — matlab data aa chuka hai ya device free hai naya command lene ke liye?

### Approach 1: Polling (Busy-Waiting)

**Kya hota hai?**

CPU baar-baar, ek loop mein, device ke **Status Register** ko check karta rehta hai: "ready hai kya? ready hai kya? ready hai kya?" Jab tak "haan" na mile, CPU yehi karta rehta hai — aur kuch nahi karta.

```c
// Polling — pseudo-code
while (status_register != READY) {
    // kuch mat karo, bas check karte raho
}
read(data_register);   // ab data lo
```

**Analogy — WhatsApp message ke liye phone baar-baar check karna:**

Socho tu kisi important WhatsApp message ka wait kar raha hai. Ek tarika hai: **har 2 minute mein phone uthao, screen on karo, dekho message aaya ya nahi, phir wapas phone rakh do.** Agar message nahi aaya, tu phir se apna kaam karne lagta hai, lekin 2 minute baad phir check karta hai. Isme problem yeh hai — tu apna asli kaam (padhai, coding, kuch bhi) baar-baar interrupt kar raha hai sirf check karne ke liye, chahe 50 baar mein se 49 baar koi naya message hi na ho.

Yehi exactly polling mein hota hai — **CPU apna productive kaam chhod ke baar-baar sirf "check" karne mein apna time waste karta hai.**

**Problems with Polling:**

- CPU cycles **waste** hote hain — jab tak device ready nahi hota, CPU kuch productive nahi kar sakta (agar simple busy-wait loop hai)
- Agar polling frequency zyada rakhi (jaise har microsecond check karo), CPU almost pura time waise hi busy rehta hai
- Agar polling frequency kam rakhi (jaise har second check karo), toh **latency** badh jaati hai — device ready ho chuka tha, lekin CPU ko 1 second baad pata chala

> [!warning]
> **Common misconception**: "Polling hamesha bekaar hai." Aisa nahi hai! Kuch scenarios mein polling actually **better** hoti hai — jaise jab device ki response itni fast expected ho ki interrupt ka overhead hi zyada lag jaaye (real-time/embedded systems mein), ya jab ek hi thread ko dedicated tarike se ek fast device (jaise high-speed network card, NVMe SSD in some modes) handle karna ho. Isko **"polling mode drivers"** kehte hain — Linux ka `NAPI` (New API) network driver framework high-traffic situations mein polling pe switch kar jaata hai kyunki interrupt-per-packet zyada expensive ho jaata.

### Approach 2: Interrupt-Driven I/O

**Kya hota hai?**

Iske bajaye, CPU apna normal kaam karta rehta hai. Jab device ready hota hai (data aa gaya, ya operation complete ho gaya), **device khud CPU ko ek signal bhejta hai** — jise **interrupt** kehte hain. CPU turant apna current kaam (temporarily) rok deta hai, interrupt ko handle karta hai, aur phir wapas apne pichle kaam pe laut aata hai.

```c
// Interrupt-driven — CPU apna normal kaam karta rehta hai
main_program_running();
// ... jab device ready hota hai, hardware CPU ko interrupt signal bhejta hai
// CPU automatically ISR (Interrupt Service Routine) pe jump karta hai
// ISR complete hote hi CPU wapas main_program pe continue karta hai
```

**Analogy — Phone Notification:**

Yeh hai asli solution: **tu apna phone silent rakh ke apna kaam karta reh, aur jab WhatsApp pe message aaye, phone khud tujhe notification (ring/vibration) de de.** Tu turant apna kaam chhod ke phone dekhta hai, message padhta hai, reply karta hai (ya baad ke liye chhod deta hai), aur phir wapas apne kaam pe laut aata hai. Tujhe baar-baar check karne ki zaroorat hi nahi — phone khud bata dega jab kuch zaruri ho.

Yehi hai **Interrupt-Driven I/O** — device khud CPU ko "batata" hai jab uska attention chahiye, CPU ko baar-baar poochna nahi padta.

### Polling vs Interrupts — Comparison Table

| Aspect | Polling | Interrupt-Driven |
|---|---|---|
| CPU utilization | Waste hoti hai (busy-wait) | Efficient — CPU free rehta hai jab tak zaroorat na ho |
| Latency | Depends on poll frequency (kabhi slow, kabhi accurate) | Turant response (hardware-triggered) |
| Complexity | Simple to implement | Thoda complex (ISR, context save/restore chahiye) |
| Best use case | Fast/predictable devices, embedded/real-time systems, high-throughput network (NAPI jaisa) | Zyada tar general-purpose devices — keyboard, mouse, disk, network |
| Overhead per event | Zero per-check overhead lekin repeated checks ka cost | Har interrupt ka fixed "context switch" overhead |

> [!tip]
> Real systems mein aksar **hybrid approach** use hoti hai — jaise Linux ka network stack normal traffic mein interrupts use karta hai, lekin jab traffic bahut high ho jaaye (jahan har packet pe interrupt costly ho jaaye), toh temporarily polling mode (NAPI) pe switch ho jaata hai. Best of both worlds.

---

## Part 3: Interrupt Handling — Poora Flow

Chalo ab dekhte hain ki jab ek interrupt aata hai, CPU ke andar **exactly** kya hota hai, step by step.

### Kya hota hai — High Level

1. Device ek electrical signal bhejta hai CPU ke ek special pin pe (ya interrupt controller ko) — isko **IRQ (Interrupt Request)** kehte hain
2. CPU current instruction complete karta hai (adhoori nahi chhodta), phir check karta hai ki koi pending interrupt hai
3. CPU apni current state (registers, Program Counter) ko **save** karta hai — kyunki usse baad mein wahi se continue karna hoga
4. CPU **ISR (Interrupt Service Routine)** — ek special function jo us specific interrupt ko handle karta hai — pe jump karta hai
5. ISR apna kaam karta hai (jaise keyboard se scan code padhna, buffer mein daalna)
6. ISR complete hone ke baad, CPU apni saved state **restore** karta hai
7. CPU wapas usi jagah se continue karta hai jahan se rukta tha, jaise kuch hua hi nahi

### ASCII Flow Diagram

```
   Normal Program Execution
   ┌─────────────────────────────┐
   │  Instruction 1               │
   │  Instruction 2               │
   │  Instruction 3               │◄────────────────┐
   └──────────────┬───────────────┘                  │
                  │                                   │
                  │   ⚡ IRQ signal aata hai            │
                  │   (jaise keyboard key press)       │
                  ▼                                   │
   ┌───────────────────────────────┐                  │
   │ CPU current instruction        │                  │
   │ complete karta hai              │                 │
   └──────────────┬──────────────────┘                │
                  ▼                                   │
   ┌───────────────────────────────┐                  │
   │ SAVE CONTEXT                    │                 │
   │ - PC (kahan tak pahuche the)     │                │
   │ - Registers (jo bhi use ho rahe) │                │
   │ - Flags/Status                   │                │
   │ (yeh sab STACK mein push hote hain)│               │
   └──────────────┬──────────────────┘                │
                  ▼                                   │
   ┌───────────────────────────────┐                  │
   │ Interrupt Vector Table dekho     │                │
   │ → is IRQ number ke liye kaunsa   │                │
   │   ISR address hai?               │                │
   └──────────────┬──────────────────┘                │
                  ▼                                   │
   ┌───────────────────────────────┐                  │
   │  JUMP to ISR                     │                │
   │  (Interrupt Service Routine)     │                │
   │  - Device ka data padho          │                │
   │  - Buffer mein store karo         │               │
   │  - Device ko "acknowledge" bhejo  │               │
   └──────────────┬──────────────────┘                │
                  ▼                                   │
   ┌───────────────────────────────┐                  │
   │ RESTORE CONTEXT                  │                │
   │ - Registers wapas load karo       │               │
   │ - PC wapas set karo                │              │
   │ (stack se POP hote hain)           │              │
   └──────────────┬──────────────────┘                │
                  │                                   │
                  └───────────────────────────────────┘
              (wapas Instruction 4 se continue,
               jaise kuch interrupt hua hi nahi)
```

**Analogy — Doctor apne patient checkup ke beech mein emergency call attend karta hai:**

Socho ek doctor patient ka checkup kar raha hai (normal program execution). Achanak emergency call aata hai (IRQ). Doctor patient se bolta hai "ek second rukiye" — apna current point yaad rakhta hai ki checkup mein kahan tak pahuncha tha (context save), phone attend karta hai (ISR execute), call khatam karke phir se wahi se checkup continue karta hai jahan chhoda tha (context restore) — bilkul aise jaise beech mein kuch hua hi na ho.

> [!info]
> **Context Save/Restore** yehi mechanism hai jo **Context Switching** ka bhi core hai — jab OS ek process se doosre process pe switch karta hai (multitasking ke liye), wahan bhi yehi save/restore pattern use hota hai, bas thoda bada scale pe (poora process state, memory mappings, etc.). Detailed process scheduling ka context tujhe `operating_systems` ke process management notes mein already mil chuka hoga.

### Interrupt Service Routine (ISR) — Zaroori Baatein

- ISR ek chhota, **fast** piece of code hona chahiye — kyunki jab tak ISR chal raha hai, us particular interrupt type ke naye occurrences typically block rehte hain (aur kabhi kabhi doosre bhi, priority ke hisaab se)
- ISR ke andar heavy computation nahi karte — sirf zaroori kaam (data ko buffer mein daalna) karke jaldi return kar dete hain. Baaki heavy lifting baad mein "deferred work" ke through hoti hai (Linux mein isko **top half / bottom half** ya **tasklets/softirqs** kehte hain — OS notes mein detail milega)
- Har ISR ka address ek table mein predefined hota hai — usko **Interrupt Vector Table (IVT)** kehte hain (agla section)

---

## Part 4: Interrupt Priority aur Vectored Interrupts

### Problem: Ek saath multiple interrupts aa jaayein toh?

Socho keyboard aur mouse dono ek saath signal bhej rahe hain, aur ek timer interrupt bhi due hai. CPU ek time pe sirf ek interrupt handle kar sakta hai — toh decide kaise ho ki pehle kiska number aaye?

### Interrupt Priority

Har interrupt source ko ek **priority level** assign hoti hai. Zyada critical devices (jaise power failure signal, ya hardware fault) ki priority sabse zyada hoti hai; kam critical (jaise keyboard) ki kam.

```
Priority Level (High → Low):
┌────────────────────────────────────┐
│ 0. Hardware Fault / Power Failure   │  ← sabse zaroori, turant handle karo
│ 1. Timer Interrupt (system clock)   │
│ 2. Disk / Storage I/O               │
│ 3. Network Card                     │
│ 4. Keyboard / Mouse                 │  ← sabse kam critical (relatively)
└────────────────────────────────────┘
```

Agar ek low-priority ISR chal raha hai aur ek high-priority interrupt aa jaata hai, toh usually CPU **current ISR ko bhi pause** kar sakta hai (interrupt ke andar interrupt — "nested interrupts") aur pehle high-priority wala handle karta hai.

> [!warning]
> Har CPU/OS combination mein nested interrupts allow nahi hote by default — kai simple systems mein jab ek ISR chal raha hota hai, toh interrupts temporarily **disable** (mask) kar diye jaate hain taaki cheezein predictable rahein. Priority-based preemption zyada sophisticated systems mein hota hai.

### Vectored Interrupts

**Kya hota hai?**

Purane systems mein, jab interrupt aata tha, CPU ek hi generic ISR pe jump karta tha, aur woh ISR khud check karta tha ki "kaunsa device tha jo interrupt bheja" (yeh polling jaisa hi tha, bas interrupt ke andar!). Isse slow hota tha.

**Vectored Interrupts** isko solve karte hain — har device/interrupt type ka apna **unique interrupt number (IRQ number)** hota hai, aur ek **Interrupt Vector Table** memory mein predefined jagah pe rakhi hoti hai, jisme har IRQ number ke corresponding uske ISR ka address already likha hota hai.

```
Interrupt Vector Table (IVT) — example
┌─────────┬──────────────────────────┐
│ IRQ #   │  ISR Address              │
├─────────┼──────────────────────────┤
│ IRQ 0   │  0x0000_1A2B  (Timer)     │
│ IRQ 1   │  0x0000_2F3C  (Keyboard)  │
│ IRQ 2   │  0x0000_4D5E  (Cascade)   │
│ IRQ 6   │  0x0000_7B8C  (Floppy/Disk)│
│ IRQ 12  │  0x0000_9E1F  (Mouse)     │
│ IRQ 14  │  0x0000_C3D4  (Primary IDE)│
└─────────┴──────────────────────────┘
```

Jab device interrupt bhejta hai, woh apne saath apna **IRQ number** bhi bhejta hai (ya interrupt controller pehchaan leta hai kaunsa pin trigger hua). CPU directly IVT mein us number ka entry dekh ke seedha sahi ISR pe jump kar jaata hai — koi generic "check karo kaun hai" wala overhead nahi.

**Analogy — Railway Station ka Announcement System:**

Socho railway station pe har platform ka apna dedicated announcement/staff hota hai. Jab train 5 platform pe aati hai, seedha Platform 5 ka staff activate hota hai — kisi generic announcer ko yeh check nahi karna padta "kaunsa platform hai, chalo dekhte hain." Yeh **direct addressing** hi vectored interrupts ka essence hai.

### Hardware jo yeh sab manage karta hai — PIC / APIC

Real hardware mein, ek dedicated chip hota hai jo multiple devices ke interrupts ko manage karta hai — priority decide karta hai, CPU ko correct signal deta hai:

- **PIC (Programmable Interrupt Controller)** — purana approach (Intel 8259), limited number of IRQ lines handle karta tha
- **APIC (Advanced PIC)** — modern systems mein use hota hai, multi-core CPUs ke saath kaam karta hai, zyada IRQ lines aur better priority handling support karta hai

> [!info]
> Jab tu Linux mein `cat /proc/interrupts` chalata hai, wahan tujhe exactly yeh dikhta hai — kaunsa IRQ number kis device ko assigned hai, aur kitni baar woh interrupt trigger hua hai. Try karke dekh, interesting hai!

---

## Part 5: DMA (Direct Memory Access)

### Problem — Interrupts bhi kaafi nahi hain bade data transfers ke liye

Interrupt-driven I/O keyboard/mouse jaise devices ke liye badhiya hai — woh occasionally, chhote amount mein data bhejte hain (ek key press = 1-2 bytes). Lekin socho ek **disk se 500 MB ki file** RAM mein copy karni hai, ya **network se** bahut saara data aa raha hai.

Agar hum interrupt-driven approach hi use karein — **har single byte ke liye ek interrupt** — toh:

```
500 MB file = 524,288,000 bytes
Agar har byte ke liye interrupt aaye:
→ 524 million interrupts!
→ Har interrupt mein context save/restore ka overhead
→ CPU ka zyada tar time interrupt handling mein hi chala jaayega
→ Actual useful kaam ke liye CPU ke paas time hi nahi bachega
```

Yeh clearly impractical hai. Isi problem ko solve karne ke liye **DMA (Direct Memory Access)** banaya gaya.

### Kya hai DMA?

**DMA ek dedicated hardware controller hai (DMA Controller / DMAC) jo devices ko seedha RAM ke saath data transfer karne deta hai — CPU ko beech mein involve kiye bina, byte-by-byte.**

CPU sirf itna karta hai:
1. DMA Controller ko batata hai: "yeh source address hai (disk), yeh destination address hai (RAM mein kahan), itna data transfer karna hai"
2. DMA Controller ko "go" bol deta hai
3. CPU apne kaam pe wapas chala jaata hai (kuch aur productive kaam karta hai)
4. DMA Controller khud disk se RAM tak poora data transfer complete kar deta hai, bina CPU ko baar-baar disturb kiye
5. Jab **poora transfer complete** ho jaata hai (na ki har byte pe), tabhi DMA Controller **ek single interrupt** CPU ko bhejta hai: "kaam ho gaya, bhai!"

**Analogy — Courier Company ko bulk delivery ka kaam sौंपना:**

Socho tu ek company ka manager hai (CPU), aur tujhe 1000 packets ek warehouse se doosre warehouse bhejwane hain. Do tarike hain:

1. **Bina DMA (Manager khud har packet uthaye):** Tu khud har packet ko uthata hai, gaadi mein rakhta hai, chalke doosri jagah rakhta hai, wapas aata hai — 1000 baar! Tera pura din isi mein chala jaayega, aur tu apna asli managerial kaam (planning, meetings) kabhi nahi kar paayega.

2. **DMA ke saath (Courier company ko outsource karna):** Tu ek courier company (DMA Controller) ko bolta hai — "yeh 1000 packets hain, is warehouse se us warehouse tak pahuncha do." Courier company apna kaam khud sambhal leti hai — tu wapas apne office jaake apna asli kaam (meetings, planning — matlab actual computation) karta hai. Jab courier company poora kaam complete kar leti hai, woh tujhe **ek hi phone call** karti hai: "sir, saara maal deliver ho gaya." Tujhe 1000 baar phone nahi aata — sirf ek baar, jab kaam poora ho jaaye.

Yehi hai DMA ka essence — **bulk data transfer ka kaam CPU se hata ke ek specialized hardware (DMA Controller) ko de dena, aur sirf transfer complete hone pe ek single notification lena.**

### DMA Transfer ka Flow

```
┌─────┐                                          ┌─────────┐
│ CPU │──1. Setup command (source,dest,size)────►│  DMA    │
│     │                                          │Controller│
└─────┘                                          └────┬────┘
   │                                                   │
   │  2. CPU free ho jaata hai,                        │ 3. DMA Controller
   │     apna doosra kaam karta hai                     │    disk se RAM tak
   ▼                                                   │    seedha data
┌──────────────────┐                                   │    transfer karta hai
│ CPU normal        │                                  │    (bus ko directly
│ instructions      │◄─────────────────────────────────┤     use karke)
│ execute kar raha  │                                   │
│ hai (independent) │                                   ▼
└──────────────────┘                          ┌───────────────────┐
   ▲                                          │  Disk  ───────►RAM │
   │                                          │  (data seedha ja   │
   │  5. Single interrupt:                    │   raha hai, CPU    │
   │     "transfer complete!"                  │   involved nahi)   │
   └──────────────────────────────────────────┴───────────────────┘
                    4. Poora transfer complete hone ke baad
```

### Before DMA vs After DMA — Comparison

| Aspect | **Without DMA** (Programmed I/O) | **With DMA** |
|---|---|---|
| Data path | Device → CPU register → RAM (do hops, CPU involved) | Device → RAM (seedha, CPU involved nahi) |
| CPU involvement | Har byte ke liye CPU active rehta hai | Sirf setup aur final "done" interrupt ke liye |
| Interrupts | Ho sakta hai har byte/chunk pe (bahut zyada) | Sirf ek baar, jab poora transfer complete ho |
| CPU free time | Bahut kam — CPU transfer ke dauraan busy rehta hai | Bahut zyada — CPU parallel mein doosra kaam kar sakta hai |
| Speed (bade transfers ke liye) | Slow — CPU bottleneck ban jaata hai | Fast — hardware-level parallel transfer |
| Best use case | Chhote, occasional data (keyboard, mouse) | Bade, bulk transfers (disk, network, graphics) |

### Real Numbers — Kyun Zaruri Hai DMA?

Socho ek modern SSD **~3500 MB/s** tak data transfer kar sakta hai (NVMe SSD). Agar CPU khud har byte ko manually copy kare (jaise `MOV` instruction se ek-ek byte le jaana), CPU ka **poora time** hi isi mein chala jaayega, aur baaki application logic (jaise tera Node.js server request handle karna) ke liye kuch bachega hi nahi.

DMA ki wajah se, disk controller khud data ko RAM mein daal deta hai (modern systems mein toh **Bus Mastering DMA** use hota hai — jahan device khud bus ko control karke transfer initiate kar sakta hai), aur CPU sirf shuru mein setup karta hai aur end mein ek interrupt receive karta hai. Beech ka poora time CPU **free** hota hai apne actual computation ke liye.

> [!tip]
> **Cycle Stealing**: DMA controller aur CPU dono same system bus/memory share karte hain. Jab DMA active transfer kar raha hota hai, woh occasionally bus ko "steal" karta hai ek cycle ke liye data move karne ke liye — isse CPU thoda slow ho sakta hai memory access ke liye (kyunki bus busy hai), lekin yeh overhead DMA na hone ki situation se bahut kam hota hai. Isko **cycle stealing DMA** kehte hain, jo **burst mode DMA** (ek baar mein poora block transfer, bus fully occupy) se contrast karta hai.

> [!info]
> **DMA aur Cache Coherency** — Ek gotcha: jab DMA controller directly RAM mein data likhta hai, lekin CPU ka cache us purani (stale) value ko already hold kiye ho sakta hai. Isliye systems ko **cache coherency** mechanisms chahiye hote hain taaki CPU ko pata chale ki cached data ab outdated hai. Iska deeper detail tujhe **12-memory-hierarchy** aur **13-cache-memory** chapters mein already mil chuka hoga.

### DMA Modes (Briefly)

| Mode | Kya hota hai |
|---|---|
| **Burst Mode** | Poora data block ek hi baar mein transfer ho jaata hai, DMA poori tarah bus control karta hai jab tak khatam na ho. Fast, lekin us dauraan CPU bus access nahi kar sakta. |
| **Cycle Stealing Mode** | DMA ek time pe ek chhota chunk (jaise 1 word) transfer karta hai, phir bus CPU ko wapas de deta hai, phir wapas le leta hai — repeat. Slower transfer, lekin CPU ko bhi thoda access milta rehta hai. |
| **Transparent Mode** | DMA sirf tab transfer karta hai jab CPU bus use hi nahi kar raha ho. Sabse slow, lekin CPU pe zero impact. |

---

## Poora Picture — Ek Saath Dekhte Hain

```
                         ┌──────────────────────┐
                         │         CPU            │
                         └───────────┬────────────┘
                                     │
                    ┌────────────────┼─────────────────┐
                    │                │                  │
              Chhota, occasional   Priority/       Bade, bulk
              data (keyboard,      Vectored        transfers
              mouse)               interrupts       (disk, network)
                    │                │                  │
                    ▼                ▼                  ▼
          ┌──────────────┐  ┌───────────────┐  ┌────────────────┐
          │ Interrupt-    │  │ Interrupt     │  │  DMA Controller │
          │ Driven I/O    │  │ Controller    │  │  handles bulk    │
          │ (per event)   │  │ (PIC/APIC)    │  │  transfer, CPU   │
          │               │  │ manages IRQs  │  │  sirf 1 interrupt│
          │               │  │ + priority    │  │  receive karta   │
          └──────────────┘  └───────────────┘  └────────────────┘
```

---

## Common Misconceptions / Gotchas

> [!warning]
> **"Interrupts hamesha polling se better hote hain"** — Nahi. Polling kabhi kabhi better hoti hai jab events itni frequent hon ki interrupt overhead khud hi bottleneck ban jaaye (jaise high-throughput networking — Linux NAPI isi wajah se hybrid approach leta hai).

> [!warning]
> **"DMA CPU ko completely bypass karta hai, CPU ka koi role nahi hota"** — Galat. CPU hi DMA transfer ko **initiate** karta hai (source, destination, size batata hai), aur transfer complete hone pe interrupt bhi CPU ko hi milta hai. DMA sirf **beech ke repetitive byte-copying kaam** ko CPU se hata deta hai — poora control CPU ke haath mein hi rehta hai.

> [!warning]
> **"Interrupt aate hi turant current instruction beech mein hi rok di jaati hai"** — Nahi, CPU current instruction ko **complete** karta hai pehle, phir hi interrupt check hota hai (typically instruction cycle ke end mein). Adhoori instruction ko beech mein rokna data corruption ka risk create karega.

> [!info]
> **DMA aur Interrupts dono saath chalte hain, competitor nahi hain** — DMA "kaise data move hota hai" ka jawab hai, aur interrupts "CPU ko kab pata chale" ka. DMA transfer complete hone ki notification khud ek interrupt ke through hi aati hai! Yeh dono concepts ek doosre ko complement karte hain, replace nahi karte.

---

## Key Takeaways

- I/O devices apne **Device Controller** (Data/Status/Control registers ke saath) ke through CPU se baat karte hain — ya toh **Memory-Mapped I/O** (normal address space share) ya **Port-Mapped I/O** (separate `IN`/`OUT` instructions) ke zariye.
- **Polling** = CPU baar-baar khud check karta hai device ready hai ya nahi (jaise phone baar-baar dekhna) — simple lekin CPU cycles waste karta hai.
- **Interrupt-Driven I/O** = device khud CPU ko signal (IRQ) bhejta hai jab attention chahiye (jaise phone notification) — CPU apna normal kaam continue karta hai beech mein.
- Interrupt handling flow: **IRQ aata hai → current instruction complete → context save (PC, registers stack pe) → ISR execute → context restore → wapas normal execution continue.**
- **Interrupt Priority** decide karta hai ki multiple simultaneous interrupts mein pehle kiska number aaye; critical hardware faults sabse high priority pe hote hain.
- **Vectored Interrupts** ka matlab hai har IRQ number ka apna dedicated ISR address predefined hota hai (**Interrupt Vector Table**), taaki CPU seedha sahi handler pe jump kar sake bina "kaun hai" check kiye.
- **PIC/APIC** dedicated hardware chips hain jo multiple device interrupts ko manage, prioritize, aur route karte hain.
- **DMA (Direct Memory Access)** bade, bulk data transfers (disk, network) ke liye banaya gaya — device seedha RAM se data transfer karta hai, CPU ko har byte ke liye disturb kiye bina, aur sirf transfer complete hone pe **ek single interrupt** milta hai.
- DMA ka core benefit: CPU **free** rehta hai transfer ke dauraan apna doosra useful kaam karne ke liye — bina DMA ke, CPU bulk transfers mein hi bottleneck ban jaata.
- Deeper OS-level detail (interrupt handlers ka top-half/bottom-half split, I/O scheduling algorithms, device driver architecture) `operating_systems/05_io_systems/` notes mein already cover ho chuka hai — yeh chapter uski hardware foundation hai.
