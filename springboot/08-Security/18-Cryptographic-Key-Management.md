# Cryptographic Key Management

> [!info] Express/TS wale dev ke liye
> Node mein tumne shayad `jsonwebtoken` ke saath ek plain string secret use kiya hoga — kuch is tarah: `jwt.sign(payload, "mySecret123")`. Demo ke liye theek hai, but production mein yeh chalega nahi. Production mein chahiye: JWT ke liye RSA/EC keys, key rotation ke liye JWKS endpoint, private keys store karne ke liye KMS, aur database fields encrypt karne ke liye AES-GCM. Is note mein yeh sab kuch real Java code ke saath cover karenge.

## Concept / mental model

### JWT signing — RSA vs EC vs symmetric

Kya hota hai? JWT ko sign karne ke liye alag-alag algorithms use ho sakte hain, aur har ek ka apna use-case hai. Socho isse tumhare ghar ki chaabi jaisa — HMAC waali chaabi ek hi hoti hai jo lock kholti bhi hai aur band bhi karti hai (symmetric), jabki RSA/EC mein do alag chaabiyan hoti hain — ek se lock karo (private key), doosri se sirf check karo ki lock sahi hai ya nahi (public key), unlock nahi kar sakte usse.

| Algorithm | Key type | Verify | Sign | When to use |
|---|---|---|---|---|
| `HS256/384/512` | Shared secret (HMAC) | ✓ (same key) | ✓ (same key) | Single service, secret private rakh sakte ho |
| `RS256/384/512` | RSA 2048/4096 | Public key | Private key | JWKS endpoint expose karna ho; multiple verifiers hon |
| `ES256/384/512` | EC P-256/P-384/P-521 | Public key | Private key | RSA jaisa hi, but chhota aur fast |
| `PS256/384/512` | RSA-PSS | Public key | Private key | RSA ka modern padding version |

> [!tip]
> Production mein **RS256 ya ES256** use karo agar koi doosri service tumhare tokens verify karti hai. Ek shared HMAC secret ka matlab hai — jo bhi verify kar sakta hai, woh sign bhi kar sakta hai. Agar koi ek verifier compromise ho gaya, toh attacker fake tokens bana sakta hai. Asymmetric keys mein verifiers ke paas sirf public key hoti hai — woh sign nahi kar sakte, sirf check kar sakte hain.

---

## Code examples

### JWT signing keys generate karna

```bash
# RSA 2048 (common choice)
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem

# EC P-256 (chhota, fast, equally strong)
openssl ecparam -name prime256v1 -genkey -noout -out ec-private.pem
openssl ec -in ec-private.pem -pubout -out ec-public.pem
```

Private keys ko Vault/KMS mein store karo (dekho [[17-Secrets-Management]]). Kabhi bhi Git mein commit mat karo — yeh CRED card ka PIN Git mein daalne jaisa hai.

### Spring Boot JWT config with RS256

```yaml
# application.yml — key files ke paths (classpath/filesystem se load hoga)
# Production mein inko env vars ke through inject karo jo Vault se fetch hue content ko point karein
spring:
  security:
    oauth2:
      authorizationserver:
        token:
          access-token-ttl: PT15M
          refresh-token-ttl: P1D

custom:
  jwt:
    private-key-location: classpath:keys/jwt-private.pem
    public-key-location:  classpath:keys/jwt-public.pem
    key-id: v1   # yeh 'kid' header ki value hai
```

```java
@Configuration
@ConfigurationProperties(prefix = "custom.jwt")
@Data
public class JwtKeyConfig {
    private Resource privateKeyLocation;
    private Resource publicKeyLocation;
    private String keyId;
}

@Bean
public JWKSource<SecurityContext> jwkSource(JwtKeyConfig config) throws Exception {
    RSAKey rsaKey = loadRsaKey(config);
    return new ImmutableJWKSet<>(new JWKSet(rsaKey));
}

private RSAKey loadRsaKey(JwtKeyConfig config) throws Exception {
    String privatePem = StreamUtils.copyToString(
        config.getPrivateKeyLocation().getInputStream(), StandardCharsets.UTF_8);
    String publicPem = StreamUtils.copyToString(
        config.getPublicKeyLocation().getInputStream(), StandardCharsets.UTF_8);

    RSAPrivateKey privateKey = (RSAPrivateKey) loadPemKey(privatePem, false);
    RSAPublicKey  publicKey  = (RSAPublicKey)  loadPemKey(publicPem,  true);

    return new RSAKey.Builder(publicKey)
        .privateKey(privateKey)
        .keyID(config.getKeyId())
        .algorithm(JWSAlgorithm.RS256)
        .keyUse(KeyUse.SIGNATURE)
        .build();
}
```

