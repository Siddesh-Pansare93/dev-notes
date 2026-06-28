# 03 - Request and Response Handling

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
    # Form() tells FastAPI to expect form data, not JSON
    return {"username": username}
```

**Why `Form()` instead of a Pydantic model?** HTML forms send data as `application/x-www-form-urlencoded`, not JSON. The `Form()` function tells FastAPI to read from form data instead of the JSON body. You need `python-multipart` installed (included with `fastapi[standard]`).

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
    return {"username": username, "email": email}
```

**Important**: You cannot mix `Form()` parameters with a Pydantic `Body()` model in the same endpoint. Form data and JSON body are different content types.

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

# Simple file upload
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

```python
# Option 1: UploadFile (recommended for large files)
@app.post("/upload")
async def upload_file(file: UploadFile):
    # UploadFile uses a spooled temporary file
    # It doesn't load everything into memory
    # Has useful attributes:
    print(file.filename)       # Original filename
    print(file.content_type)   # MIME type
    print(file.size)           # File size

    # Read in chunks for large files
    chunk_size = 1024 * 1024  # 1MB
    while chunk := await file.read(chunk_size):
        # Process chunk
        pass

    # Reset file position if you need to read again
    await file.seek(0)

    return {"filename": file.filename}

# Option 2: bytes (loads entire file into memory)
@app.post("/upload-small")
async def upload_small_file(file: bytes = File()):
    # Entire file in memory -- fine for small files
    return {"size": len(file)}
```

### Saving Uploaded Files

```python
import shutil
from pathlib import Path

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/upload")
async def upload_file(file: UploadFile):
    file_path = UPLOAD_DIR / file.filename

    # Method 1: Read all at once (small files)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Method 2: Stream to disk (large files)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"filename": file.filename, "path": str(file_path)}
```

### File Upload with Form Data

```python
@app.post("/profile")
async def update_profile(
    username: str = Form(),
    bio: str = Form(default=""),
    avatar: UploadFile | None = None,  # Optional file
):
    result = {"username": username, "bio": bio}
    if avatar:
        result["avatar_filename"] = avatar.filename
    return result
```

---

## Headers

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
    # Note: header names use underscores in Python, FastAPI converts
    # "x_custom_header" -> "x-custom-header" automatically
    return {"user_agent": user_agent, "custom_header": x_custom_header}
```

**Naming convention**: HTTP headers use hyphens (`X-Custom-Header`), but Python variables can't have hyphens. FastAPI automatically converts underscores to hyphens. So `x_token` in your function reads the `X-Token` header.

### Duplicate Headers

```python
# Some headers can appear multiple times (like X-Forwarded-For)
@app.get("/forwarded")
def get_forwarded(x_forwarded_for: list[str] | None = Header(default=None)):
    return {"forwarded_for": x_forwarded_for}
```

---

## Cookies

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

# Reading cookies
@app.get("/me")
def get_me(session_id: str | None = Cookie(default=None)):
    return {"session_id": session_id}

# Setting cookies
@app.post("/login")
def login():
    response = JSONResponse(content={"message": "Logged in"})
    response.set_cookie(
        key="session_id",
        value="abc123",
        httponly=True,
        max_age=86400,        # seconds (not milliseconds like Express)
        secure=True,          # HTTPS only
        samesite="lax",
    )
    return response

# Deleting cookies
@app.post("/logout")
def logout():
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_id")
    return response
```

---

## Request Object Access

Sometimes you need the raw request object, just like you'd access `req` directly in Express.

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

# Access raw body
@app.post("/raw")
async def get_raw_body(request: Request):
    body = await request.body()          # bytes
    json_body = await request.json()     # parsed JSON
    return {"received": json_body}
```

You can combine `Request` with other parameter types:

```python
@app.post("/users")
async def create_user(
    user: UserCreate,          # Pydantic model (parsed body)
    request: Request,          # Raw request access
    x_request_id: str = Header(default=None),  # Specific header
):
    client_ip = request.client.host
    return {"user": user, "ip": client_ip, "request_id": x_request_id}
```

---

## Custom Responses

### Default JSON Response

By default, FastAPI uses `JSONResponse` and serializes your return value with `jsonable_encoder`. But you can use other response types.

### JSONResponse (explicit)

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

```python
from fastapi.responses import HTMLResponse

