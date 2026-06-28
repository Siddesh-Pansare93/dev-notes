---
tags: [security, production, cryptography, jwt, key-rotation, kms, jwks, aes, envelope-encryption]
aliases: [Key Management, JWT Key Rotation, JWKS, KMS, Crypto Agility, At-Rest Encryption]
stage: advanced
---

# Cryptographic Key Management

> [!info] For the Express/TS dev
> In Node you've probably used `jsonwebtoken` with a string secret. That works for demos. Production needs: RSA/EC keys for JWTs, JWKS endpoints for rotation, KMS for storing private keys, and AES-GCM for encrypting database fields. This note covers all of it with real Java code.

## Concept / mental model

### JWT signing — RSA vs EC vs symmetric

| Algorithm | Key type | Verify | Sign | When to use |
|---|---|---|---|---|
| `HS256/384/512` | Shared secret (HMAC) | ✓ (same key) | ✓ (same key) | Single service, secret can stay private |
| `RS256/384/512` | RSA 2048/4096 | Public key | Private key | Expose JWKS endpoint; multiple verifiers |
| `ES256/384/512` | EC P-256/P-384/P-521 | Public key | Private key | Same as RSA but smaller + faster |
| `PS256/384/512` | RSA-PSS | Public key | Private key | More modern RSA padding |

> [!tip]
> Use **RS256 or ES256** in production if any other service verifies your tokens. A shared HMAC secret means every verifier also has signing capability — a compromised verifier can forge tokens. With asymmetric keys, verifiers only hold the public key.

---

## Code examples

### Generating JWT signing keys

```bash
# RSA 2048 (common choice)
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem

# EC P-256 (smaller, faster, equally strong)
openssl ecparam -name prime256v1 -genkey -noout -out ec-private.pem
openssl ec -in ec-private.pem -pubout -out ec-public.pem
```

Store private keys in Vault/KMS (see [[17-Secrets-Management]]). Never commit to Git.

### Spring Boot JWT config with RS256

```yaml
# application.yml — paths to key files (loaded from classpath/filesystem)
# In production, inject these as env vars pointing to Vault-fetched content
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
    key-id: v1   # the 'kid' header value
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

### JWKS endpoint — expose public keys for verifiers

If you're running an Authorization Server (e.g., with Spring Authorization Server):

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

Resource servers (your microservices) fetch this once at startup and cache. When they see a JWT with `kid: v1`, they verify using the matching public key.

### JWT key rotation — the `kid` overlap window pattern

> [!danger]
> **Do not swap keys atomically.** Tokens issued with key v1 are still in circulation when you want to move to v2. A hard cutover invalidates all active sessions at once.

**Safe rotation procedure:**

1. **Generate key v2**
2. **Serve both keys from JWKS** (v1 + v2 in the `keys` array)
3. **Start signing new tokens with v2** (`kid: v2` in token header)
4. **Wait for v1 token TTL to expire** (e.g., 15 minutes)
5. **Remove v1 from JWKS** — no valid v1 tokens can exist anymore

```java
@Configuration
public class JwksConfig {

    // Load both current and previous key
    @Bean
    public JWKSource<SecurityContext> jwkSource(
            @Value("${custom.jwt.key-v1-private}") Resource v1Private,
            @Value("${custom.jwt.key-v1-public}")  Resource v1Public,
            @Value("${custom.jwt.key-v2-private}") Resource v2Private,
            @Value("${custom.jwt.key-v2-public}")  Resource v2Public
    ) throws Exception {

        RSAKey keyV1 = buildRsaKey("v1", v1Private, v1Public);
        RSAKey keyV2 = buildRsaKey("v2", v2Private, v2Public);

        // Both keys served; v2 is used for signing (first in list)
        return new ImmutableJWKSet<>(new JWKSet(List.of(keyV2, keyV1)));
    }

    @Bean
    public JwtEncoder jwtEncoder(JWKSource<SecurityContext> jwkSource) {
        return new NimbusJwtEncoder(jwkSource);
        // NimbusJwtEncoder signs with the first key in the JWKSet by default
    }
}
```

---

## Storing private keys — KMS / HSM / Vault

| Option | Security | Ops complexity | Cost |
|---|---|---|---|
| Files on classpath (dev only) | Low | Trivial | Free |
| Vault Transit secret engine | High | Medium | Free (OSS Vault) |
| AWS KMS | Very High | Low (managed) | ~$1/key/month + API calls |
| GCP Cloud KMS | Very High | Low | Similar to AWS |
| Azure Key Vault HSM | Very High | Low | Premium tier |
| HSM (physical/CloudHSM) | Highest | High | Expensive |

**Vault Transit** (sign without exposing the key):

```java
// Vault signs your JWT payload — the private key never leaves Vault
@Service
public class VaultTransitJwtSigner {

