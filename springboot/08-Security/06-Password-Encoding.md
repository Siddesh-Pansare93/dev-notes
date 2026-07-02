# Password Encoding

> [!info] Express/TS wale dev ke liye
> Node mein tum seedha `bcrypt` (`bcrypt.hash`, `bcrypt.compare`) use karte ho. Spring Security mein `PasswordEncoder` naam ka ek abstraction hai jiska default implementation BCrypt, Argon2, scrypt, PBKDF2 sab support karta hai — aur ek "delegating encoder" bhi hai jo login ke time pe hashes ko automatically upgrade kar deta hai. Hamesha delegating encoder use karo — 5 saal baad khud ko thank you bologe.

## Concept / Ye kaam kaise karta hai

Socho tum Zomato jaisa app bana rahe ho jahan lakhs users apna password store karte hain. Agar tum plaintext password DB mein daal doge aur kabhi breach ho gaya, toh sabka account gaya. Isliye password ko hash karke store karte hain — matlab ek one-way function jo password ko ek random-dikhne wali string mein convert kar deta hai, jisse wapas original password nikaalna practically impossible ho.

`PasswordEncoder` interface bas yahi kaam karta hai:

```java
public interface PasswordEncoder {
    String encode(CharSequence rawPassword);
    boolean matches(CharSequence rawPassword, String encodedPassword);
    default boolean upgradeEncoding(String encodedPassword) { return false; }
}
```

`DelegatingPasswordEncoder` har hash ke aage algorithm ka naam prefix karke store karta hai, taaki baad mein pata chale kis algorithm se bana tha:

```
{bcrypt}$2a$10$kp...uH4...
{argon2}$argon2id$v=19$m=16384,t=2,p=1$...
{scrypt}$e0801$...
{pbkdf2@SpringSecurity_v5_8}...
{noop}plaintext        ← SIRF TESTING KE LIYE
```

Jab tum `matches` call karte ho, Spring us prefix ko dekh kar sahi algorithm choose kar leta hai automatically. Aur agar wo algorithm current default nahi hai (matlab purana ho chuka hai), toh `upgradeEncoding` `true` return karega, aur tum agle login pe usse re-hash kar sakte ho. Ye bilkul UPI apps jaisa hai jo purane encryption ko silently naye se replace karte rehte hain bina user ko pata chale.

## Code example

### Factory use karo (90% cases mein yahi sahi jawab hai)

Kyun zaruri hai? Kyunki khud se algorithm choose karna, sahi parameters set karna — ye sab galat karne ke bahut chances hain. Spring ki factory ne already best defaults choose kar rakhe hain.

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    // Is likhte waqt BCrypt hi default hai
}
```

### Signup pe hashing

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

Bas itna hi — `encoder.encode()` call karo, jo string wapas aayegi wahi DB mein save kar do. Plaintext password kabhi bhi kahin store mat karo, na hi logs mein print karo.

### Login pe compare karna

Agar tum Spring Security ka standard flow use kar rahe ho, toh `DaoAuthenticationProvider` ye kaam khud hi kar deta hai peeche se. Lekin agar tumhara custom login flow hai (jaise ek REST endpoint jo manually check karta hai):

```java
boolean ok = encoder.matches(req.password(), user.getPasswordHash());
if (!ok) throw new BadCredentialsException("invalid");
```

`matches` ke andar hi constant-time comparison hoti hai, toh timing attacks se bhi bache rehte ho — tumhe khud kuch extra karne ki zarurat nahi.

### Login pe auto-upgrade

Ye feature sabse zyada underrated hai. Socho tumne 2 saal pehle BCrypt strength 10 use kiya tha, ab tumhe Argon2 pe switch karna hai. Sab existing users ka password re-hash karne ke liye migration script chalana headache hai — kyunki tumhare paas unka plaintext password hai hi nahi!

Solution: jab user agli baar login kare, tab silently unka hash naye algorithm se re-hash kar do — kyunki us waqt tumhare paas unka raw password already available hota hai (login form se).

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
            u.setPasswordHash(encoder.encode(password));   // current default se re-hash
        }
        return u;
    }
}
```

Isse users dheere-dheere, apne aap purane algorithm se naye pe migrate ho jaate hain — koi bhi mass migration job chalane ki zaroorat nahi padti.

### BCrypt ki strength configure karna

```java
@Bean
public PasswordEncoder passwordEncoder() {
    // strength 12 = 2^12 = 4096 rounds. Default 10 hai.
    return new BCryptPasswordEncoder(12);
}
```

