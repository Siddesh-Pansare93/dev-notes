# Booting Process — What Happens When You Press Power

Socho ek Swiggy delivery boy subah subah duty pe nikalta hai. Pehle woh khud check karta hai — bike theek hai? Petrol hai? Phone charge hai? App login hai? Tab jaake woh "available" hota hai orders lene ke liye. Agar bike start hi na ho, ya app crash ho jaaye, toh koi order deliver nahi ho sakta.

Tera computer bhi bilkul yehi karta hai jab tu power button dabata hai. Power aane se lekar login screen dikhne tak, ek poori **checklist aur handoff chain** chalti hai — hardware khud ko check karta hai, phir firmware ek chhote se program (bootloader) ko dhoondhta hai, bootloader OS ke kernel ko memory mein load karta hai, kernel drivers jagata hai, aur finally user-space services (jaise login screen) start hoti hain.

Yeh poora process **10-30 seconds** (SSD + modern UEFI) se lekar **1-2 minute** (purana HDD + BIOS) tak le sakta hai. Is chapter mein hum yeh poori journey, step-by-step, dekhenge.

> [!info]
> Yeh chapter **hardware-level aur firmware-level** boot process pe focus karta hai. Kernel ke andar jo detailed process management, scheduling, systemd unit dependency graph, etc. hote hain, unka gehra detail tumhe `operating_systems` notes mein milega — yahan hum sirf itna samjhenge ki OS load kaise hota hai memory mein aur handoff kaise hota hai.

---

## Big Picture — Poori Journey Ek Nazar Mein

```
┌─────────────────────────────────────────────────────────────────────┐
│  POWER BUTTON PRESS                                                  │
└───────────────────────────────┬───────────────────────────────────--┘
                                 ▼
                    ┌────────────────────────┐
                    │ 1. PSU sends Power Good │  (bijli stable hai signal)
                    └───────────┬────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ 2. CPU Reset & Fetch    │  (CPU jaagta hai, firmware
                    │    firmware entry point │   address pe jump karta hai)
                    └───────────┬────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ 3. POST (Power-On       │  (hardware self-test:
                    │    Self Test)           │   RAM, keyboard, GPU...)
                    └───────────┬────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ 4. BIOS/UEFI            │  (firmware hardware ko
                    │    Initialization       │   initialize karta hai)
                    └───────────┬────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ 5. Boot Device Select   │  (kaunsi disk/SSD se
                    │                         │   boot karna hai)
                    └───────────┬────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ 6. Bootloader Runs      │  (GRUB / Windows Boot
                    │    (MBR/GPT → Loader)   │   Manager OS dhoondta hai)
                    └───────────┬────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ 7. Kernel Load into RAM │  (OS ka core memory mein
                    │                         │   aata hai)
                    └───────────┬────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ 8. Kernel Init:         │  (drivers load, hardware
                    │    Drivers + Hardware   │   detect, root filesystem
                    │                         │   mount)
                    └───────────┬────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ 9. init/systemd Starts  │  (user-space services:
                    │    User-Space           │   network, display, etc.)
                    └───────────┬────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ 10. Login Screen        │  (finally tu password
                    │                         │   daal sakta hai)
                    └────────────────────────┘
```

Ab har step ko detail mein dekhte hain.

---

## Step 1: Power Button Press — Bijli Ka Safar Shuru

**Kya hota hai?**

Jab tu power button dabata hai, yeh directly CPU ko "on" nahi karta. Yeh signal jaata hai motherboard ke **Power Supply Unit (PSU)** ko. PSU AC current (wall se aane wala) ko DC voltages (+3.3V, +5V, +12V) mein convert karta hai jo motherboard, CPU, RAM, disk sabko chahiye hote hain.

**Kyun zaruri hai "Power Good" signal?**

PSU turant stable voltage nahi de pata — kuch milliseconds lagte hain voltage settle hone mein. Jab tak voltage stable na ho, PSU ek **"Power Good" (PG) signal** motherboard ko nahi bhejta. Jab tak yeh signal nahi aata, motherboard ka chipset CPU ko **RESET state** mein rakhta hai (matlab CPU freeze/hold pe hai, kuch nahi kar raha).

> Socho jaise ek building mein generator start hota hai — turant lights on nahi hoti, pehle generator RPM stabilize hota hai, tabhi power feed hoti hai. Agar voltage unstable state mein hi CPU ko chala diya jaaye, toh hardware damage ho sakta hai ya data corrupt.

