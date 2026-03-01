import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
    },
    endpoint: process.env.AWS_ENDPOINT, // for Supabase/Cloudflare R2/LocalStack
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
