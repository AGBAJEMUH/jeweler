import sharp from 'sharp';
import { uploadToStorage } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

/**
 * Attempts to remove background using Poof.bg API
 */
async function removeBackgroundPoof(imageBuffer: Buffer): Promise<Buffer | null> {
    const apiKey = process.env.POOF_API_KEY;
    if (!apiKey) return null;

    try {
        const formData = new FormData();
        formData.append('image_file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'image.jpg');

        const response = await fetch('https://api.poof.bg/v1/remove', {
            method: 'POST',
            headers: { 'x-api-key': apiKey },
            body: formData
        });

        if (!response.ok) return null;
        return Buffer.from(await response.arrayBuffer());
    } catch (error) {
        console.error('[IMAGE_SERVICE] Poof.bg Error:', error);
        return null;
    }
}

/**
 * Attempts to remove background using FreeBGRemover (Removal.ai) API
 */
async function removeBackgroundFree(imageBuffer: Buffer): Promise<Buffer | null> {
    const apiKey = process.env.FREEBG_API_KEY;
    if (!apiKey) return null;

    try {
        const formData = new FormData();
        formData.append('image_file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'image.jpg');

        const response = await fetch('https://api.removal.ai/3/remove', {
            method: 'POST',
            headers: { 'Rm-Token': apiKey },
            body: formData
        });

        if (!response.ok) return null;
        const data = await response.json();
        if (data.status !== 1 || !data.url) return null;

        const imgRes = await fetch(data.url);
        return Buffer.from(await imgRes.arrayBuffer());
    } catch (error) {
        console.error('[IMAGE_SERVICE] FreeBG Error:', error);
        return null;
    }
}

/**
 * Gets a random background image from the public folder based on tone
 */
function getRandomBackground(tone: string): Buffer | null {
    const bgDir = path.join(process.cwd(), 'public', 'backgrounds', tone);
    if (!fs.existsSync(bgDir)) return null;

    const files = fs.readdirSync(bgDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (files.length === 0) return null;

    const randomFile = files[Math.floor(Math.random() * files.length)];
    return fs.readFileSync(path.join(bgDir, randomFile));
}

/**
 * Main Image Processing Logic
 * 1. Removes background (resilient choice between Poof and FreeBG)
 * 2. Composites onto a local tone-based background using Sharp
 * 3. Applies shadow, lighting, and branding
 */
export async function processStyledImage(
    originalUrl: string,
    logoUrl: string,
    price: string,
    context: string,
    tone: string = 'Luxury'
): Promise<string> {
    console.log(`[IMAGE_SERVICE] processStyledImage starting for ${originalUrl} with tone ${tone}`);

    try {
        // 1. Fetch original image
        let imageBuffer: Buffer;
        if (originalUrl.startsWith('/uploads/') || originalUrl.startsWith('/')) {
            imageBuffer = fs.readFileSync(path.join(process.cwd(), 'public', originalUrl));
        } else {
            const res = await fetch(originalUrl);
            if (!res.ok) throw new Error('Failed to fetch original image');
            imageBuffer = Buffer.from(await res.arrayBuffer());
        }

        // 2. Remove Background (Try Poof first, then FreeBG)
        let productNoBg = await removeBackgroundPoof(imageBuffer);
        if (!productNoBg) {
            console.log('[IMAGE_SERVICE] Poof.bg failed or limit reached, trying FreeBG...');
            productNoBg = await removeBackgroundFree(imageBuffer);
        }

        // If no background removal works, we can't style it properly locally
        if (!productNoBg) {
            console.warn('[IMAGE_SERVICE] All BG removal APIs failed. Falling back to original.');
            return originalUrl;
        }

        // 3. Select Background
        const bgBuffer = getRandomBackground(tone);
        if (!bgBuffer) {
            console.warn(`[IMAGE_SERVICE] No backgrounds found for tone ${tone}. Check public/backgrounds/`);
            return originalUrl;
        }

        // 4. Composition using Sharp
        const bgMetadata = await sharp(bgBuffer).metadata();
        const width = bgMetadata.width || 1200;
        const height = bgMetadata.height || 1200;

        // Visual Refinement: Subtle blur to background for depth-of-field
        let processedBg = sharp(bgBuffer).blur(2);

        // Visual Refinement: Subtle color grading overlay based on tone
        const grading: Record<string, { r: number, g: number, b: number, alpha: number }> = {
            Luxury: { r: 255, g: 215, b: 0, alpha: 0.05 }, // gold tint
            Trendy: { r: 255, g: 20, b: 147, alpha: 0.05 }, // pink tint
            Minimal: { r: 255, g: 255, b: 255, alpha: 0.05 }, // clean lift
            Bold: { r: 0, g: 0, b: 0, alpha: 0.1 }, // dark squash
        };
        const toneGrading = grading[tone] || grading.Luxury;

        processedBg = processedBg.composite([{
            input: {
                create: {
                    width,
                    height,
                    channels: 4,
                    background: toneGrading
                }
            },
            blend: 'over'
        }]);

        const bgProcessedBuffer = await processedBg.toBuffer();

        // Resize product to fit nicely (usually 60-70% of background)
        const productSize = Math.floor(Math.min(width, height) * 0.7);
        const resizedProduct = await sharp(productNoBg)
            .resize(productSize, productSize, { fit: 'inside' })
            .toBuffer();

        const productMetadata = await sharp(resizedProduct).metadata();
        const pW = productMetadata.width || 0;
        const pH = productMetadata.height || 0;

        // Generate a soft drop shadow
        const shadow = await sharp(resizedProduct)
            .extractChannel('alpha')
            .blur(12)
            .extend({ top: 15, bottom: 15, left: 15, right: 15, background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();

        // Final Composite onto processed background
        let result = sharp(bgProcessedBuffer)
            .composite([
                {
                    input: shadow,
                    blend: 'multiply',
                    top: Math.floor((height - pH) / 2) + 12, // shadow offset
                    left: Math.floor((width - pW) / 2) + 8,
                },
                {
                    input: resizedProduct,
                    top: Math.floor((height - pH) / 2),
                    left: Math.floor((width - pW) / 2),
                }
            ]);

        // 5. Add Logo Watermark (Southeast)
        if (logoUrl) {
            try {
                let logoBuf: Buffer;
                if (logoUrl.startsWith('/uploads/') || logoUrl.startsWith('/')) {
                    logoBuf = fs.readFileSync(path.join(process.cwd(), 'public', logoUrl));
                } else {
                    const lRes = await fetch(logoUrl);
                    logoBuf = Buffer.from(await lRes.arrayBuffer());
                }

                const watermark = await sharp(logoBuf)
                    .resize({ width: 200, withoutEnlargement: true })
                    .ensureAlpha()
                    .composite([{
                        input: Buffer.from([255, 255, 255, 128]),
                        raw: { width: 1, height: 1, channels: 4 },
                        tile: true,
                        blend: 'dest-in'
                    }])
                    .png()
                    .toBuffer();

                result = result.composite([
                    {
                        input: watermark,
                        gravity: 'southeast',
                        top: height - 100, // naive positioning with padding
                        left: width - 240,
                    }
                ]);
            } catch (wmErr) {
                console.error('[IMAGE_SERVICE] Logo failed:', wmErr);
            }
        }

        const finalBuffer = await result.jpeg({ quality: 90 }).toBuffer();
        const fileName = `campaigns/styled/${Date.now()}-styled.jpg`;
        return await uploadToStorage(fileName, finalBuffer, 'image/jpeg');

    } catch (e) {
        console.error('[IMAGE_SERVICE] Style error:', e);
        return originalUrl;
    }
}

/**
 * Creates a smart grid collage
 */
export async function processCompositeImage(styledImageUrls: string[]): Promise<string> {
    if (styledImageUrls.length === 0) return '';
    const THUMB = 600;
    const GAP = 8;
    const BG = { r: 15, g: 15, b: 15 };

    try {
        const tiles = await Promise.all(
            styledImageUrls.map(async (url) => {
                let buf: Buffer;
                if (url.startsWith('/uploads/') || url.startsWith('/')) {
                    buf = fs.readFileSync(path.join(process.cwd(), 'public', url));
                } else {
                    const cleanUrl = url.split('?')[0];
                    const res = await fetch(cleanUrl);
                    buf = Buffer.from(await res.arrayBuffer());
                }
                return sharp(buf)
                    .resize(THUMB, THUMB, { fit: 'cover', position: 'centre' })
                    .jpeg({ quality: 90 })
                    .toBuffer();
            })
        );

        const n = tiles.length;
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const totalWidth = cols * THUMB + (cols - 1) * GAP;
        const totalHeight = rows * THUMB + (rows - 1) * GAP;

        const compositeInputs = tiles.map((tile, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const tilesInRow = row === rows - 1 ? n - row * cols : cols;
            const rowWidth = tilesInRow * THUMB + (tilesInRow - 1) * GAP;
            const xOffset = Math.floor((totalWidth - rowWidth) / 2);
            return { input: tile, left: xOffset + col * (THUMB + GAP), top: row * (THUMB + GAP) };
        });

        const composited = await sharp({
            create: { width: totalWidth, height: totalHeight, channels: 3, background: BG }
        }).composite(compositeInputs).jpeg({ quality: 92 }).toBuffer();

        const fileName = `campaigns/composite/${Date.now()}-composite.jpg`;
        return await uploadToStorage(fileName, composited, 'image/jpeg');
    } catch (err) {
        console.error('[IMAGE_SERVICE] Composite error:', err);
        return styledImageUrls[0];
    }
}