Jaise hi Power Good signal aata hai, motherboard ka reset circuit CPU ko release karta hai, aur CPU **RESET vector** pe jump karta hai — yeh ek fixed, hardwired memory address hota hai (x86 mein typically `0xFFFFFFF0`) jahan firmware ka entry point hota hai.

> [!info]
> Is poore step ko **"Power-On Reset" (POR)** kehte hain. Yeh purely electrical/hardware phenomenon hai — koi software abhi tak involve nahi hua.

---

## Step 2: CPU Wake-Up aur Firmware Ko Control

CPU jab RESET se release hota hai, uske andar sab registers **default/known state** mein set ho jaate hain (jaise Program Counter ek fixed address pe point karta hai). CPU is address pe jo bhi instruction milegi, wahi execute karega.

Yeh address hamesha **ROM (BIOS chip) ya Flash memory** mein map hota hai — jahan **firmware** (BIOS ya UEFI) permanently store hota hai. RAM abhi tak initialize nahi hua hai (usko test/setup karna baaki hai), isliye CPU RAM se kuch nahi padh sakta — sirf ROM se.

> [!tip]
> Isiliye BIOS/UEFI code **ROM ya NOR Flash chip** mein rakha jaata hai — yeh **non-volatile** hai (power off hone pe bhi data nahi udta), jabki RAM **volatile** hai (power off = sab data gayab). Deeper detail iska tumhe `15-rom-firmware-bios-uefi` chapter mein milega.

---

## Step 3: POST — Power-On Self Test

**Kya hota hai?**

Firmware ka sabse pehla kaam hai — **POST (Power-On Self Test)** run karna. Yeh ek diagnostic checklist hai jo verify karta hai ki basic hardware components zinda aur theek hain, isse pehle ki OS load karne ki koshish ki jaaye.

POST typically yeh check karta hai:

| Component | Kya check hota hai |
|---|---|
| **CPU** | Registers, basic instructions kaam kar rahe hain? |
| **RAM** | Memory chips detect ho rahe hain, basic read/write test |
| **Keyboard/Mouse** | Controller respond kar raha hai? |
| **Graphics Card** | Display output ke liye ready hai? (isliye pehla POST screen tabhi dikhta hai) |
| **Storage Controllers** | SATA/NVMe controllers detect ho rahe hain |
| **CMOS Battery** | System clock/settings ke liye battery theek hai? |

**Kyun zaruri hai?**

Socho tu ek restaurant kitchen kholta hai subah — pehle check karega gas connection hai ya nahi, fridge chal raha hai ya nahi, paani aa raha hai ya nahi. Agar gas hi nahi hai, toh order lena bekaar hai. Waise hi, agar RAM faulty hai ya CPU registers galat respond kar rahe hain, toh OS load karna crash/corruption ki taraf le jaayega.

**Jab POST fail hota hai:**

Agar koi critical hardware fail ho, motherboard **beep codes** (speaker se) ya **LED/display codes** (modern motherboards mein small 2-digit debug display) se batata hai kaunsa component fail hua. Jaise:

- 1 long beep + 2 short = graphics card issue (classic AMI BIOS code)
- Continuous beeping = RAM not detected

> [!warning]
> Agar RAM hi na mile, toh monitor pe kuch bhi nahi dikhega (kyunki graphics driver bhi initialize nahi ho paaya) — sirf beep sunayi dega. Isiliye purane zamaane mein "no display + beeping" ka matlab logs check karne ke bajaye directly RAM slot check karna hota tha.

---

## Step 4: BIOS vs UEFI — Firmware Initialization

POST pass hone ke baad, firmware apna asli kaam shuru karta hai: **hardware ko initialize karna** taaki OS use kar sake.

### BIOS (Basic Input/Output System) — Purana Tareeka

- 1980s se chala aa raha standard, **16-bit real mode** mein chalta hai
- Disk se boot karne ke liye **MBR (Master Boot Record)** scheme use karta hai — disk ka pehla 512 bytes
- **2 TB tak** hi disk size support karta hai (MBR ki addressing limit ki wajah se)
- Boot devices ka simple text menu (jaise "Press F12 for boot menu")
- Koi built-in security nahi — koi bhi bootloader chala sakta hai

### UEFI (Unified Extensible Firmware Interface) — Modern Standard

