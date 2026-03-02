import { NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { uploadToStorage } from '@/lib/storage';

// Allow sufficient time for uploads + background generation on Vercel
export const maxDuration = 300;

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const tone = formData.get('tone') as string || 'Luxury';
        const logoFile = formData.get('logoFile') as File | null;
        const productsDataStr = formData.get('productsData') as string;

        if (!name || !productsDataStr) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const productsData: { name: string, price: string, desc: string }[] = JSON.parse(productsDataStr);

        // Upload Logo
        let logoUrl = null;
        if (logoFile) {
            const buffer = Buffer.from(await logoFile.arrayBuffer());
            logoUrl = await uploadToStorage(`campaigns/logos/${Date.now()}-${logoFile.name}`, buffer, logoFile.type);
        }

        // Create Campaign in DB
        const campaign = await db.campaign.create({
            data: {
                name,
                description,
                tone,
                logo_url: logoUrl,
                status: 'processing', // Will immediately start processing logically
            }
        });


        // Upload Products and Link to Campaign
        for (let i = 0; i < productsData.length; i++) {
            const pData = productsData[i];
            const pFile = formData.get(`productFile_${i}`) as File;

            if (!pFile) continue;

            const buffer = Buffer.from(await pFile.arrayBuffer());
            const originalUrl = await uploadToStorage(`campaigns/${campaign.id}/originals/${Date.now()}-${pFile.name}`, buffer, pFile.type);

            await db.product.create({
                data: {
                    campaign_id: campaign.id,
                    name: pData.name,
                    price: pData.price ? Number(pData.price) : null,
                    description: pData.desc,
                    original_image_url: originalUrl,
                    status: 'processing',
                }
            });
        }

        // TRIGGER BACKGROUND PROCESSING
        // In Vercel, serverless function timeouts are short. We can trigger an async fetch without awaiting the entire generation.
        // For Vercel Edge/Serverless, we can send a POST request to ourselves but not await it fully, or use Vercel Queue (Next.js 14+) / Inngest.
        // Here we will do a 'fire and forget' fetch to a background API route to avoid blocking this request.
        const url = new URL(req.url);
        const generateUrl = `${url.protocol}//${url.host}/api/campaigns/${campaign.id}/generate`;
        console.log(`[API_CAMPAIGNS] Triggering background generation: ${generateUrl}`);

        // TRIGGER BACKGROUND PROCESSING via after() so Vercel keeps the function alive
        // after() is the Next.js 15 API for scheduling work post-response — Vercel honours it correctly
        after(async () => {
            console.log(`[API_CAMPAIGNS] Executing background task for campaign ${campaign.id}`);
            try {
                const res = await fetch(generateUrl, { method: 'POST' });
                console.log(`[API_CAMPAIGNS] Background generation request status: ${res.status}`);
            } catch (err) {
                console.error(`[API_CAMPAIGNS] Background generation fetch failed:`, err);
            }
        });

        return NextResponse.json({ success: true, campaignId: campaign.id }, { status: 201 });

    } catch (error) {
        console.error('Error creating campaign:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    const campaigns = await db.campaign.findMany({
        orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(campaigns);
}
