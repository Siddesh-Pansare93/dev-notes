# 03 - Request aur Response Handling

## Form Data

### Express.js (with body-parser/express.urlencoded)

```javascript
app.use(express.urlencoded({ extended: true }));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  res.json({ username });
});
```

### FastAPI

```python
from fastapi import FastAPI, Form

app = FastAPI()

@app.post("/login")
def login(username: str = Form(), password: str = Form()):
    # Form() FastAPI ko batata hai ki form data expect karo, JSON nahi
    return {"username": username}
```

**Kyun `Form()` use karte hain Pydantic model ki jagah?** HTML forms data `application/x-www-form-urlencoded` format mein bhejte hain, JSON nahi. `Form()` function FastAPI ko boltaa hai: "Bhai, JSON body se padha mat karo, form data se padh le." Iske liye `python-multipart` install hona zaruri hai (jo `fastapi[standard]` mein automatic aata hai).

### Combining Form Fields with Validation

```python
from fastapi import Form, File, UploadFile

@app.post("/register")
def register(
    username: str = Form(min_length=3, max_length=50),
    email: str = Form(pattern=r"^[\w.-]+@[\w.-]+\.\w+$"),
    password: str = Form(min_length=8),
    age: int = Form(ge=13, le=120),
):
    # Validation rules directly Form() ke andar likhe
    return {"username": username, "email": email}
```

> [!warning]
> Yaad rakho — ek hi endpoint mein `Form()` parameters aur Pydantic `Body()` model dono nahi mix kar sakte. Form data aur JSON body dono alag content types hain, jaise Zomato par biryani order aur pizza dono ek bar order nahi kar sakte kuch restrictions ke wajah se.

---

## File Uploads

### Express.js (with multer)

```javascript
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Single file
app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.file);
  res.json({ filename: req.file.originalname, size: req.file.size });
});

// Multiple files
app.post('/upload-many', upload.array('files', 10), (req, res) => {
  res.json({ count: req.files.length });
});
```

### FastAPI

```python
from fastapi import FastAPI, File, UploadFile

app = FastAPI()

# Single file upload
@app.post("/upload")
async def upload_file(file: UploadFile):
    contents = await file.read()
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(contents),
    }

# Multiple files
@app.post("/upload-many")
async def upload_files(files: list[UploadFile]):
    return {
        "filenames": [f.filename for f in files],
        "count": len(files),
    }
```

### UploadFile vs bytes

Socho — ek Swiggy delivery boy aur ek Zomato delivery boy dono milkshake deliver kar rahe hain. Ek glass mein (memory mein) pura dalata hai, dusra slowly-slowly cups mein serve karta hai (streaming). Python mein bhi aisa hi choice hai:

```python
# Option 1: UploadFile (badi files ke liye behtarín — jaise slowly sipping chai)
@app.post("/upload")
async def upload_file(file: UploadFile):
    # UploadFile ek temporary file use karta hai
    # Poora file memory mein load nahi hota
    # Useful attributes hain:
    print(file.filename)       # Original filename
    print(file.content_type)   # MIME type
    print(file.size)           # File size

    # Badi files ke liye chunks mein padho
    chunk_size = 1024 * 1024  # 1MB
    while chunk := await file.read(chunk_size):
        # Har chunk ko process kar
        pass

    # Agar dobara read karna ho toh file position reset kar
    await file.seek(0)

    return {"filename": file.filename}

# Option 2: bytes (poora file memory mein ek dum se — chhoti files ke liye theek hai)
@app.post("/upload-small")
async def upload_small_file(file: bytes = File()):
    # Poora file memory mein — small files ke liye sahi
    return {"size": len(file)}
```

> [!tip]
> Badi files ke liye hamesha `UploadFile` use karo, bytes nahi. Warna RAM full hone ka khatra hai, jaise ek 500MB movie HD quality mein download karne ka matlab paura phone hang ho jayega!

### Saving Uploaded Files

```python
import shutil
from pathlib import Path

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/upload")
async def upload_file(file: UploadFile):
    file_path = UPLOAD_DIR / file.filename

    # Method 1: Ek dum padho (chhoti files ke liye)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Method 2: Streaming disk par (badi files ke liye)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"filename": file.filename, "path": str(file_path)}
```

