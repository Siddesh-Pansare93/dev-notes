---
tags: [security, password, bcrypt, hashing]
aliases: [PasswordEncoder, BCrypt, Argon2, Password Hashing]
stage: intermediate
---

# Password Encoding

> [!info] For the Express/TS dev
> In Node you reach for `bcrypt` (`bcrypt.hash`, `bcrypt.compare`). Spring Security has the `PasswordEncoder` abstraction with a default implementation that supports BCrypt, Argon2, scrypt, PBKDF2 — and a delegating encoder that auto-upgrades hashes when users log in. Always use the delegating encoder; you'll thank yourself in five years.

## Concept / How it works

The `PasswordEncoder` interface:

```java
public interface PasswordEncoder {
    String encode(CharSequence rawPassword);
    boolean matches(CharSequence rawPassword, String encodedPassword);
    default boolean upgradeEncoding(String encodedPassword) { return false; }
}
```

`DelegatingPasswordEncoder` stores hashes prefixed with the algorithm:

```
{bcrypt}$2a$10$kp...uH4...
{argon2}$argon2id$v=19$m=16384,t=2,p=1$...
{scrypt}$e0801$...
{pbkdf2@SpringSecurity_v5_8}...
{noop}plaintext        ← TESTING ONLY
```

Validation picks the right algorithm; if it's not the current default, `upgradeEncoding` is true and you can re-hash on next login.

## Code example

### Use the factory (the right answer 90% of the time)

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    // BCrypt is the default at the moment of writing
}
```

### Hashing on signup

```java
@Service
public class UserService {

    private final UserRepository repo;
    private final PasswordEncoder encoder;

    public UserService(UserRepository repo, PasswordEncoder encoder) {
        this.repo = repo; this.encoder = encoder;
    }

    public UserResponse register(SignupRequest req) {
        if (repo.existsByEmail(req.email())) {
            throw new ConflictException("email already in use");
        }
        User u = new User();
        u.setEmail(req.email());
        u.setPasswordHash(encoder.encode(req.password()));   // {bcrypt}...
        u.setFullName(req.fullName());
        return toResponse(repo.save(u));
    }
}
```

### Comparing on login

Spring Security's `DaoAuthenticationProvider` does it for you. Custom flow:

```java
boolean ok = encoder.matches(req.password(), user.getPasswordHash());
if (!ok) throw new BadCredentialsException("invalid");
```

### Auto-upgrade on login

```java
@Service
public class AuthService {

    private final UserRepository repo;
    private final PasswordEncoder encoder;

    public AuthService(UserRepository repo, PasswordEncoder encoder) {
        this.repo = repo; this.encoder = encoder;
    }

    @Transactional
    public User login(String email, String password) {
        User u = repo.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("invalid"));
        if (!encoder.matches(password, u.getPasswordHash())) {
            throw new BadCredentialsException("invalid");
        }
        if (encoder.upgradeEncoding(u.getPasswordHash())) {
            u.setPasswordHash(encoder.encode(password));   // re-hash with current default
        }
        return u;
    }
}
```

This silently migrates users from old algorithms over time — no mass migration job needed.

### Configuring BCrypt strength

```java
@Bean
public PasswordEncoder passwordEncoder() {
    // strength 12 = 2^12 = 4096 rounds. Default is 10.
    return new BCryptPasswordEncoder(12);
}
```

But then you lose delegation. Better: register a delegating encoder with custom maps:

```java
@Bean
public PasswordEncoder passwordEncoder() {
    String idForEncode = "bcrypt";
    Map<String, PasswordEncoder> encoders = new HashMap<>();
    encoders.put("bcrypt", new BCryptPasswordEncoder(12));
    encoders.put("argon2", Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8());
    encoders.put("scrypt", SCryptPasswordEncoder.defaultsForSpringSecurity_v5_8());
    encoders.put("pbkdf2@SpringSecurity_v5_8",
                 Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8());
    encoders.put("noop", NoOpPasswordEncoder.getInstance());   // tests only
    return new DelegatingPasswordEncoder(idForEncode, encoders);
}
```

### Argon2 (recommended where available)

```xml
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk18on</artifactId>
</dependency>
```

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
}
```

Argon2id is the modern, memory-hard hash — slower for attackers using GPUs/ASICs.

## Choosing parameters

| Algorithm | Cost knob | Memory | Recommended setting |
| --- | --- | --- | --- |
| BCrypt | log rounds (`strength`) | low | 10-12 |
| scrypt | N, r, p | medium | defaults |
| Argon2id | iterations, memoryKb, parallelism | high | 16 MB, 2 iter, 1 par |
| PBKDF2 | iterations | low | 600,000+ |

Calibrate so a single hash takes ~250-500 ms on your server. Slower = better against brute force; too slow = login DoS.

## Express/TS comparison

```ts
// bcrypt
import bcrypt from 'bcrypt';

const hash = await bcrypt.hash(rawPassword, 12);
const ok = await bcrypt.compare(rawPassword, storedHash);
```

| Node | Spring |
| --- | --- |
| `bcrypt.hash(pw, 12)` | `encoder.encode(pw)` |
| `bcrypt.compare(pw, h)` | `encoder.matches(pw, h)` |
| Manual algorithm migration | `upgradeEncoding` + re-hash on login |
| `argon2` library | `Argon2PasswordEncoder` |

## Gotchas

> [!danger] Don't roll your own
> No SHA-256 + salt loops. Use `PasswordEncoder`. Period.

> [!danger] `NoOpPasswordEncoder` in production
> Stores plaintext. There's no scenario where this is acceptable outside tests.

> [!warning] Same password yields different hashes
> Each `encode` generates a new salt. Comparing two hashes string-equality means nothing — always use `matches`.

> [!warning] Storing encoded hash length
> BCrypt is 60 chars. With the `{bcrypt}` prefix, 68. Argon2 is much longer — make your `password_hash` column `VARCHAR(255)`.

> [!warning] Don't `.trim()` the input
> Trimming silently changes the password. Either reject leading/trailing whitespace at the API boundary or accept it as part of the password.

> [!warning] Constant-time compare matters at the bytes level
> `PasswordEncoder.matches` does this internally. If you write your own comparison, use `MessageDigest.isEqual` to prevent timing attacks.

> [!tip] Pre-hash long passwords?
> Pre-hashing with SHA-256 to allow arbitrarily long inputs ("passphrase") is fine. Some libraries do it; BCrypt itself caps at 72 bytes silently — long passphrases beyond that are NOT actually checked. `BCryptPasswordEncoder` in Spring 6.4+ throws on >72 bytes; verify your version.

## Related

- [[03-Authentication-Methods]]
- [[04-JWT-with-Spring-Security]]
- [[01-Spring-Security-Concepts]]
