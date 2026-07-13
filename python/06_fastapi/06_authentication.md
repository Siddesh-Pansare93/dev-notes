# 06 - FastAPI mein Authentication

## Overview

Socho ek second — tumne Zomato par khana order kia, toh Zomato ko kaise pata hai ki TUM ho, na ki koi aur? Token ke through! 🔐

FastAPI mein authentication ka pattern bilkul alag hai Node.js se. Express mein passport.js strategies aur middleware chalate ho, lekin FastAPI mein sab kuch **dependency-based** hai. Matlab dependencies ke through auth logic likhte ho.

### Express.js Auth Stack

```javascript
// Express: multiple packages, verbose setup
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
}, async (payload, done) => {
  const user = await User.findById(payload.sub);
  done(null, user || false);
}));

app.get('/protected', passport.authenticate('jwt', { session: false }), handler);
```

### FastAPI Auth Stack

```python
# FastAPI: built-in OAuth2 + sirf yeh kaafi hai
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.get("/protected")
def protected_route(token: str = Depends(oauth2_scheme)):
    # token automatically extract ho jayega Authorization header se
    return {"token": token}
```

---

## OAuth2PasswordBearer: Foundation Samjho

`OAuth2PasswordBearer` ek FastAPI class hai jo kya karta hai:
1. `Authorization: Bearer <token>` header ko dhundta hai
2. Token string ko extract karta hai
3. Swagger UI mein "lock" icon show karta hai
4. Swagger UI par login form add karta hai

```python
from fastapi.security import OAuth2PasswordBearer

# tokenUrl = jaha par clients username/password send karte hain token pane ke liye
# Yeh sirf Swagger UI ke liye hai — docs ko batata hai login endpoint kaha hai
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.get("/users/me")
def read_users_me(token: str = Depends(oauth2_scheme)):
    # token = raw JWT string jo Authorization header se aaya
    # Agar token nahi hai toh FastAPI automatic 401 return karega
    return {"token": token}
```

---

## Complete JWT Authentication System

Chalo step-by-step ek poora auth system banate hain.

### Step 1: Dependencies Install Karo

```bash
pip install "passlib[bcrypt]" "python-jose[cryptography]"
# passlib: password hashing (Node.js mein bcrypt ki tarah)
# python-jose: JWT encode/decode (Node.js mein jsonwebtoken ki tarah)
```

### Step 2: Configuration

```python
# config.py
from datetime import timedelta

SECRET_KEY = "your-secret-key-change-this-in-production"  # .env se late honge
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
```

### Step 3: Password Hashing

Password ko plaintext mein store mat karo! Zomato bhi tumhara password hash karke rakhta hai.

```python
# auth/password.py
from passlib.context import CryptContext

# Yeh bcrypt.hash() aur bcrypt.compare() ki tarah kaam karta hai
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Password hash karo. Node.js mein bcrypt.hash(password, 10) ka same"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Password verify karo. Node.js mein bcrypt.compare() ka same"""
    return pwd_context.verify(plain_password, hashed_password)
```

### Step 4: JWT Token Create aur Verify Karo

```python
# auth/jwt.py
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    JWT token create karo.
    Node.js mein jwt.sign(payload, secret, { expiresIn: '30m' }) ka same
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict | None:
    """
    JWT token verify aur decode karo.
    Node.js mein jwt.verify(token, secret) ka same
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
```

### Step 5: User Models aur Fake Database

```python
# schemas.py
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

class UserInDB(UserResponse):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None
```

```python
# Ek fake database (production mein real DB use karoge)
from auth.password import hash_password

fake_users_db: dict[str, dict] = {
    "alice": {
        "id": 1,
        "username": "alice",
        "email": "alice@example.com",
        "hashed_password": hash_password("secret123"),
        "is_active": True,
        "is_admin": False,
    },
    "admin": {
        "id": 2,
        "username": "admin",
        "email": "admin@example.com",
        "hashed_password": hash_password("adminpass"),
        "is_active": True,
        "is_admin": True,
    },
}
```

### Step 6: Authentication Dependencies

Yeh dependencies jo likhengen, isi ke through auth ka sab kuch hoga.

