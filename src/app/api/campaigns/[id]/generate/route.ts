import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateProductDescription, generatePlatformCaptions } from '@/lib/gpt';
import { processStyledImage, processCompositeImage } from '@/lib/imageService';

export const maxDuration = 60; // Allow sufficient time for Vercel execution

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const campaignId = parseInt(resolvedParams.id, 10);

    if (isNaN(campaignId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    try {
        const campaign = await db.campaign.findUnique({
            where: { id: campaignId },
            include: { products: true }
        });

        if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

        const context = campaign.description || campaign.name;
        const styledImageUrls: string[] = [];

        // Loop through products
        for (const product of campaign.products) {
            try {
                // 1. Description
                let finalDesc = product.description;
                if (!finalDesc || finalDesc.trim() === '') {
                    finalDesc = await generateProductDescription(product.name, product.price?.toString() || 'Price on request', context);
                }

                // 2. Image Styling
                const styledImageUrl = await processStyledImage(product.original_image_url, campaign.logo_url || '', product.price?.toString() || '', context);
                styledImageUrls.push(styledImageUrl);

                // 3. Captions
                const captions = await generatePlatformCaptions(product.name, product.price?.toString() || 'Price on request', finalDesc || '', context);

                // Save to DB
                await db.product.update({
                    where: { id: product.id },
                    data: {
                        description: finalDesc,
                        styled_image_url: styledImageUrl,
                        status: 'completed',
                    }
                });

                // Save Captions
                if (captions && captions.length > 0) {
                    await db.caption.createMany({
                        data: captions.map((c: any) => ({
                            product_id: product.id,
                            platform: c.platform,
                            caption_text: c.caption_text,
                            hashtags: c.hashtags || '',
                        }))
                    });
                }
            } catch (productError) {
                console.error(`Failed to process product ${product.id}`, productError);
                await db.product.update({
                    where: { id: product.id },
                    data: { status: 'failed' }
                });
            }
        }

        // 4. Composite Image
        if (styledImageUrls.length > 0) {
            try {
                const compositeUrl = await processCompositeImage(styledImageUrls);
                if (compositeUrl) {
                    await db.compositeImage.create({
                        data: {
                            campaign_id: campaignId,
                            image_url: compositeUrl,
                        }
                    });
                }
            } catch (compositeError) {
                console.error('Failed to generate composite', compositeError);
            }
        }

        // Done
        await db.campaign.update({
            where: { id: campaignId },
            data: { status: 'completed' }
        });

        return NextResponse.json({ success: true, status: 'completed' });
    } catch (err) {
        console.error('Generation pipeline error:', err);
        await db.campaign.update({
            where: { id: campaignId },
            data: { status: 'failed' }
        });
        return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 });
    }
}
