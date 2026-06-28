# Authentication & Authorization — Complete Guide

> "Security mein compromise mat karo. Ek galti aur lakho users ka data leak ho sakta hai."

## Table of Contents

1. [Authentication vs Authorization](#1-authentication-vs-authorization)
2. [Session-Based Authentication](#2-session-based-authentication)
3. [JWT Authentication](#3-jwt-json-web-token-authentication)
4. [Access Tokens + Refresh Tokens](#4-access-tokens--refresh-tokens)
5. [OAuth 2.0 — "Login with Google" Explained](#5-oauth-20--login-with-google-explained)
6. [OpenID Connect (OIDC)](#6-openid-connect-oidc)
7. [API Key Authentication](#7-api-key-authentication)
8. [RBAC — Role-Based Access Control](#8-rbac--role-based-access-control)
9. [ABAC — Attribute-Based Access Control](#9-abac--attribute-based-access-control)
10. [Multi-Factor Authentication (MFA)](#10-multi-factor-authentication-mfa)
11. [Single Sign-On (SSO)](#11-single-sign-on-sso)
12. [Password Storage Done Right](#12-password-storage-done-right)
13. [Common Vulnerabilities](#13-common-vulnerabilities)
14. [Session vs JWT — Full Comparison](#14-session-vs-jwt--full-comparison)
15. [Auth in Microservices](#15-auth-in-microservices)
16. [Common Interview Questions](#16-common-interview-questions)
17. [Key Takeaways](#17-key-takeaways)

---

## 1. Authentication vs Authorization

### The Hotel Analogy — Samjho Pehle

Soch ki tu ek hotel mein check-in karne gaya.

**Authentication (AuthN) = Front Desk wala check karta hai ki tu kaun hai.**
Tu apna ID card / passport dikhata hai. Front desk wala verify karta hai. "Haan, yeh Siddesh hai." That's it — identity proved.

**Authorization (AuthZ) = Tera room key card decide karta hai ki tu kahan ja sakta hai.**
Tera card 5th floor ke sirf Room 503 ka door kholta hai. Agar tu 7th floor pe jaane ki koshish kare, door nahi khulega. Tujhe 7th floor access nahi hai, chahe tu kahin ka bhi guest ho.

```
AUTHENTICATION                    AUTHORIZATION
─────────────                     ─────────────
"WHO are you?"                    "WHAT can you do?"
Prove your identity               Check your permissions

Hotel front desk                  Key card opens your
checks your ID.                   floor, not others.

Result: User ID                   Result: Allow / Deny
```

### Real World Examples

| App | Authentication | Authorization |
|-----|---------------|---------------|
| Instagram | Login with phone/email/Google | Can edit only YOUR posts, not others |
| YouTube | Login with Google account | Premium users can download videos, free users cannot |
| Zomato | Login with phone OTP | Restaurant owners can edit their own menu, not competitors' |
| Netflix | Login with email+password | Different plans allow different screen counts |
| WhatsApp | Login with phone OTP | Can only read chats you are part of |
| Swiggy | Login with phone | Delivery partners see only their assigned orders |

### Why This Distinction Matters

Yeh kyun important hai? Because ek system mein dono alag-alag problems hain:

- **AuthN failure** = System ko pata nahi tum kaun ho. Hacker ghus sakta hai.
- **AuthZ failure** = System ko pata hai tum kaun ho, but permissions galat hain. Ek normal user admin data dekh sakta hai.

2019 mein Facebook ka ek bug tha jahan authorization galat tha — logged-in users doosron ke private photos dekh sakte the. Authentication sahi tha (sab log logged in the), but authorization galat tha.

```mermaid
flowchart LR
    A[User Request] --> B{Authenticated?}
    B -- No --> C[401 Unauthorized\nPlease Login]
    B -- Yes --> D{Authorized?}
    D -- No --> E[403 Forbidden\nNo Permission]
    D -- Yes --> F[200 OK\nHere's your data]
```

> **Interview Tip:** Ye baat clearly explain karo — 401 Unauthorized matlab "not authenticated" (identity prove nahi hui), aur 403 Forbidden matlab "authenticated but not authorized" (ID pata hai, but permission nahi hai). Interviewer yeh distinction sun ke impress hote hain.

---

## 2. Session-Based Authentication

### The Library Card Analogy

Soch tu library mein gaya. Counter pe gaya, ID diya, unho ne ek library card banake diya. Ab jab bhi library aata hai, woh card dikhata hai. Counter wala card scan karta hai, records check karta hai, aur andar jaane deta hai.

Session-based auth exactly aisa hi kaam karta hai. Server ek "library record" rakhta hai har logged-in user ka.

### How It Works — Step by Step

```mermaid
sequenceDiagram
    participant Browser
    participant Server
    participant Redis as Redis / DB

    Browser->>Server: POST /login {email, password}
    Server->>Server: Verify password hash
    Server->>Redis: CREATE session {userId, email, roles}
    Redis-->>Server: sessionId = "abc123xyz"
    Server-->>Browser: Set-Cookie: sessionId=abc123xyz; HttpOnly; Secure

    Note over Browser,Redis: Every subsequent request

    Browser->>Server: GET /profile (Cookie: sessionId=abc123xyz)
    Server->>Redis: GET session "abc123xyz"
    Redis-->>Server: {userId: 42, email: "user@gmail.com", roles: ["user"]}
    Server-->>Browser: 200 OK {profile data}

    Note over Browser,Redis: Logout

    Browser->>Server: POST /logout
    Server->>Redis: DELETE session "abc123xyz"
    Server-->>Browser: Clear cookie → 200 OK
```

### What Gets Stored Where

```
CLIENT (Browser Cookie):
─────────────────────────
sessionId = "abc123xyz789"
(just a random ID, nothing sensitive)

SERVER (Redis / Database):
──────────────────────────
{
  "abc123xyz789": {
    userId: 42,
    email: "siddesh@gmail.com",
    roles: ["user"],
    createdAt: "2026-06-26T10:00:00Z",
    expiresAt: "2026-06-27T10:00:00Z"
  }
}
```

### Pros and Cons

| Pros | Cons |
|------|------|
| Easy to revoke — just delete session from Redis | Server must store ALL sessions — not stateless |
| Server has full control over sessions | Doesn't scale well without shared session store |
| Secure by design (session ID reveals nothing) | Sticky sessions or shared Redis needed across servers |
| Instant logout works | Cookies don't work well for mobile apps or cross-domain APIs |
| Can store rich session data | Performance hit on every request (Redis lookup) |

### Real Example: Zomato Web App

Jab tu Zomato pe login karta hai browser se:
1. Zomato server ek session banata hai Redis mein
2. Browser ko sessionId cookie milta hai
3. Har request pe browser cookie bhejta hai
4. Zomato ka server Redis se session check karta hai
5. Jab tu logout karta hai — Redis se session delete ho jaata hai, instantly

```javascript
// Node.js session setup
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');

const redisClient = redis.createClient({ url: process.env.REDIS_URL });

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,       // HTTPS only — production mein must
    httpOnly: true,     // JavaScript se access nahi — XSS protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'  // CSRF protection
  }
}));

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findOne({ email });

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Session mein user data store karo
  req.session.userId = user.id;
  req.session.email = user.email;
  req.session.roles = user.roles;

  res.json({ message: 'Login successful' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});
```

> **Interview Tip:** Session-based auth ke saath "horizontal scaling" problem batao. Agar 3 servers hain aur session server-1 pe stored hai, server-2 aur server-3 use nahi dekh sakte. Solution: Shared Redis cluster. Yeh batana bahut important hai.

---

## 3. JWT (JSON Web Token) Authentication

### The Stamped Passport Analogy

Soch ek government office mein gaye, ID proof diya, unho ne ek stamped certificate diya — jisme likha hai: "Yeh Siddesh hai, Indian citizen hai, 25 saal ka hai." Ab yeh certificate le ke kisi bhi embassy ya visa office mein jaao — woh har baar government office se verify nahi karenge. Certificate khud hi proof hai, kyunki government ka stamp hai uspe.

JWT exactly aisa hi hai. Server ek "stamped token" deta hai. Har doosra server is token ko verify kar sakta hai bina original server se pooche.

### JWT Structure — Teen Parts

JWT ka format hota hai:
```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjQyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
      HEADER              PAYLOAD                    SIGNATURE
```

**Header** (Algorithm ka naam):
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload** (Claims — user ki info):
```json
{
  "sub": "42",
  "email": "siddesh@gmail.com",
  "roles": ["user"],
  "plan": "premium",
  "iat": 1751000000,
  "exp": 1751000900
}
```

`iat` = issued at (kab banaya gaya)
`exp` = expiration (kab expire hoga)

**Signature** (Server ka stamp — tamper proof):
```
HMACSHA256(
  base64(header) + "." + base64(payload),
  SECRET_KEY
)
```

Agar koi payload mein kuch bhi change kare (jaise `"roles": ["admin"]` banane ki koshish kare), signature invalid ho jaayega. Server reject karega.

### How JWT Auth Works

```mermaid
sequenceDiagram
    participant App as Mobile App / SPA
    participant AuthServer as Auth Server
    participant API as API Server

    App->>AuthServer: POST /login {email, password}
    AuthServer->>AuthServer: Verify credentials
    AuthServer->>AuthServer: Sign JWT with SECRET_KEY
    AuthServer-->>App: { accessToken: "eyJ...", refreshToken: "..." }

    Note over App,API: Every API request (no DB lookup needed!)

    App->>API: GET /orders\nAuthorization: Bearer eyJ...
    API->>API: Verify signature with SECRET_KEY
    API->>API: Check expiration (exp claim)
    API->>API: Extract userId, roles from payload
    API-->>App: 200 OK {orders data}
```

### Why JWT is Stateless — Yeh Important Hai

Session mein server ko database/Redis lookup karna padta hai har request pe.

JWT mein server sirf signature verify karta hai — NO database call. Yeh bahut fast hai aur horizontally scale karna easy hai.

```
Session Request:    Browser → Server → Redis → Server → Response
JWT Request:        Browser → Server → (verify signature) → Response
                                        (NO Redis call!)
```

Netflix ke 200 million users hain. Har request pe Redis hit karna bahut expensive hota. JWT is problem ko solve karta hai.

### JWT Implementation

```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET; // Strong random string, 256-bit minimum
const ACCESS_TOKEN_EXPIRY = '15m';         // Short-lived — yeh important hai!
const REFRESH_TOKEN_EXPIRY = '30d';        // Long-lived

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findOne({ email });

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Access token — short lived, contains user info
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      plan: user.plan
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  // Refresh token — long lived, only contains userId
  const refreshToken = jwt.sign(
    { sub: user.id },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  // Refresh token ko DB mein store karo (revocation ke liye)
  await db.refreshTokens.create({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  res.json({ accessToken, refreshToken });
});

// JWT verify middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token required' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { sub, email, roles, plan, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Protected route — no DB call!
app.get('/orders', authenticate, async (req, res) => {
  const orders = await db.orders.find({ userId: req.user.sub });
  res.json(orders);
});
```

### Where to Store JWT — Critical Security Point

```
❌ localStorage:
   - JavaScript se access hota hai
   - XSS attack mein steal ho sakta hai
   - Avoid karo!

✅ httpOnly Cookie:
   - JavaScript se access NAHI hota
   - XSS attacks se safe
   - Yeh sahi approach hai!

✅ In-memory (for SPAs):
   - Page refresh pe disappears
   - XSS se safe agar properly handled
   - Refresh token cookie mein rakhte hain
```

> **Interview Tip:** "localStorage mein JWT store karna XSS vulnerable kyun hai" — yeh bahut common question hai. Answer: XSS attack mein attacker malicious JavaScript inject karta hai. `localStorage.getItem('token')` se token steal kar sakta hai. HttpOnly cookie mein JavaScript access nahi hota, isliye safe rehta hai.

---

## 4. Access Tokens + Refresh Tokens

### The Parking Ticket Analogy

Soch tune ek mall mein parking ticket liya — yeh 2 ghante ke liye valid hai. Andar shopping kar raha hai. 2 ghante baad parking meter paas gaya, naya token liya. Agar tera original parking receipt (refresh token) valid hai, tujhe phir se payment nahi karni.

- **Access Token** = Short-lived parking token (15 min - 1 hour)
- **Refresh Token** = Long-lived receipt that lets you get a new parking token

### The Problem JWT Can't Revoke

Yeh ek real problem hai: JWT stateless hai, isliye server ke paas "blacklist" nahi hota. Agar user logout kare aur token 14 minutes mein expire hoga, wo token technically abhi bhi valid hai.

**Solution: Short Access Tokens + Refresh Token in DB**

```mermaid
sequenceDiagram
    participant App
    participant Server
    participant DB

    Note over App,DB: Initial Login
    App->>Server: POST /login
    Server->>DB: Store refresh token
    Server-->>App: accessToken (15min) + refreshToken (30d)

    Note over App,DB: 15 minutes later — access token expired
    App->>Server: GET /api/data (expired token)
    Server-->>App: 401 Token Expired

    App->>Server: POST /refresh {refreshToken}
    Server->>DB: Verify refresh token exists
    Server->>Server: Generate new access token
    Server->>DB: Rotate refresh token (delete old, create new)
    Server-->>App: New accessToken (15min) + New refreshToken (30d)

    Note over App,DB: User Logout
    App->>Server: POST /logout {refreshToken}
    Server->>DB: DELETE refresh token
    Server-->>App: 200 OK (future refresh attempts will fail)
```

### Refresh Token Rotation — Security Best Practice

Har refresh pe nayi refresh token bhi do, aur purani delete karo. Agar koi purani refresh token use karne ki koshish kare (token stolen ho gaya tha), immediately detect hoga.

```javascript
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // DB mein check karo — kya yeh token valid hai?
    const stored = await db.refreshTokens.findOne({
      token: refreshToken,
      userId: decoded.sub
    });

    if (!stored || new Date() > stored.expiresAt) {
      // Rotation attack detect! Sabhi tokens revoke karo
      await db.refreshTokens.deleteMany({ userId: decoded.sub });
      return res.status(403).json({ error: 'Refresh token reuse detected' });
    }

    const user = await db.users.findById(decoded.sub);

    // Naya access token
    const newAccessToken = jwt.sign(
      { sub: user.id, email: user.email, roles: user.roles },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Naya refresh token (rotation)
    const newRefreshToken = jwt.sign(
      { sub: user.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Purana delete, naya store
    await db.refreshTokens.delete({ id: stored.id });
    await db.refreshTokens.create({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// Logout — specific device
app.post('/auth/logout', async (req, res) => {
  const { refreshToken } = req.body;
  await db.refreshTokens.deleteOne({ token: refreshToken });
  res.json({ message: 'Logged out' });
});

// Logout — all devices (e.g. account compromised)
app.post('/auth/logout-all', authenticate, async (req, res) => {
  await db.refreshTokens.deleteMany({ userId: req.user.sub });
  res.json({ message: 'Logged out from all devices' });
});
```

---

## 5. OAuth 2.0 — "Login with Google" Explained

### The Security Guard + VIP Pass Analogy

Soch ek nightclub hai. Tu ek VIP event mein jaana chahta hai. Entry ke liye tumhare paas VIP pass chahiye. Tum seedha organizer ke paas jaate ho (Google), unhe batate ho kaun ho, woh ek special code dete hain, tum woh code nightclub ko dete ho. Nightclub organizer ko call karke verify karta hai, aur tumhe VIP access milta hai.

- **Tum** = Resource Owner (user)
- **Tumhara app** = Client
- **Google** = Authorization Server
- **Google APIs** = Resource Server

OAuth 2.0 ke baare mein ek important baat: **OAuth 2.0 authorization ke liye hai, authentication ke liye nahi.** "Login with Google" actually OpenID Connect use karta hai jo OAuth 2.0 ke upar bana hai (section 6 dekho).

### Authorization Code Flow — Step by Step

```mermaid
sequenceDiagram
    participant User
    participant YourApp as Your App\n(Swiggy, Zomato, etc.)
    participant Google as Google\n(Authorization Server)
    participant GoogleAPI as Google APIs\n(Resource Server)

    User->>YourApp: Click "Login with Google"

    YourApp->>User: Redirect to Google
    Note right of YourApp: GET https://accounts.google.com/o/oauth2/auth\n?client_id=YOUR_ID\n&redirect_uri=https://swiggy.com/callback\n&scope=openid email profile\n&state=random_csrf_token\n&response_type=code

    User->>Google: Login page dikhta hai
    User->>Google: Enters Google credentials + Consents to permissions

    Google->>YourApp: Redirect back with code
    Note left of Google: GET https://swiggy.com/callback\n?code=4/0ABCD...XYZ\n&state=random_csrf_token

    YourApp->>Google: Exchange code for tokens (server-to-server)
    Note right of YourApp: POST /token\nclient_id + client_secret + code

    Google->>YourApp: Access token + ID token + Refresh token

    YourApp->>GoogleAPI: GET /userinfo (Bearer access_token)
    GoogleAPI->>YourApp: {name, email, picture, sub}

    YourApp->>User: Logged in as Siddesh!
```

### OAuth Roles Explained

```
Resource Owner      = User (tum)
Client              = Your app (Swiggy, Instagram, etc.)
Authorization Server = Google/Facebook/GitHub (jo tokens issue karta hai)
Resource Server     = Google APIs (jo actual data deta hai)
```

### Why "Authorization Code" Flow? Why Not Direct?

```
WRONG WAY (Implicit Flow — deprecated):
App → Google → Redirect with token in URL
Problem: Token URL mein hota hai → logs mein save hota hai → stolen!

RIGHT WAY (Authorization Code Flow):
App → Google → Redirect with CODE (short-lived, 1-time use)
App → (server-to-server) → Exchange code for token
Code is useless without client_secret. Secure!
```

### Grant Types Summary

| Grant Type | Use Case | Security |
|-----------|----------|----------|
| Authorization Code | Web apps with backend | Most secure |
| Authorization Code + PKCE | SPAs, Mobile apps | Secure (no client_secret needed) |
| Client Credentials | Server-to-server (no user) | Machine-to-machine |
| Refresh Token | Get new access token | For long sessions |
| Implicit | SPAs (OLD) | Deprecated — insecure |
| Password Grant | Direct password sharing | Avoid — anti-pattern |

### PKCE — Mobile Apps ke liye

Mobile apps mein `client_secret` safely store nahi kar sakte (decompile ho sakta hai). PKCE (Proof Key for Code Exchange) iska solution hai:

```
1. App generates: code_verifier = random 128 chars
2. App computes:  code_challenge = SHA256(code_verifier)
3. App sends code_challenge to Google (not verifier)
4. Google sends back auth code
5. App sends: auth code + code_verifier (original)
6. Google verifies: SHA256(code_verifier) == code_challenge
7. Tokens milte hain!

Attacker ko code intercept mile bhi toh uske paas code_verifier nahi,
isliye token exchange nahi kar sakta.
```

### Implementing "Login with Google"

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://yourapp.com/auth/google/callback',
    scope: ['openid', 'email', 'profile']
  },
  async (accessToken, refreshToken, profile, done) => {
    // User database mein dhundho ya create karo
    let user = await db.users.findOne({ googleId: profile.id });

    if (!user) {
      user = await db.users.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0].value,
        emailVerified: true // Google ne verify kiya hai
      });
    }

    return done(null, user);
  }
));

// Step 1: Redirect to Google
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['openid', 'email', 'profile']
  })
);

// Step 2: Google callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // User authenticated — ab JWT banao
    const token = jwt.sign(
      { sub: req.user.id, email: req.user.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    // httpOnly cookie mein set karo
    res.cookie('accessToken', token, { httpOnly: true, secure: true });
    res.redirect('/dashboard');
  }
);
```

> **Interview Tip:** Yeh common question hai — "OAuth 2.0 aur OpenID Connect mein kya fark hai?" OAuth 2.0 is an **authorization** framework (API access dena). OpenID Connect adds **identity** (who you are). OAuth ke baad tumhare paas access_token hota hai (API call ke liye). OIDC adds `id_token` (user ki identity — name, email, etc.).

---

## 6. OpenID Connect (OIDC)

### Simple Explanation

OAuth 2.0 = Access permission dene ka framework
OIDC = OAuth 2.0 + "Who is this user?" layer

OIDC ek `id_token` add karta hai (JWT format mein) jo user ki identity contain karta hai.

```
OAuth 2.0 gives you:
  access_token → use kar API calls ke liye

OIDC additionally gives you:
  id_token (JWT) → user ki identity
  {
    "sub": "108934567890",     ← Google user ID
    "email": "sid@gmail.com",
    "name": "Siddesh Pansare",
    "picture": "https://...",
    "email_verified": true,
    "iss": "https://accounts.google.com",
    "aud": "your_client_id",
    "exp": 1751000900
  }
```

```mermaid
flowchart LR
    A[OAuth 2.0] --> B[Access Token\nfor API calls]
    C[OpenID Connect\nOAuth 2.0 +] --> D[Access Token\nfor API calls]
    C --> E[ID Token JWT\nuser identity]
    C --> F[Userinfo Endpoint\n/userinfo]
```

### Why Use OIDC Instead of Just OAuth?

OAuth se tumhe pata hai user ne permission di, but **kaun hai woh user** yeh pata nahi. OIDC adds standardized user info. Isliye "Login with Google" OIDC use karta hai, pure OAuth nahi.

---

## 7. API Key Authentication

### The House Key Analogy

Simple baat hai — API key ek copy of key hai jo tum kisi trusted party ko dete ho apne ghar ki. Woh har baar ID proof nahi dikhaata, directly key use karke andar jaata hai.

API keys primarily **server-to-server** communication ke liye hain — jahan koi user involved nahi hota.

### When to Use API Keys

- Third-party integrations (Razorpay, Twilio, SendGrid)
- Backend services communicating with each other
- IoT devices hitting your API
- Webhook authentications

### How API Key Auth Works

```mermaid
sequenceDiagram
    participant Razorpay as Razorpay\n(3rd party service)
    participant YourServer as Your Backend
    participant DB

    YourServer->>DB: Generate API key for Razorpay integration
    DB-->>YourServer: key = "rzp_live_abc123..." (hash store karo)
    YourServer-->>Razorpay: Share API key securely

    Note over Razorpay,DB: Every API call

    Razorpay->>YourServer: POST /webhook\nAuthorization: Bearer rzp_live_abc123...
    YourServer->>DB: Hash(key) == stored_hash?
    DB-->>YourServer: Yes + permissions
    YourServer-->>Razorpay: 200 OK
```

### API Key Best Practices

```
✅ Store HASHED in database (not plaintext)
✅ Show key only ONCE at generation time
✅ Use prefixes: sk_live_, sk_test_, rzp_live_
✅ Scope permissions per key
✅ Track last used timestamp
✅ Allow revocation
✅ Rotate keys periodically
✅ Rate limit per key

❌ Never store plaintext
❌ Never include in URLs (?api_key=... → logs mein aata hai)
❌ Never commit to Git
❌ Never use MD5 for hashing (use SHA-256)
```

### Implementation

```javascript
const crypto = require('crypto');

// API key generate karo
async function generateApiKey(userId, name, permissions) {
  const rawKey = 'sk_live_' + crypto.randomBytes(32).toString('hex');

  // Hash store karo (NEVER plaintext)
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  await db.apiKeys.create({
    userId,
    name,
    keyHash,
    prefix: rawKey.substring(0, 12) + '...',  // Display ke liye
    permissions,
    createdAt: new Date(),
    lastUsedAt: null
  });

  // Sirf ek baar return karo — user se bol ke save kar le!
  return rawKey;
}

// Verify middleware
const authenticateApiKey = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'API key required' });
  }

  const rawKey = authHeader.substring(7);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await db.apiKeys.findOne({ keyHash });
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Last used update karo
  await db.apiKeys.update({ id: apiKey.id }, { lastUsedAt: new Date() });

  req.apiKey = apiKey;
  req.userId = apiKey.userId;
  next();
};
```

---

## 8. RBAC — Role-Based Access Control

### The Job Title Analogy

Office mein think karo. Har employee ki ek job title hoti hai — Manager, Developer, Intern, HR. Title ke based pe unke access rights hote hain:
- Manager → appraisal system access
- Developer → code repository access
- Intern → limited read access
- HR → employee records access

RBAC exactly aisa hi hai. **Users → Roles → Permissions**

### RBAC Structure

```
Users:
  Alice  → [admin]
  Bob    → [editor]
  Charlie → [viewer]
  Guest  → [guest]

Roles and Permissions:
  admin   → read, write, delete, manage_users, view_analytics
  editor  → read, write, delete
  viewer  → read
  guest   → (none)

Permission Check:
  "Can Bob delete a post?"
  Bob → editor → [read, write, delete] → YES ✅

  "Can Charlie delete a post?"
  Charlie → viewer → [read] → NO ❌
```

### Real Example: YouTube

```
YouTube RBAC:
─────────────
Creator role:
  - Upload videos
  - Edit own video descriptions
  - See own analytics
  - Reply to comments

Moderator role (hired by creator):
  - Delete comments
  - Ban users from channel
  - Cannot delete the video itself

Viewer (free):
  - Watch videos
  - Like/comment
  - Cannot download

Viewer (Premium):
  - Everything free viewers can
  - Download for offline
  - Background play
```

### RBAC Implementation

```javascript
// Role-permission mapping
const ROLE_PERMISSIONS = {
  admin:   ['read', 'write', 'delete', 'manage_users', 'view_analytics'],
  editor:  ['read', 'write', 'delete'],
  creator: ['read', 'write', 'delete', 'publish', 'view_own_analytics'],
  viewer:  ['read'],
  guest:   []
};

// Middleware factory
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userRole = req.user.role;
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    if (!permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        yourRole: userRole
      });
    }

    next();
  };
};

