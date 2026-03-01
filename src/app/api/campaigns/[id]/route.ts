import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deleteFromStorage } from '@/lib/storage';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
    const { id } = await params;
    const campaignId = parseInt(id, 10);

    if (isNaN(campaignId)) {
        return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    try {
        // 1. Fetch all media URLs before deleting the DB record
        const campaign = await db.campaign.findUnique({
            where: { id: campaignId },
            include: {
                products: { select: { original_image_url: true, styled_image_url: true } },
                composite_images: { select: { image_url: true } },
            },
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // 2. Collect every stored file URL
        const urlsToDelete: (string | null | undefined)[] = [
            campaign.logo_url,
            ...campaign.products.map(p => p.original_image_url),
            ...campaign.products.map(p => p.styled_image_url),
            ...campaign.composite_images.map(c => c.image_url),
        ];

        // 3. Delete files from Supabase Storage (best-effort — won't crash if it fails)
        await deleteFromStorage(urlsToDelete);

        // 4. Delete the DB record — cascades to products, captions, composite_images
        await db.campaign.delete({ where: { id: campaignId } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error deleting campaign:', err);
        return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }
}