- 2000s ke baad ka replacement, **32/64-bit** mode mein chalta hai, zyada powerful aur flexible
- **GPT (GUID Partition Table)** use karta hai — disk sizes **9 zettabytes tak** support karta hai
- Graphical interface (mouse click karke settings badal sakta hai, BIOS mein sirf keyboard chalta tha)
- **Faster boot** — parallel hardware initialization possible hai
- **Secure Boot** feature — sirf cryptographically signed bootloaders/OS ko chalne deta hai (malware/rootkits ko boot process hijack karne se rokta hai)
- Network boot, larger drivers, mouse support jaise cheezein built-in

| Feature | BIOS | UEFI |
|---|---|---|
| Mode | 16-bit real mode | 32/64-bit |
| Partition scheme | MBR | GPT |
| Max disk size | 2 TB | 9 ZB |
| Boot speed | Slower | Faster |
| Interface | Text-only | Graphical, mouse support |
| Security | Nahi | Secure Boot |
| Multiple OS boot | Complex | Easy (multiple entries in NVRAM) |

> [!tip]
> Zyadatar sab modern laptops/desktops (2012 ke baad) UEFI use karte hain, lekin "legacy/CSM (Compatibility Support Module) mode" bhi rakhte hain taaki purane BIOS-only OS bhi boot ho sakein. Agar tumne kabhi "Secure Boot disable karo" karke Linux install kiya hai, toh tumne UEFI ke saath hi kaam kiya hai.

Firmware is stage pe **hardware initialize** karta hai — memory controller, chipset, PCIe lanes, USB controllers ko basic level pe zinda karta hai taaki age ka boot process aage badh sake.

---

## Step 5: Boot Device Selection

Firmware ab decide karta hai **kis device se boot karna hai** — internal SSD, external USB, network (PXE boot), ya DVD.

Yeh order **"Boot Order" / "Boot Priority"** settings mein defined hota hai, jo firmware setup screen (Delete/F2/F10 dabake) mein change kar sakte ho.

- **BIOS/Legacy**: har bootable disk ke pehle sector (512 bytes, jise **MBR** kehte hain) mein ek chhota sa boot code hota hai + ek **boot signature** (`0x55AA`) — agar yeh signature match kare, tabhi firmware use "bootable" maanta hai
- **UEFI**: firmware NVRAM mein stored boot entries dekhta hai, jo directly ek specific file (jaise `\EFI\Microsoft\Boot\bootmgfw.efi` ya `\EFI\BOOT\BOOTX64.EFI`) ko point karte hain — yeh **EFI System Partition (ESP)** naam ki chhoti FAT32 partition mein rehta hai

> Socho jaise tumhare paas 3 dabbawale options hain (USB, SSD, network) aur ek priority list hai ki pehle kisse poochna hai "tere paas tiffin (OS) hai kya deliver karne ke liye?" Jo pehla "haan" bole, uska tiffin use hota hai.

---

## Step 6: Bootloader — OS Ko Dhoondhne Wala

**Kya hota hai?**

Firmware ka kaam bas itna hai ki woh ek chhote se program — **bootloader** — ko load karke control de de. Bootloader ka kaam hai actual OS kernel ko dhoondhna, load karna, aur usko control handover karna.

Do popular bootloaders:

### GRUB (GRand Unified Bootloader) — Linux World

GRUB do stages mein kaam karta hai (BIOS/MBR systems pe):

1. **Stage 1**: MBR ke 512 bytes mein itni jagah nahi hoti poora bootloader rakhne ki, isliye yahan sirf ek tiny stub hota hai jo Stage 2 ko load karta hai
2. **Stage 2**: Yeh actual GRUB menu dikhata hai (jo tumne shayad dekha hoga — "Ubuntu / Windows / Advanced options") aur kernel + initrd (initial ramdisk, temporary root filesystem) ko memory mein load karta hai

UEFI systems pe GRUB seedha ek `.efi` file ke roop mein ESP partition se load hota hai — do-stage process ki zaroorat nahi.

### Windows Boot Manager (`bootmgfw.efi`)

Windows ka bootloader, jo **Boot Configuration Data (BCD)** naam ki ek database padhta hai (jaise purane `boot.ini` ka modern replacement) — isme entries hoti hain "Windows 11 kahan hai", "dusra OS agar dual-boot hai toh kahan hai", etc. Yeh menu dikhata hai (agar multiple OS hain) aur chosen OS ka **`winload.efi`** invoke karta hai jo actual Windows kernel (`ntoskrnl.exe`) ko load karta hai.

