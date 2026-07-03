# ROM, Firmware & BIOS/UEFI

Socho ek Sunday subah. Tumne apna laptop power button dabaya. Ek second ke andar screen pe laptop ka logo aata hai, phir Windows/Ubuntu ka loading spinner, aur phir tumhara desktop. Ye sab itni jaldi aur "seamlessly" hota hai ki kabhi socha nahi hoga — **CPU ko ye kaise pata chala ki karna kya hai?** RAM to abhi khaali hai (power off tha, RAM ne sab kuch bhula diya), hard disk pe OS pada hai lekin CPU directly disk se instructions nahi padh sakta.

Is chapter mein hum exactly yahi gap explain karenge: **ROM, Firmware, aur BIOS/UEFI** — wo cheezein jo computer ko "zinda" karti hain power button dabne ke pehle second se lekar OS load hone tak.

> [!info]
> Ye chapter Computer Organization & Architecture series ka hai. Agar tumne memory hierarchy (RAM, cache) wala chapter pehle nahi padha, ek baar dekh lena — RAM vs ROM ka contrast samajhna easy ho jayega.

---

## 1. Pehle samjho: RAM ka problem kya hai?

Tumhe pata hai RAM (Random Access Memory) **volatile** hoti hai — matlab power gayi, sab data gaya. Ye Zomato ke ek delivery boy ke short-term memory jaisa hai: usko abhi ke order ka address yaad hai, lekin shift khatam hote hi bhool jayega, kal fir se batana padega.

Ab problem ye hai: computer start hote hi CPU ko **kuch to instructions chahiye** run karne ke liye — jaise "check karo RAM kaam kar rahi hai ya nahi", "keyboard connect hai ya nahi", "hard disk/SSD dhundo aur usse OS load karo". Ye instructions kahan store hongi?

- RAM mein nahi — kyunki power off hone par RAM khaali ho jaati hai. Power on hote hi RAM mein **kuch nahi hota**.
- Hard disk pe bhi poori tarah depend nahi kar sakte — hard disk ko access karne ke liye bhi controller logic chahiye, aur agar disk corrupt/absent ho to CPU ko pata chalna chahiye "disk not found" bolne ke liye. Wo basic logic bhi kahin se aana chahiye.

Isliye chahiye ek memory jo:
1. **Non-volatile** ho — power off hone par bhi data na khoye.
2. Motherboard pe hi permanently soldered/fitted ho, taaki system boot hote hi turant available ho.
3. Change na ho paaye easily — accidentally delete/corrupt na ho, kyunki agar ye corrupt ho gayi to computer **bilkul bhi start nahi hoga** (isse "bricking" kehte hain).

Yahi kaam karti hai **ROM**.

```
                POWER ON hone ke turant baad:

   +------------------+          +------------------+
   |       RAM         |          |       ROM        |
   |  (khaali/garbage)  |          | (BIOS/UEFI code) |
   |   volatile         |          |  non-volatile     |
   +------------------+          +------------------+
                                        |
                                        v
                          CPU sabse pehle ROM se
                          instructions padhta hai
```

---

## 2. ROM kya hai?

**ROM = Read-Only Memory.** Naam thoda misleading hai — "read-only" ka matlab hamesha "kabhi likh nahi sakte" nahi hota (aage dekhenge). Asli baat ye hai:

- Ye ek **non-volatile memory chip** hai motherboard pe (ya CPU/chipset ke paas) soldered.
- Isme wo **basic, low-level instructions** stored hoti hain jo computer ko power-on ke turant baad chahiye — jaise hardware check karna aur OS ko load karna shuru karna.
- Normal use mein CPU sirf ye data **padhta** hai, usme likhta nahi — isliye "read-only" naam pada. Lekin kuch types of ROM mein specialized tareeke se rewrite bhi kiya ja sakta hai (jaise BIOS update karna).

### RAM vs ROM — quick comparison