    private final VaultTemplate vault;

    public String sign(byte[] payload) {
        VaultTransitContext context = VaultTransitContext.builder()
            .build();

        // Base64url-encode payload, sign with Vault
        String payloadB64 = Base64.getUrlEncoder().encodeToString(payload);
        Signature sig = vault.opsForTransit()
            .sign("jwt-signing-key", payloadB64, context);

        return sig.getSignature();   // "vault:v1:base64sig"
    }
}
```

---

## At-rest encryption for database fields

For highly sensitive fields (SSNs, credit card last 4, medical notes) that must be stored but protected even if the DB is compromised:

### Envelope encryption pattern

```
Plaintext  →  [encrypt with DEK]  →  Ciphertext stored in DB
DEK        →  [encrypt with KEK from KMS]  →  Encrypted DEK stored alongside ciphertext
```

- **DEK** (Data Encryption Key) — unique per record, generated in your app
- **KEK** (Key Encryption Key) — stored in KMS, never in your app

```java
@Component
@RequiredArgsConstructor
public class FieldEncryptionService {

    private final KmsClient kmsClient;
    private final String    kekArn;       // AWS KMS key ARN from config

    public EncryptedField encrypt(String plaintext) {
        // Generate a fresh DEK via KMS
        GenerateDataKeyRequest req = GenerateDataKeyRequest.builder()
            .keyId(kekArn)
            .keySpec(DataKeySpec.AES_256)
            .build();
        GenerateDataKeyResponse resp = kmsClient.generateDataKey(req);

        byte[] dek           = resp.plaintext().asByteArray();
        byte[] encryptedDek  = resp.ciphertextBlob().asByteArray();

        // Encrypt plaintext with DEK (AES-256-GCM)
        byte[] ciphertext = encryptAesGcm(plaintext.getBytes(UTF_8), dek);

        // Zero out the DEK in memory
        Arrays.fill(dek, (byte) 0);

        return new EncryptedField(
            Base64.getEncoder().encodeToString(ciphertext),
            Base64.getEncoder().encodeToString(encryptedDek)
        );
    }

    public String decrypt(EncryptedField field) {
        byte[] encryptedDek = Base64.getDecoder().decode(field.encryptedDek());

        // Ask KMS to decrypt the DEK
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
            new SecureRandom().nextBytes(iv);  // 96-bit IV for GCM

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE,
                new SecretKeySpec(key, "AES"),
                new GCMParameterSpec(128, iv));  // 128-bit auth tag

            byte[] encrypted = cipher.doFinal(plaintext);