// Usage
app.get('/posts', authenticate, requirePermission('read'), getPostsHandler);
app.post('/posts', authenticate, requirePermission('write'), createPostHandler);
app.delete('/posts/:id', authenticate, requirePermission('delete'), deletePostHandler);
app.get('/admin/users', authenticate, requirePermission('manage_users'), getUsersHandler);
```

### RBAC Limitations

```
Problem: "Role explosion"
Bob is editor but ONLY for category "Technology", not "Sports"
Charlie is viewer but can also comment (extra permission)
Dave is admin but only for his own organization's data

RBAC struggle karta hai aise complex scenarios mein.
Solution: ABAC (next section)
```

---

## 9. ABAC — Attribute-Based Access Control

### The Airport Security Analogy

Airport pe sirf "passenger" ya "staff" se kaam nahi chalta. Security check hoti hai based pe:
- Kaun hai? (user attributes)
- Kahan jaana chahta hai? (resource attributes)
- Kab? (time/environment attributes)
- Kya karna chahta hai? (action)

Business class passenger → lounge access
Economy passenger → lounge access nahi
Staff on duty → restricted areas access
Staff off duty → restricted areas access nahi

Yeh ABAC hai — **multiple attributes ke based pe decision**.

### ABAC Policy Example

```
ALLOW if:
  user.department == "finance"
  AND resource.classification == "confidential"
  AND resource.department == "finance"
  AND action == "read"
  AND environment.time.hour >= 9
  AND environment.time.hour <= 18
  AND user.mfaVerified == true