| Property | RAM | ROM |
|---|---|---|
| Volatility | Volatile (power off = data gone) | Non-volatile (data permanent) |
| Speed | Bahut fast | RAM se dheemi |
| Use | Running programs, temporary data | Boot instructions, firmware |
| Writable? | Haan, baar baar, easily | Mostly read-only; kuch types rewritable but rarely |
| Analogy | Tumhari working memory jab tum calculation kar rahe ho | Tumhari birth certificate — permanent record, baar baar nahi badalta |

**Analogy:** Socho ek **tiffin service (dabbawala)** ka fixed route map jo ek laminated card pe print hai aur dabbawale ke box mein hamesha rehta hai — chahe wo kitne bhi tiffins deliver kare, ye card kabhi mitta nahi, aur wo isko roz roz naya nahi likhta. Ye route card hai ROM. Uske daily delivery notes (kis ghar se kitna paisa lena hai, aaj kaun sa gate khula hai) — ye hai RAM, jo roz change hoti hai aur agla din bhoola diya jaata hai.

> [!tip]
> Mnemonic: **RAM = temporary scratchpad, ROM = permanent instruction manual.**

---

## 3. ROM ke types — evolution samjho

ROM ek single fixed technology nahi hai — waqt ke saath ye evolve hui hai, kyunki manufacturers ko chahiye tha ki "read-only" cheez ko **kabhi kabhi update bhi** kiya ja sake (bugs fix karne, features add karne ke liye).

```
MROM  --->  PROM  --->  EPROM  --->  EEPROM  --->  Flash Memory
(fixed)    (once)     (UV erase)   (electric erase)  (fast electric erase, modern)
```

### a) MROM (Masked ROM)
- Sabse purana type. Factory mein hi chip design karte waqt data **permanently hardwire** kar diya jaata hai (mask ke through, chip fabrication ke time).
- Ek baar bana diya, to kabhi change nahi ho sakta — bilkul ek **printed book** jaisa, chapte ke baad edit nahi kar sakte.
- Aaj-kal practically obsolete hai (bohot inflexible tha, ek bug matlab poora chip fek do).

### b) PROM (Programmable ROM)
- Blank chip factory se aati hai, aur ek baar **user/manufacturer khud "burn" kar sakta hai** special device (PROM programmer) se.
- Lekin ek baar burn ho gaya, to fir se kabhi nahi likh sakte — **"write once, read many"**.
- Analogy: ek **blank CD-R** — khud burn kar sakte ho ek baar, phir wo fixed ho jaati hai.

### c) EPROM (Erasable Programmable ROM)
- Ismein ek improvement aaya: chip ko **UV light (ultraviolet)** se erase kiya ja sakta hai, aur fir se reprogram kar sakte ho.
- Chip ke upar ek chota **quartz window** hota tha jisse UV light daalte the erase karne ke liye — poora data ek saath erase hota tha (selective nahi).
- Practical problem: UV eraser machine chahiye, poora process slow aur manual tha.

### d) EEPROM (Electrically Erasable Programmable ROM)
- Ab UV light ki zaroorat nahi — **electrical signals se hi erase aur rewrite** kar sakte ho, chip ko circuit se nikale bina.
- Byte-by-byte erase/write possible — bahut zyada flexible.
- Limitation: erase/write cycles limited hote hain (typically ~100,000 cycles), aur speed EPROM se better lekin abhi bhi slow-ish thi bade data ke liye.

### e) Flash Memory (modern era)
- EEPROM ka hi advanced version, lekin **block-by-block erase/write** karta hai (poora byte-by-byte nahi), jisse ye **bahut fast** ho gaya.
- Aaj ke **BIOS/UEFI chips, USB pendrives, SSDs, phone storage** — sab Flash memory use karte hain.
- Ye wahi "Flash" hai jiska naam tumne SSD/pendrive context mein suna hoga.

### Quick comparison table

| Type | Erase method | Rewritable? | Speed | Modern use |
|---|---|---|---|---|
| MROM | Kabhi nahi | Nahi | N/A | Obsolete |
| PROM | Kabhi nahi (once burned) | Sirf ek baar | N/A | Rare, legacy |
| EPROM | UV light | Haan (poora chip) | Slow | Obsolete |
| EEPROM | Electrical | Haan (byte-level) | Medium | Small config storage |
| Flash | Electrical | Haan (block-level) | Fast | **BIOS/UEFI chips, SSDs, USB drives** |

