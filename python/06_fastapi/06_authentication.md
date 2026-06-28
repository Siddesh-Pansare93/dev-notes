# 06 - Authentication in FastAPI

## Overview

Authentication in FastAPI uses a dependency-based approach. Instead of passport.js strategies or express-jwt middleware, you build authentication as reusable dependencies.

### Express.js Auth Stack

```javascript
// Express: multiple packages, lots of config
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
# FastAPI: built-in OAuth2 support + standard Python packages
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.get("/protected")
def protected_route(token: str = Depends(oauth2_scheme)):
    # token is extracted from Authorization: Bearer <token>
    return {"token": token}
```

---

## OAuth2PasswordBearer: The Foundation

`OAuth2PasswordBearer` is a FastAPI class that:
1. Tells FastAPI to look for an `Authorization: Bearer <token>` header
2. Extracts the token string
3. Adds a "lock" icon to the endpoint in Swagger UI
4. Provides a login form in Swagger UI at the `tokenUrl`

```python
from fastapi.security import OAuth2PasswordBearer

# tokenUrl is the endpoint where clients POST username/password to get a token
# This is for Swagger UI -- it tells the docs where the login endpoint is
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.get("/users/me")
def read_users_me(token: str = Depends(oauth2_scheme)):
    # token = the raw JWT string from the Authorization header
    # If no token is present, FastAPI returns 401 automatically
    return {"token": token}
```

---

## Complete JWT Authentication System

Here's a full implementation, step by step.

### Step 1: Install Dependencies

```bash
pip install "passlib[bcrypt]" "python-jose[cryptography]"
# passlib: password hashing (like bcrypt in Node.js)
# python-jose: JWT encoding/decoding (like jsonwebtoken in Node.js)
```

### Step 2: Configuration

```python
# config.py
from datetime import timedelta

SECRET_KEY = "your-secret-key-change-this-in-production"  # Like JWT_SECRET in .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
```

### Step 3: Password Hashing

```python
# auth/password.py
from passlib.context import CryptContext

# This is like bcrypt.hash() and bcrypt.compare() in Node.js
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password. Like bcrypt.hash(password, 10) in Node.js"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password. Like bcrypt.compare(password, hash) in Node.js"""
    return pwd_context.verify(plain_password, hashed_password)
```

### Step 4: JWT Token Creation and Verification

```python
# auth/jwt.py
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT token.
    Like jwt.sign(payload, secret, { expiresIn: '30m' }) in Node.js
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict | None:
    """
    Verify and decode a JWT token.
    Like jwt.verify(token, secret) in Node.js
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
```

### Step 5: User Models and Fake Database

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
# Fake user database (replace with real DB later)
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

```python
# auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from config import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    This dependency:
    1. Extracts the Bearer token (via oauth2_scheme)
    2. Decodes and validates the JWT
    3. Looks up the user
    4. Returns the user object

    Like passport.authenticate('jwt') in Express
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
    """Check if the authenticated user is active."""
    if not user.get("is_active"):
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

async def get_admin_user(user: dict = Depends(get_current_active_user)):
    """Check if the authenticated user is an admin."""
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
    OAuth2PasswordRequestForm expects form data with 'username' and 'password'.
    This is the standard OAuth2 "password flow".
    """
    user = fake_users_db.get(form_data.username)

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create JWT with username as "sub" (subject) claim
    access_token = create_access_token(data={"sub": user["username"]})

    return {"access_token": access_token, "token_type": "bearer"}
```

### Step 8: Protected Routes

```python
@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(get_current_active_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
    }

@app.get("/admin/dashboard")
async def admin_dashboard(admin: dict = Depends(get_admin_user)):
    return {
        "message": f"Welcome admin {admin['username']}",
        "total_users": len(fake_users_db),
    }

# Public endpoint (no dependency = no auth required)
@app.get("/public")
def public_endpoint():
    return {"message": "This is public"}
```

---

## How It All Flows

```
Client sends: POST /token
  Body: username=alice&password=secret123
  -> Server validates credentials
  -> Server returns: {"access_token": "eyJ...", "token_type": "bearer"}

Client sends: GET /users/me
  Header: Authorization: Bearer eyJ...
  -> oauth2_scheme extracts "eyJ..."
  -> get_current_user decodes JWT, finds user
  -> get_current_active_user checks user.is_active
  -> Route handler receives the user dict
  -> Returns user data
```

---

## Comparison with Node.js Approaches

### Express + passport-jwt

```javascript
// Node.js: passport setup (verbose!)
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

// Using it
app.get('/protected',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json(req.user);
  }
);
```

### Express + express-jwt (simpler)

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

### FastAPI (same thing, cleaner)

```python
@app.get("/protected")
async def protected(user: dict = Depends(get_current_active_user)):
    return user
# That's it. The dependency handles everything.
```

---

## Scopes and Permissions

FastAPI has built-in support for OAuth2 scopes (fine-grained permissions).

```python
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from fastapi import Security

# Define available scopes
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

    # Check scopes
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

# Routes with specific scope requirements
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

### Including Scopes in the Token

```python
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Determine scopes based on user role
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

A common pattern for handling token expiration.

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

    # Issue new access token
    new_access_token = create_access_token(
        data={"sub": payload["sub"], "type": "access"},
        expires_delta=timedelta(minutes=30),
    )

    return {"access_token": new_access_token, "token_type": "bearer"}
```

---

## Optional Authentication

Sometimes you want routes that work for both authenticated and unauthenticated users.

```python
from fastapi.security import OAuth2PasswordBearer

# auto_error=False means it won't raise 401 if no token is present
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
        # Authenticated: show personalized data
        return {**post, "is_bookmarked": check_bookmark(user["id"], post_id)}
    else:
        # Anonymous: basic data
        return post
```

---

## Practice Exercises

### Exercise 1: Basic JWT Auth
Implement a complete JWT authentication system with:
- `POST /register` -- create a new user (store hashed password)
- `POST /token` -- login and get JWT token
- `GET /users/me` -- get current user profile (protected)
- Test all three endpoints using the Swagger UI

### Exercise 2: Role-Based Access Control
Extend Exercise 1 with roles:
- Users can have roles: "user", "moderator", "admin"
- `GET /posts` -- accessible by anyone (authenticated)
- `DELETE /posts/{id}` -- only moderators and admins
- `GET /admin/users` -- only admins
- Create a `require_role` dependency factory:

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
Implement a complete refresh token system:
- `POST /auth/login` -- returns access_token (15 min) and refresh_token (7 days)
- `POST /auth/refresh` -- exchange refresh token for new access token
- `POST /auth/logout` -- invalidate refresh token (add to blacklist)
- Store refresh tokens in a set (simulating a database)

### Exercise 4: API Key + JWT Dual Auth
Create an API that supports both authentication methods:
- JWT Bearer tokens for user-facing endpoints
- API keys (via `X-API-Key` header) for service-to-service communication
- Create a unified `get_current_client` dependency that checks both

### Exercise 5: Testing with Auth Overrides
Write tests for protected endpoints by:
1. Creating a `get_current_user` override that returns a fake user
2. Testing that protected endpoints work with the override
3. Testing that admin endpoints reject non-admin users
4. Testing the login endpoint with valid and invalid credentials