### File Upload with Form Data

Jaise Swiggy par profile photo upload karte waqt description bhi dete ho, vaisa hi:

```python
@app.post("/profile")
async def update_profile(
    username: str = Form(),
    bio: str = Form(default=""),
    avatar: UploadFile | None = None,  # File optional hai
):
    result = {"username": username, "bio": bio}
    if avatar:
        result["avatar_filename"] = avatar.filename
    return result
```

---

## Headers

HTTP headers wo hidden information hote hain jo browser request ke saath bhejta hai — jaise user agent, authentication tokens, aur custom headers. Express mein `req.headers`, FastAPI mein `Header()`.

### Express.js

```javascript
app.get('/info', (req, res) => {
  const userAgent = req.headers['user-agent'];
  const customHeader = req.headers['x-custom-header'];
  res.json({ userAgent, customHeader });
});
```

### FastAPI

```python
from fastapi import Header

@app.get("/info")
def get_info(
    user_agent: str = Header(),
    x_custom_header: str | None = Header(default=None),
):
    # Note: HTTP headers hyphens use karte hain, lekin Python variables nahi
    # FastAPI automatically convert karta hai: underscores -> hyphens
    # "x_custom_header" -> "x-custom-header"
    return {"user_agent": user_agent, "custom_header": x_custom_header}
```

**Naming convention:** HTTP headers hyphens use karte hain (`X-Custom-Header`), lekin Python variables underscore use karte hain. FastAPI automatically convert kar deta hai. Toh `x_token` variable `X-Token` header padh leta hai.

### Duplicate Headers

Kuch headers multiple times aa sakte hain (jaise `X-Forwarded-For` — jab multiple proxies se request pass hote hain):

```python
@app.get("/forwarded")
def get_forwarded(x_forwarded_for: list[str] | None = Header(default=None)):
    # List of IP addresses mil jayenge
    return {"forwarded_for": x_forwarded_for}
```

---

## Cookies

Cookies wo small files hain jo browser store karta hai aur har request ke saath bhej deta hai. Password nahi store karte cookies mein — authentication token ya session ID rakhte hain.

### Express.js

```javascript
const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.get('/me', (req, res) => {
  const sessionId = req.cookies.session_id;
  res.json({ sessionId });
});

app.post('/login', (req, res) => {
  res.cookie('session_id', 'abc123', { httpOnly: true, maxAge: 86400000 });
  res.json({ message: 'Logged in' });
});
```

### FastAPI

```python
from fastapi import Cookie
from fastapi.responses import JSONResponse

# Cookies padho
@app.get("/me")
def get_me(session_id: str | None = Cookie(default=None)):
    return {"session_id": session_id}

# Cookies set karo
@app.post("/login")
def login():
    response = JSONResponse(content={"message": "Logged in"})
    response.set_cookie(
        key="session_id",
        value="abc123",
        httponly=True,
        max_age=86400,        # seconds (milliseconds nahi, jaise Express mein)
        secure=True,          # HTTPS only — production mein zaroori
        samesite="lax",       # CSRF protection ke liye
    )
    return response

# Cookies delete karo (logout ke waqt)
@app.post("/logout")
def logout():
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_id")
    return response
```

> [!warning]
> `httponly=True` aur `secure=True` set karo production mein! `httponly` matlab JavaScript se access nahi ho payega, sirf HTTP requests mein jayega. `secure=True` matlab HTTPS over hi bhejega.

---

## Request Object Access

Kabhi kabhi raw request object chahiye hota hai — jaise Express mein directly `req` access karte ho. FastAPI mein `Request` class use hote ho:

### Express.js

```javascript
app.get('/info', (req, res) => {
  console.log(req.method);
  console.log(req.url);
  console.log(req.ip);
  console.log(req.headers);
  console.log(req.body);
});
```

### FastAPI

```python
from fastapi import Request

@app.get("/info")
async def get_info(request: Request):
    return {
        "method": request.method,
        "url": str(request.url),
        "client_ip": request.client.host,
        "headers": dict(request.headers),
        "query_params": dict(request.query_params),
        "path_params": request.path_params,
    }

# Raw body access karo (jab parsed JSON nahi chahiye)
@app.post("/raw")
async def get_raw_body(request: Request):
    body = await request.body()          # bytes
    json_body = await request.json()     # parsed JSON
    return {"received": json_body}
```