> [!info]
> Aaj ke motherboards mein jo BIOS/UEFI chip hota hai, wo actually **Flash memory** hota hai — isiliye "BIOS update/flash karna" bolte hain. "Flashing the BIOS" literally isi Flash memory ko naye data se overwrite karne ko refer karta hai.

---

## 4. Firmware kya hota hai?

**Firmware** = wo software jo **hardware ke saath permanently/semi-permanently baked hota hai**, aur hardware ko basic level pe operate karne ke liye zaroori hota hai.

- Ye normal application software (Chrome, VS Code) jaisa nahi hai jo tum install/uninstall karte ho freely.
- Ye device ke ROM/Flash memory mein rehta hai, aur us specific hardware ko chalane ke liye "brain ka sabse pehla layer" hai.
- **BIOS/UEFI ek firmware hai** — lekin firmware sirf motherboard tak limited nahi. Har hardware device mein apna firmware hota hai:

```
Devices with their own firmware:
  - Motherboard          -> BIOS/UEFI
  - Hard disk / SSD       -> disk controller firmware
  - Router                -> router firmware (jo tum kabhi "update" karte ho)
  - Printer                -> printer firmware
  - Smart TV, washing machine -> embedded firmware
  - Phone                 -> baseband/modem firmware
```

**Analogy:** Firmware ek **naye employee ka training manual + reflexes** jaisa hai jo company (hardware) join karte hi usko diya jaata hai — "agar fire alarm baje to yahan se exit lo", "phone kaise uthana hai" — ye basic operating instructions hain jo employee (hardware) ke bina kaam hi nahi kar payega, chahe uska "actual kaam" (application software/OS) kuch bhi ho.

**Software layers ka hierarchy samjho:**

```
+-------------------------------------------+
|   Applications (Chrome, VS Code, games)     |   <- tum inko use karte ho
+-------------------------------------------+
|   Operating System (Windows, Linux, macOS)  |   <- resource management, scheduling
+-------------------------------------------+
|   Firmware (BIOS/UEFI)                      |   <- hardware ko jagata hai, OS ko load karta hai
+-------------------------------------------+
|   Hardware (CPU, RAM, disk, motherboard)     |   <- physical circuits
+-------------------------------------------+
```

Firmware, hardware aur OS ke beech ka **pull hai** — hardware ko itna "samajhdar" banata hai ki wo OS ko load kar sake.

> [!info]
> Deeper OS-level detail (jaise OS boot loader, kernel initialization, process scheduling) is repo ke `operating_systems` notes mein cover hoga — yahan hum sirf firmware/BIOS tak ka scope rakhenge.

---

## 5. BIOS — sabse purana firmware standard

**BIOS = Basic Input/Output System.** 1980s se IBM PC compatible computers mein use ho raha hai — ek **bahut purana lekin foundational standard**.

### BIOS kya karta hai? (Boot process step-by-step)

```
[Power Button Press]
        |
        v
[1] CPU hardwired hota hai ek fixed memory address
    pe jump karne ke liye -> wahi BIOS/ROM chip hai
        |
        v
[2] POST (Power-On Self-Test) chalta hai
    - RAM check
    - Keyboard/mouse detect
    - CPU, graphics card check
    - Agar fail -> beep codes ya error screen
        |
        v
[3] BIOS bootable device dhoondta hai
    (hard disk, SSD, USB, CD/DVD)
    - Order "boot priority" mein set hota hai
        |
        v
[4] Bootable device ke pehle sector se
    "Bootloader" (MBR - Master Boot Record)
    load karta hai RAM mein
        |
        v
[5] Bootloader OS kernel ko load karta hai
        |
        v
[Operating System takes over -> Desktop dikhta hai]
```

**POST (Power-On Self-Test)** wo pehla kaam hai jo BIOS karta hai — jaise ek doctor operation se pehle patient ka basic checkup karta hai: BP normal hai? Pulse thik hai? Waise hi BIOS check karta hai RAM sahi hai, keyboard connected hai, graphics card detect ho raha hai. Agar kuch galat hai, to tumne wo "beep-beep" sound suni hogi ya kaali screen pe error — ye POST ki taraf se hai.