### JWKS endpoint — public keys ko verifiers ke liye expose karna

Kyun zaruri hai? Agar tumhare paas ek Authorization Server hai (jaise Spring Authorization Server) jo tokens issue karta hai, toh baaki saari microservices ko pata hona chahiye ki tokens genuine hain ya nahi — bina private key share kiye. JWKS endpoint yehi karta hai:

```
GET /.well-known/jwks.json

{
  "keys": [
    {
      "kty": "RSA",
      "kid": "v1",
      "use": "sig",
      "alg": "RS256",
      "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
      "e": "AQAB"
    }
  ]
}
```

Resource servers (tumhari microservices) startup pe iss endpoint ko ek baar fetch karke cache kar lete hain. Jab bhi unko `kid: v1` waala JWT milega, woh matching public key se verify kar denge — jaise Zomato ka delivery partner OTP verify karta hai bina yeh jaane ki OTP kaise generate hua.

### JWT key rotation — `kid` overlap window pattern

> [!danger]
> **Keys ko atomically swap mat karo.** Jab tum key v1 se v2 pe move karna chahte ho, tab tak bahut saare tokens jo v1 se sign hue the, active hote hain (circulation mein). Agar tum ek jhatke mein hard cutover kar doge, toh saare active sessions ek saath invalid ho jayenge — jaise Paytm achanak sabka login expire kar de.

**Safe rotation procedure:**

1. **Key v2 generate karo**
2. **Dono keys JWKS mein serve karo** (v1 + v2, `keys` array mein)
3. **Naye tokens ko v2 se sign karna start karo** (token header mein `kid: v2`)
4. **v1 token ka TTL expire hone tak wait karo** (jaise 15 minute)
5. **v1 ko JWKS se remove kar do** — ab koi valid v1 token exist hi nahi kar sakta

```java
@Configuration
public class JwksConfig {

    // Current aur previous, dono keys load karo
    @Bean
    public JWKSource<SecurityContext> jwkSource(
            @Value("${custom.jwt.key-v1-private}") Resource v1Private,
            @Value("${custom.jwt.key-v1-public}")  Resource v1Public,
            @Value("${custom.jwt.key-v2-private}") Resource v2Private,
            @Value("${custom.jwt.key-v2-public}")  Resource v2Public
    ) throws Exception {

        RSAKey keyV1 = buildRsaKey("v1", v1Private, v1Public);
        RSAKey keyV2 = buildRsaKey("v2", v2Private, v2Public);

        // Dono keys serve hongi; v2 signing ke liye use hoti hai (list mein pehli)
        return new ImmutableJWKSet<>(new JWKSet(List.of(keyV2, keyV1)));
    }

    @Bean
    public JwtEncoder jwtEncoder(JWKSource<SecurityContext> jwkSource) {
        return new NimbusJwtEncoder(jwkSource);
        // NimbusJwtEncoder default mein JWKSet ki pehli key se sign karta hai
    }
}
```

---

## Private keys store karna — KMS / HSM / Vault

Kya hota hai? Private key kahan store karni hai, yeh decision security aur ops complexity ke beech ka trade-off hai. Socho isse aise — apna ghar ki chaabi tum kahan rakhoge? Table pe (classpath files — koi bhi utha sakta hai), ek locked drawer mein (Vault), ya bank locker mein (KMS/HSM — sabse secure but thoda process lagta hai access karne ke liye).

| Option | Security | Ops complexity | Cost |
|---|---|---|---|
| Classpath pe files (sirf dev ke liye) | Low | Trivial | Free |
| Vault Transit secret engine | High | Medium | Free (OSS Vault) |
| AWS KMS | Very High | Low (managed) | ~$1/key/month + API calls |
| GCP Cloud KMS | Very High | Low | AWS jaisa hi |
| Azure Key Vault HSM | Very High | Low | Premium tier |
| HSM (physical/CloudHSM) | Highest | High | Mehenga |

