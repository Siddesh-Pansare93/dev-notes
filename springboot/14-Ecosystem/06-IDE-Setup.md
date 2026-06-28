---
tags: [ecosystem, ide, intellij, vscode, productivity]
aliases: [IDE, IntelliJ, VS Code Java]
stage: foundation
---

# IDE Setup

> [!info] For the Express/TS dev
> Java IDEs are an order of magnitude more powerful than your average TS setup. Refactoring, navigation, and debugging are world-class. **IntelliJ IDEA** is the gold standard. **VS Code** with the Java pack is fine for casual work but lags on big projects.

## IntelliJ IDEA (recommended)

**Editions:**
- **Community** (free, open-source) — covers core Java + Maven/Gradle + Git
- **Ultimate** (paid) — adds Spring/Spring Boot support, JPA tooling, HTTP client, DB tools, profilers

For Spring Boot work, **Ultimate is worth it**. The Spring plugin alone (autocomplete on `application.yml` keys, bean dependency graph, request mapping navigation) saves hours.

### First-time setup checklist

1. **JDK**: File → Project Structure → SDKs → add 21
2. **Project SDK & language level**: match your `pom.xml`
3. **Annotation processing**: Settings → Build → Compiler → Annotation Processors → "Enable annotation processing"
4. **Build with Maven/Gradle**: Settings → Build → Build Tools → Maven (or Gradle) → "Build and run using: IntelliJ IDEA" for fast incremental builds
5. **Format on save**: Settings → Tools → Actions on Save → check "Reformat code", "Optimize imports"
6. **Plugins to install**:
   - Lombok (bundled in 2020.3+, but verify enabled)
   - SonarLint
   - Key Promoter X (teaches you shortcuts)
   - .ignore
   - GitToolBox

### Essential shortcuts (macOS / Win-Linux)

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

> [!tip] Learn 3 shortcuts a day
> Search Everywhere (`⇧⇧`), Show Intentions (`⌥⏎`), and Refactor (`⌃T`) cover 80% of daily use.

### Spring tooling highlights (Ultimate)

- **Endpoints panel** — see all `@RequestMapping`s; click to navigate
- **Beans graph** — visualize the DI graph
- **`application.yml` autocomplete** — knows every Spring property
- **HTTP Client** — `*.http` files for live request testing
- **Database tool window** — connect to your DB, run SQL, inspect schema
- **Run dashboard** — multi-app run/debug

### Debugger features worth learning

- **Conditional breakpoints** — right-click breakpoint → condition `user.id == 42`
- **Logging breakpoint** — print without pausing
- **Hot swap** — change a method body and re-run without restart (limited)
- **Drop frame** — re-enter a method during a debug session
- **Stream debugger** — visualize `.map().filter().collect()` step-by-step

## VS Code for Java

Install the **Extension Pack for Java** (Microsoft) which bundles:
- Language Support for Java by Red Hat
- Debugger for Java
- Test Runner for Java
- Maven for Java
- Gradle for Java
- Project Manager for Java

Plus:
- **Spring Boot Extension Pack** (VMware) — Boot Dashboard, application properties autocomplete, live actuator data
- **Lombok Annotations Support** (if using Lombok)

### When VS Code is fine

- Small projects, scripts
- Polyglot repos (TS + Java side-by-side)
- You're already deep in VS Code muscle memory

### When IntelliJ wins

- Big enterprise codebase (10k+ files)
- Heavy refactoring
- Spring/JPA-heavy projects
- Database & profiling work

### VS Code Java shortcuts

Mostly the same as TS:

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

Still used in some enterprises. STS (Spring Tool Suite) is the Spring-flavored Eclipse distribution. If you have a choice, pick IntelliJ.

## Settings sync

- IntelliJ: Settings → Settings Sync → Enable (uses your JetBrains account)
- VS Code: built-in Settings Sync via GitHub/Microsoft account

## Recommended editor config

`.editorconfig` at repo root:

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

## Related
- [[05-Common-CLI-Tools]]
- [[01-Maven-Basics]]
- [[01-Spring-Boot-Project-Layout]]
- [[01-Java-vs-TypeScript-Quick-Map]]