### BIOS ki limitations (kyun purana pad gaya)

BIOS 1980s ke hardware ke hisaab se design hua tha, aur modern hardware ke saath uski kai limitations expose ho gayin:

1. **16-bit mode mein chalta hai** — bahut purana processor mode, jisse boot process slow hota hai.
2. **MBR (Master Boot Record) partitioning scheme use karta hai**, jo sirf **2 TB tak ke disks** support karta hai aur max **4 primary partitions** allow karta hai.
3. **Boot slow hai** — sequential hardware initialization hota hai, parallel nahi.
4. **Mouse support nahi** — traditional BIOS setup screen sirf keyboard se navigate hoti hai (blue-ish text screens yaad hain shayad).
5. **Security features minimal** — koi built-in verification nahi ki bootloader/OS trusted source se aaya hai ya nahi (malware inject ho sakta hai boot process mein).

Isi wajah se ek naya standard aaya — **UEFI**.

---

## 6. UEFI — BIOS ka modern replacement

**UEFI = Unified Extensible Firmware Interface.** Ye Intel ki EFI (Extensible Firmware Interface) se evolve hua ek **industry-standard specification** hai jo 2000s mein aaya aur 2010s tak mostly BIOS ko replace kar chuka.

Zyada tar naye computers (2012+ ke baad ke Windows machines, sab Macs) **UEFI use karte hain**, chahe UI mein abhi bhi log isko "BIOS settings" bol dete hain (habit ki wajah se).

### UEFI BIOS se better kyun hai?

| Feature | BIOS | UEFI |
|---|---|---|
| Mode | 16-bit real mode | 32-bit/64-bit mode |
| Partitioning support | MBR (max 2TB disk, 4 partitions) | **GPT** (max ~9 ZB disk, 128 partitions) |
| Boot speed | Slow (sequential init) | **Fast** (parallel init, drivers pre-loaded) |
| UI | Text-only, keyboard-only | **Graphical**, mouse support |
| Security | Koi built-in verification nahi | **Secure Boot** support |
| Networking | Nahi | Built-in network stack (remote troubleshooting/update) |
| Pre-OS apps | Nahi | UEFI shell, diagnostic apps chala sakta hai |
| Extensibility | Limited | Modular drivers add kar sakte ho |

### GPT vs MBR — thoda detail

UEFI ka ek bada fayda hai **GPT (GUID Partition Table)** support:

- **MBR** sirf 32-bit disk addressing use karta hai, isliye max disk size **2 TB** tak limited hai, aur sirf **4 primary partitions** ban sakti hain.
- **GPT** 64-bit addressing use karta hai — **theoretically 9.4 ZB** (zettabytes!) tak disks support karta hai, aur **128 partitions** tak allow karta hai bina extended partition ka jhanjhat kiye.
- GPT apne aap ki **multiple copies (backup) rakhta hai** partition table ki — agar ek corrupt ho jaaye, dusri se recover ho sakta hai. MBR mein aisा kuch nahi tha.

**Analogy:** MBR ek **purani railway reservation register** jaisa hai jisme sirf 4 columns hain aur register ka size bhi limited hai — naye passengers ke liye jagah khatam ho jaati hai. GPT ek **modern digital IRCTC system** jaisa hai — unlimited (practically) bookings, aur agar server down ho to backup se turant recover ho jaata hai.

### Secure Boot

Ye UEFI ka ek headline security feature hai:

- Har bootloader/OS component **digitally signed** hona chahiye trusted certificate se.
- UEFI boot ke time verify karta hai ki jo bhi bootloader/OS load ho raha hai, wo **tampered/malware-infected to nahi hai**.
- Agar signature match nahi karta (untrusted/modified code), UEFI boot **block kar deta hai**.

**Analogy:** Secure Boot ek **airport security check** jaisa hai — sirf wahi passenger (bootloader/OS) plane (RAM/execution) mein chadh sakta hai jiska boarding pass (digital signature) verified ho. Bina verified pass ke, security (UEFI) usko andar hi nahi jaane degi.

