import sharp from 'sharp';
import { uploadToStorage } from '@/lib/storage';

const visualStyles: Record<string, string> = {
    Luxury: 'soft editorial lighting, gold and ivory background, luxury velvet and marble surfaces, champagne and warm tones, sophisticated depth of field, Vogue magazine aesthetic',
    Trendy: 'vibrant colorful gradient background, trendy lifestyle setting, bright and fun colors, social-media-viral aesthetic, Gen-Z color palette, energetic composition',
    Minimal: 'pure white studio background, clean Scandinavian minimalism, negative space, monochromatic neutral tones, precise product placement, Apple product photography style',
    Bold: 'dramatic chiaroscuro lighting, dark jewel-toned background, deep contrast, powerful composition, fashion-forward editorial, high-impact visual statement',
};

/**
 * Calls the Photoroom API to replace the background of a product image
 * with an AI-generated luxury jewelry setting, then uploads the result to storage.
 */
export async function processStyledImage(
    originalUrl: string,
    logoUrl: string,
    price: string,
    context: string,
    tone: string = 'Luxury'
): Promise<string> {
    console.log(`[IMAGE_SERVICE] processStyledImage starting for ${originalUrl} with tone ${tone}`);
    if (process.env.PHOTOROOM_API_KEY) {
        console.log(`[IMAGE_SERVICE] Photoroom API key found, calling API...`);
        try {
            // 1. Fetch the original image bytes
            let imageBuffer: Buffer;
            if (originalUrl.startsWith('/uploads/')) {
                const fs = await import('fs');
                const path = await import('path');
                imageBuffer = fs.readFileSync(path.join(process.cwd(), 'public', originalUrl));
            } else {
                const res = await fetch(originalUrl);
                if (!res.ok) throw new Error('Failed to fetch original image');
                imageBuffer = Buffer.from(await res.arrayBuffer());
            }

            // 2. Build Photoroom API request
            const formData = new FormData();
            formData.append('imageFile', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'product.jpg');

            const styleDesc = visualStyles[tone] || visualStyles.Luxury;
            const prompt = `Professional jewelry product photography. Visual style: ${styleDesc}. Theme: ${context}. IMPORTANT: Do not include or generate any text, letters, words, logos, signatures, or watermarks in the background. Ultra high resolution, photorealistic.`;
            formData.append('background.prompt', prompt);

            // 3. Call Photoroom v2 edit API
            const prRes = await fetch('https://image-api.photoroom.com/v2/edit', {
                method: 'POST',
                headers: { 'x-api-key': process.env.PHOTOROOM_API_KEY },
                body: formData,
            });

            if (!prRes.ok) {
                const errText = await prRes.text();
                console.error('[IMAGE_SERVICE] Photoroom error:', errText);
                throw new Error('Photoroom generation failed');
            }

            console.log(`[IMAGE_SERVICE] Photoroom API call successful`);

            // 4. Add logo watermark and upload to storage
            let resultBuffer: Buffer = Buffer.from(await prRes.arrayBuffer() as ArrayBuffer);

            if (logoUrl) {
                try {
                    console.log(`[IMAGE_SERVICE] Adding logo watermark from ${logoUrl}`);
                    let logoBuffer: Buffer;
                    if (logoUrl.startsWith('/uploads/') || logoUrl.startsWith('/')) {
                        const fs = await import('fs');
                        const path = await import('path');
                        logoBuffer = fs.readFileSync(path.join(process.cwd(), 'public', logoUrl));
                    } else {
                        const logoRes = await fetch(logoUrl);
                        if (!logoRes.ok) throw new Error('Failed to fetch logo');
                        logoBuffer = Buffer.from(await logoRes.arrayBuffer());
                    }

                    // Resize logo and reduce opacity to 50% for a subtle watermark
                    const watermark = await sharp(logoBuffer)
                        .resize({ width: 250, withoutEnlargement: true })
                        .ensureAlpha()
                        .composite([{
                            input: Buffer.from([255, 255, 255, 128]), // 50% alpha channel (128/255)
                            raw: { width: 1, height: 1, channels: 4 },
                            tile: true,
                            blend: 'dest-in'
                        }])
                        .png()
                        .toBuffer();

                    const baseImage = sharp(resultBuffer);
                    const metadata = await baseImage.metadata();

                    if (metadata.width && metadata.height) {
                        resultBuffer = await baseImage
                            .composite([
                                {
                                    input: watermark,
                                    gravity: 'north', // top-center
                                }
                            ])
                            .jpeg({ quality: 90 })
                            .toBuffer();
                        console.log(`[IMAGE_SERVICE] Watermark applied successfully`);
                    }
                } catch (wmErr) {
                    console.error('[IMAGE_SERVICE] Failed to apply watermark:', wmErr);
                    // continue with unwatermarked resultBuffer
                }
            }

            const fileName = `campaigns/styled/${Date.now()}-styled-product.jpg`;
            const styledUrl = await uploadToStorage(fileName, resultBuffer, 'image/jpeg');
            console.log(`[IMAGE_SERVICE] Styled image uploaded: ${styledUrl}`);
            return styledUrl;

        } catch (e) {
            console.error('[IMAGE_SERVICE] Image processing error:', e);
        }
    } else {
        console.warn(`[IMAGE_SERVICE] No Photoroom API key found, skipping API call`);
    }

    // Graceful fallback when no API key or Photoroom fails
    console.log(`[IMAGE_SERVICE] Using fallback for ${originalUrl}`);
    return `${originalUrl}?styled=true&theme=${tone.toLowerCase()}`;
}