**Kyun ek alag bootloader chahiye, firmware seedha kernel kyun nahi load karta?**

Kernel bahut bada aur complex hota hai (megabytes), aur alag-alag jagah disk pe ho sakta hai, alag filesystem format (ext4, NTFS) mein ho sakta hai. Firmware itna smart nahi hota ki har filesystem samajh sake. Bootloader ek chhota, specialized program hai jiska ek hi kaam hai — filesystem padhna, kernel dhoondhna, use RAM mein sahi jagah load karna, aur control transfer karna. Yeh **separation of concerns** hai — jaise ek receptionist (bootloader) sirf itna karti hai ki sahi department (kernel) tak tumhe bhej de, khud kaam nahi karti.

> [!info]
> Dual-boot (Windows + Linux) setups mein bootloader hi decide karta hai kaunsa OS chalega — isiliye GRUB menu ya Windows Boot Manager menu mein tumhe list dikhti hai.

---

## Step 7: Kernel Load into Memory

Bootloader ab kernel image ko disk se padhkar **RAM mein copy** karta hai — ek specific memory address pe. Saath mein woh:

- **initrd/initramfs** (Linux) ya boot-critical drivers (Windows) bhi load karta hai — yeh ek temporary, minimal filesystem hai jisme woh drivers hote hain jo real root filesystem (jo shayad encrypted ho, ya RAID pe ho, ya alag disk controller pe ho) ko mount karne ke liye chahiye
- Kernel parameters pass karta hai (jaise Linux mein `root=/dev/sda2`, ya boot mode flags)

Phir bootloader CPU ka control **kernel ke entry point** pe jump karke de deta hai. Is point ke baad, **bootloader ka kaam khatam** — ab OS kernel poora control le leta hai.

> Yeh bilkul waise hai jaise ek travel agent (bootloader) tumhe airport tak chhod deta hai, boarding pass thama deta hai, aur bol deta hai "ab yahan se aage tumhara flight crew (kernel) sambhalega."

---

## Step 8: Kernel Initialization — OS Jaagta Hai

**Kya hota hai?**

Ab **kernel** (Linux kernel, ya Windows NT kernel) control mein hai, aur yeh sabse zyada kaam is stage pe karta hai:

