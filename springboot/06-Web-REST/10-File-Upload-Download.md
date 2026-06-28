---
tags: [web-rest, files, multipart, streaming]
aliases: [File Upload, File Download, MultipartFile]
stage: intermediate
---

# File Upload & Download

> [!info] For the Express/TS dev
> Express needs `multer` to parse multipart bodies. Spring Boot has multipart parsing **on by default** — `@RequestParam("file") MultipartFile file` Just Works. For downloads, return `Resource` or `StreamingResponseBody` — equivalent to `res.sendFile()` / `res.download()` / piping a stream to `res`.

## Concept / How it works

- **Upload**: `multipart/form-data` requests are parsed into `MultipartFile` objects.
- **Download**: return a `Resource` (in-memory or filesystem) or `StreamingResponseBody` (lazy, for large files).
- **Configuration** lives in `application.yml`.

`application.yml`:

```yaml
spring:
  servlet:
    multipart:
      enabled: true
      max-file-size: 50MB
      max-request-size: 100MB
      file-size-threshold: 2KB    # below this, kept in memory
      location: ${java.io.tmpdir}
```

## Code example

### Single-file upload

```java
@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final StorageService storage;

    public FileController(StorageService storage) { this.storage = storage; }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileUploadResponse upload(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("file is empty");
        }
        String storedKey = storage.store(
                file.getOriginalFilename(),
                file.getContentType(),
                file.getInputStream()    // throws IOException — handle/wrap
        );
        return new FileUploadResponse(storedKey, file.getSize());
    }
}
```

### Multiple files + extra fields

```java
public record UploadMeta(@NotBlank String albumId, @NotBlank String caption) {}

@PostMapping(value = "/bulk", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public List<FileUploadResponse> uploadMany(
        @RequestPart("files") List<MultipartFile> files,
        @RequestPart("meta") @Valid UploadMeta meta
) {
    return files.stream()
            .map(f -> storage.store(meta.albumId(), f))
            .toList();
}
```

`@RequestPart` (vs `@RequestParam`) lets the JSON `meta` part be deserialized.

### Storage service

```java
@Service
public class StorageService {

    private final Path root;

    public StorageService(@Value("${app.storage.root}") String root) {
        this.root = Path.of(root);
    }

    public String store(String originalName, String contentType, InputStream in) {
        try {
            Files.createDirectories(root);
            String safeName = UUID.randomUUID() + "-" + sanitize(originalName);
            Path target = root.resolve(safeName).normalize();
            // Path traversal guard
            if (!target.startsWith(root)) {
                throw new SecurityException("invalid path");
            }
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            return safeName;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private String sanitize(String name) {
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
```

### Download — small files (in-memory `Resource`)

```java
@GetMapping("/{key}")
public ResponseEntity<Resource> download(@PathVariable String key) {
    Path file = storage.resolve(key);
    Resource resource = new FileSystemResource(file);
    if (!resource.exists()) {
        return ResponseEntity.notFound().build();
    }
    return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + key + "\"")
            .contentLength(file.toFile().length())
            .body(resource);
}
```

### Download — large files (streaming, no buffering)

```java
@GetMapping("/{key}/stream")
public ResponseEntity<StreamingResponseBody> stream(@PathVariable String key) {
    Path file = storage.resolve(key);
    if (!Files.exists(file)) return ResponseEntity.notFound().build();

    StreamingResponseBody body = out -> {
        try (InputStream in = Files.newInputStream(file)) {
            in.transferTo(out);
        }
    };

    return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + key + "\"")
            .body(body);
}
```

### Range requests (resumable downloads)

`ResourceHttpRequestHandler` already supports `Range`. Just return a `Resource` and Spring handles `206 Partial Content` for byte ranges automatically.

## Express/TS comparison

```ts
// Express + multer
import multer from 'multer';
const upload = multer({ dest: 'uploads/', limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/files', upload.single('file'), (req, res) => {
  res.json({ key: req.file.filename, size: req.file.size });
});

router.get('/files/:key', (req, res) => {
  res.download(path.join('uploads', req.params.key));
});
```

| Express + multer | Spring |
| --- | --- |
| `multer.single('file')` middleware | `@RequestParam("file") MultipartFile` |
| `multer.array('files', 10)` | `List<MultipartFile>` |
| `req.file` | `MultipartFile` parameter |
| `req.file.buffer` | `file.getBytes()` / `file.getInputStream()` |
| `res.download(path)` | `ResponseEntity<Resource>` + Content-Disposition |
| `fs.createReadStream(p).pipe(res)` | `StreamingResponseBody` |
| `limits.fileSize` | `spring.servlet.multipart.max-file-size` |

## Gotchas

> [!danger] Path traversal
> Never trust `file.getOriginalFilename()`. A name like `../../etc/passwd` is a real attack. Sanitize, generate UUIDs, and verify the resolved path is under your root (see `target.startsWith(root)` above).

> [!warning] `MaxUploadSizeExceededException`
> When the client exceeds `max-file-size` you get this exception. Map it in `@ControllerAdvice` to `413 Payload Too Large`.

> [!warning] Don't `getBytes()` on huge files
> `MultipartFile#getBytes()` loads the whole file into memory. For large files use `getInputStream()` and stream to disk / S3.

> [!warning] Content-Type sniffing
> Browsers send any `Content-Type` the user picks. If you'll re-serve files, validate magic bytes (e.g., Apache Tika) before trusting the type.

> [!tip] Direct-to-S3 / signed URLs
> For production at scale, hand the client a presigned URL and let them upload directly to object storage. Your Spring app only sees the metadata.

## Related

- [[03-Response-Handling]]
- [[06-Exception-Handling]]
- [[11-WebClient-RestTemplate]]
