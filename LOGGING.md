# Logging System — Media Storage Service

## Overview

This project uses **Winston** for structured JSON logging. Every log entry includes a timestamp, log level, service name, and contextual metadata. HTTP requests are tagged with a unique **request ID** (8-char UUID) for end-to-end tracing.

---

## Log Files

| File | Location | Content |
|------|----------|---------|
| `logs/combined.log` | `backend/logs/combined.log` | All logs (debug, info, warn, error) |
| `logs/error.log` | `backend/logs/error.log` | Errors only + uncaught exceptions/rejections |

- **Rotation**: `combined.log` rotates at 20 MB (keeps 10 files). `error.log` rotates at 10 MB (keeps 5 files).
- **Console**: In development (`NODE_ENV !== 'production'`), logs are also printed to the console with color formatting.

---

## Log Format

Every log line is a JSON object:

```json
{
  "level": "info",
  "message": "Incoming request",
  "requestId": "a1b2c3d4",
  "method": "POST",
  "url": "/api/upload",
  "ip": "::1",
  "userAgent": "Mozilla/5.0...",
  "service": "media-storage-service",
  "timestamp": "2026-03-16 14:23:05.123"
}
```

### Fields

| Field | Description |
|-------|-------------|
| `timestamp` | ISO-style timestamp with milliseconds |
| `level` | `debug`, `info`, `warn`, `error` |
| `message` | Human-readable event description |
| `requestId` | 8-char UUID for request tracing |
| `method` | HTTP method (GET, POST, etc.) |
| `url` | Full request URL including query string |
| `ip` | Client IP address |
| `userAgent` | Browser/client user agent string |
| `statusCode` | HTTP response status code |
| `durationMs` | Request processing time in milliseconds |
| `query` | Query parameters (if any) |
| `body` | Request body (non-multipart only, sensitive fields masked) |
| `error` | Error message (on failures) |
| `stack` | Stack trace (on errors) |
| `service` | Always `media-storage-service` |

---

## What Gets Logged

### Middleware Level
- Every incoming HTTP request (method, URL, query, body, IP, user-agent)
- Every outgoing response (status code, duration)
- All errors (with stack trace, request context)

### Controllers
- Upload start/complete with file count and total size
- Queue job creation (image/video compression)
- Media CRUD operations (delete, bulk delete, edit, recompress)
- Retry requests

### Services
- Database inserts, updates, deletes
- Cache hits and misses (Redis GET/SET/DEL)
- File deletions from disk
- Compression results (original size → compressed size, ratio)
- Company creation

### Workers
- Job start, completion, failure (with job ID, media ID)
- Compression results with size/ratio details
- Thumbnail generation

### Infrastructure
- Database connection and migration status
- Redis connection, reconnection, and errors
- Uncaught exceptions and unhandled promise rejections

---

## Request ID Tracing

Every HTTP request gets a unique 8-character request ID assigned in the `requestLogger` middleware. This ID is:

- Logged with every request/response pair
- Available in controllers via `req.requestId`
- Used in error handler for correlating errors to specific requests

To trace a specific request through the system:

```bash
grep "a1b2c3d4" logs/combined.log
```

---

## Viewing Logs on VPS (Production)

### Navigate to log directory

```bash
cd /path/to/image-upload/backend/logs
```

### View latest logs (live tail)

```bash
tail -f combined.log
```

### View only errors (live tail)

```bash
tail -f error.log
```

### Pretty-print JSON logs

```bash
tail -f combined.log | jq .
```

> Install `jq` if not available: `sudo apt install jq` (Ubuntu) or `sudo yum install jq` (CentOS)

### Search logs by request ID

```bash
grep "a1b2c3d4" combined.log | jq .
```

### Search errors in a time range

```bash
grep "2026-03-16 14:" error.log | jq .
```

### Count errors in last hour

```bash
grep "$(date +%Y-%m-%d\ %H)" error.log | wc -l
```

### Find slow requests (> 1 second)

```bash
grep '"durationMs"' combined.log | jq 'select(.durationMs > 1000)'
```

### Find all failed uploads

```bash
grep '"Upload failed"' combined.log | jq .
```

### Find all 500 errors

```bash
grep '"statusCode":500' error.log | jq .
```

### Monitor worker job failures

```bash
grep 'worker: job failed' combined.log | jq .
```

### Check Redis connection issues

```bash
grep 'Redis' combined.log | jq .
```

### Check uncaught exceptions

```bash
grep -E 'Uncaught Exception|Unhandled Rejection' error.log | jq .
```

---

## Log Rotation

Logs auto-rotate via Winston's built-in file rotation:

- `combined.log`: 20 MB max, 10 files retained
- `error.log`: 10 MB max, 5 files retained

Rotated files are named `combined.log.1`, `combined.log.2`, etc.

For additional OS-level rotation, you can configure `logrotate`:

```bash
sudo nano /etc/logrotate.d/media-storage
```

```
/path/to/image-upload/backend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
```

---

## PM2 Integration

If running with PM2, application `console.log` output (development only) goes to PM2's own logs. The Winston file logs work independently.

```bash
# PM2 logs
pm2 logs media-storage-backend

# Application logs (structured JSON)
tail -f /path/to/image-upload/backend/logs/combined.log | jq .
```

---

## Security

- Sensitive fields (`password`, `token`) are automatically masked in request body logs.
- Multipart form data bodies are not logged (too large / binary).
- Stack traces are only written to files, not exposed in API responses.
