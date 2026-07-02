# IDE Setup

> [!info] Express/TS wale dev ke liye
> Java IDEs tumhare average TS setup se ek level upar ki cheez hain. Refactoring, navigation, aur debugging — sab world-class hai. **IntelliJ IDEA** gold standard hai. **VS Code** Java pack ke saath chhote-mote kaam ke liye theek hai, lekin bade projects pe peeche reh jaata hai.

## IntelliJ IDEA (recommended)

**Kya hota hai?** IntelliJ do flavours mein aata hai — ek free, ek paid. Dono ka use-case alag hai.

**Editions:**
- **Community** (free, open-source) — core Java + Maven/Gradle + Git cover karta hai
- **Ultimate** (paid) — Spring/Spring Boot support, JPA tooling, HTTP client, DB tools, profilers add karta hai

Spring Boot ke kaam ke liye, **Ultimate lene layak hai**. Sirf Spring plugin hi itna kaam bana deta hai — `application.yml` keys pe autocomplete, bean dependency graph, request mapping navigation — ki ghanton bach jaate hain. Socho jaise tum Zomato ka free version use kar rahe ho vs Zomato Gold — dono se khana milta hai, lekin Gold mein extra perks hain jo daily use mein farak dalte hain.

### First-time setup checklist

Naya IntelliJ khola aur Spring Boot project open kiya? Pehle ye 6 cheezein set kar lo, warna baad mein weird issues aayenge:

1. **JDK**: File → Project Structure → SDKs → 21 add karo
2. **Project SDK & language level**: apne `pom.xml` se match karo
3. **Annotation processing**: Settings → Build → Compiler → Annotation Processors → "Enable annotation processing" (Lombok jaise annotation-based libraries ke liye zaruri hai, warna getters/setters generate hi nahi honge)
4. **Build with Maven/Gradle**: Settings → Build → Build Tools → Maven (ya Gradle) → "Build and run using: IntelliJ IDEA" — isse fast incremental builds milte hain
5. **Format on save**: Settings → Tools → Actions on Save → "Reformat code" aur "Optimize imports" check karo
6. **Plugins install karo**:
   - Lombok (2020.3+ mein bundled hota hai, bas enable verify kar lo)
   - SonarLint
   - Key Promoter X (ye tumhe shortcuts sikhata hai — jab bhi mouse se click karoge, ye bata dega ki uske liye shortcut kya tha)
   - .ignore
   - GitToolBox

> [!warning] Annotation processing bhool gaye?
> Agar Lombok use kar rahe ho aur annotation processing enable nahi kiya, toh `@Getter`, `@Setter` waali classes mein red squiggly lines aayengi — jaise TypeScript mein type errors dikhte hain, waise hi. Bahut confusing lagta hai shuru mein.

### Essential shortcuts (macOS / Win-Linux)

Kyun zaruri hai? Kyunki mouse se click karte-karte tumhara din nikal jaayega. Shortcuts seekh lo, productivity 3x ho jaayegi — bilkul waise jaise VS Code mein `Cmd+P` seekhne ke baad tum file explorer use karna bhool gaye the.

| Action | macOS | Win/Linux |
|--------|-------|-----------|
| Search everywhere | `⇧⇧` | `Shift+Shift` |
| Go to class | `⌘O` | `Ctrl+N` |
| Go to file | `⌘⇧O` | `Ctrl+Shift+N` |
| Go to symbol | `⌘⌥O` | `Ctrl+Alt+Shift+N` |
| Find usages | `⌥F7` | `Alt+F7` |
| Refactor → rename | `⇧F6` | `Shift+F6` |
| Extract method | `⌘⌥M` | `Ctrl+Alt+M` |
| Extract variable | `⌘⌥V` | `Ctrl+Alt+V` |
| Show intentions / quick fix | `⌥⏎` | `Alt+Enter` |
| Generate (getter, ctor) | `⌘N` | `Alt+Insert` |
| Implement methods | `⌃I` | `Ctrl+I` |
| Reformat code | `⌘⌥L` | `Ctrl+Alt+L` |
| Optimize imports | `⌃⌥O` | `Ctrl+Alt+O` |
| Run | `⌃R` | `Shift+F10` |
| Debug | `⌃D` | `Shift+F9` |
| Step over / into / out | `F8 / F7 / ⇧F8` | `F8 / F7 / Shift+F8` |
| Evaluate expression | `⌥F8` | `Alt+F8` |
| Show structure (outline) | `⌘7` | `Alt+7` |
| Recent files | `⌘E` | `Ctrl+E` |
| Recent locations | `⌘⇧E` | `Ctrl+Shift+E` |
| Navigate back / forward | `⌘[ / ⌘]` | `Ctrl+Alt+← / →` |

> [!tip] Roz 3 shortcuts seekho
> Search Everywhere (`⇧⇧`), Show Intentions (`⌥⏎`), aur Refactor (`⌃T`) — ye teen hi daily use ka 80% cover kar dete hain. Baaki dheere-dheere muscle memory mein aa jaayenge.

### Spring tooling highlights (Ultimate)

Ye woh features hain jinke liye Ultimate ka paisa vasool hota hai:

- **Endpoints panel** — saare `@RequestMapping`s dikhta hai; click karke seedha us controller method pe pahunch jaate ho (Postman collection dekhne jaisa, lekin code ke andar hi)
- **Beans graph** — DI graph visualize karta hai — kaunsa bean kis bean ko inject kar raha hai, sab ek diagram mein
- **`application.yml` autocomplete** — har Spring property ko jaanta hai, typo hone se bachata hai
- **HTTP Client** — `*.http` files se live request testing (Postman jaisa hi, bas IDE ke andar)
- **Database tool window** — apne DB se connect karo, SQL run karo, schema inspect karo — bina alag DB client khole
- **Run dashboard** — multiple apps ek saath run/debug karne ke liye (agar microservices pe kaam kar rahe ho)

### Debugger features worth learning

Debugging Java mein Node.js ke `console.log` dabane se kahin zyada powerful hai — agar tumne ye features seekh liye:

- **Conditional breakpoints** — breakpoint pe right-click → condition daalo jaise `user.id == 42`. Matlab breakpoint sirf tab rukega jab woh specific user aaye — 10,000 requests mein se ek ko dhundhna aasan ho jaata hai
- **Logging breakpoint** — bina execution ruke print kar deta hai. Basically `console.log` ka replacement, bina code mein likhe
- **Hot swap** — method body change karo aur bina app restart kiye re-run karo (limited use cases mein kaam karta hai). Ye kuch-kuch nodemon jaisa feel deta hai, lekin sirf method body ke liye
- **Drop frame** — debug session ke beech mein method ko dobara enter karo, bina poora restart kiye
- **Stream debugger** — `.map().filter().collect()` chain ko step-by-step visualize karta hai. Bilkul waise jaise tum chahte the ki JS array chains (`.map().filter()`) ko dekh sako ki har step pe data kaisa dikh raha hai

## VS Code for Java

**Kya hota hai?** Agar tum already VS Code mein comfortable ho (jaisa ki zyadatar Node/TS devs hote hain), toh Java ke liye bhi VS Code chala sakte ho — bas sahi extensions chahiye.

Install karo **Extension Pack for Java** (Microsoft) jisme ye sab bundled aata hai:
- Language Support for Java by Red Hat
- Debugger for Java
- Test Runner for Java
- Maven for Java
- Gradle for Java
- Project Manager for Java

Plus:
- **Spring Boot Extension Pack** (VMware) — Boot Dashboard, application properties autocomplete, live actuator data
- **Lombok Annotations Support** (agar Lombok use kar rahe ho)

### VS Code kab theek hai?

- Chhote projects, scripts
- Polyglot repos (TS + Java saath-saath ek hi repo mein)
- Jab tum already VS Code ke muscle memory mein deep ho aur switch nahi karna chahte

### IntelliJ kab jeetta hai?

- Bada enterprise codebase (10k+ files) — jaise ek bade e-commerce platform ka backend
- Heavy refactoring
- Spring/JPA-heavy projects
- Database aur profiling ka kaam

> [!tip] Analogy
> Ye kuch-kuch aisa hai jaise VS Code Zomato ka basic app hai — fast, halka, kaam chal jaata hai. IntelliJ Ultimate Zomato Gold + Pro dono hai — heavy lifting ke liye banaya gaya, thoda resource-hungry bhi.

### VS Code Java shortcuts

Zyadatar TS wale shortcuts jaise hi hain:

| Action | Shortcut |
|--------|----------|
| Quick open | `Cmd/Ctrl+P` |
| Command palette | `Cmd/Ctrl+Shift+P` |
| Go to definition | `F12` |
| Find references | `Shift+F12` |
| Rename | `F2` |
| Format | `Shift+Alt+F` |
| Quick fix | `Cmd/Ctrl+.` |
| Run/Debug Java | `F5` |

## Eclipse

Kuch enterprises mein aaj bhi use hota hai (purani Java shops mein common hai). STS (Spring Tool Suite) Eclipse ka Spring-flavored distribution hai. Agar choice ho, toh IntelliJ pick karo — Eclipse ab thoda dated feel deta hai.

## Settings sync

- IntelliJ: Settings → Settings Sync → Enable karo (JetBrains account use hota hai)
- VS Code: built-in Settings Sync GitHub/Microsoft account se

Ye kaafi handy hai — naya laptop set karte waqt ya office/personal machine switch karte waqt saara setup (theme, shortcuts, plugins) apne aap aa jaata hai. Jaise UPI mein tumhara payment method har jagah sync ho jaata hai, waise hi.

## Recommended editor config

`.editorconfig` repo root mein rakho — isse team ke sab members (chahe IntelliJ use karein ya VS Code) same formatting rules follow karte hain:

```ini
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 4

[*.{yml,yaml,json,md}]
indent_size = 2
```

> [!info] Kyun zaruri hai?
> Bina `.editorconfig` ke, ek dev tabs use karega, doosra spaces — aur git diff mein pura file "changed" dikhega sirf whitespace ki wajah se. Ye chhoti si file team ke beech consistency maintain karti hai, bilkul waise jaise ESLint + Prettier Node projects mein karte hain.

## Related
- [[05-Common-CLI-Tools]]
- [[01-Maven-Basics]]
- [[01-Spring-Boot-Project-Layout]]
- [[01-Java-vs-TypeScript-Quick-Map]]