> [!warning]
> Secure Boot kabhi kabhi Linux distros dual-boot karte waqt problem create karta hai kyunki kuch distros ke bootloaders Microsoft se signed nahi hote. Isliye "disable Secure Boot" karna padta hai aisi cases mein — ye ek common gotcha hai jo naye Linux users face karte hain.

### UEFI = superset, BIOS compatibility mode

Zyada tar modern UEFI firmwares mein ek **"Legacy Boot" / "CSM (Compatibility Support Module)" mode** hota hai jo purane BIOS-only OS/bootloaders ko bhi support karta hai — taaki backward compatibility bani rahe. Isliye settings screen mein tumhe "UEFI Boot" aur "Legacy Boot" dono options milte hain.

---

## 7. BIOS/UEFI settings kahan store hote hain? CMOS ka role

Ab ek interesting confusion clear karte hain: **BIOS/UEFI ka code Flash ROM mein hota hai, lekin uski settings (jo tum change karte ho) kahin aur store hoti hain.**

### CMOS kya hai?

- **CMOS (Complementary Metal-Oxide-Semiconductor)** ek chota, low-power memory chip hai motherboard pe jisme BIOS/UEFI ki **configuration settings** store hoti hain:
  - System date & time
  - Boot device order
  - Hardware configuration (jaise fan speed profile, overclocking settings)
  - Password settings

- CMOS memory bhi **volatile** hoti hai (RAM ki tarah) — agar power completely off ho jaaye aur backup na ho, to settings reset ho jaayengi.

### CMOS battery ka role

Isi problem ko solve karne ke liye motherboard pe ek chota **coin-cell battery** hoti hai (usually **CR2032**, 3V) jise **CMOS battery** kehte hain.

```
   Motherboard
   +------------------------------------------+
   |                                              |
   |   [CPU]      [RAM slots]     [Flash ROM]     |
   |                                (BIOS/UEFI      |
   |                                 code, non-       |
   |                                 volatile)         |
   |                                              |
   |   [CMOS chip] <---- powered by ----  ( CMOS   |
   |   (settings,                          battery, |
   |    volatile)                          CR2032) |
   |                                              |
   +------------------------------------------+
```

- Jab tak computer plug-in hai, CMOS ko **main power supply** se current milta hai.
- Jab computer unplug/off hota hai, CMOS battery **chhota sa current continuously supply karti hai** taaki CMOS chip ki settings (date/time, boot order) na khoyein.

**Ye battery khatam ho jaaye to kya hota hai?**
- Computer boot to ho jaayega (kyunki BIOS/UEFI **code** Flash ROM mein hai, wo battery pe depend nahi karta).
- Lekin **date/time reset ho jaayega** (hamesha 2002 ya kisi purani date pe restart hoga), aur custom BIOS settings (boot order, overclock settings) **default pe wapas chali jaayengi**.
- Ye ek common sign hai purane desktops mein "CMOS battery mar gayi hai, replace karo" — bahut sasti fix hai (₹30-50 ki battery).

> [!tip]
> Agar tumhara purana desktop har baar restart pe date/time galat dikhata hai, 99% chances hain CMOS battery weak ho gayi hai. Isse "CMOS reset" bhi bolte hain jab troubleshooting ke liye jaan-bujh kar battery nikal ke settings factory-default pe la dete hain.

### Zara clear karte hain naming confusion

| Term | Kya hai | Volatile? | Location |
|---|---|---|---|
| BIOS/UEFI firmware code | Actual instructions jo boot karti hain | Non-volatile | Flash ROM chip |
| CMOS | Settings storage (date, boot order, etc.) | Volatile | Chota CMOS chip |
| CMOS battery | Power source jo CMOS settings ko zinda rakhti hai power-off mein | N/A (battery) | Coin cell (CR2032) motherboard pe |

Log casually "CMOS settings" ya "BIOS settings" bol dete hain interchangeably, lekin technically CMOS = storage for settings, BIOS/UEFI = firmware jo un settings ko use karke chalta hai.

---