```

### ABAC vs RBAC Comparison

| Feature | RBAC | ABAC |
|---------|------|------|
| Complexity | Simple | Complex |
| Flexibility | Limited | Very high |
| Performance | Fast | Slower (more evaluations) |
| Fine-grained control | No | Yes |
| Audit trail | Easy | Harder |
| Use case | Most apps | Enterprise, compliance-heavy |
| Example | YouTube roles | AWS IAM policies |

### ABAC Implementation

```javascript
class PolicyEngine {
  // Policies define karo
  static policies = [
    {
      id: 'finance-read-confidential',
      description: 'Finance team can read confidential finance docs',
      effect: 'allow',
      condition: (user, resource, action, env) =>
        action === 'read' &&
        resource.type === 'document' &&
        resource.classification === 'confidential' &&
        user.department === resource.department &&
        user.department === 'finance' &&
        env.hour >= 9 && env.hour <= 18
    },
    {
      id: 'own-resource-edit',
      description: 'Users can edit their own resources',
      effect: 'allow',
      condition: (user, resource, action) =>
        ['update', 'delete'].includes(action) &&
        resource.ownerId === user.id
    },
    {
      id: 'admin-all-access',
      description: 'Admins can do everything',
      effect: 'allow',
      condition: (user) => user.role === 'admin'
    }
  ];

