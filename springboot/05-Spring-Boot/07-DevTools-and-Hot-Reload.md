---
tags:
  - spring-boot
  - devtools
  - dx
aliases:
  - DevTools
  - Hot Reload
  - spring-boot-devtools
stage: intermediate
---

# DevTools and Hot Reload

> [!info] For the Express/TS dev
> `nodemon` watches your files and restarts the process on change. Spring Boot DevTools does the same — but smarter. It uses **two classloaders** (one for unchanging deps, one for your code) and only reloads the latter, so restarts are 1–3 seconds rather than full cold-start.

## Add DevTools

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

Gradle:

```groovy
developmentOnly 'org.springframework.boot:spring-boot-devtools'
```

> [!warning] Don't ship DevTools to production
> The `optional`/`developmentOnly` flag prevents it from being included in dependency-resolution downstream. DevTools also auto-disables when running from a packaged JAR.

## What you get

| Feature | Effect |
|---|---|
| Automatic restart | When classpath changes (compiled `.class` files), the app restarts. |
| LiveReload | Browser auto-refreshes via `livereload.com` browser extension. |
| Property defaults | Disables template caching (Thymeleaf, FreeMarker), enables debug logging for web. |
| Remote debug | Connect from your IDE to a running app on another machine (rarely used). |

## How it triggers

DevTools watches the classpath, **not source files**. The actual recompile is the IDE's job.

| Setup | What triggers a restart |
|---|---|
| IntelliJ IDEA | "Build Project" (Ctrl+F9) writes new `.class` files; or enable `Settings → Build → Compiler → Build project automatically` + `Registry → compiler.automake.allow.when.app.running`. |
| VS Code (Java extension) | Auto-builds on save. |
| `mvn spring-boot:run` | Recompile in another terminal: `mvn compile`. |

## nodemon vs DevTools

| Behavior | nodemon | DevTools |
|---|---|---|
| Watches | source files | compiled classes |
| Trigger | file change | classpath change |
| Restart speed | full Node startup | partial reload (~1–3s) |
| State preserved | no | no (still a restart, just faster) |
| Config | `nodemon.json` | `application.yml` `spring.devtools.*` |

## Configuration

```yaml
spring:
  devtools:
    restart:
      enabled: true              # default
      additional-paths: src/main/custom
      exclude: static/**,public/**,templates/**
      poll-interval: 1s
      quiet-period: 400ms
    livereload:
      enabled: true
      port: 35729
```

> [!tip] Exclude noisy paths
> By default, DevTools restarts on any classpath change — including your `static/` files. Exclude them so static asset edits don't kill your app.

## True hot-swap (no restart) with JRebel / DCEVM

DevTools is fast but still a **full context restart**. If you want truly seamless code changes:

- **JRebel** (commercial) — no restart for most code changes.
- **HotswapAgent + DCEVM** (free) — open source equivalent.

For day-to-day work, DevTools is plenty.

## LiveReload

When DevTools restarts the app, it also pings the LiveReload server. Install the [LiveReload browser extension](http://livereload.com/extensions/) and your browser auto-refreshes. Useful for Thymeleaf development; less so for pure REST APIs.

## Code example: forcing a property change to reload

DevTools also reloads properties from `META-INF/spring.factories` and `application.yml`, but only if you explicitly trigger a restart. Easiest:

```bash
touch src/main/resources/.reloadtrigger
# or just save a Java file — your IDE recompiles, classpath changes, restart fires
```

## Trigger file (alternative)

If automatic restart-on-class-change is too aggressive (e.g., during heavy refactors), set:

```yaml
spring:
  devtools:
    restart:
      trigger-file: .reloadtrigger
```

Now restarts only happen when you `touch .reloadtrigger`. Same pattern as `rs` in nodemon.

## Remote DevTools (advanced)

Run an app on a remote machine, develop locally, push code via DevTools tunnel. Setup is fiddly and rarely worth it — modern alternatives like Skaffold or Tilt do this better for Kubernetes workloads.

## Property defaults DevTools sets

DevTools quietly tunes for development:

| Property | DevTools default | Production |
|---|---|---|
| `spring.thymeleaf.cache` | false | true |
| `spring.freemarker.cache` | false | true |
| `spring.h2.console.enabled` | true | false |
| `logging.level.web` | DEBUG | INFO |

These reset when you run from a packaged JAR (production mode).

## Gotchas

> [!warning] Common pitfalls
> - **No restart happening?** Check that your IDE is compiling on save. In IntelliJ: enable both "Build project automatically" AND the registry flag for in-progress apps.
> - **Restart loop** — DevTools watches `target/`. Ensure your build doesn't generate files there during runtime.
> - **DevTools active in production** because someone forgot `optional` — visible from the startup banner (`Devtools enabled`). Remove the dependency or scope it correctly.
> - **Memory growth across many restarts** — known classloader leak with some libraries. Restart the JVM occasionally.
> - **Test contexts also use DevTools** — slows tests. Mark the dep `developmentOnly` (Gradle) or `optional` (Maven) to keep it out of test classpath.
> - **`@ConfigurationProperties` not picking up YAML changes** — DevTools restarts the context, but if you edit YAML *only*, no recompile happens. Touch a Java file or your trigger file.

> [!example] My recommended workflow
> - In IDE: enable build-on-save.
> - In `application-dev.yml`: lower noise (`logging.level.org.springframework=INFO`).
> - Add a `.reloadtrigger` file pattern if your repo is large.
> - For frontend dev against a Spring backend: run frontend with its own dev server (Vite/Next), proxy to Spring at :8080. Don't conflate the two.

## Related
- [[01-What-is-Spring-Boot]]
- [[05-Application-Properties]]
- [[06-SpringApplication-Bootstrap]]
- [[09-Building-and-Running]]
- [[08-Logging]]
