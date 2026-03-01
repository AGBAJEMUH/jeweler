import sharp from 'sharp';
import { uploadToStorage } from '@/lib/storage';

/**
 * Calls the Photoroom API to replace the background of a product image
 * with an AI-generated luxury jewelry setting, then uploads the result to storage.
 */
export async function processStyledImage(
    originalUrl: string,
    logoUrl: string,
    price: string,
    context: string
): Promise<string> {
    if (process.env.PHOTOROOM_API_KEY) {
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
            formData.append('imageFile', new Blob([imageBuffer as any], { type: 'image/jpeg' }), 'product.jpg');

            const prompt = `Luxury jewelry display, high-end commercial photography, professional lighting, elegant composition. Theme: ${context}`;
            formData.append('background.prompt', prompt);

            // 3. Call Photoroom v2 edit API
            const prRes = await fetch('https://image-api.photoroom.com/v2/edit', {
                method: 'POST',
                headers: { 'x-api-key': process.env.PHOTOROOM_API_KEY },
                body: formData,
            });

            if (!prRes.ok) {
                const errText = await prRes.text();
                console.error('Photoroom error:', errText);
                throw new Error('Photoroom generation failed');
            }

            // 4. Upload the result to storage
            const resultBuffer = Buffer.from(await prRes.arrayBuffer());
            const fileName = `campaigns/styled/${Date.now()}-styled-product.jpg`;
            return await uploadToStorage(fileName, resultBuffer, 'image/jpeg');

        } catch (e) {
            console.error('Image processing error:', e);
        }
    }

    // Graceful fallback when no API key or Photoroom fails
    return `${originalUrl}?styled=true&theme=luxury`;
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

    const THUMB = 600; // px per tile
    const GAP = 8;     // px gap between tiles
    const BG = { r: 15, g: 15, b: 15 }; // near-black background

    try {
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

        // 5. Upload and return the public URL
        const fileName = `campaigns/composite/${Date.now()}-composite.jpg`;
        return await uploadToStorage(fileName, composited, 'image/jpeg');

    } catch (err) {
        console.error('Composite generation error:', err);
        return styledImageUrls[0];
    }
}