**Vault Transit** (key bahar bheje bina sign karna):

```java
// Vault tumhare JWT payload ko sign karta hai — private key kabhi Vault se bahar nahi jaati
@Service
public class VaultTransitJwtSigner {

    private final VaultTemplate vault;

    public String sign(byte[] payload) {
        VaultTransitContext context = VaultTransitContext.builder()
            .build();

        // Payload ko base64url-encode karo, Vault se sign karwao
        String payloadB64 = Base64.getUrlEncoder().encodeToString(payload);
        Signature sig = vault.opsForTransit()
            .sign("jwt-signing-key", payloadB64, context);

        return sig.getSignature();   // "vault:v1:base64sig"
    }
}
```

---

## Database fields ke liye at-rest encryption

Kyun zaruri hai? Highly sensitive fields (SSN, credit card ke last 4 digits, medical notes) ko store toh karna hai, but agar kabhi DB compromise ho jaaye, tab bhi woh safe rehne chahiye. Isliye sirf encrypt karke store karte hain.

### Envelope encryption pattern

Kya hota hai? Ek locker ke andar doosra locker rakhne jaisa. Socho ek jewellery box hai (DEK se locked), aur us jewellery box ko tum bank locker mein rakhte ho (KEK se protected). Bank locker ki chaabi (KEK) kabhi tumhare ghar (application) mein nahi rehti — hamesha bank (KMS) mein hi rehti hai.

```
Plaintext  →  [DEK se encrypt]  →  Ciphertext DB mein store
DEK        →  [KMS ke KEK se encrypt]  →  Encrypted DEK ciphertext ke saath store
```

- **DEK** (Data Encryption Key) — har record ke liye unique, tumhare app mein generate hoti hai
- **KEK** (Key Encryption Key) — KMS mein store hoti hai, kabhi tumhare app mein nahi aati

```java
@Component
@RequiredArgsConstructor
public class FieldEncryptionService {

    private final KmsClient kmsClient;
    private final String    kekArn;       // config se AWS KMS key ARN

    public EncryptedField encrypt(String plaintext) {
        // KMS se ek fresh DEK generate karo
        GenerateDataKeyRequest req = GenerateDataKeyRequest.builder()
            .keyId(kekArn)
            .keySpec(DataKeySpec.AES_256)
            .build();
        GenerateDataKeyResponse resp = kmsClient.generateDataKey(req);

        byte[] dek           = resp.plaintext().asByteArray();
        byte[] encryptedDek  = resp.ciphertextBlob().asByteArray();

        // Plaintext ko DEK se encrypt karo (AES-256-GCM)
        byte[] ciphertext = encryptAesGcm(plaintext.getBytes(UTF_8), dek);

        // DEK ko memory se zero out kar do
        Arrays.fill(dek, (byte) 0);

        return new EncryptedField(
            Base64.getEncoder().encodeToString(ciphertext),
            Base64.getEncoder().encodeToString(encryptedDek)
        );
    }

    public String decrypt(EncryptedField field) {
        byte[] encryptedDek = Base64.getDecoder().decode(field.encryptedDek());

        // KMS se DEK decrypt karwao
        DecryptRequest req = DecryptRequest.builder()
            .ciphertextBlob(SdkBytes.fromByteArray(encryptedDek))
            .keyId(kekArn)
            .build();
        byte[] dek = kmsClient.decrypt(req).plaintext().asByteArray();

        byte[] ciphertext = Base64.getDecoder().decode(field.ciphertext());
        byte[] plaintext  = decryptAesGcm(ciphertext, dek);

        Arrays.fill(dek, (byte) 0);
        return new String(plaintext, UTF_8);
    }

    private byte[] encryptAesGcm(byte[] plaintext, byte[] key) {
        try {
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);  // GCM ke liye 96-bit IV

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE,
                new SecretKeySpec(key, "AES"),
                new GCMParameterSpec(128, iv));  // 128-bit auth tag

            byte[] encrypted = cipher.doFinal(plaintext);

            // IV ko ciphertext ke aage prepend karo: [12 bytes IV][ciphertext + 16 bytes tag]
            byte[] result = new byte[12 + encrypted.length];
            System.arraycopy(iv, 0, result, 0, 12);
            System.arraycopy(encrypted, 0, result, 12, encrypted.length);
            return result;
        } catch (GeneralSecurityException e) {
            throw new CryptoException("AES-GCM encryption failed", e);
        }
    }
}
```