## 8. BIOS/UEFI settings screen kaise access karein?

- Computer restart karo, aur boot hote hi (logo screen pe) **specific key** baar-baar dabao:
  - Common keys: `Del`, `F2`, `F10`, `F12`, `Esc` (manufacturer ke hisaab se alag)
  - Dell: `F2`, HP: `Esc`/`F10`, Lenovo: `F1`/`F2`, ASUS: `Del`/`F2`

- Is screen mein tum kar sakte ho:
  - Boot order change (kis drive se pehle boot ho)
  - Date/time set
  - Secure Boot on/off
  - Virtualization (VT-x/AMD-V) enable — needed for Docker/VMs
  - Fan curves, RAM timings (advanced/overclocking users ke liye)
  - Password protection set karna

> [!warning]
> BIOS/UEFI settings mein galat cheez change karna (jaise CPU voltage/overclocking values) system ko boot na hone layak bana sakta hai. Agar pakka na ho kya kar rahe ho, sirf boot order jaisi safe settings hi touch karo.

---

## 9. Common misconceptions

- **"ROM ka matlab hamesha unwritable hota hai"** — galat. Flash-based BIOS/UEFI chips definitely rewritable hain (BIOS update/flash), bas normal operation mein CPU sirf read karta hai, write nahi.
- **"BIOS aur UEFI alag alag cheez hain jo saath exist karti hain"** — galat. UEFI, BIOS ka **replacement/successor** hai. Modern systems mein "BIOS settings" bolna sirf legacy habit hai — actually UEFI chal raha hota hai.
- **"CMOS battery nikaalne se BIOS/UEFI firmware delete ho jaayega"** — galat. Firmware Flash ROM mein hai, battery sirf CMOS settings (date/time/config) ko preserve karti hai.
- **"Firmware sirf motherboard ki cheez hai"** — galat. Har hardware device (SSD, router, printer, phone) ka apna firmware hota hai; BIOS/UEFI sirf motherboard-level firmware ka example hai.
- **"Secure Boot virus-proof banata hai system ko"** — galat. Secure Boot sirf **boot-time verification** karta hai ki bootloader tampered nahi hai; ye ek layer hai, poori security nahi.

---

## Key Takeaways

- **ROM** ek non-volatile memory hai jo power off hone par bhi data nahi khoti — isme wo basic instructions hoti hain jo computer ko boot karne ke liye chahiye, RAM available hone se pehle.
- ROM types evolve hue: **MROM (fixed) -> PROM (once-writable) -> EPROM (UV-erasable) -> EEPROM (electrically erasable) -> Flash (fast, block-erasable)**. Modern BIOS/UEFI chips **Flash memory** use karte hain.
- **Firmware** = hardware ke saath baked-in software jo us hardware ko basic level operate karata hai. BIOS/UEFI motherboard ka firmware hai, lekin har device (SSD, router, printer) ka apna firmware hota hai.
- **BIOS** purana (1980s se) firmware standard hai — 16-bit, MBR partitioning (max 2TB, 4 partitions), text-only UI, slow boot, koi security verification nahi.
- **UEFI** BIOS ka modern replacement hai — 32/64-bit, **GPT partitioning** (huge disks, 128 partitions), graphical UI with mouse support, **faster boot** (parallel init), aur **Secure Boot** (signed bootloader verification).
- **CMOS** ek chhoti volatile memory chip hai jo BIOS/UEFI **settings** (date/time, boot order) store karti hai — ye BIOS/UEFI ke actual code se alag hai.
- **CMOS battery (CR2032 coin cell)** CMOS settings ko power-off ke dauraan bhi zinda rakhti hai. Battery mar jaaye to date/time reset ho jaata hai aur settings default pe chali jaati hain — lekin computer boot phir bhi hoga, kyunki firmware code Flash ROM mein safe hai.
- BIOS/UEFI settings screen access karne ke liye boot ke time `Del`/`F2`/`F10`/`F12`/`Esc` jaisi keys dabani padti hain (manufacturer-dependent).
- Deeper OS boot process (bootloader se kernel initialization tak) ke liye is repo ke `operating_systems` notes dekho.
