# File Upload & Download

Socho Zomato ka restaurant owner hai — woh apne restaurant ka menu PDF upload karta hai, food photos upload karta hai, aur baad mein woh photos download bhi karta hai apne dashboard se. Ya phir Swiggy ka delivery partner apna Aadhar card upload karta hai verification ke liye. Ya CRED pe tum apna credit card statement PDF upload karte ho analysis ke liye.

Yeh sab **file upload/download** hai — aur almost every production app mein yeh feature hota hi hai. Tum Node.js mein `multer` use karte the, right? Spring Boot mein yeh aur bhi seamless hai — multipart parsing box ke bahar hi kaam karta hai, alag se kuch install nahi karna.

Iss chapter mein hum cover karenge:
- Single file upload
- Multiple files + JSON metadata ek saath
- Storage service (disk pe save karna)
- File download — small files aur large files dono ke liye
- Range requests (resumable downloads — jaise YouTube pause karke resume karte ho)
- Security gotchas jo beginners miss karte hain
- Express/multer ke saath full comparison

---

## Pehle Samjho — Multipart/Form-Data Kya Hota Hai?

Jab tum browser se file upload karte ho, toh normal JSON request nahi jaati. Request ka format alag hota hai — `multipart/form-data`. Is format mein data multiple "parts" mein split hota hai, jaise ek train ke alag-alag dabba:

```
POST /api/v1/files HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="menu.pdf"
Content-Type: application/pdf

<binary file data here>
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

Node.js/Express mein `multer` middleware yeh parse karta tha. Spring Boot mein yeh parsing **automatically** hoti hai — `MultipartFile` object mein sab kuch aa jaata hai.

---

## Configuration — application.yml

Pehle application configure karo. Yeh `application.yml` mein daalo:

```yaml
spring:
  servlet:
    multipart:
      enabled: true                        # multipart parsing on karo (default: true)
      max-file-size: 50MB                  # ek file max kitni badi ho sakti hai
      max-request-size: 100MB             # poori request (sab files mila ke) max size
      file-size-threshold: 2KB           # is se chhoti files memory mein raho, baaki disk pe
      location: ${java.io.tmpdir}         # temp files kahan store hongi
```

Aur apna custom storage path bhi define karo:

```yaml
app:
  storage:
    root: /var/uploads    # ya Windows pe: C:/uploads
```

> [!info] Node.js comparison
> Express mein multer ko initialize karte waqt `dest` aur `limits` define karte the. Yahan sab `application.yml` mein centralized hai — aur Spring Boot automatically `MaxUploadSizeExceededException` throw karta hai agar size exceed ho.

---

## Single File Upload

Sabse basic case — ek file upload karna.

```java
@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final StorageService storage;

    // Constructor injection — @Autowired nahi chahiye Spring Boot mein agar ek hi constructor hai
    public FileController(StorageService storage) {
        this.storage = storage;
    }

    /**
     * POST /api/v1/files
     * Content-Type: multipart/form-data
     * Body: file=<binary>
     *
     * Zomato analogy: restaurant owner apna menu PDF upload karta hai
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> upload(
            @RequestParam("file") MultipartFile file  // "file" = form field name
    ) {
        // Empty file check — user ne accidentally khaali form submit kar diya
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Bhai, file toh bhejo pehle!");
        }

        // File store karo aur unique key wapas lo
        String storedKey = storage.store(
                file.getOriginalFilename(),   // original file ka naam (e.g., "menu.pdf")
                file.getContentType(),         // MIME type (e.g., "application/pdf")
                file.getInputStream()          // file ka actual data as a stream
        );

        // Response mein file key aur size bhejo
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new FileUploadResponse(storedKey, file.getSize()));
    }
}
```

**Response record:**

```java
// Java 16+ record — boilerplate-free DTO
public record FileUploadResponse(String key, long sizeBytes) {}
```

**Test karo `curl` se:**

```bash
curl -X POST http://localhost:8080/api/v1/files \
  -F "file=@/path/to/menu.pdf" \
  -H "Accept: application/json"
```

---

## Multiple Files + JSON Metadata Ek Saath

Real scenario: Swiggy restaurant wala multiple food photos upload karta hai aur saath mein album name aur caption bhi bhejta hai. Yahan `@RequestPart` ka use hota hai — kyunki `@RequestParam` sirf simple values ke liye hota hai, JSON object ke liye nahi.

```java
// Metadata ka record — JSON se automatically deserialize hoga
public record UploadMeta(
        @NotBlank String albumId,    // konsa album hai ye photos ka
        @NotBlank String caption,    // caption kya likha hai
        String category              // optional: "starters", "main-course", etc.
) {}
```

```java
/**
 * POST /api/v1/files/bulk
 * Content-Type: multipart/form-data
 * Parts:
 *   - files[]: multiple image files
 *   - meta: JSON string {"albumId": "diwali-special", "caption": "Diwali menu"}
 */