  static evaluate(user, resource, action, env = {}) {
    const context = {
      hour: new Date().getHours(),
      ...env
    };

    // Explicit DENY policies check karo pehle
    for (const policy of this.policies) {
      if (policy.effect === 'deny' && policy.condition(user, resource, action, context)) {
        return false;
      }
    }

    // ALLOW policies check karo
    for (const policy of this.policies) {
      if (policy.effect === 'allow' && policy.condition(user, resource, action, context)) {
        return true;
      }
    }

    // Default deny
    return false;
  }
}

// Usage
app.put('/documents/:id', authenticate, async (req, res) => {
  const user = await db.users.findById(req.user.sub);
  const document = await db.documents.findById(req.params.id);

  const allowed = PolicyEngine.evaluate(user, document, 'update');

  if (!allowed) {
    return res.status(403).json({ error: 'Access denied by policy' });
  }

  const updated = await db.documents.update(req.params.id, req.body);
  res.json(updated);
});
```

### Real Example: AWS IAM (ABAC at scale)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::company-data/${aws:PrincipalTag/Department}/*",
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/Classification": "internal"
        },
        "IpAddress": {
          "aws:SourceIp": "10.0.0.0/8"
        }
      }
    }
  ]
}
```

Finance team → sirf `company-data/finance/` access kar sakta hai. Marketing team → sirf `company-data/marketing/` access. Aur sirf office network se.