Lekin isse tumhara delegation feature chala jaata hai — matlab future mein Argon2 pe switch karna mushkil ho jayega. Better approach: delegating encoder ko custom maps ke saath register karo:

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
    encoders.put("noop", NoOpPasswordEncoder.getInstance());   // sirf tests ke liye
    return new DelegatingPasswordEncoder(idForEncode, encoders);
}
```

### Argon2 (jahan available ho, wahan recommended)

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

Argon2id modern, "memory-hard" hashing algorithm hai — matlab isko crack karne ke liye attacker ko sirf CPU power nahi, bahut zyada RAM bhi chahiye. Isliye GPU/ASIC farms use karke brute-force karna bahut mehenga ho jaata hai. Agar naya project bana rahe ho aur choice hai, toh Argon2id best hai.

## Parameters kaise choose karein?

Kyun zaruri hai? Kyunki bahut zyada "cost" set kar doge toh login slow ho jayega (bad UX, potential DoS), aur bahut kam set karoge toh attacker aasani se brute-force kar lega.

| Algorithm | Cost knob | Memory | Recommended setting |
| --- | --- | --- | --- |
| BCrypt | log rounds (`strength`) | low | 10-12 |
| scrypt | N, r, p | medium | defaults |
| Argon2id | iterations, memoryKb, parallelism | high | 16 MB, 2 iter, 1 par |
| PBKDF2 | iterations | low | 600,000+ |

Rule of thumb: ek single hash tumhare server pe ~250-500 ms le, itna calibrate karo. Jitna slow, brute force utna hard — lekin bahut zyada slow karoge toh login hi DoS ho jayega (jaise agar tumhara /login endpoint 5 second lene lage, users frustrate ho jayenge, aur attacker requests ka flood bhej ke server ko busy kar sakta hai).

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
| Manual algorithm migration | `upgradeEncoding` + login pe re-hash |
| `argon2` library | `Argon2PasswordEncoder` |

Basically concept wahi hai jo Node mein hai, bas Spring mein ek extra layer (`DelegatingPasswordEncoder`) hai jo algorithm-agnostic banata hai — taaki future mein bina breaking changes ke algorithm switch kar sako.

## Gotchas

> [!danger] Apna khud ka encoder mat banao
> SHA-256 + salt loops likh ke "apna crypto" banane ki koshish mat karo. `PasswordEncoder` use karo. Full stop. Ye waisa hi hai jaise koi apna khud ka payment gateway banane ki koshish kare instead of Razorpay/Stripe use karne ke — technically possible, practically ek disaster.

> [!danger] Production mein `NoOpPasswordEncoder`
> Ye plaintext store karta hai. Koi bhi scenario nahi hai jahan ye production mein acceptable ho — sirf tests ke liye hai.

> [!warning] Same password se alag-alag hash aata hai
> Har `encode` call ek naya random salt generate karta hai. Isliye do hashes ko string se compare karna (`hash1.equals(hash2)`) bilkul bekaar hai — hamesha `matches` use karo.

> [!warning] Encoded hash ki length store karte waqt dhyan rakho
> BCrypt hash 60 characters ka hota hai. `{bcrypt}` prefix ke saath 68. Argon2 usse bhi lamba hota hai — apna `password_hash` column `VARCHAR(255)` rakho, warna truncation ka bug aayega jo debug karna nightmare hoga.

> [!warning] Input ko `.trim()` mat karo
> Trimming silently password change kar deta hai (agar user ne intentionally leading/trailing space rakha ho). Ya toh API boundary pe hi leading/trailing whitespace reject kar do, ya use password ka legitimate part maan lo.

> [!warning] Constant-time compare bytes level pe matter karta hai
> `PasswordEncoder.matches` internally ye handle karta hai. Agar kabhi khud comparison likhne ki naubat aaye, `MessageDigest.isEqual` use karo — normal `==` ya `.equals()` timing attack ke liye vulnerable ho sakte hain (jahan attacker response time measure karke character-by-character password guess kar sakta hai).

> [!tip] Lambe passwords ko pre-hash karna?
> Bahut lambi passphrase allow karne ke liye pehle SHA-256 se pre-hash karna theek hai, kuch libraries ye karti bhi hain. Ek cheez yaad rakho: BCrypt khud 72 bytes pe silently cap kar deta hai — usse lambi passphrase ka extra part actually check hi nahi hota (matlab agar tumhara password 100 characters ka hai, toh sirf pehle 72 hi matter karte hain). Spring 6.4+ mein `BCryptPasswordEncoder` 72 bytes se zyada pe exception throw karta hai — apna version verify kar lena.

## Related

- [[03-Authentication-Methods]]
- [[04-JWT-with-Spring-Security]]
- [[01-Spring-Security-Concepts]]