`Request` ko dusre parameters ke saath combine kar sakte ho:

```python
@app.post("/users")
async def create_user(
    user: UserCreate,                    # Pydantic model (parsed body)
    request: Request,                    # Raw request
    x_request_id: str = Header(default=None),  # Specific header
):
    client_ip = request.client.host
    return {"user": user, "ip": client_ip, "request_id": x_request_id}
```

---

## Custom Responses

Default mein FastAPI `JSONResponse` use karta hai, lekin kabhi HTML, CSV, file, redirect — kuch aur chahiye ho toh custom response return kar sakte ho.

### Default JSON Response

```python
# Yeh default hai — koi `response_class` specify nahi kiya toh JSON
@app.get("/items")
def get_items():
    return {"items": []}  # Automatically JSONResponse ho jayega
```

### JSONResponse (explicit)

Headers ya status code customize karna ho toh explicitly banao:

```python
from fastapi.responses import JSONResponse

@app.get("/custom")
def custom_response():
    content = {"message": "Hello"}
    headers = {"X-Custom-Header": "my-value"}
    return JSONResponse(
        content=content,
        status_code=200,
        headers=headers,
    )
```

### HTMLResponse

HTML page return karna ho:

```python
from fastapi.responses import HTMLResponse

@app.get("/page", response_class=HTMLResponse)
def get_page():
    html = """
    <html>
        <body>
            <h1>Namaste, Duniya!</h1>
            <p>Yeh HTML FastAPI se aa raha hai</p>
        </body>
    </html>
    """
    return HTMLResponse(content=html)
```

### PlainTextResponse

Sirf text bhejno:

```python
from fastapi.responses import PlainTextResponse

@app.get("/health", response_class=PlainTextResponse)
def health_check():
    return "OK"
```

### RedirectResponse

Kisi aur URL par redirect karo (jaise old link ko new link par):

```python
from fastapi.responses import RedirectResponse

@app.get("/old-page")
def old_page():
    return RedirectResponse(url="/new-page")

@app.get("/old-page-permanent")
def old_page_permanent():
    return RedirectResponse(url="/new-page", status_code=301)
```

### StreamingResponse

Badi files ya large data streams ke liye — memory mein poora load mat kar, slowly-slowly bhej de:

```python
from fastapi.responses import StreamingResponse
import io

# Streaming text file
@app.get("/download")
def download_file():
    def generate():
        for i in range(100):
            yield f"Line {i}\n"

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=data.txt"},
    )

# Streaming CSV (jaise Swiggy ka order history export)
@app.get("/export")
def export_csv():
    def generate_csv():
        yield "id,name,email\n"
        for i in range(1000):
            yield f"{i},user_{i},user_{i}@example.com\n"

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users.csv"},
    )
```

### FileResponse

Existing file directly send kar:

```python
from fastapi.responses import FileResponse

@app.get("/files/{filename}")
def get_file(filename: str):
    file_path = f"./uploads/{filename}"
    return FileResponse(
        path=file_path,
        filename=filename,          # Download mein ye name aayega
        media_type="application/octet-stream",
    )

# Image serve karo
@app.get("/images/{image_name}")
def get_image(image_name: str):
    return FileResponse(f"./images/{image_name}", media_type="image/png")
```

### Express se comparison

```javascript
// Express equivalents
res.json({ data: 'json' });           // JSONResponse (FastAPI mein default)
res.send('<html>...</html>');           // HTMLResponse
res.sendFile('/path/to/file');          // FileResponse
res.redirect('/new-url');               // RedirectResponse
res.type('text/plain').send('OK');      // PlainTextResponse

// Express streaming
const stream = fs.createReadStream('file.txt');
stream.pipe(res);                       // StreamingResponse
```

---

## Response Headers and Cookies via Response Parameter

FastAPI ka ek clever trick — ek `Response` object inject kar sakte ho parameter mein, headers aur cookies set kar sakte ho, aur phir normally apna data return kar sakte ho:

```python
from fastapi import Response

@app.get("/items/{item_id}")
def get_item(item_id: int, response: Response):
    # Response par headers set kar
    response.headers["X-Item-Id"] = str(item_id)
    response.headers["Cache-Control"] = "max-age=3600"

    # Cookies set kar
    response.set_cookie(key="last_viewed", value=str(item_id))

    # Normally data return kar — FastAPI baki sambhal lega
    return {"item_id": item_id, "name": f"Item {item_id}"}
```

Yeh approach cleaner hai jab sirf ek-do headers ya cookie set karna ho — full `JSONResponse` banane ki zarurat nahi.

---

## Putting It All Together: Real-World Example

Ek complete example — profile photo upload with validation, CSV export, aur cookie-based tracking:

```python
from fastapi import FastAPI, File, UploadFile, Form, Header, Cookie, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import json

app = FastAPI()

class ProfileUpdate(BaseModel):
    display_name: str
    bio: str | None = None

# Profile photo upload with form data
@app.post("/profile/photo")
async def upload_photo(
    file: UploadFile,
    description: str = Form(default=""),
    authorization: str = Header(),
):
    # File type validation karo
    if file.content_type not in ["image/jpeg", "image/png"]:
        return JSONResponse(
            status_code=400,
            content={"error": "Only JPEG and PNG files are allowed"},
        )

    contents = await file.read()
    # File save karne ka logic yaha...

    return {
        "filename": file.filename,
        "size": len(contents),
        "description": description,
    }

# Data export karo CSV mein (streaming se — efficient)
@app.get("/export/users")
def export_users(
    response: Response,
    format: str = "csv",
    authorization: str = Header(),
):
    users = [
        {"id": 1, "name": "Alice", "email": "alice@example.com"},
        {"id": 2, "name": "Bob", "email": "bob@example.com"},
    ]

    if format == "csv":
        def generate():
            yield "id,name,email\n"
            for user in users:
                yield f"{user['id']},{user['name']},{user['email']}\n"

        return StreamingResponse(
            generate(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=users.csv"},
        )

    return users  # Default JSON

# Recently viewed products tracking (Swiggy/Flipkart style)
@app.get("/products/{product_id}")
def get_product(
    product_id: int,
    response: Response,
    recently_viewed: str | None = Cookie(default=None),
):
    # Cookie se recently viewed products nikalo
    viewed = json.loads(recently_viewed) if recently_viewed else []
    if product_id not in viewed:
        viewed.append(product_id)
        viewed = viewed[-10:]  # Last 10 products hi rakho

    # Updated cookie set kar
    response.set_cookie(
        key="recently_viewed",
        value=json.dumps(viewed),
        max_age=86400 * 30,  # 30 din
    )

    return {"product_id": product_id, "recently_viewed": viewed}
```

---

## Practice Exercises

### Exercise 1: Contact Form
Ek `POST /contact` endpoint banana joh:
- Form data accept kare: `name`, `email`, `subject`, `message`
- Name minimum 2 characters hona chahiye
- Email valid format mein hona chahiye
- JSON confirmation return kare

### Exercise 2: File Upload with Validation
Ek `POST /documents/upload` endpoint jo:
- File upload aur `category` form field accept kare
- File PDF hona validate kare (content_type check karo)
- File 10MB se chhota hona validate kare
- Filename, size, aur category return kare

### Exercise 3: Custom Headers API
`GET /api/data` endpoint jo:
- Request headers se `X-API-Key` aur `X-Request-ID` padhe
- Sirf valid API key (`secret123`) par data return kare
- Response headers set kare: `X-Response-Time`, `X-Request-ID` (echo back)
- Invalid API key par 401 JSONResponse return kare

### Exercise 4: Cookie-Based Preferences
Ye endpoints banana:
- `POST /preferences` — JSON body se `theme` aur `language` lelo, cookies mein store karo
- `GET /preferences` — Cookies se theme aur language padh kar return karo
- `DELETE /preferences` — Preference cookies clear karo

### Exercise 5: Streaming Data Export
`GET /export/logs` endpoint jo:
- Query parameters: `start_date`, `end_date`, `level` (info/warning/error)
- Fake log data generate kare
- Streaming response se download format mein return kare
- CSV aur JSON Lines dono formats support kare (`format` query param se)
