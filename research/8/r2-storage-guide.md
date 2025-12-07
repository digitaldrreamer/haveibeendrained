# Cloudflare R2 Storage Guide for "Have I Been Drained"

**Last Updated:** December 2025 | **Target:** Solana wallet security checker

---

## Table of Contents

1. [API & Compatibility](#api--compatibility)
2. [Pricing & Cost Estimation](#pricing--cost-estimation)
3. [Authentication](#authentication)
4. [Upload Strategies](#upload-strategies)
5. [Security Best Practices](#security-best-practices)
6. [Integration with Tech Stack](#integration-with-tech-stack)
7. [Implementation Examples](#implementation-examples)
8. [Cost Calculation for 10,000 Files](#cost-calculation-for-10000-files)
9. [Security Checklist](#security-checklist)

---

## API & Compatibility

### Supported S3 API Methods

Cloudflare R2 implements S3-compatible APIs, supporting ~99% of common operations:

| Operation | Support | Notes |
|-----------|---------|-------|
| **PutObject** | ✅ Full | Upload single objects |
| **GetObject** | ✅ Full | Download objects |
| **DeleteObject** | ✅ Full | Delete single objects |
| **ListBucketV2** | ✅ Full | List objects with pagination |
| **HeadObject** | ✅ Full | Get object metadata |
| **CopyObject** | ✅ Full | Copy objects within/between buckets |
| **Multipart Upload** | ✅ Full | UploadPart, CompleteMultipartUpload, AbortMultipartUpload |
| **Object Versioning** | ✅ Full | Track object versions |
| **Bucket Lifecycle** | ✅ Basic | Expiration & transition to Infrequent Access only |
| **Object Tagging** | ✅ Full | Tag-based metadata |
| **Server-Side Encryption (SSE)** | ✅ Full | AES-256 encryption |
| **Presigned URLs** | ✅ Full | Temporary access URLs |
| **CORS Configuration** | ✅ Full | Cross-origin requests |
| **Bucket Notifications** | 🟡 Beta | Workers Queues & HTTP polling only (no SNS/SQS/Lambda) |
| **Intelligent-Tiering** | ❌ Not Supported | Limited to Standard and Infrequent Access classes |
| **Bucket Policies** | ❌ Not Supported | Public access via r2.dev domains only |
| **IAM Roles** | ❌ Not Supported | Access Keys + Tokens only |

### Key Differences from S3

**R2 Limitations:**
- **50 bucket operations/sec** rate limit
- **1 concurrent write/sec per object** (no parallel writes to same file)
- **5 GiB maximum** single PUT (use multipart for larger files)
- **100MB max** via Cloudflare Workers free/pro, 500MB enterprise
- Presigned URLs cannot be used with custom domains (must use native R2 endpoint)
- No SNS/SQS/Lambda bucket notifications (use Workers Queues instead)

**R2 Advantages:**
- ✅ Zero egress fees (unlimited bandwidth)
- ✅ No egress transfer charges for CDN distribution
- ✅ S3-compatible SDK usage without code changes
- ✅ Built-in Cloudflare global network integration
- ✅ Event notifications via Workers (beta)

---

## Pricing & Cost Estimation

### Current Pricing (December 2025)

#### Standard Storage

| Metric | Cost | Free Tier |
|--------|------|-----------|
| Storage | $0.015/GB-month | 10 GB-month |
| Class A Operations | $4.50/million requests | 1 million/month |
| Class B Operations | $0.36/million requests | 10 million/month |
| Egress | **Free** (unlimited) | Free |
| Data Retrieval | None | N/A |

**Class A Operations:** PutObject, DeleteObject, CreateMultipartUpload, CompleteMultipartUpload, AbortMultipartUpload
**Class B Operations:** GetObject, HeadObject, ListBucketV2, CopyObject

#### Infrequent Access Storage

| Metric | Cost | Notes |
|--------|------|-------|
| Storage | $0.01/GB-month | 30-day minimum |
| Class A Operations | $9.00/million requests | Higher mutation cost |
| Class B Operations | $0.90/million requests | Higher read cost |
| Data Retrieval | $0.01/GB | Per GB retrieved |
| Egress | **Free** (unlimited) | Free |

**When to use:** Data accessed <4x monthly or for long-term evidence archive

### Comparison with Alternatives (December 2025)

| Provider | Storage | Egress | Notes |
|----------|---------|--------|-------|
| **Cloudflare R2** | $0.015/GB | **FREE** | Best for high-bandwidth apps |
| **AWS S3** | $0.023/GB | $0.09/GB | Industry standard, mature ecosystem |
| **Backblaze B2** | $0.006/GB | $0.01/GB | Cheapest, growing S3 API support |
| **Wasabi** | $0.0049/GB | **FREE** | S3-compatible, budget option |

**Recommendation for "Have I Been Drained":** R2 is ideal because:
1. Zero egress = public wallet analysis data can be freely shared
2. Presigned URLs allow time-limited evidence downloads
3. Cloudflare Workers integration for validation
4. No surprise bandwidth costs for viral Blinks/social sharing

---

## Authentication

### Access Key Management

#### Generate R2 API Token

1. **Cloudflare Dashboard** → Account Settings → API Tokens
2. **Create Token** with R2 permissions:
   ```
   Permissions:
   - Object Read
   - Object Write
   - Object List
   - Object Delete
   ```

3. **Scope to specific bucket** for production security

#### Access Key Structure

```
Access Key ID:    0123456789abcdef0123456789abcdef
Secret Access Key: 0123456789abcdef0123456789abcdef_0123456789abcdef0123456789abcdef
Account ID:       0123456789abcdef0123456789abcdef
Bucket:           evidence-storage
```

### Authentication Methods

#### 1. Direct S3 API (Backend Server)

```typescript
// Using AWS SDK v3
import { S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});
```

**Best for:**
- Server-side file uploads
- Sensitive file processing
- Administrative operations

**Security:**
- Never expose credentials to browser
- Use environment variables or Cloudflare Workers Secrets
- Rotate keys quarterly

#### 2. Presigned URLs (Browser Uploads)

Allows browser directly upload to R2 without credentials.

```typescript
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Server-side: Generate signed URL
const command = new PutObjectCommand({
  Bucket: "evidence-storage",
  Key: `uploads/${userId}/${fileId}.json`,
  ContentType: "application/json",
});

const presignedUrl = await getSignedUrl(s3Client, command, {
  expiresIn: 3600, // 1 hour
});

// Return to frontend
response.json({ uploadUrl: presignedUrl });
```

**Benefits:**
- Direct browser→R2 upload (no server overhead)
- Temporary access (signature expires)
- Per-file granular permissions
- Metadata embedded in URL

**Limitations:**
- Cannot be used with custom domains
- Restricted to 7-day max expiration
- Must use native R2 endpoint

#### 3. Cloudflare Workers Authentication

For custom domain access with automatic validation.

```javascript
// Worker handling R2 access
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    // Validate token (implement your auth logic)
    if (!isValidToken(token)) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Proxy to R2 via custom domain
    const objectPath = url.pathname.substring(1);
    return env.EVIDENCE_BUCKET.get(objectPath);
  },
};
```

**Advantages:**
- Custom domain support (e.g., `evidence.haveibeen.drained`)
- Server-side token validation
- Rate limiting & DDoS protection
- Cache control headers

---

## Upload Strategies

### 1. Browser Direct Upload (Recommended)

Best for user-submitted evidence files.

```typescript
// Frontend: useFileUpload.ts
interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileKey?: string;
  error?: string;
}

async function uploadFile(
  file: File,
  documentType: string
): Promise<UploadResult> {
  try {
    // Step 1: Request presigned URL from backend
    const presignResponse = await fetch("/api/upload/presigned-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        documentType, // e.g., "transaction-evidence"
      }),
    });

    if (!presignResponse.ok) {
      throw new Error("Failed to get upload URL");
    }

    const { presignedUrl, fileKey } = await presignResponse.json();

    // Step 2: Upload directly to R2
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    // Step 3: Construct public URL
    const fileUrl = `https://${import.meta.env.PUBLIC_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/evidence-storage/${fileKey}`;

    return {
      success: true,
      fileUrl,
      fileKey,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

```typescript
// Backend: api/upload/presigned-url.ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, R2_CONFIG } from "@/lib/r2-client";

export async function POST(request: Request) {
  try {
    // 1. Validate authentication
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // 2. Parse request
    const { fileName, fileType, fileSize, documentType } = await request.json();

    // 3. Validate file
    if (!R2_CONFIG.allowedMimeTypes.includes(fileType)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type" }),
        { status: 400 }
      );
    }

    if (fileSize > R2_CONFIG.maxFileSize) {
      return new Response(
        JSON.stringify({ error: "File too large (max 500MB)" }),
        { status: 400 }
      );
    }

    // 4. Generate secure file key
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const fileId = crypto.randomUUID().substring(0, 8);
    const fileExtension = fileName.split(".").pop();
    const fileKey = `uploads/${userId}/${timestamp}/${documentType}_${fileId}.${fileExtension}`;

    // 5. Create presigned URL (1-hour expiry)
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        userId,
        originalFileName: fileName,
        documentType,
        uploadedAt: new Date().toISOString(),
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return new Response(
      JSON.stringify({
        presignedUrl,
        fileKey,
        expiresAt: Date.now() + 3600 * 1000,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Presigned URL error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate upload URL" }),
      { status: 500 }
    );
  }
}
```

### 2. Multipart Upload (Large Files >5GB)

For large transaction bundles or batch evidence files.

```typescript
// Server: Initiate multipart upload
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";

async function uploadLargeFile(
  fileStream: ReadableStream,
  fileName: string,
  fileSize: number
): Promise<string> {
  const fileKey = `large-uploads/${Date.now()}-${fileName}`;
  const partSize = 100 * 1024 * 1024; // 100 MB chunks

  // 1. Initiate multipart upload
  const initiateCommand = new CreateMultipartUploadCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: fileKey,
  });

  const { UploadId } = await s3Client.send(initiateCommand);

  // 2. Upload parts
  const parts = [];
  let partNumber = 1;
  let buffer = Buffer.alloc(0);

  for await (const chunk of fileStream) {
    buffer = Buffer.concat([buffer, chunk]);

    if (buffer.length >= partSize) {
      const partData = buffer.slice(0, partSize);
      buffer = buffer.slice(partSize);

      const uploadCommand = new UploadPartCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: fileKey,
        PartNumber: partNumber,
        UploadId,
        Body: partData,
      });

      const { ETag } = await s3Client.send(uploadCommand);
      parts.push({ PartNumber: partNumber, ETag });
      partNumber++;
    }
  }

  // Upload remaining data
  if (buffer.length > 0) {
    const uploadCommand = new UploadPartCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: fileKey,
      PartNumber: partNumber,
      UploadId,
      Body: buffer,
    });

    const { ETag } = await s3Client.send(uploadCommand);
    parts.push({ PartNumber: partNumber, ETag });
  }

  // 3. Complete multipart upload
  const completeCommand = new CompleteMultipartUploadCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: fileKey,
    UploadId,
    MultipartUpload: { Parts: parts },
  });

  await s3Client.send(completeCommand);

  return fileKey;
}
```

### 3. Server-Side Upload (Sensitive Evidence)

For programmatic uploads (e.g., Helius RPC evidence correlation).

```typescript
// Hono API route: api/evidence/upload
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/r2-client";

const uploadSchema = z.object({
  walletAddress: z.string().min(44).max(44), // Solana address
  transactionSignature: z.string(),
  evidenceType: z.enum([
    "drain-detection",
    "user-report",
    "community-analysis",
  ]),
  evidenceData: z.record(z.unknown()),
});

export const uploadEvidence = app.post(
  "/api/evidence/upload",
  zValidator("json", uploadSchema),
  async (c) => {
    const {
      walletAddress,
      transactionSignature,
      evidenceType,
      evidenceData,
    } = c.req.valid("json");

    try {
      // Validate user (Clerk or custom auth)
      const userId = c.req.header("x-user-id");
      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Generate file key
      const fileKey = `evidence/${evidenceType}/${walletAddress}/${transactionSignature}.json`;

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: "evidence-storage",
        Key: fileKey,
        Body: JSON.stringify(evidenceData),
        ContentType: "application/json",
        Metadata: {
          walletAddress,
          evidenceType,
          reportedBy: userId,
          timestamp: new Date().toISOString(),
        },
      });

      await s3Client.send(command);

      // Return with public presigned URL
      const fileUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 7 * 24 * 60 * 60, // 7 days
      });

      return c.json({
        success: true,
        fileKey,
        publicUrl: fileUrl,
      });
    } catch (error) {
      console.error("Evidence upload error:", error);
      return c.json({ error: "Failed to upload evidence" }, 500);
    }
  }
);
```

---

## Security Best Practices

### 1. File Type Validation

**Never trust file extensions. Use MIME type + magic bytes.**

```typescript
// lib/file-validator.ts
import { fileTypeFromBuffer } from "file-type";

const ALLOWED_TYPES = {
  "application/json": [".json"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

export async function validateFile(
  file: File
): Promise<{ valid: boolean; error?: string }> {
  // 1. Check extension
  const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
  if (!Object.values(ALLOWED_TYPES).flat().includes(extension)) {
    return { valid: false, error: "Invalid file extension" };
  }

  // 2. Check MIME type
  if (!ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]) {
    return { valid: false, error: "Invalid MIME type" };
  }

  // 3. Check file size
  const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
  if (file.size > MAX_SIZE) {
    return { valid: false, error: "File too large" };
  }

  // 4. Check magic bytes (file signature)
  const buffer = await file.arrayBuffer();
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType || !ALLOWED_TYPES[fileType.mime as keyof typeof ALLOWED_TYPES]) {
    return { valid: false, error: "Invalid file content" };
  }

  return { valid: true };
}
```

### 2. Malware Scanning Integration

**Option A: AttachmentAV (Recommended)**

```typescript
// lib/malware-scanner.ts
import axios from "axios";

async function scanFileForMalware(
  filePath: string,
  fileBuffer: Buffer
): Promise<{ safe: boolean; threatName?: string }> {
  try {
    // Upload to AttachmentAV for scanning
    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer]), filePath);

    const response = await axios.post(
      "https://api.attachmentav.com/v1/scan",
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.ATTACHMENTAV_API_KEY}`,
        },
      }
    );

    if (response.data.status === "clean") {
      return { safe: true };
    } else {
      return { safe: false, threatName: response.data.threat };
    }
  } catch (error) {
    console.error("Malware scan error:", error);
    // Fail secure: reject uploads if scan fails
    return { safe: false, threatName: "Scan unavailable" };
  }
}

export async function uploadWithScan(
  file: File
): Promise<{ success: boolean; error?: string; fileKey?: string }> {
  // 1. Validate file
  const validation = await validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // 2. Scan for malware
  const buffer = await file.arrayBuffer();
  const scanResult = await scanFileForMalware(file.name, new Buffer(buffer));

  if (!scanResult.safe) {
    return {
      success: false,
      error: `Malware detected: ${scanResult.threatName}`,
    };
  }

  // 3. Safe to upload
  // ... continue with presigned URL upload
  return { success: true };
}
```

**Option B: Cloudflare Gateway (Enterprise)**

If using Cloudflare Zero Trust, enable in Traffic Policies:
- Go to **Traffic Policies** → **Traffic Settings**
- Enable **Scan files for malware**
- Choose: uploads, downloads, or both

### 3. Public vs Private Buckets

**For "Have I Been Drained":**

```bash
# Create public evidence bucket (R2 dashboard)
Name: evidence-storage
Access: Private (default)

# But allow public READ via presigned URLs + custom domain
# Prevent anonymous uploads
```

**Bucket Configuration:**

```typescript
// Set bucket CORS for controlled access
const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: [
        "https://haveibeen.drained",
        "https://www.haveibeen.drained",
      ],
      AllowedMethods: ["GET", "PUT", "POST"],
      AllowedHeaders: ["*"],
      MaxAgeSeconds: 3600,
      ExposeHeaders: ["ETag", "x-amz-meta-*"],
    },
  ],
};
```

### 4. File Access Control Patterns

#### Pattern 1: Presigned URL (Time-Limited)

```typescript
// Frontend receives temporary download link
// Expires in 1 hour - requires re-authentication after
const downloadUrl = await getSignedUrl(s3Client, getCommand, {
  expiresIn: 3600,
});
```

**Security:** ✅ Excellent
- Each URL is bearer token
- Expires automatically
- Per-file granular control
- Cannot be used with custom domain

#### Pattern 2: Worker Proxy (Custom Domain)

```typescript
// Worker validates auth, proxies to R2
export default {
  async fetch(request, env) {
    // Validate JWT or session
    const token = request.headers.get("authorization");
    if (!validateToken(token)) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Extract file path from URL
    const url = new URL(request.url);
    const filePath = url.pathname.substring(1);

    // Stream from R2
    return env.EVIDENCE_BUCKET.get(filePath);
  },
};
```

**Security:** ✅ Very Good
- Session-based validation
- Custom domain support
- Rate limiting via Cloudflare
- Cannot see R2 credentials

#### Pattern 3: Public Access (R2.dev)

```
https://[bucket-name].r2.dev/public-evidence/...
```

**Security:** ⚠️ Limited
- Only for truly public data
- Variable rate limiting
- No access control
- Anyone with URL can access

### 5. Data Encryption

**At-Rest Encryption:**
- R2 uses AES-256 by default ✅
- No customer configuration needed
- Separate keys per object

**In-Transit Encryption:**
- Always use HTTPS (presigned URLs enforce)
- TLS 1.3 for all connections

**Application-Level Encryption:**

```typescript
// For highly sensitive data
import { encrypt, decrypt } from "@noble/ciphers/aes";

async function uploadEncryptedEvidence(
  evidence: object,
  walletAddress: string
) {
  // Encrypt before uploading to R2
  const plaintext = JSON.stringify(evidence);
  const encryptionKey = await deriveKey(walletAddress); // User-specific
  const ciphertext = encrypt(encryptionKey, plaintext);

  const command = new PutObjectCommand({
    Bucket: "evidence-storage",
    Key: `encrypted/${walletAddress}/${Date.now()}.bin`,
    Body: ciphertext,
    ServerSideEncryption: "AES256",
  });

  await s3Client.send(command);
}
```

---

## Integration with Tech Stack

### Astro + Svelte Frontend

```svelte
<!-- src/components/EvidenceUpload.svelte -->
<script>
  import { onMount } from "svelte";

  let isUploading = false;
  let uploadProgress = 0;
  let uploadError = "";

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    isUploading = true;
    uploadError = "";

    try {
      // Step 1: Get presigned URL
      const presignResponse = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          documentType: "wallet-analysis",
        }),
      });

      if (!presignResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { presignedUrl } = await presignResponse.json();

      // Step 2: Upload with progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            uploadProgress = Math.round((e.loaded / e.total) * 100);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            resolve(null);
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // Success
      isUploading = false;
      uploadProgress = 100;
    } catch (error) {
      uploadError = error.message;
      isUploading = false;
    }
  }