---

## 10. Multi-Factor Authentication (MFA)

### The Bank Vault Analogy

Bank vault kholne ke liye sirf ek key nahi chahiye. Chahiye:
1. Bank manager ki key (something you have)
2. Customer ki key (something you have)
3. Time lock — sirf banking hours mein (environment)

MFA same principle — multiple independent factors.

### The Three Factors

```
Factor 1: Something you KNOW
  - Password
  - PIN
  - Security questions (weak!)

Factor 2: Something you HAVE
  - Phone (SMS OTP)
  - Authenticator app (Google Authenticator, Authy)
  - Hardware token (YubiKey)
  - Email OTP

Factor 3: Something you ARE
  - Fingerprint (Touch ID)
  - Face recognition (Face ID)
  - Retina scan
  - Voice recognition
```

### MFA Methods — Security Ranking

| Method | Security | Convenience | Phishable? |
|--------|---------|-------------|-----------|
| SMS OTP | Low | High | Yes (SIM swap attack) |
| Email OTP | Low-Medium | High | Yes |
| TOTP (Google Authenticator) | High | Medium | No (offline) |
| Push notification (Duo) | High | High | Partially |
| Hardware key (YubiKey) | Very High | Low | No |
| Biometric | High | Very High | No |

### TOTP Flow (Google Authenticator)

TOTP = Time-based One-Time Password. Phone aur server dono ke paas same secret hai. Har 30 seconds mein dono ek naya code calculate karte hain. Server check karta hai ki client ka code match karta hai.

```mermaid
sequenceDiagram
    participant User
    participant App as Your App
    participant AuthApp as Google Authenticator

    Note over User,AuthApp: MFA Setup (one time)
    User->>App: Enable MFA
    App->>App: Generate TOTP secret
    App->>User: Show QR code (contains secret)
    User->>AuthApp: Scan QR code
    AuthApp->>AuthApp: Store secret
    User->>App: Enter first code to verify setup
    App->>App: Verify TOTP code, enable MFA

    Note over User,AuthApp: Every Login
    User->>App: Enter email + password
    App->>User: Password correct. Enter MFA code.
    User->>AuthApp: Open app
    AuthApp->>User: Shows 6-digit code (valid 30 sec)
    User->>App: Enter code: 482619
    App->>App: Verify TOTP\n(server knows same secret, same time)
    App->>User: Login successful!
```

### MFA Implementation

```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// MFA setup — Step 1: Generate secret
app.post('/mfa/setup', authenticate, async (req, res) => {
  const user = await db.users.findById(req.user.sub);

  const secret = speakeasy.generateSecret({
    name: `YourApp (${user.email})`,
    issuer: 'YourApp'
  });

  // Temporarily store (not enabled yet — wait for verification)
  await db.users.update({ id: user.id }, {
    mfaSecretTemp: secret.base32,
    mfaEnabled: false
  });

  // QR code generate karo for authenticator app
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  res.json({
    secret: secret.base32,  // Manual entry ke liye
    qrCode: qrCodeUrl       // Scan ke liye
  });
});

// MFA setup — Step 2: Verify and enable
app.post('/mfa/verify-setup', authenticate, async (req, res) => {
  const { code } = req.body;
  const user = await db.users.findById(req.user.sub);

  const isValid = speakeasy.totp.verify({
    secret: user.mfaSecretTemp,
    encoding: 'base32',
    token: code,
    window: 1  // 30 second window tolerance
  });

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  // MFA enable karo
  await db.users.update({ id: user.id }, {
    mfaSecret: user.mfaSecretTemp,
    mfaSecretTemp: null,
    mfaEnabled: true
  });

  // Backup codes bhi generate karo
  const backupCodes = Array.from({ length: 10 },
    () => crypto.randomBytes(4).toString('hex')
  );
  await db.users.update({ id: user.id }, {
    mfaBackupCodes: backupCodes.map(c => bcrypt.hashSync(c, 10))
  });

  res.json({
    message: 'MFA enabled',
    backupCodes  // Ek baar dikhao, store karne kaho user ko
  });
});

// Login with MFA
app.post('/login', async (req, res) => {
  const { email, password, mfaCode } = req.body;

  const user = await db.users.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.mfaEnabled) {
    if (!mfaCode) {
      // Client ko batao ki MFA required hai
      return res.status(200).json({
        mfaRequired: true,
        message: 'Enter your authenticator code'
      });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: mfaCode,
      window: 1
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }
  }

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, roles: user.roles },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({ accessToken });
});
```

> **Interview Tip:** MFA ke baare mein poochha jaaye toh SMS OTP ki weakness zaroor batao — SIM swapping attack. Attacker telecom company ko convince karta hai ki woh tumhara number hai, aur tumhara number unke SIM pe transfer karwa leta hai. Fir sab OTPs unhe milte hain. TOTP (offline) is immune to this.

---

## 11. Single Sign-On (SSO)

### The Office Badge Analogy

Badi companies mein (Google, Microsoft office campus) ek badge hota hai. Ek baar badge scan karke andar gaye — phir cafeteria, gym, meeting rooms, parking — sab jagah same badge kaam karta hai. Har jagah alag login nahi karna padta.

SSO exactly yahi karta hai: **Login once, access multiple apps.**

### How SSO Works

```mermaid
sequenceDiagram
    participant User
    participant Gmail
    participant Drive as Google Drive
    participant IdP as Identity Provider\n(Google SSO)

    User->>Gmail: Open Gmail (not logged in)
    Gmail->>IdP: Redirect to Google SSO
    IdP->>User: Login page
    User->>IdP: Enter credentials
    IdP->>Gmail: SSO Token issued
    Gmail->>User: Logged in to Gmail!

    Note over User,IdP: Now User opens Google Drive

    User->>Drive: Open Google Drive
    Drive->>IdP: Check SSO session
    IdP->>Drive: Already authenticated! Here's your token.
    Drive->>User: Logged in to Drive! (no login required)
```

### SAML vs OAuth/OIDC for SSO

| Aspect | SAML | OAuth/OIDC |
|--------|------|-----------|
| Format | XML | JSON |
| Use case | Enterprise (Okta, Azure AD, ADFS) | Consumer (Google, Facebook) |
| Mobile apps | Poor support | Excellent |
| Complexity | Very high | Medium |
| Age | 2005 | 2012/2014 |
| Who uses it | Banks, hospitals, large corp | Startups, consumer apps |

### SSO in Corporate World

```
Company uses Okta (Identity Provider):

Employees log into Okta once →
  → Access Jira (project management)
  → Access GitHub Enterprise
  → Access Slack
  → Access Salesforce
  → Access AWS Console

HR removes employee → Okta account disabled →
All app access revoked INSTANTLY.
```