1. **CPU mode switch** — real mode se protected/long mode mein switch (agar zaroorat ho), memory addressing full power mein aa jaati hai
2. **Memory management setup** — virtual memory, paging tables set up hote hain (deeper detail `12-memory-hierarchy` chapter mein)
3. **Hardware detection & driver loading** — kernel scan karta hai kaunse devices connected hain (CPU cores, GPU, network card, USB devices, disk controllers) aur unke drivers load karta hai
4. **Root filesystem mount** — initrd ki madad se real root filesystem (`/` in Linux, `C:\` in Windows) ko mount karta hai
5. **Process #1 spawn karna** — kernel apna pehla user-space process spawn karta hai:
   - Linux mein: **`systemd`** (ya purane systems mein `init`), hamesha **PID 1**
   - Windows mein: **`wininit.exe`** / **Session Manager (`smss.exe`)**

> [!tip]
> Linux mein `ps -p 1` chalao kabhi, tumhe `systemd` (ya `init`) dikhega — yeh literally pehla process hai jo kernel banata hai, aur yehi baaki sab processes ka **ancestor** hai (parent of all parents).

---

## Step 9: init/systemd — User-Space Services Start Hoti Hain

**Kya hota hai?**

Ab kernel ka heavy-lifting kaam khatam, aur **user-space** ka boot shuru hota hai. `systemd` (modern Linux distros — Ubuntu, Fedora, Arch, etc. mein) ek **dependency graph** ke roop mein services start karta hai — matlab "yeh service tabhi start hogi jab woh dependency ready ho."

Typical cheezein jo yahan start hoti hain:

- Network services (Wi-Fi/Ethernet driver ready, IP address le lena — DHCP)
- Disk mounting (baaki partitions jo root ke alawa hain)
- System logging (`journald`, `syslog`)
- Display server / graphical environment (X11 ya Wayland)
- Login manager (GDM, LightDM, ya Windows Logon UI)

Systemd services ko **"targets"** mein group karta hai (purane SysVinit ke "runlevels" ka modern equivalent):

| Target (systemd) | Purana Runlevel (SysVinit) | Matlab |
|---|---|---|
| `poweroff.target` | 0 | System shutdown |
| `rescue.target` | 1 | Single-user/recovery mode |
| `multi-user.target` | 3 | Full system, no GUI (jaise server) |
| `graphical.target` | 5 | Full system + GUI (desktop) |
| `reboot.target` | 6 | Restart |

Windows mein equivalent kaam **Service Control Manager (`services.exe`)** karta hai — yeh Windows Services (background processes jaise Print Spooler, Windows Update) ko start karta hai, aur phir **Winlogon** login screen dikhata hai.

> Socho yeh stage jaise ek restaurant khulne se pehle staff aana shuru hota hai — waiter (network service), cook (disk services), cashier (logging) — sab apni jagah pe set hote hain, tab jaake "Open" ka board (login screen) laga sakte hain.

---

## Step 10: Login Screen — Tu Finally Andar Ja Sakta Hai

Jab saari essential services ready ho jaati hain, **display manager** (GDM/LightDM/Windows Logon) login prompt dikhata hai. Tu username/password ya PIN/biometric daalta hai, aur:

- **Authentication** hota hai (password hash match, ya biometric verify)
- Tera **user session** start hota hai — desktop environment (GNOME, KDE, Windows Explorer shell) load hota hai
- Aur ab tu apna browser, VS Code, terminal — jo bhi chahiye — khol sakta hai

Yahan se boot process officially **complete** maana jaata hai.

---

## Cold Boot vs Warm Boot (Restart) — Farak Kya Hai?

Yeh ek common confusion hai — "restart" aur "shutdown + power on" same nahi hote.

### Cold Boot (Hard Boot)

- System **completely power off** tha (koi bhi component powered nahi tha) aur ab power button se **fresh start** ho raha hai
- **Poora POST cycle** chalta hai — RAM se lekar CPU tak sab kuch fresh state se test hota hai
- RAM completely **cleared** hota hai (volatile memory — power gaya toh sab data gaya)
- Hardware clocks reset ho sakte hain (agar CMOS battery bhi dead ho)
- **Slower** hota hai kyunki poora hardware init cycle dobara chalta hai

### Warm Boot (Restart / Soft Reboot)

- System already ON tha, OS ne khud restart trigger kiya (Start Menu → Restart, ya `reboot` command)
- Kuch hardware checks **skip** ho sakte hain (kaafi firmware "fast boot" options RAM test jaisi cheezein skip kar dete hain agar recently hi POST hua tha)
- CPU ko phir bhi reset kiya jaata hai (registers clear), lekin poora electrical power cycle nahi hota
- **Faster** hota hai cold boot se

| Aspect | Cold Boot | Warm Boot (Restart) |
|---|---|---|
| Power state pehle | Completely off | On, OS running |
| Trigger | Power button | OS restart command |
| POST | Full | Kabhi kabhi partial/skipped (fast boot) |
| RAM | Fully cleared (already tha) | Cleared during restart bhi |
| Speed | Slower | Thoda faster |
| Use case | Jab system freeze ho jaaye, ya fresh start chahiye | Updates install karne ke baad, normal restart |

> [!warning]
> **Misconception**: "Restart aur Shutdown+Start same hote hain." Windows mein yeh especially tricky hai — Windows ka default **"Shutdown"** (Restart nahi) actually **Fast Startup / Hybrid Shutdown** use karta hai, jisme kernel session **hibernate** ho jaata hai (disk pe save) instead of poori tarah se band hona. Isiliye kabhi kabhi driver update ke baad "Shutdown karke phir se on karo" kaam nahi karta, lekin "Restart" karna kaam kar jaata hai — kyunki Restart ek **true cold-like reboot** trigger karta hai jabki Shutdown+Start actually ek hibernated state resume kar raha hota hai!

> [!info]
> **Sleep** aur **Hibernate** boot process ka hissa nahi hain — woh alag power states hain:
> - **Sleep (S3)**: RAM powered rehta hai (thoda current chalta rehta hai), baaki sab band — instant resume
> - **Hibernate (S4)**: RAM ka poora content disk pe save hota hai, phir system poora off — resume pe woh state disk se wapas RAM mein load hoti hai (yeh ek mini "boot" jaisa hai, but OS pehle se pata hai kya load karna hai)

---

## Poora Timeline — Real World Numbers Ke Saath

```
Time (approx)     Event
─────────────────────────────────────────────────────────
0 ms              Power button pressed
0-100 ms          PSU stabilizes, Power Good signal
100-300 ms        CPU reset, firmware entry point jump
300 ms - 2 sec     POST (RAM, CPU, peripherals check)
2 sec - 3 sec      UEFI/BIOS hardware init + boot device select
3 sec - 4 sec      Bootloader runs (GRUB/Windows Boot Manager)
4 sec - 6 sec      Kernel load into RAM
6 sec - 10 sec     Kernel init: drivers, filesystem mount
10 sec - 15 sec    systemd/init starts services
15 sec - 20 sec    Login screen appears
─────────────────────────────────────────────────────────
Total: ~15-25 seconds (modern SSD + UEFI + fast boot)
```

> Purane HDD + Legacy BIOS wale systems mein yeh timeline **60-90 seconds** tak jaa sakti thi — HDD ka spin-up time hi 5-10 seconds le leta tha, aur POST bhi slower tha kyunki har device ko sequentially initialize kiya jaata tha (UEFI parallel init karta hai, isliye faster).

---

## Common Gotchas / Misconceptions

1. **"BIOS aur firmware same cheez hai"** — Technically UEFI bhi ek firmware hai, BIOS bhi. "BIOS" term aksar galti se UEFI settings screen ke liye bhi use hoti hai (jaise "BIOS mein jaake boot order badal do" — actual mein woh UEFI setup ho sakta hai).

2. **"Boot loader hi OS hai"** — Nahi, bootloader sirf ek chhota launcher hai. Kernel hi asli OS hai jo memory management, process scheduling, driver handling karta hai.

3. **"Fast Boot hamesha safe hai"** — UEFI ka "Fast Boot" option POST steps skip karta hai speed ke liye, lekin isse kabhi kabhi USB boot ya BIOS settings access karna mushkil ho jaata hai (kyunki keyboard initialize hone se pehle hi OS load start ho jaata hai). Dual-boot users ko yeh disable karna padta hai kabhi kabhi.

4. **"Secure Boot Linux install nahi hone deta"** — Aisa nahi hai; modern distros (Ubuntu, Fedora) signed bootloaders (shim) use karte hain jo Secure Boot ke saath compatible hain. Sirf bahut purane ya custom-compiled kernels mein dikkat aati hai.

5. **"Zyada RAM = fast boot"** — RAM boot speed pe directly bahut kam impact daalta hai (jab tak enough hai). Boot speed sabse zyada depend karta hai **storage speed** (SSD vs HDD) aur **kitni services startup pe load ho rahi hain** pe.

---

## Key Takeaways

- Boot process ek **layered handoff chain** hai: PSU → CPU reset → Firmware (BIOS/UEFI) → POST → Bootloader → Kernel → init/systemd → Login.
- **POST** hardware ki basic health check karta hai — RAM, CPU, keyboard, GPU — isse pehle ki OS load kiya jaaye.
- **BIOS** (16-bit, MBR, 2TB limit) purana standard hai; **UEFI** (32/64-bit, GPT, Secure Boot, faster) modern replacement hai.
- **Bootloader** (GRUB, Windows Boot Manager) ka ek hi kaam hai — sahi kernel dhoondhna, RAM mein load karna, aur control handover karna. Yeh OS nahi hai, sirf ek launcher hai.
- **Kernel initialization** stage mein drivers load hote hain, memory management setup hota hai, aur root filesystem mount hota hai, phir kernel apna pehla process (PID 1 — `systemd`/`init` ya `wininit.exe`) spawn karta hai.
- **systemd/init** dependency-based tareeke se user-space services (network, display, logging) start karta hai jab tak **login screen** nahi aa jaata.
- **Cold boot** = full power cycle + full POST, **warm boot/restart** = OS-triggered, kuch checks skip ho sakte hain, generally faster.
- Windows ka default "Shutdown" actually **Hybrid Shutdown/Fast Startup** hota hai (kernel session hibernate hota hai) — sach much cold boot nahi. "Restart" hi true fresh reboot deta hai.
- Sleep (S3) aur Hibernate (S4) boot process ka part nahi hain — yeh alag power states hain jo poori boot chain skip karte hain resume ke time.
- Boot speed sabse zyada depend karta hai **storage type (SSD vs HDD)** aur **startup services ki sankhya** pe, RAM size pe nahi.