### JPA `@Convert` se transparent field encryption

Kya hota hai? Yeh trick use karke tum apne entity mein normal `String` field likh sakte ho, aur JPA background mein automatically encrypt/decrypt kar dega — application code ko pata bhi nahi chalega.

```java
@Converter
@Component
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    // Static holder trick se Spring inject karta hai (converters by default Spring beans nahi hote)
    private static FieldEncryptionService encryptionService;

    @Autowired
    public void setEncryptionService(FieldEncryptionService svc) {
        EncryptedStringConverter.encryptionService = svc;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        EncryptedField field = encryptionService.encrypt(attribute);
        // Ciphertext aur encrypted DEK, dono ko JSON mein serialize karo
        return field.toJson();
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        EncryptedField field = EncryptedField.fromJson(dbData);
        return encryptionService.decrypt(field);
    }
}

@Entity
public class Patient {
    @Id private Long id;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "ssn_encrypted")
    private String ssn;    // DB mein encrypted store hota hai, application code ko pata nahi chalta
}
```

> [!warning]
> Encrypted fields ko `WHERE ssn = ?` se query nahi kar sakte — iske liye tumhe har row decrypt karni padegi, jo bahut slow hai. Searchable encrypted fields ke liye deterministic encryption (AES-SIV) use karo, ya lookup ke liye alag se ek keyed hash (HMAC) store karo. AES-GCM non-deterministic hota hai (same plaintext, different ciphertext har baar) — storage ke liye best hai but searching ke liye nahi.

---

## Crypto agility — algorithm rotation ke liye design karo

Kya hota hai? Time ke saath crypto algorithms weak ho jaate hain (jaise purane phone ka lock pattern aajkal easily crack ho jaata hai). PBKDF2 → bcrypt → Argon2id — har generation pehle se strong hai. Apna password storage aise design karo ki naye algorithm pe migrate karna easy ho, bina saare users ko forcefully password reset kiye:

```java
// Hash ke saath algorithm identifier bhi store karo
@Entity
public class User {
    // Format: "$argon2id$v=19$m=65536,t=3,p=4$salt$hash"
    // ya:      "$2a$12$salt+hash"           (bcrypt)
    private String passwordHash;
    private String hashAlgorithm;  // "ARGON2ID", "BCRYPT" — migration ke liye
}

// DelegatingPasswordEncoder — Spring ka built-in crypto agility, passwords ke liye
@Bean
public PasswordEncoder passwordEncoder() {
    Map<String, PasswordEncoder> encoders = Map.of(
        "argon2",  new Argon2PasswordEncoder(16, 32, 1, 65536, 3),
        "bcrypt",  new BCryptPasswordEncoder(12),
        "pbkdf2",  new Pbkdf2PasswordEncoder("secret", 16, 310000, SecretKeyFactoryAlgorithm.PBKDF2WithHmacSHA256)
    );
    // Naye passwords argon2 use karenge; purane bcrypt/pbkdf2 hashes abhi bhi verify honge
    return new DelegatingPasswordEncoder("argon2", encoders);
}
// Hash format: {argon2}$argon2id$...  — prefix se pata chalta hai kaunsa algorithm use hua
```

---

## Common mistakes

> [!danger]
> **ECB mode** (`AES/ECB/PKCS5Padding`): same plaintext blocks se same ciphertext banta hai. Isse pattern reveal ho jaate hain — jaise ek scanned image mein blocks-blocks mein same rang dikhna. ECB kabhi mat use karo.
 GCM ya random IV ke saath CBC use karo.

> [!danger]
> **Hardcoded IVs / nonces**: AES-GCM ke liye fixed IV use karna semantic security completely tod deta hai. Har encryption ke liye `new SecureRandom()` se fresh random IV generate karo.

> [!danger]
> **Custom crypto**: apna khud ka cipher, hash, ya key derivation function likhna. Mat karo. JCA/JCE ke standard algorithms use karo. Ek hi exception hai — Bouncy Castle, un algorithms ke liye jo JDK mein nahi hain (jaise newer EC curves).