/**
 * Creates a smart grid collage of all styled product images using sharp.
 *
 * Layout auto-calculated: cols = ceil(√N), rows = ceil(N / cols).
 * Any incomplete last row is centred.
 * Each tile is THUMB×THUMB px. Result is uploaded to storage.
 */
export async function processCompositeImage(styledImageUrls: string[]): Promise<string> {
    if (styledImageUrls.length === 0) return '';
    console.log(`[IMAGE_SERVICE] processCompositeImage starting for ${styledImageUrls.length} images`);

    const THUMB = 600; // px per tile
    const GAP = 8;     // px gap between tiles
    const BG = { r: 15, g: 15, b: 15 }; // near-black background

    try {
        console.log(`[IMAGE_SERVICE] Downloading and resizing tiles...`);
        // 1. Download + resize every styled image to a uniform THUMB×THUMB tile
        const tiles = await Promise.all(
            styledImageUrls.map(async (url) => {
                let buf: Buffer;
                if (url.startsWith('/uploads/') || url.startsWith('/')) {
                    const fs = await import('fs');
                    const path = await import('path');
                    buf = fs.readFileSync(path.join(process.cwd(), 'public', url));
                } else {
                    const cleanUrl = url.split('?')[0];
                    const res = await fetch(cleanUrl);
                    if (!res.ok) throw new Error(`Failed to fetch styled image: ${cleanUrl}`);
                    buf = Buffer.from(await res.arrayBuffer());
                }
                return sharp(buf)
                    .resize(THUMB, THUMB, { fit: 'cover', position: 'centre' })
                    .jpeg({ quality: 90 })
                    .toBuffer();
            })
        );

        const n = tiles.length;

        // 2. Calculate grid dimensions
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const totalWidth = cols * THUMB + (cols - 1) * GAP;
        const totalHeight = rows * THUMB + (rows - 1) * GAP;

        // 3. Position each tile — centre-align any incomplete last row
        const compositeInputs: sharp.OverlayOptions[] = tiles.map((tile, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;

            // How many tiles are in this row?
            const tilesInRow = row === rows - 1 ? n - row * cols : cols;
            // Offset to centre incomplete row
            const rowWidth = tilesInRow * THUMB + (tilesInRow - 1) * GAP;
            const xOffset = Math.floor((totalWidth - rowWidth) / 2);

            return {
                input: tile,
                left: xOffset + col * (THUMB + GAP),
                top: row * (THUMB + GAP),
            };
        });

        // 4. Compose onto a dark canvas
        const composited = await sharp({
            create: {
                width: totalWidth,
                height: totalHeight,
                channels: 3,
                background: BG,
            },
        })
            .composite(compositeInputs)
            .jpeg({ quality: 92 })
            .toBuffer();

        const fileName = `campaigns/composite/${Date.now()}-composite.jpg`;
        const compositeUrl = await uploadToStorage(fileName, composited, 'image/jpeg');
        console.log(`[IMAGE_SERVICE] Composite image uploaded: ${compositeUrl}`);
        return compositeUrl;

    } catch (err) {
        console.error('[IMAGE_SERVICE] Composite generation error:', err);
        return styledImageUrls[0];
    }
}