@PostMapping(value = "/bulk", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<List<FileUploadResponse>> uploadMany(
        @RequestPart("files") List<MultipartFile> files,          // multiple files
        @RequestPart("meta") @Valid UploadMeta meta               // JSON part — automatically deserialize hoga
) {
    // Sab files process karo ek ek karke
    List<FileUploadResponse> responses = files.stream()
            .map(f -> storage.store(meta.albumId(), f))
            .toList();

    return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(responses);
}
```

**`@RequestPart` vs `@RequestParam` — kab kya use karein?**

| Situation | Use Karein |
|-----------|-----------|
| Simple text ya file | `@RequestParam` |
| JSON object as a part | `@RequestPart` |
| File + JSON ek saath | `@RequestPart` dono ke liye |

**Test karo:**

```bash
curl -X POST http://localhost:8080/api/v1/files/bulk \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F 'meta={"albumId":"summer-menu","caption":"New items"}' \
  -H "Accept: application/json"
```

---

## Storage Service — Files Disk Pe Save Karna

Yeh service actual file saving ka kaam karti hai. Isme security ka dhyan rakha gaya hai:

```java
@Service
public class StorageService {

    private final Path root;

    public StorageService(@Value("${app.storage.root}") String rootPath) {
        this.root = Path.of(rootPath).toAbsolutePath().normalize();
    }

    /**
     * File store karo aur unique key return karo
     * @param originalName original file name (e.g., "../../etc/passwd" — attack attempt!)
     * @param contentType  MIME type
     * @param in           file data stream
     * @return unique stored key (UUID-based)
     */
    public String store(String originalName, String contentType, InputStream in) {
        try {
            // Directory create karo agar exist nahi karti
            Files.createDirectories(root);

            // UUID prefix + sanitized name = unique aur safe filename
            String safeName = UUID.randomUUID() + "-" + sanitize(originalName);

            // Resolved path — normalize() se ".." wale attacks handle hote hain
            Path target = root.resolve(safeName).normalize();

            // CRITICAL SECURITY CHECK: path traversal attack rokna
            // Agar koi "../../etc/passwd" jaise naam bheje toh yeh catch hoga
            if (!target.startsWith(root)) {
                throw new SecurityException("Path traversal detected — hacking attempt!");
            }

            // Stream ko file mein copy karo
            // REPLACE_EXISTING: agar somehow same UUID generate ho (practically impossible)
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);

            return safeName;

        } catch (IOException e) {
            // Checked exception ko unchecked mein wrap karo
            // Spring ke global exception handler se handle hoga
            throw new UncheckedIOException("File save karte waqt error aaya", e);
        }
    }

    /**
     * Overloaded version jo directly MultipartFile leta hai
     */
    public FileUploadResponse store(String albumId, MultipartFile file) {
        try {
            String key = store(file.getOriginalFilename(), file.getContentType(), file.getInputStream());
            return new FileUploadResponse(key, file.getSize());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * File path resolve karo key se (download ke liye)
     */
    public Path resolve(String key) {
        Path resolved = root.resolve(key).normalize();
        // Fir se security check
        if (!resolved.startsWith(root)) {
            throw new SecurityException("Invalid file key");
        }
        return resolved;
    }

    /**
     * Filename sanitize karo — dangerous characters remove karo
     * "menu_2024 (1).pdf" -> "menu_2024__1_.pdf"
     */
    private String sanitize(String name) {
        if (name == null || name.isBlank()) return "unnamed";
        // Sirf alphanumeric, dot, dash, underscore allow karo
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
```

> [!warning] `getBytes()` kabhi mat use karo large files ke liye
> `MultipartFile#getBytes()` puri file memory mein load kar leta hai. 500MB ki video file pe yeh OutOfMemoryError de sakta hai. Hamesha `getInputStream()` use karo aur stream karo disk pe.

---

## File Download — Small Files (In-Memory Resource)

Small files ke liye (documents, images under few MBs) — direct `Resource` return karo:

```java
/**
 * GET /api/v1/files/{key}
 * Response: file binary content with proper headers
 *
 * Analogy: CRED se apna credit card statement download karna
 */
@GetMapping("/{key}")
public ResponseEntity<Resource> download(@PathVariable String key) {
    Path filePath = storage.resolve(key);
    Resource resource = new FileSystemResource(filePath);

    // File exist karti hai?
    if (!resource.exists() || !resource.isReadable()) {
        return ResponseEntity.notFound().build();
    }

    // Content type determine karo — agar pata nahi toh generic binary
    String contentType = determineContentType(filePath);

    return ResponseEntity.ok()
            // Browser ko batao yeh download karna hai, view nahi
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + resource.getFilename() + "\"")
            // MIME type set karo
            .contentType(MediaType.parseMediaType(contentType))
            // File size set karo — browser download progress bar ke liye use karta hai
            .contentLength(filePath.toFile().length())
            .body(resource);
}

private String determineContentType(Path file) {
    try {
        String type = Files.probeContentType(file);
        return type != null ? type : MediaType.APPLICATION_OCTET_STREAM_VALUE;
    } catch (IOException e) {
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }
}
```

**`Content-Disposition` header ka importance:**

- `attachment; filename="..."` — browser automatically download dialog dikhata hai
- `inline; filename="..."` — browser file dikhane ki koshish karta hai (PDFs, images)

---

## File Download — Large Files (Streaming)

Large files (videos, big datasets) ke liye `StreamingResponseBody` use karo. Yeh lazy hai — data RAM mein buffer nahi hota, seedha response stream mein jaata hai:

```java
/**
 * GET /api/v1/files/{key}/stream
 *
 * Analogy: Hotstar pe movie download karna — bytes aate jaate hain,
 * pure movie RAM mein nahi aata ek saath
 */
@GetMapping("/{key}/stream")
public ResponseEntity<StreamingResponseBody> stream(@PathVariable String key) {
    Path filePath = storage.resolve(key);

    if (!Files.exists(filePath)) {
        return ResponseEntity.notFound().build();
    }

    // Lambda jo response stream mein data likhta hai — lazily executed
    StreamingResponseBody body = outputStream -> {
        try (InputStream in = Files.newInputStream(filePath)) {
            // transferTo = efficient bulk copy, internally buffered
            in.transferTo(outputStream);
        }
        // try-with-resources se InputStream automatically close ho jaata hai
    };

    return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + filePath.getFileName() + "\"")
            // Note: StreamingResponseBody ke saath contentLength optional hai
            // Agar set na karo toh chunked transfer encoding use hogi
            .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(Files.size(filePath)))
            .body(body);
}
```

> [!tip] Async Streaming
> Agar bahut zyada concurrent downloads hain, toh `StreamingResponseBody` ko `TaskExecutor` ke saath async bhi kar sakte ho:
> ```java
> @Bean
> public TaskExecutor downloadExecutor() {
>     ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
>     executor.setCorePoolSize(10);
>     executor.setMaxPoolSize(50);
>     executor.setQueueCapacity(100);
>     executor.setThreadNamePrefix("download-");
>     executor.initialize();
>     return executor;
> }
> ```
> Phir `@GetMapping` method pe `@Async` ya Spring MVC ka async support use karo.

---

## Range Requests — Resumable Downloads

Socho tum IRCTC se train ticket download kar rahe the — beech mein internet gaya. Ab phir se start karna padega? Range requests se yeh problem solve hoti hai. Browser ek specific byte range maang sakta hai:

```
GET /api/v1/files/abc.pdf
Range: bytes=1048576-2097151   # 1MB se 2MB tak ka chunk maango
```

**Good news:** Agar tum `Resource` return karte ho, toh Spring Boot automatically `Range` requests handle karta hai! `206 Partial Content` response automatically aata hai.

```java
// Yahi wala download endpoint — kuch extra nahi karna
@GetMapping("/{key}")
public ResponseEntity<Resource> download(@PathVariable String key) {
    // ... wahi code jo upar hai
    // Spring automatically Range header process karega
    // ResourceHttpRequestHandler yeh sab handle karta hai internally
}
```

Manual range support chahiye toh (custom storage, S3, etc.):

```java
@GetMapping("/{key}/range")
public ResponseEntity<Resource> downloadWithRange(
        @PathVariable String key,
        @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader
) {
    Path filePath = storage.resolve(key);
    Resource resource = new FileSystemResource(filePath);
    long fileSize = filePath.toFile().length();

    if (rangeHeader != null) {
        // Parse "bytes=start-end"
        String[] ranges = rangeHeader.replace("bytes=", "").split("-");
        long start = Long.parseLong(ranges[0]);
        long end = ranges.length > 1 && !ranges[1].isEmpty()
                ? Long.parseLong(ranges[1])
                : fileSize - 1;

        // 206 Partial Content response
        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                .header(HttpHeaders.CONTENT_RANGE,
                        "bytes " + start + "-" + end + "/" + fileSize)
                .contentLength(end - start + 1)
                .body(resource);
    }

    // Normal download
    return ResponseEntity.ok()
            .contentLength(fileSize)
            .body(resource);
}
```

---

## Global Exception Handling — Size Exceed Hone Pe Proper Error

Agar user 50MB se badi file upload kare, Spring `MaxUploadSizeExceededException` throw karta hai. Isse `@ControllerAdvice` mein handle karo:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * File size limit exceed hone pe 413 return karo
     * Analogy: Paytm KYC mein agar document 2MB se bada ho — proper error message chahiye
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleFileTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity
                .status(HttpStatus.PAYLOAD_TOO_LARGE)   // 413
                .body(new ErrorResponse(
                        "FILE_TOO_LARGE",
                        "File size limit exceed ho gayi. Maximum allowed size: 50MB"
                ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)   // 400
                .body(new ErrorResponse("BAD_REQUEST", ex.getMessage()));
    }
}

// Simple error response record
public record ErrorResponse(String code, String message) {}
```

---

## Real-World Production Pattern — S3 Signed URLs

Agar app production pe scale karna hai (jaise Swiggy ya Zomato), toh files directly apne server pe store mat karo. AWS S3 ya Google Cloud Storage use karo aur **presigned URLs** generate karo:

```java
/**
 * Production pattern:
 * 1. Client presigned URL maangta hai
 * 2. Client directly S3 pe upload karta hai (Spring server bypass)
 * 3. Client upload hone ke baad Spring ko notify karta hai
 *
 * Fayde:
 * - Spring server pe bandwidth load nahi
 * - Large files efficiently handle hote hain
 * - S3 ki built-in reliability milti hai
 */
@GetMapping("/upload-url")
public PresignedUrlResponse getUploadUrl(
        @RequestParam String filename,
        @RequestParam String contentType
) {
    // S3 SDK se presigned PUT URL generate karo
    // (AWS SDK v2 example — actual implementation project-specific hogi)
    String presignedUrl = s3Service.generatePresignedPutUrl(
            "my-bucket",
            "uploads/" + UUID.randomUUID() + "/" + sanitize(filename),
            contentType,
            Duration.ofMinutes(15)   // URL 15 minutes mein expire ho jaayegi
    );

    return new PresignedUrlResponse(presignedUrl);
}
```

> [!tip] Production Recommendation
> Direct file upload to Spring server sirf small-scale ya internal tools ke liye theek hai. Production apps mein S3/GCS + presigned URLs ka pattern use karo. Yeh Zomato, Swiggy, CRED jaise sab karte hain.

---

## Express/TypeScript Comparison

Tu Node.js se aaya hai, toh comparison samajhna important hai:

```typescript
// Express + multer (TypeScript)
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const safeName = `${uuidv4()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }  // 50MB
});

// Single file upload
router.post('/files', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.status(201).json({ key: req.file.filename, size: req.file.size });
});

// Multiple files
router.post('/files/bulk', upload.array('files', 10), (req, res) => {
  const files = req.files as Express.Multer.File[];
  res.status(201).json(files.map(f => ({ key: f.filename, size: f.size })));
});

// Download
router.get('/files/:key', (req, res) => {
  const filePath = path.join('uploads', req.params.key);
  res.download(filePath);
});

// Streaming download
router.get('/files/:key/stream', (req, res) => {
  const filePath = path.join('uploads', req.params.key);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});
```

**Side-by-side comparison:**

| Feature | Express + Multer | Spring Boot |
|---------|-----------------|-------------|
| Setup | `npm install multer` + manual config | Built-in, bas `application.yml` |
| Single file | `upload.single('file')` middleware | `@RequestParam("file") MultipartFile` |
| Multiple files | `upload.array('files', 10)` | `List<MultipartFile>` |
| File data | `req.file.buffer` / `req.file.path` | `file.getBytes()` / `file.getInputStream()` |
| File metadata | `req.file.originalname`, `req.file.size` | `file.getOriginalFilename()`, `file.getSize()` |
| Download small | `res.download(path)` | `ResponseEntity<Resource>` |
| Download large | `fs.createReadStream(p).pipe(res)` | `StreamingResponseBody` |
| Size limit config | `limits: { fileSize: 50MB }` in multer | `spring.servlet.multipart.max-file-size: 50MB` |
| Size limit error | Custom error middleware | `MaxUploadSizeExceededException` auto-thrown |
| Range requests | Manual implementation needed | Automatic via `ResourceHttpRequestHandler` |
| Type safety | Runtime only (multer types exist but limited) | Compile-time, full type safety |

---

## Gotchas — Yeh Mistakes Mat Karna

> [!danger] Path Traversal Attack — Sabse Dangerous
> `file.getOriginalFilename()` pe kabhi trust mat karo. Agar koi attacker `../../etc/passwd` ya `../../config/application.yml` filename bheje? Tum unka server file overwrite kar doge ya sensitive data expose ho jaayega.
>
> **Fix:** UUID prefix add karo + sanitize karo + resolved path verify karo:
> ```java
> Path target = root.resolve(safeName).normalize();
> if (!target.startsWith(root)) {
>     throw new SecurityException("Path traversal detected!");
> }
> ```

> [!warning] MaxUploadSizeExceededException Handle Karo
> Agar client `max-file-size` se badi file bheje, Spring automatically yeh exception throw karta hai. Isse handle nahi kiya toh ugly 500 error aayega. `@ControllerAdvice` mein `413 Payload Too Large` return karo.

> [!warning] Content-Type Pe Blindly Trust Mat Karo
> Browser jo `Content-Type` header bhejta hai woh client-controlled hai. Koi bhi malicious file ko `image/jpeg` content type ke saath upload kar sakta hai. Agar tum files re-serve karte ho, toh **magic bytes** validate karo:
> ```java
> // Apache Tika use karo actual type detect karne ke liye
> // dependency: org.apache.tika:tika-core
> Tika tika = new Tika();
> String detectedType = tika.detect(file.getInputStream());
> if (!ALLOWED_TYPES.contains(detectedType)) {
>     throw new IllegalArgumentException("File type allowed nahi hai: " + detectedType);
> }
> ```

> [!warning] `getBytes()` Large Files Pe = OutOfMemoryError
> ```java
> // GALAT — 200MB file RAM mein load ho gayi
> byte[] data = file.getBytes();
>
> // SAHI — stream karo, memory efficient
> try (InputStream in = file.getInputStream()) {
>     Files.copy(in, targetPath);
> }
> ```

> [!tip] File Name Collision
> Sirf original filename save mat karo — collision hoga. UUID prefix hamesha lagao:
> ```java
> String safeName = UUID.randomUUID() + "-" + sanitize(file.getOriginalFilename());
> ```

> [!warning] Temp Files Cleanup
> `file-size-threshold` se badi files `java.io.tmpdir` mein temporarily store hoti hain. Production mein disk space monitor karo. Ya `location` property se custom temp dir set karo jahan regular cleanup cron job ho.

> [!info] Virus Scanning
> Production mein user-uploaded files ClamAV ya cloud-based scanner se scan karna chahiye. Yeh especially important hai agar files doosre users ko serve karne hain — jaise Slack mein file sharing.

---

## Complete Working Example — Ek Saath Dekho

```java
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor  // Lombok se constructor injection
@Slf4j                    // Lombok se logger
public class FileController {

    private final StorageService storage;

    // Single upload
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> upload(
            @RequestParam("file") MultipartFile file
    ) {
        log.info("File upload request: name={}, size={}, type={}",
                file.getOriginalFilename(), file.getSize(), file.getContentType());

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Empty file upload karne ka kya fayda?");
        }

        String key = storage.store(
                file.getOriginalFilename(),
                file.getContentType(),
                file.getInputStream()
        );

        log.info("File stored successfully: key={}", key);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new FileUploadResponse(key, file.getSize()));
    }

    // Download
    @GetMapping("/{key}")
    public ResponseEntity<Resource> download(@PathVariable String key) {
        log.info("File download request: key={}", key);

        Path filePath = storage.resolve(key);
        Resource resource = new FileSystemResource(filePath);

        if (!resource.exists()) {
            log.warn("File not found: key={}", key);
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + resource.getFilename() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(filePath.toFile().length())
                .body(resource);
    }

    // Delete (optional but common)
    @DeleteMapping("/{key}")
    public ResponseEntity<Void> delete(@PathVariable String key) {
        storage.delete(key);
        return ResponseEntity.noContent().build();
    }
}
```

---

## Key Takeaways

- **Multipart parsing built-in hai** — `@RequestParam("file") MultipartFile file` bas karo, multer install nahi karna

- **`@RequestPart` use karo** jab file ke saath JSON metadata bhi bhejni ho ek hi request mein

- **`getInputStream()` preferred hai** `getBytes()` ke upar — large files ke liye memory efficient

- **Path traversal attack** sabse common security vulnerability hai file upload mein — UUID + sanitize + `startsWith(root)` check hamesha karo

- **Small files** ke liye `ResponseEntity<Resource>`, **large files** ke liye `StreamingResponseBody`

- **Range requests** automatically handle hote hain jab `Resource` return karo — Spring internally `ResourceHttpRequestHandler` use karta hai

- **`MaxUploadSizeExceededException`** ko `@ControllerAdvice` mein `413 Payload Too Large` pe map karo

- **Content-Type trust mat karo** — Apache Tika se magic bytes validate karo production mein

- **Production mein** presigned S3/GCS URLs use karo — Spring server pe file bandwidth mat lao

- **Node.js comparison:** multer ka `storage`, `limits`, `fileFilter` = Spring ka `StorageService` + `application.yml` config + validation logic — concepts same hain, implementation alag