> [!danger]
> **Passwords ke liye MD5 ya SHA-1**: yeh fast hashing algorithms hain — ek GPU billions per second compute kar sakta hai. Passwords ke liye hamesha bcrypt, Argon2, ya scrypt use karo. MD5/SHA-1 sirf non-security purposes ke liye theek hain (checksums, content addressing) — password ke liye bilkul nahi.

> [!warning]
> **JWKS lookup mein `kid` pin na karna**: agar tum `kid` header ko apne JWKS ke against explicitly validate nahi karte, toh ek attacker jo IdP control karta hai woh apni khud ki key swap kar sakta hai. Hamesha `kid` explicitly match karo.

---

## Java ka JCA/JCE aur BouncyCastle

Kya hota hai? JCA (Java Cryptography Architecture) aur JCE (Java Cryptography Extension) yeh provide karte hain:
- `Cipher`, `MessageDigest`, `Mac`, `KeyPairGenerator`, `KeyStore`, `SecureRandom`
- Available algorithms: AES-GCM, RSA-OAEP, ECDSA, SHA-256/384/512, PBKDF2, waghera

BouncyCastle add karo jab tumhe chahiye:
- X.509 certificate parsing/generation
- PKCS#12 key stores
- Extra EC curves (Brainpool, Curve25519)
- CMS, PGP
- Modern algorithms jo abhi JDK mein nahi hain (XChaCha20-Poly1305, Kyber — post-quantum)

```xml
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk18on</artifactId>
    <version>1.78</version>
</dependency>
```

```java
// BouncyCastle ko JCE provider ke roop mein register karo
Security.addProvider(new BouncyCastleProvider());
// Ab Cipher.getInstance("AES/GCM/NoPadding", "BC") Bouncy Castle use karega
```

---

## Express/TS comparison

```typescript
// Node.js ka built-in crypto module (JCA ke equivalent)
import { createCipheriv, createDecipheriv, randomBytes, createSign } from 'crypto';

// AES-256-GCM encryption
function encrypt(plaintext: string, key: Buffer): { ciphertext: string; iv: string; tag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: encrypted.toString('base64'),
    iv:         iv.toString('base64'),
    tag:        cipher.getAuthTag().toString('base64')
  };
}

// JWT signing with RS256
import jwt from 'jsonwebtoken';
const token = jwt.sign({ sub: userId }, privateKey, {
  algorithm: 'RS256',
  keyid: 'v2',
  expiresIn: '15m'
});
```

Algorithms same hain — AES-256-GCM, RS256, EC — chahe Node ho ya Java. Java ka API thoda zyada verbose hai but cryptographic primitives bilkul identical hain. BouncyCastle library, Node ke `node-forge` ya `@noble/*` family jaisi hai.

---

## Production checklist

- [ ] JWT signing RS256 ya ES256 use karta hai (HS256 sirf tab jab single-service internal ho)
- [ ] JWKS endpoint publicly serve ho raha hai; resource servers JWKS se verify karte hain, hardcoded keys se nahi
- [ ] JWTs mein `kid` header present hai; JWKS lookup known key IDs ke against validate karta hai
- [ ] Key rotation procedure documented aur tested hai (two-key overlap window)
- [ ] Private keys KMS/Vault mein store hain (filesystem ya `application.yml` mein nahi)
- [ ] Database field encryption AES-256-GCM use karta hai, har record ke liye random IV ke saath
- [ ] Envelope encryption: DEK, KMS ke KEK se encrypted hai; DEK kahin plaintext mein store nahi
- [ ] Password hashing ke liye `DelegatingPasswordEncoder` (default Argon2id)
- [ ] Codebase mein kahin bhi ECB mode ya hardcoded IVs nahi hain
- [ ] Maven/Gradle build mein SpotBugs + FindSecBugs plugin, crypto misuse pakadne ke liye
- [ ] BouncyCastle version pinned hai aur regularly update hoti hai

---

## Related

- [[17-Secrets-Management]]
- [[04-JWT-with-Spring-Security]]
- [[08-OAuth2-Resource-Server]]
- [[06-Password-Encoding]]
- [[13-Spring-Security-OIDC-Login]]
- [[20-Production-Security-Checklist]]