```python
# auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from config import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Yeh dependency:
    1. Bearer token extract karta hai (oauth2_scheme ke through)
    2. JWT ko decode aur validate karta hai
    3. User ko dhundta hai
    4. User object return karta hai

    Express mein passport.authenticate('jwt') ka same kaam
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = fake_users_db.get(username)
    if user is None:
        raise credentials_exception

    return user

async def get_current_active_user(user: dict = Depends(get_current_user)):
    """Check karo ki user active hai ya nahi."""
    if not user.get("is_active"):
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

async def get_admin_user(user: dict = Depends(get_current_active_user)):
    """Check karo ki user admin hai ya nahi."""
    if not user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
```

### Step 7: Login Endpoint

```python
# main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from auth.password import verify_password
from auth.jwt import create_access_token
from auth.dependencies import get_current_active_user, get_admin_user
from schemas import Token

app = FastAPI()

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 compatible token login.
    OAuth2PasswordRequestForm automatically 'username' aur 'password' expect karta hai.
    Yeh standard OAuth2 "password flow" hai.
    """
    user = fake_users_db.get(form_data.username)

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # JWT create karo with username as "sub" (subject) claim
    access_token = create_access_token(data={"sub": user["username"]})

    return {"access_token": access_token, "token_type": "bearer"}
```

### Step 8: Protected Routes

```python
@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(get_current_active_user)):
    # Sirf logged-in users yeh endpoint access kar sakte hain
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
    }

@app.get("/admin/dashboard")
async def admin_dashboard(admin: dict = Depends(get_admin_user)):
    # Sirf admins yeh endpoint access kar sakte hain
    return {
        "message": f"Welcome admin {admin['username']}",
        "total_users": len(fake_users_db),
    }

# Public endpoint (koi dependency nahi = auth zaroori nahi)
@app.get("/public")
def public_endpoint():
    return {"message": "This is public"}
```

---

## Flow Samjho: Diagram Style

Zomato ki tarah sochte hain:

```
User: "Mujhe login karna hai"
      -> POST /token bhejta hai
      -> Body: username=alice&password=secret123

Server: "Credentials check karta hai"
        -> Sahi ho toh JWT token generate karta hai
        -> Response: {"access_token": "eyJ...", "token_type": "bearer"}

User: "Mujhe apni profile chahiye"
      -> GET /users/me bhejta hai
      -> Header mein token: Authorization: Bearer eyJ...

Server: "Token extract karta hai oauth2_scheme se"
        -> get_current_user JWT decode karta hai, user dhundta hai
        -> get_current_active_user check karta hai active hai ya nahi
        -> User data return karta hai
```

---

## Node.js ke saath Comparison

### Express + passport-jwt

```javascript
// Node.js: verbose setup
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.sub);
    if (!user) return done(null, false);
    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
}));

// Usage
app.get('/protected',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json(req.user);
  }
);
```

### Express + express-jwt (thoda simple)

```javascript
const { expressjwt: jwt } = require('express-jwt');

app.use(jwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
}).unless({ path: ['/login', '/register'] }));

app.get('/protected', (req, res) => {
  res.json(req.auth); // decoded JWT payload
});
```

### FastAPI (cleaner, na?)

```python
@app.get("/protected")
async def protected(user: dict = Depends(get_current_active_user)):
    return user
# Bas itna. Dependency sab kuch handle kar lega.
```

---

## Scopes aur Permissions

Kya agar tumhare app mein different user roles hain? Jaise Zomato mein — customer, delivery boy, restaurant owner. FastAPI ke paas **OAuth2 scopes** hain fine-grained permissions ke liye.

```python
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from fastapi import Security

# Available scopes define karo
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    scopes={
        "users:read": "Read user information",
        "users:write": "Create and modify users",
        "admin": "Admin access",
    },
)

async def get_current_user(
    security_scopes: SecurityScopes,
    token: str = Depends(oauth2_scheme),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": f'Bearer scope="{security_scopes.scope_str}"'},
    )

    payload = verify_token(token)
    if not payload:
        raise credentials_exception

    # Check karo ki user ke paas required scopes hain ya nahi
    token_scopes = payload.get("scopes", [])
    for scope in security_scopes.scopes:
        if scope not in token_scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required scope: {scope}",
            )

    user = fake_users_db.get(payload.get("sub"))
    if not user:
        raise credentials_exception
    return user

# Routes jo specific scopes require karte hain
@app.get("/users")
async def list_users(
    user: dict = Security(get_current_user, scopes=["users:read"]),
):
    return list(fake_users_db.values())

@app.post("/users")
async def create_user(
    user: dict = Security(get_current_user, scopes=["users:write"]),
):
    return {"message": "User created"}

@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: dict = Security(get_current_user, scopes=["admin"]),
):
    return {"message": f"User {user_id} deleted"}
```