### JWT-based SSO (Simple Version)

```javascript
// Auth Service (central) issues JWT
// Multiple services verify the same JWT

// auth-service.js
app.post('/login', async (req, res) => {
  // ... verify credentials
  const token = jwt.sign(
    { sub: user.id, email: user.email, roles: user.roles },
    SHARED_SECRET, // All services know this secret
    { expiresIn: '1h', issuer: 'auth.yourcompany.com' }
  );
  res.json({ token });
});

// orders-service.js (completely separate server)
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SHARED_SECRET, {
      issuer: 'auth.yourcompany.com'
    });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// payments-service.js (another separate server)
// Same verifyToken middleware — same SHARED_SECRET
```

---

## 12. Password Storage Done Right

### The Safe Deposit Box Analogy

Tumhara password directly store karna aisa hai jaise tumhara spare key counter pe rakh dena. Hashing aisa hai jaise spare key ko melt karke ek unique metal art banao — original key retrieve nahi ho sakti, but verify kar sakte ho ki yeh wahi hai.

### Password Storage Evolution

```
❌ WORST: Plaintext
   DB: password = "mypassword123"
   Breach hone pe sabka password expose.
   Real example: 2019 Facebook — millions of passwords plaintext stored.

❌ BAD: MD5/SHA1 hash
   DB: password = "5f4dcc3b5aa765d61d8327deb882cf99"
   Problem: Rainbow tables (pre-computed hash databases exist!)
   GPU pe billions of MD5/second crack ho sakte hain.

❌ STILL BAD: MD5 with static salt
   DB: password = MD5("salt123" + "mypassword123")
   Problem: Static salt leaked with DB. Same password same hash.

✅ GOOD: bcrypt
   DB: password = "$2b$12$N9qo8..."
   - Random salt built-in
   - Slow by design (2^cost iterations)
   - Cost factor adjustable

✅ BETTER: Argon2id
   - Winner of Password Hashing Competition (2015)
   - Memory-hard (GPU attacks resistant)
   - Modern standard
```

### Why Bcrypt/Argon2 are Slow by Design

MD5 ek second mein billions of hashes compute kar sakta hai — attacker ke liye cheap.
Bcrypt/Argon2 ek second mein sirf hundreds compute karta hai — attack ka cost astronomical ho jaata hai.

```
cost=10 → 2^10 = 1024 iterations → ~100ms per hash
cost=12 → 2^12 = 4096 iterations → ~400ms per hash
cost=14 → 2^14 = 16384 iterations → ~1.5s per hash

Login pe 100ms acceptable hai. Attacker ke liye:
1 million passwords crack karne ke liye:
  MD5:    < 1 second
  bcrypt: 100,000 seconds = 28 hours
  
Adjust cost over time as hardware gets faster.
```

### Password Storage Implementation

```javascript
const bcrypt = require('bcrypt');
// OR better:
// const argon2 = require('argon2');

const SALT_ROUNDS = 12; // Production mein 12-14 use karo

// Registration
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Password validation
  if (password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters' });
  }

  // Hash karo — NEVER store plain password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await db.users.create({
    email,
    passwordHash,  // ← yeh store hoga
    // password    ← yeh KABHI nahi
  });

  res.json({ userId: user.id });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await db.users.findOne({ email });

  // Timing attack prevention: always run bcrypt.compare
  // even if user not found (takes same time)
  const dummyHash = '$2b$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const hash = user?.passwordHash ?? dummyHash;

  const isValid = await bcrypt.compare(password, hash);

  if (!user || !isValid) {
    // Same error message regardless of whether user exists or password wrong
    // (Prevents user enumeration)
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check if password needs rehash (if cost factor was increased)
  if (bcrypt.getRounds(user.passwordHash) < SALT_ROUNDS) {
    const newHash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.users.update({ id: user.id }, { passwordHash: newHash });
  }

  // Generate tokens...
});

// Argon2 (preferred modern approach)
const argon2 = require('argon2');

const hashPassword = async (password) => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,  // 64 MB — GPU resistant
    timeCost: 3,
    parallelism: 1
  });
};

const verifyPassword = async (hash, password) => {
  return argon2.verify(hash, password);
};
```

### Password Reset Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Email as Email Service
    participant DB

    User->>App: POST /forgot-password {email}
    App->>DB: Generate secure random token
    App->>DB: Store token hash + expiry (15 min)
    App->>Email: Send reset link with plain token
    App->>User: "If email exists, reset link sent"

    Note over User,DB: User clicks link in email

    User->>App: GET /reset-password?token=abc123
    App->>User: Show new password form

    User->>App: POST /reset-password {token, newPassword}
    App->>DB: Hash(token) match karo
    App->>DB: Check token not expired
    App->>DB: Hash(newPassword), update user
    App->>DB: Delete reset token (one-time use)
    App->>DB: Invalidate all existing sessions/refresh tokens
    App->>User: Password reset successful. Please login.
```

---

## 13. Common Vulnerabilities

### SQL Injection

**Analogy:** Soch ek form mein address fill karna hai. Tum likhte ho: `Pune'; DROP TABLE users; --`. Agar system naively yeh SQL mein paste kare, toh poori users table delete ho jaati hai.

```sql
-- Vulnerable query (KABHI MAT KARO):
SELECT * FROM users WHERE email = '${ req.body.email }';

-- Attack input:
email = "admin@x.com' OR '1'='1"

-- Resulting query (returns all users!):
SELECT * FROM users WHERE email = 'admin@x.com' OR '1'='1';
```

**Prevention:**
```javascript
// ❌ String interpolation — vulnerable
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ Parameterized query — safe
const query = 'SELECT * FROM users WHERE email = $1';
const result = await db.query(query, [email]);

// ✅ ORM (Prisma, Sequelize) — handles it automatically
const user = await prisma.user.findUnique({ where: { email } });
```

### Brute Force Attacks

Attacker systematically tries all possible passwords.

**Prevention:**
```javascript
// Rate limiting on login — critical
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per 15 minutes
  keyGenerator: (req) => req.body.email || req.ip,
  message: 'Too many login attempts. Try again in 15 minutes.',
  standardHeaders: true
});

app.post('/login', loginRateLimiter, loginHandler);

// Account lockout after repeated failures
const MAX_FAILED_ATTEMPTS = 10;

async function handleFailedLogin(userId) {
  await db.users.increment({ id: userId }, 'failedLoginAttempts');
  const user = await db.users.findById(userId);

  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    await db.users.update({ id: userId }, {
      lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 min lockout
    });
    // Email user about lockout
  }
}
```

### Credential Stuffing

Breach mein leaked username/password combinations doosri websites pe try karna. 2 billion+ leaked credentials dark web pe available hain.

**Prevention:**
- Haveibeenpwned.com API se check karo at registration
- MFA strongly push karo
- Unusual login locations detect karo
- Device fingerprinting use karo

```javascript
const { pwnedPassword } = require('hibp');

app.post('/register', async (req, res) => {
  const { password } = req.body;

  // Check if password appears in known breaches
  const pwnedCount = await pwnedPassword(password);
  if (pwnedCount > 0) {
    return res.status(400).json({
      error: `This password has appeared in ${pwnedCount} data breaches. Please choose a different password.`
    });
  }

  // ... proceed with registration
});
```

### Session Fixation

Attacker ek known sessionId set kar deta hai login se pehle. User login karta hai — agar server wahi sessionId use kare, attacker ke paas valid session ho jaata hai.

