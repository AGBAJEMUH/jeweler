import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'auto',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
    },
    endpoint: process.env.AWS_ENDPOINT, // for Supabase/Cloudflare R2/LocalStack
    forcePathStyle: true, // Required for many S3-compatible providers like Supabase
});

const BUCKET = process.env.AWS_BUCKET_NAME || 'jeweler-bucket';

export async function uploadToStorage(key: string, buffer: Buffer, contentType: string) {
    // Graceful fallback for local development if no keys are provided
    if (process.env.NODE_ENV !== 'production' && !process.env.AWS_ACCESS_KEY_ID) {
        const fs = await import('fs');
        const path = await import('path');
        const localPath = path.join(process.cwd(), 'public', 'uploads', key);
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, buffer);
        return `/uploads/${key}`;
    }

    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });

    await s3.send(command);

    return process.env.AWS_PUBLIC_URL
        ? `${process.env.AWS_PUBLIC_URL}/${key}`
        : `https://${BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

/**
 * Deletes one or more files from storage by their public URLs.
 * Extracts the S3 key from each URL and calls DeleteObjects.
 * Handles both Supabase/R2 (AWS_PUBLIC_URL) and standard S3 URL formats.
 * No-ops gracefully if a URL is null/empty or if AWS keys are absent (local dev).
 */
export async function deleteFromStorage(urls: (string | null | undefined)[]) {
    const validUrls = urls.filter(Boolean) as string[];
    if (validUrls.length === 0) return;

    // Local dev fallback — delete from public/uploads
    if (process.env.NODE_ENV !== 'production' && !process.env.AWS_ACCESS_KEY_ID) {
        const fs = await import('fs');
        const path = await import('path');
        for (const url of validUrls) {
            if (url.startsWith('/uploads/')) {
                const localPath = path.join(process.cwd(), 'public', url);
                try { fs.unlinkSync(localPath); } catch { /* already gone */ }
            }
        }
        return;
    }

    // Derive the S3 key from the public URL
    const toKey = (url: string): string | null => {
        if (process.env.AWS_PUBLIC_URL && url.startsWith(process.env.AWS_PUBLIC_URL)) {
            return url.slice(process.env.AWS_PUBLIC_URL.length + 1); // strip base URL + '/'
        }
        // Standard S3 URL: https://<bucket>.s3.<region>.amazonaws.com/<key>
        try {
            const parsed = new URL(url);
            return parsed.pathname.replace(/^\//, '');
        } catch {
            return null;
        }
    };

    const keys = validUrls.map(toKey).filter(Boolean) as string[];
    if (keys.length === 0) return;

    try {
        await s3.send(new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true },
        }));
    } catch (err) {
        // Log but don't crash the delete route if storage cleanup fails
        console.error('Storage cleanup error:', err);
    }
}