### Token mein Scopes Include Karo

```python
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # User role ke based par scopes decide karo
    scopes = ["users:read"]
    if user.get("is_admin"):
        scopes.extend(["users:write", "admin"])

    access_token = create_access_token(
        data={"sub": user["username"], "scopes": scopes}
    )
    return {"access_token": access_token, "token_type": "bearer"}
```

---

## Refresh Tokens

Token 30 minutes mein expire hona chahiye security ke liye. Lekin baar-baar login karna padhao users ko? Refresh tokens solution hain.

**Analogy**: UPI par PIN enter karte ho login ke time, phir kai transactions bina PIN ke ho sakte hain — refresh token bhi aisa hi kaam karta hai.

```python
from datetime import timedelta

REFRESH_TOKEN_EXPIRE_DAYS = 7

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Short-lived access token
    access_token = create_access_token(
        data={"sub": user["username"], "type": "access"},
        expires_delta=timedelta(minutes=30),
    )

    # Long-lived refresh token
    refresh_token = create_access_token(
        data={"sub": user["username"], "type": "refresh"},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@app.post("/token/refresh")
async def refresh_token(refresh_token: str):
    payload = verify_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Naya access token issue karo
    new_access_token = create_access_token(
        data={"sub": payload["sub"], "type": "access"},
        expires_delta=timedelta(minutes=30),
    )

    return {"access_token": new_access_token, "token_type": "bearer"}
```

---

## Optional Authentication

Kya agar koi route both authenticated aur unauthenticated users ke liye kaam kare? Jaise blog post — logon ko read to karni chahiye, lekin bookmark sirf login users kare.

```python
from fastapi.security import OAuth2PasswordBearer

# auto_error=False means agar token nahi hai toh 401 error nahi ayega
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

async def get_optional_user(token: str | None = Depends(oauth2_scheme_optional)):
    if token is None:
        return None  # Anonymous user
    payload = verify_token(token)
    if not payload:
        return None
    return fake_users_db.get(payload.get("sub"))

@app.get("/posts/{post_id}")
async def get_post(post_id: int, user: dict | None = Depends(get_optional_user)):
    post = get_post_by_id(post_id)
    if user:
        # Authenticated: personalized data dikhao
        return {**post, "is_bookmarked": check_bookmark(user["id"], post_id)}
    else:
        # Anonymous: basic data
        return post
```

---

## Practice Exercises

### Exercise 1: Basic JWT Auth
Ek complete JWT authentication system banao with:
- `POST /register` — naya user create karo (hashed password store karo)
- `POST /token` — login karo aur JWT token lo
- `GET /users/me` — apni profile dekho (protected)
- Swagger UI se sab endpoints test karo

### Exercise 2: Role-Based Access Control
Exercise 1 ko extend karo roles ke saath:
- Users ke paas roles ho sakte hain: "user", "moderator", "admin"
- `GET /posts` — sirf authenticated users
- `DELETE /posts/{id}` — sirf moderators aur admins
- `GET /admin/users` — sirf admins
- Ek `require_role` dependency factory banao:

```python
def require_role(*roles: str):
    async def check_role(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return check_role

# Usage:
@app.delete("/posts/{post_id}")
async def delete_post(post_id: int, user = Depends(require_role("moderator", "admin"))):
    ...
```

### Exercise 3: Refresh Token Flow
Complete refresh token system implement karo:
- `POST /auth/login` — access_token (15 min) aur refresh_token (7 days) return karo
- `POST /auth/refresh` — refresh token se naya access token lo
- `POST /auth/logout` — refresh token invalidate karo (blacklist mein add karo)
- Refresh tokens ko ek set mein store karo (database simulate karna)

### Exercise 4: API Key + JWT Dual Auth
Ek API banao jo dono auth methods support karey:
- JWT Bearer tokens — user-facing endpoints
- API keys (X-API-Key header) — service-to-service communication
- Ek unified `get_current_client` dependency banao jo dono check kare

### Exercise 5: Testing with Auth Overrides
Protected endpoints ko test karo:
1. `get_current_user` override create karo jo fake user return karey
2. Protected endpoints test karo override ke saath
3. Admin endpoints ko non-admin users se reject krao
4. Login endpoint ko valid aur invalid credentials se test karo