**Prevention:**
```javascript
app.post('/login', async (req, res) => {
  // ... verify credentials

  // LOGIN KE BAAD nayi session ID generate karo
  // KABHI existing session ID use mat karo!
  await req.session.regenerate(); // ← critical!

  req.session.userId = user.id;
  res.json({ success: true });
});
```

### JWT-specific Attacks

```
1. None Algorithm Attack:
   Attacker header mein "alg": "none" set karta hai,
   signature skip karta hai.
   Prevention: Always specify allowed algorithms:
   jwt.verify(token, secret, { algorithms: ['HS256'] })

2. Algorithm Confusion (HS256 vs RS256):
   RS256 uses public key to verify. Attacker public key
   se HS256 token sign karta hai.
   Prevention: Explicitly specify algorithm, never trust header's alg.

3. Weak Secret:
   Short/guessable JWT secret → brute forced.
   Prevention: 256-bit random secret minimum.
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 14. Session vs JWT — Full Comparison

```mermaid
flowchart TD
    A[Choose Auth Method] --> B{Multiple servers\nor microservices?}
    B -- Yes --> C{Need instant\nrevocation?}
    B -- No --> D[Session-based\nSimple, full control]
    C -- Yes --> E[Session + Shared Redis\nor JWT + Refresh Token DB]
    C -- No --> F[JWT\nStateless, scales well]
    F --> G{Mobile/Cross-domain?}
    G -- Yes --> H[JWT in httpOnly cookie\nor Authorization header]
    G -- No --> I[Either works]
```

| Aspect | Session-Based | JWT-Based |
|--------|--------------|-----------|
| Storage | Server (Redis/DB) | Client (cookie/memory) |
| State | Stateful | Stateless |
| Revocation | Instant | Difficult (wait for expiry) |
| Scalability | Needs shared store | Scales easily |
| Token size | Small (random ID) | Larger (encoded claims) |
| DB lookup per request | Yes (Redis) | No |
| Mobile apps | Poor fit | Great fit |
| Cross-domain | Difficult | Easy |
| Offline validation | No | Yes |
| Best for | Traditional web apps, SSR | APIs, microservices, mobile |

### When to Use What

```
Use SESSION when:
  ✅ Simple web app, single domain
  ✅ Need to invalidate sessions instantly
  ✅ Server-side rendering (Rails, Django)
  ✅ Gaming sessions (long-lived, need instant kick)
  ✅ Financial/banking apps (regulatory need for instant revocation)

Use JWT when:
  ✅ Microservices architecture
  ✅ Mobile applications
  ✅ Public APIs consumed by third parties
  ✅ Multi-domain authentication
  ✅ You control multiple services sharing same secret
  ✅ Serverless (no shared storage)

Use HYBRID (best of both):
  ✅ Short-lived JWT (15 min) → stateless, scales
  ✅ Refresh token stored in DB → revocation possible
  ✅ This is what most major apps use in practice
```

---

## 15. Auth in Microservices

### The Border Control Analogy

Ek country mein multiple states hain. Jab tum country mein enter karte ho, airport pe ek baar verify hote ho (API Gateway). Fir state ke andar state boundaries pe koi check nahi — you are trusted. But agar koi directly kisi state mein ghusne ki koshish kare (bypass gateway), caught.

```mermaid
flowchart TD
    Client --> Gateway[API Gateway\nVerify JWT\nExtract user info]
    Gateway -->|X-User-Id: 42\nX-User-Roles: user,premium| UserService[User Service]
    Gateway -->|X-User-Id: 42\nX-User-Roles: user,premium| OrderService[Order Service]
    Gateway -->|X-User-Id: 42\nX-User-Roles: user,premium| PaymentService[Payment Service]
    UserService -.- DB1[(Users DB)]
    OrderService -.- DB2[(Orders DB)]
    PaymentService -.- DB3[(Payments DB)]
```

### Auth Gateway Pattern

```javascript
// API Gateway — JWT verify karo, baaki services ko trust
const apiGateway = express();

apiGateway.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_PUBLIC_KEY, {
      algorithms: ['RS256']  // RS256 for microservices — each service has public key
    });

    // User info headers pe add karo for downstream services
    req.headers['x-user-id'] = decoded.sub;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-roles'] = JSON.stringify(decoded.roles);
    req.headers['x-auth-verified'] = 'true';  // Mark as verified

    // Remove authorization header before forwarding (optional)
    // delete req.headers['authorization'];

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Downstream service — gateway pe trust karo
// orders-service.js
const extractUser = (req, res, next) => {
  // Gateway ne already verify kiya hai
  if (req.headers['x-auth-verified'] !== 'true') {
    // Direct access attempt without gateway
    return res.status(401).json({ error: 'Gateway authentication required' });
  }

  req.user = {
    id: req.headers['x-user-id'],
    email: req.headers['x-user-email'],
    roles: JSON.parse(req.headers['x-user-roles'] || '[]')
  };

  next();
};

app.get('/orders', extractUser, async (req, res) => {
  // User verified by gateway, proceed with business logic
  const orders = await db.orders.find({ userId: req.user.id });
  res.json(orders);
});
```

### RS256 vs HS256 in Microservices

```
HS256 (HMAC + SHA256):
  - Same SECRET for signing AND verifying
  - All services need the secret
  - Secret leak = all services compromised
  - Good for single service or tightly controlled env

RS256 (RSA + SHA256):
  - PRIVATE key → Auth service signs
  - PUBLIC key → All services verify
  - Services don't need secret
  - Public key safe to distribute
  - Better for microservices!