@app.get("/page", response_class=HTMLResponse)
def get_page():
    html = """
    <html>
        <body>
            <h1>Hello, World!</h1>
            <p>This is HTML from FastAPI</p>
        </body>
    </html>
    """
    return HTMLResponse(content=html)
```

### PlainTextResponse

```python
from fastapi.responses import PlainTextResponse

@app.get("/health", response_class=PlainTextResponse)
def health_check():
    return "OK"
```

### RedirectResponse

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

```python
from fastapi.responses import StreamingResponse
import io

# Streaming a file
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

# Streaming a CSV
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

```python
from fastapi.responses import FileResponse

@app.get("/files/{filename}")
def get_file(filename: str):
    file_path = f"./uploads/{filename}"
    return FileResponse(
        path=file_path,
        filename=filename,          # Download filename
        media_type="application/octet-stream",
    )

# Serve an image
@app.get("/images/{image_name}")
def get_image(image_name: str):
    return FileResponse(f"./images/{image_name}", media_type="image/png")
```

### Compare with Express

```javascript
// Express equivalents
res.json({ data: 'json' });           // JSONResponse (default in FastAPI)
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

FastAPI has a neat trick: you can inject a `Response` object to set headers and cookies while still returning your normal data.

```python
from fastapi import Response

@app.get("/items/{item_id}")
def get_item(item_id: int, response: Response):
    # Set headers on the response
    response.headers["X-Item-Id"] = str(item_id)
    response.headers["Cache-Control"] = "max-age=3600"

    # Set cookies
    response.set_cookie(key="last_viewed", value=str(item_id))

    # Return data normally -- FastAPI handles the rest
    return {"item_id": item_id, "name": f"Item {item_id}"}
```

This is cleaner than creating a full `JSONResponse` when you just need to add a header or cookie.

---

## Putting It All Together: A Real-World Example

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
    if file.content_type not in ["image/jpeg", "image/png"]:
        return JSONResponse(
            status_code=400,
            content={"error": "Only JPEG and PNG files are allowed"},
        )

    contents = await file.read()
    # Save file logic here...

    return {
        "filename": file.filename,
        "size": len(contents),
        "description": description,
    }

# Export data as streaming CSV
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

# Tracking with cookies
@app.get("/products/{product_id}")
def get_product(
    product_id: int,
    response: Response,
    recently_viewed: str | None = Cookie(default=None),
):
    # Update recently viewed cookie
    viewed = json.loads(recently_viewed) if recently_viewed else []
    if product_id not in viewed:
        viewed.append(product_id)
        viewed = viewed[-10:]  # Keep last 10

    response.set_cookie(
        key="recently_viewed",
        value=json.dumps(viewed),
        max_age=86400 * 30,
    )

    return {"product_id": product_id, "recently_viewed": viewed}
```

---

## Practice Exercises

### Exercise 1: Contact Form
Create a `POST /contact` endpoint that accepts form data with fields: `name`, `email`, `subject`, `message`. Validate that name is at least 2 characters and email matches a basic pattern. Return a JSON confirmation.

### Exercise 2: File Upload with Validation
Create a `POST /documents/upload` endpoint that:
- Accepts a file upload and a `category` form field
- Validates the file is a PDF (check content_type)
- Validates the file is under 10MB
- Returns the filename, size, and category

### Exercise 3: Custom Headers API
Create an endpoint `GET /api/data` that:
- Reads `X-API-Key` and `X-Request-ID` from request headers
- Returns data only if `X-API-Key` is "secret123"
- Sets response headers: `X-Response-Time`, `X-Request-ID` (echo back)
- Returns a 401 JSONResponse if the API key is invalid

### Exercise 4: Cookie-Based Preferences
Build these endpoints:
- `POST /preferences` -- accepts JSON body with `theme` and `language`, stores them in cookies
- `GET /preferences` -- reads theme and language from cookies and returns them
- `DELETE /preferences` -- clears the preference cookies

### Exercise 5: Streaming Data Export
Create a `GET /export/logs` endpoint that:
- Accepts query parameters: `start_date`, `end_date`, `level` (info/warning/error)
- Generates fake log data
- Returns it as a streaming response with proper Content-Disposition header for download
- Support both CSV and JSON lines format via a `format` query parameter