            // Prepend IV to ciphertext: [12 bytes IV][ciphertext + 16 bytes tag]
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

### JPA `@Convert` for transparent field encryption

```java
@Converter
@Component
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    // Spring-injected via a static holder trick (converters aren't Spring beans by default)
    private static FieldEncryptionService encryptionService;

    @Autowired
    public void setEncryptionService(FieldEncryptionService svc) {
        EncryptedStringConverter.encryptionService = svc;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        EncryptedField field = encryptionService.encrypt(attribute);
        // Serialize both ciphertext and encrypted DEK as JSON
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
    private String ssn;    // stored encrypted, transparent to application code
}
```

> [!warning]
> Encrypted fields cannot be queried with `WHERE ssn = ?` — you'd have to decrypt every row. For searchable encrypted fields, use deterministic encryption (AES-SIV) or store a keyed hash (HMAC) separately for lookup. AES-GCM is non-deterministic and preferred for storage.

---

## Crypto agility — design for algorithm rotation

PBKDF2 → bcrypt → Argon2id: each generation is stronger. Design your password storage to support algorithm migration:

```java
// Store algorithm identifier with the hash
@Entity
public class User {
    // Format: "$argon2id$v=19$m=65536,t=3,p=4$salt$hash"
    // or:      "$2a$12$salt+hash"           (bcrypt)
    private String passwordHash;
    private String hashAlgorithm;  // "ARGON2ID", "BCRYPT" — for migration
}

// DelegatingPasswordEncoder — Spring's built-in crypto agility for passwords
@Bean
public PasswordEncoder passwordEncoder() {
    Map<String, PasswordEncoder> encoders = Map.of(
        "argon2",  new Argon2PasswordEncoder(16, 32, 1, 65536, 3),
        "bcrypt",  new BCryptPasswordEncoder(12),
        "pbkdf2",  new Pbkdf2PasswordEncoder("secret", 16, 310000, SecretKeyFactoryAlgorithm.PBKDF2WithHmacSHA256)
    );
    // New passwords use argon2; old bcrypt/pbkdf2 hashes still verify
    return new DelegatingPasswordEncoder("argon2", encoders);
}
// Hash format: {argon2}$argon2id$...  — the prefix identifies the algorithm
```

---

## Common mistakes

> [!danger]
> **ECB mode** (`AES/ECB/PKCS5Padding`): identical plaintext blocks produce identical ciphertext. Reveals patterns. NEVER use ECB. Use GCM or CBC with a random IV.

> [!danger]
> **Hardcoded IVs / nonces**: using a fixed IV for AES-GCM completely breaks semantic security. Generate a fresh random IV for every encryption with `new SecureRandom()`.

> [!danger]
> **Custom crypto**: implementing your own cipher, hash, or key derivation function. Don't. Use JCA/JCE standard algorithms. The only exception is Bouncy Castle for algorithms not in the JDK (e.g., newer EC curves).

> [!danger]
> **MD5 or SHA-1 for passwords**: these are fast hashing algorithms — a GPU can compute billions per second. Always use bcrypt, Argon2, or scrypt for passwords. MD5/SHA-1 are only appropriate for non-security purposes (checksums, content addressing).

> [!warning]
> **Not pinning `kid` in JWKS lookup**: if you don't validate the `kid` header against your JWKS before using the key, an attacker who controls an IdP could swap in their own key. Always match `kid` explicitly.

---

## Java's JCA/JCE and BouncyCastle

JCA (Java Cryptography Architecture) and JCE (Java Cryptography Extension) provide:
- `Cipher`, `MessageDigest`, `Mac`, `KeyPairGenerator`, `KeyStore`, `SecureRandom`
- Available algorithms: AES-GCM, RSA-OAEP, ECDSA, SHA-256/384/512, PBKDF2, etc.

Add BouncyCastle when you need:
- X.509 certificate parsing/generation
- PKCS#12 key stores
- Additional EC curves (Brainpool, Curve25519)
- CMSM, PGP
- Modern algorithms not yet in JDK (XChaCha20-Poly1305, Kyber — post-quantum)

```xml
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk18on</artifactId>
    <version>1.78</version>
</dependency>
```

```java
// Register BouncyCastle as JCE provider
Security.addProvider(new BouncyCastleProvider());
// Now Cipher.getInstance("AES/GCM/NoPadding", "BC") uses Bouncy Castle
```

---

## Express/TS comparison

```typescript
// Node.js built-in crypto (equivalent to JCA)
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

The algorithms are the same — AES-256-GCM, RS256, EC. Java's API is more verbose but the cryptographic primitives are identical. The BouncyCastle library is equivalent to Node's `node-forge` or the `@noble/*` family of crypto libraries.

---

## Production checklist

- [ ] JWT signing uses RS256 or ES256 (not HS256 unless single-service internal)
- [ ] JWKS endpoint served publicly; resource servers verify via JWKS, not hardcoded keys
- [ ] `kid` header present in JWTs; JWKS lookup validates against known key IDs
- [ ] Key rotation procedure documented and tested (two-key overlap window)
- [ ] Private keys stored in KMS/Vault (not on filesystem or in `application.yml`)
- [ ] Database field encryption uses AES-256-GCM with per-record random IV
- [ ] Envelope encryption: DEK encrypted by KMS KEK; DEK not stored in plaintext
- [ ] `DelegatingPasswordEncoder` for password hashing (Argon2id as default)
- [ ] No ECB mode, no hardcoded IVs anywhere in codebase
- [ ] SpotBugs + FindSecBugs plugin in Maven/Gradle build to catch crypto misuse
- [ ] BouncyCastle version pinned and regularly updated

---

## Related

- [[17-Secrets-Management]]
- [[04-JWT-with-Spring-Security]]
- [[08-OAuth2-Resource-Server]]
- [[06-Password-Encoding]]
- [[13-Spring-Security-OIDC-Login]]
- [[20-Production-Security-Checklist]]