</script>

<div class="upload-container">
  <input
    type="file"
    accept=".json,.pdf,.csv"
    on:change={handleFileUpload}
    disabled={isUploading}
  />

  {#if isUploading}
    <div class="progress">
      <div class="bar" style="width: {uploadProgress}%"></div>
      <span>{uploadProgress}%</span>
    </div>
  {/if}

  {#if uploadError}
    <div class="error">{uploadError}</div>
  {/if}
</div>
```

### Hono API Server

```typescript
// src/api/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Enable CORS for browser uploads
app.use(
  "*",
  cors({
    origin: "https://haveibeen.drained",
    allowMethods: ["GET", "POST", "PUT"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Presigned URL endpoint
app.post("/api/upload/presigned-url", async (c) => {
  const { fileName, fileType, fileSize, documentType } = await c.req.json();

  // Validation...
  // Generate presigned URL...

  return c.json({ presignedUrl, fileKey });
});

// Retrieve evidence endpoint
app.get("/api/evidence/:walletAddress", async (c) => {
  const { walletAddress } = c.req.param();

  // Validate authorization...
  // Query R2 for evidence files...
  // Return with presigned download URLs...

  return c.json({ evidence: [...] });
});

export default app;
```

### Cloudflare Workers (Image Processing)

```typescript
// workers/image-processor.ts
// Use with Cloudflare Images for transaction screenshot optimization

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Extract image path and resize params
    const imagePath = url.pathname.substring(1); // Remove leading /
    const width = url.searchParams.get("width") || "400";
    const quality = url.searchParams.get("quality") || "80";

    try {
      // Get image from R2
      const imageObject = await env.EVIDENCE_BUCKET.get(imagePath);

      if (!imageObject) {
        return new Response("Not found", { status: 404 });
      }

      // Cloudflare Images API for optimization
      const image = new Response(imageObject.body);

      // Add caching headers
      const headers = new Headers();
      headers.set("Cache-Control", "public, max-age=31536000");
      headers.set("Content-Type", imageObject.httpMetadata.contentType);

      return new Response(image.body, { headers });
    } catch (error) {
      return new Response("Error processing image", { status: 500 });
    }
  },
};
```

### PostgreSQL Integration

```sql
-- schema.sql: Track uploaded evidence files

CREATE TABLE evidence_files (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  file_key VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  content_hash VARCHAR(64), -- SHA-256 for deduplication
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  malware_scanned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evidence_wallet ON evidence_files(wallet_address);
CREATE INDEX idx_evidence_content_hash ON evidence_files(content_hash);
```

```typescript
// lib/evidence-db.ts
import { db } from "@/lib/db";

export async function saveEvidenceMetadata(
  fileKey: string,
  walletAddress: string,
  userId: string,
  fileSize: number,
  contentType: string
) {
  return db.insert("evidence_files").values({
    id: crypto.randomUUID(),
    wallet_address: walletAddress,
    file_key: fileKey,
    file_type: contentType,
    file_size: fileSize,
    uploaded_by: userId,
    uploaded_at: new Date(),
  });
}
```

---

## Implementation Examples

### Complete Upload Flow

```typescript
// api/upload.ts - Full server-side implementation

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configuration
const s3Client = new S3Client({
  region: "auto",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});

const ALLOWED_TYPES = {
  "application/json": 10 * 1024 * 1024, // 10 MB
  "text/plain": 10 * 1024 * 1024,
  "application/pdf": 50 * 1024 * 1024, // 50 MB
};

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.enum(Object.keys(ALLOWED_TYPES)),
  fileSize: z.number().int().positive(),
  documentType: z.enum([
    "transaction-evidence",
    "user-report",
    "community-analysis",
  ]),
});

// Create app
const app = new Hono();

// Presigned URL generation
app.post("/api/upload/presigned-url", zValidator("json", uploadSchema), async (c) => {
  const auth = c.req.header("authorization");
  if (!auth || !validateToken(auth)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { fileName, fileType, fileSize, documentType } = c.req.valid("json");

  // Validate file type
  if (!(fileType in ALLOWED_TYPES)) {
    return c.json({ error: "Invalid file type" }, 400);
  }

  // Validate file size
  const maxSize = ALLOWED_TYPES[fileType as keyof typeof ALLOWED_TYPES];
  if (fileSize > maxSize) {
    return c.json(
      { error: `File too large (max ${maxSize / 1024 / 1024} MB)` },
      400
    );
  }

  try {
    // Generate unique file key
    const timestamp = new Date().toISOString().split("T")[0];
    const fileId = crypto.randomUUID().substring(0, 8);
    const extension = fileName.split(".").pop()?.toLowerCase();
    const fileKey = `uploads/${timestamp}/${documentType}_${fileId}.${extension}`;

    // Create presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        originalFileName: fileName,
        documentType,
        uploadedAt: new Date().toISOString(),
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return c.json({
      presignedUrl,
      fileKey,
      expiresAt: Date.now() + 3600 * 1000,
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return c.json({ error: "Failed to generate upload URL" }, 500);
  }
});

// Check if file exists
app.head("/api/upload/verify/:fileKey", async (c) => {
  const { fileKey } = c.req.param();

  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
    });

    await s3Client.send(command);
    return new Response(null, { status: 200 });
  } catch (error) {
    return new Response(null, { status: 404 });
  }
});

export default app;
```

### Complete CORS Configuration

```typescript
// workers/cors-handler.ts
export default {
  async fetch(request, env) {
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://haveibeen.drained",
          "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "3600",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }

    // Add CORS headers to all responses
    const response = await handleRequest(request, env);
    response.headers.set(
      "Access-Control-Allow-Origin",
      "https://haveibeen.drained"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");

    return response;
  },
};
```

---

## Cost Calculation for 10,000 Files

### Scenario: 10,000 Evidence Files from Community Reports

**Assumptions:**
- Average file size: 250 KB
- Mix: 60% JSON (analysis), 30% PDF (screenshots), 10% TXT (reports)
- Access pattern: Each file read 5x (average)
- Monthly ingestion: 100 files
- Retention: 12 months

### Monthly Cost Breakdown

| Category | Calculation | Cost |
|----------|-----------|------|
| **Storage** | 10,000 files × 250 KB = 2,500 GB<br>2,500 GB × $0.015/GB-month | **$37.50** |
| **Class A Operations** | 100 uploads + 1,000 API checks = 1,100 ops<br>Well within free tier (1M/month) | **FREE** |
| **Class B Operations** | 10,000 files × 5 reads = 50,000 reads<br>Well within free tier (10M/month) | **FREE** |
| **Egress** | Unlimited downloads via presigned URLs | **FREE** |
| **Data Retrieval** | Standard storage (no retrieval charges) | **FREE** |
| **TOTAL MONTHLY** | | **$37.50** |

### Annual Cost

- **Year 1:** $37.50 × 12 = **$450**
- **With growth (2x files):** $75 × 12 = **$900**
- **With Infrequent Access** (after 6 months): Save ~30% on storage = **$315-630**

### Cost Comparison vs Alternatives

| Provider | 10,000 × 250KB | Monthly | Annual |
|----------|---|---|---|
| **R2** | Storage only | $37.50 | $450 |
| **AWS S3** | Storage + egress @0.09/GB | $22.50 + $225 = $247.50 | $2,970 |
| **Backblaze B2** | Storage + egress @0.01/GB | $15 + $25 = $40 | $480 |
| **Wasabi** | Storage + free egress | $24.50 | $294 |

**Winner:** R2 for high-bandwidth sharing (e.g., Solana Blinks)

---

## Security Checklist

### Pre-Launch Security Audit

- [ ] **Access Control**
  - [ ] R2 API tokens generated with bucket-specific scopes
  - [ ] Access Keys rotated and old ones deleted
  - [ ] No hardcoded credentials in repository
  - [ ] Environment variables configured in Cloudflare Workers
  - [ ] Database credentials separate from file access credentials

- [ ] **File Validation**
  - [ ] MIME type validation implemented
  - [ ] File extension whitelist defined
  - [ ] Magic byte checking enabled
  - [ ] File size limits enforced (500 MB max)
  - [ ] Malware scanning via AttachmentAV or equivalent

- [ ] **Upload Security**
  - [ ] Presigned URLs expire after 1 hour
  - [ ] User authentication required for uploads
  - [ ] File paths include user ID for isolation
  - [ ] Content-Type headers validated
  - [ ] CORS restrictions configured for specific origins

- [ ] **Download Security**
  - [ ] Download presigned URLs expire appropriately (1-7 days)
  - [ ] Rate limiting on download endpoint
  - [ ] Access logs maintained for compliance
  - [ ] Authentication checked before generating download URLs
  - [ ] Wallet owner can only download their own evidence

- [ ] **Data Protection**
  - [ ] Sensitive data marked for Infrequent Access tier
  - [ ] Encryption at rest enabled (AES-256 default)
  - [ ] TLS 1.3 enforced for all connections
  - [ ] PII handled per GDPR/privacy requirements
  - [ ] Backup strategy documented

- [ ] **Monitoring & Compliance**
  - [ ] R2 access logs enabled
  - [ ] Failed upload attempts logged
  - [ ] Unusual access patterns monitored
  - [ ] Regular security audits scheduled
  - [ ] Incident response plan documented
  - [ ] Data retention policy defined

- [ ] **Infrastructure**
  - [ ] Cloudflare WAF rules configured
  - [ ] DDoS protection enabled
  - [ ] Rate limiting on API endpoints
  - [ ] Backup R2 bucket created (separate region)
  - [ ] Disaster recovery plan tested

### Monthly Security Tasks

1. **Review Access Logs**
   ```
   Cloudflare Dashboard → R2 → Logs
   - Check for unusual access patterns
   - Monitor failed authentication attempts
   - Verify only expected users accessing data
   ```

2. **Rotate Credentials**
   ```
   - Generate new API tokens
   - Update environment variables in production
   - Delete old tokens
   - Verify applications still authenticate
   ```

3. **Test Presigned URL Expiry**
   ```
   - Verify old URLs are rejected
   - Confirm new uploads generate valid URLs
   - Check expiration times in logs
   ```

4. **Audit CORS Configuration**
   ```
   - Verify only trusted origins allowed
   - Check for overly permissive headers
   - Review browser upload success rates
   ```

---

## Troubleshooting & Common Issues

### Issue: CORS Error on Browser Upload

**Symptoms:** `Access-Control-Allow-Origin` header missing

**Solution:**
```typescript
// Ensure presigned URL is generated with correct headers
const command = new PutObjectCommand({
  // ... other config
  // R2 auto-responds with CORS headers if bucket configured
});

// Also configure bucket CORS rules via Dashboard:
// R2 → Bucket Settings → CORS Configuration
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://haveibeen.drained"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

### Issue: Presigned URL Expires Too Quickly

**Symptoms:** 403 Forbidden after 15 minutes

**Solution:**
```typescript
// Default AWS SDK presigned URL uses 1 hour
const presignedUrl = await getSignedUrl(s3Client, command, {
  expiresIn: 3600, // Default: 3600 seconds (1 hour)
});

// For long uploads, increase to 7 days max
const presignedUrl = await getSignedUrl(s3Client, command, {
  expiresIn: 7 * 24 * 60 * 60, // 604,800 seconds
});
```

### Issue: High Class A Operations Cost

**Symptoms:** Approaching rate limits, unexpected charges

**Solution:**
```typescript
// Batch operations instead of individual requests
// Instead of 100 individual checks:
// ❌ Bad: for (const file of files) await checkExists(file)

// ✅ Good: Use metadata from upload response
const { fileKey, etag } = await uploadFile(file);
// Store in DB, no need for HEAD request

// Reduce API calls by caching file metadata
const cache = new Map();
async function getFileInfo(fileKey) {
  if (cache.has(fileKey)) return cache.get(fileKey);
  // ... fetch once
  cache.set(fileKey, data);
  return data;
}
```

### Issue: Multipart Upload Hanging

**Symptoms:** Upload stalls at 50-70%

**Solution:**
```typescript
// Implement retry logic for individual parts
async function uploadPartWithRetry(
  part: Buffer,
  partNumber: number,
  maxRetries: number = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadPart(part, partNumber);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000)); // Exponential backoff
    }
  }
}
```

---

## Additional Resources

**Official Documentation:**
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

**Libraries & Tools:**
- AWS SDK v3: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- Hono: Web framework with R2 support
- Cloudflare Wrangler: CLI for Workers/KV/R2

**Security:**
- AttachmentAV: Malware scanning service
- file-type: MIME type detection via magic bytes
- Noble: Cryptographic libraries

---

## Summary

**For "Have I Been Drained":**

1. ✅ Use **R2 presigned URLs** for browser uploads (no server-side file handling)
2. ✅ Store **evidence files** with user ID in path for access isolation
3. ✅ Implement **malware scanning** before storing evidence
4. ✅ Use **Cloudflare Workers** for custom domain downloads with auth
5. ✅ Leverage **zero egress** for viral Solana Blinks distribution
6. ✅ Cost-effective: ~$450/year for 10,000 evidence files

**Next Steps:**
1. Create R2 bucket in Cloudflare Dashboard
2. Generate API token with R2 permissions
3. Configure CORS for browser uploads
4. Implement presigned URL endpoint in Hono API
5. Add malware scanning integration
6. Deploy upload components in Astro/Svelte