```

---

## 16. Common Interview Questions

### Q1: Authentication aur Authorization mein kya fark hai?

**Answer:**
- AuthN (Authentication) = "Who are you?" — Identity prove karna. Hotels pe ID check, website pe login.
- AuthZ (Authorization) = "What can you do?" — Permissions check karna. Hotel key card opens your floor only.
- 401 Unauthorized = Not authenticated (please login)
- 403 Forbidden = Authenticated but not authorized (tujhe permission nahi)

---

### Q2: JWT ko revoke kyun nahi kar sakte? Solution kya hai?

**Answer:**
JWT stateless hai — server ke paas koi record nahi hota. Ek baar issued, token valid rahega expiry tak, chahe user logout kare.

**Solutions:**
1. **Short expiry** (15 min) — damage window chhota hota hai
2. **Refresh token rotation** — refresh token DB mein store hota hai, revoke kar sakte hain
3. **Token blacklist** (Redis) — compromised tokens store karo, har request pe check karo (partial state returns)
4. **Short-lived JWT + Refresh tokens in DB** — best practical approach

---

### Q3: "Login with Google" (OAuth 2.0) kaise kaam karta hai?

**Answer (Authorization Code Flow):**
1. User clicks "Login with Google"
2. App Google pe redirect karta hai (client_id, redirect_uri, scope, state)
3. User Google pe login karta hai aur permissions approve karta hai
4. Google app ke callback URL pe auth code bhejta hai
5. App server-side code aur client_secret se Google ko POST karta hai
6. Google access_token + id_token return karta hai
7. App id_token se user info extract karta hai, session/JWT create karta hai

State parameter CSRF protection ke liye important hai — verify karo wapas aate waqt.

---

### Q4: Passwords database mein kaise store karne chahiye?

**Answer:**
1. NEVER plaintext
2. NEVER MD5/SHA1/SHA256 alone (too fast, rainbow tables)
3. Use **bcrypt** (cost factor 12+) or **Argon2id** (memory-hard, modern)
4. Both include random salt automatically
5. Timing attacks prevent karne ke liye: even for invalid users, hashing run karo
6. User enumeration prevent karne ke liye: same error for wrong email AND wrong password

---

### Q5: RBAC aur ABAC mein kya fark hai? Kab kya use karna chahiye?

**Answer:**
- **RBAC**: Users → Roles → Permissions. Simple, fast. Use karo jab access patterns predictable hon. YouTube Premium vs Free, Admin vs User.
- **ABAC**: Access based on attributes — user attributes + resource attributes + environment. Flexible but complex. Use karo jab fine-grained control chahiye — department-based, time-based, location-based. AWS IAM ABAC ka example hai.

Most apps RBAC se start karte hain, ABAC sirf jab needed.

---

### Q6: MFA implement karo — kaun sa method recommend karoge aur kyun?

**Answer:**
- TOTP (Google Authenticator / Authy) recommend karoon — offline kaam karta hai, SIM swap se safe, phishing resistant, widely supported.
- SMS OTP avoid karo — SIM swapping attack se vulnerable, SS7 protocol attacks se intercept ho sakta hai.
- WebAuthn/Passkeys — future-proof, phish-proof, but adoption still growing.

Implementation: speakeasy library (Node.js), TOTP secret generate, QR code show, verify with 30-sec window tolerance.

---

### Q7: Microservices mein auth kaise design karoge?

**Answer:**
1. **Central Auth Service** — login/logout, token issue
2. **API Gateway** — JWT verify karo, user info extract karo, headers mein pass karo
3. **Microservices** — gateway pe trust karo, headers se user read karo, own authorization logic apply karo
4. **RS256** — Auth service private key se sign karta hai, services public key se verify karte hain (secret share nahi karna padta)
5. **Short-lived access tokens** + **refresh tokens** in DB for revocation

---

### Q8: Session fixation attack kya hai? Kaise prevent karte hain?

**Answer:**
Attacker ek known sessionId pre-set karta hai (e.g., URL parameter ya cookie se). User usi sessionId ke saath login karta hai. Server valid session mark karta hai. Now attacker ke paas valid session hai.

Prevention: Login ke baad ALWAYS session regenerate karo (`req.session.regenerate()`). Nayi random sessionId generate hogi — old (known) one invalid ho jaayegi.

---

### Q9: JWT localStorage mein store karna kyun unsafe hai?

**Answer:**
localStorage JavaScript se accessible hai. XSS attack mein attacker malicious script inject karta hai jo `localStorage.getItem('jwt')` call karta hai aur token steal kar leta hai.

**Safe alternatives:**
- **httpOnly cookie** — JavaScript accessible nahi, XSS immune
- **Memory (RAM)** — page refresh pe gone, XSS immune, short-lived tokens ke liye fine, refresh token httpOnly cookie mein rakhte hain

---

### Q10: OAuth 2.0 mein PKCE kyun use karte hain?

**Answer:**
SPAs aur mobile apps mein `client_secret` safely store nahi kar sakte (bundle mein dekh sakte hain, decompile kar sakte hain). PKCE (Proof Key for Code Exchange) client secret ki jagah use karta hai:

1. Client random `code_verifier` generate karta hai
2. `code_challenge = SHA256(code_verifier)` compute karta hai
3. `code_challenge` auth server ko bhejta hai (verifier nahi!)
4. Auth code milta hai
5. Token exchange mein `code_verifier` bhejta hai
6. Server verify karta hai — `SHA256(verifier) == challenge`?

Agar koi auth code intercept kare, bina `code_verifier` ke token exchange nahi kar sakta.

---

## 17. Key Takeaways

```
╔══════════════════════════════════════════════════════════════╗
║                    KEY TAKEAWAYS                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  AUTHENTICATION                                               ║
║  ─────────────                                                ║
║  • AuthN = WHO are you? (hotel ID check)                     ║
║  • AuthZ = WHAT can you do? (hotel key card)                 ║
║  • 401 = not authenticated, 403 = not authorized             ║
║  • Sessions = stateful, instant revocation, needs Redis      ║
║  • JWT = stateless, scales, hard to revoke                   ║
║  • Best practice: Short JWT (15m) + Refresh Token in DB      ║
║  • Store JWT in httpOnly cookie, NOT localStorage            ║
║                                                               ║
║  OAUTH 2.0 + OIDC                                             ║
║  ────────────────                                             ║
║  • OAuth 2.0 = authorization framework (not authentication!) ║
║  • OIDC = OAuth + identity (id_token for who you are)        ║
║  • "Login with Google" = OIDC                                ║
║  • SPAs/Mobile → use PKCE (no client_secret needed)          ║
║  • Server-to-server → Client Credentials grant               ║
║                                                               ║
║  AUTHORIZATION                                                ║
║  ─────────────                                                ║
║  • RBAC = Roles → simple, fast, most apps use this           ║
║  • ABAC = Attributes → flexible, complex, AWS IAM            ║
║  • Principle of Least Privilege always                        ║
║                                                               ║
║  PASSWORDS & MFA                                              ║
║  ────────────────                                             ║
║  • NEVER store plaintext, NEVER use MD5/SHA1 alone           ║
║  • Use bcrypt (cost 12+) or Argon2id                         ║
║  • TOTP > SMS OTP (SIM swap attack se safe)                  ║
║  • Always regenerate session after login (session fixation)  ║
║                                                               ║
║  SECURITY RULES                                               ║
║  ──────────────                                               ║
║  • HTTPS always — no exceptions in production                ║
║  • Rate limit login endpoints                                 ║
║  • Parameterized queries — prevent SQL injection             ║
║  • Sanitize output — prevent XSS                             ║
║  • SameSite + httpOnly + Secure cookie flags                  ║
║  • Never commit secrets to Git                               ║
║  • Defense in depth — multiple layers                         ║
╚══════════════════════════════════════════════════════════════╝
```

### Quick Decision Framework

```mermaid
flowchart TD
    A[New Auth Feature?] --> B{Server-to-Server?}
    B -- Yes --> C[API Keys or\nClient Credentials OAuth]
    B -- No --> D{Need SSO?}
    D -- Yes --> E{Enterprise?}
    E -- Yes --> F[SAML + Okta/Azure AD]
    E -- No --> G[OAuth 2.0 / OIDC]
    D -- No --> H{Microservices?}
    H -- Yes --> I[JWT RS256 + API Gateway\n+ Refresh Tokens in DB]
    H -- No --> J{Need instant revocation?}
    J -- Yes --> K[Session-based\nwith Redis]
    J -- No --> L[JWT HS256\nShort expiry]
```

### The Security Mindset

Security ek feature nahi hai — yeh ek mindset hai. Jab bhi koi new feature build karo, yeh questions poochho:

1. Kya yeh endpoint authenticated users ke liye hi accessible hona chahiye?
2. Authorization check ho rahi hai sirf frontend pe? (Backend pe bhi must!)
3. User kya kuch inject kar sakta hai is input mein?
4. Agar yeh data leak ho jaaye, kitna damage hoga?
5. Log kar rahe hain authentication events? (Audit trail)

**Yeh ek baar theek se implement karo. Baad mein refactor karna bahut mehnga padta hai.**

---

*Next: [Security Best Practices](../34-security/README.md) | [System Design Fundamentals](../01-intro/README.md)*
