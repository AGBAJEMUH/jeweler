import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import AdmZip from 'adm-zip';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const campaignId = parseInt(resolvedParams.id, 10);

    if (isNaN(campaignId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const campaign = await db.campaign.findUnique({
        where: { id: campaignId },
        include: {
            products: true,
            composite_images: true,
        }
    });

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    try {
        const zip = new AdmZip();

        // Fetch and add Composite Image
        if (campaign.composite_images[0]?.image_url) {
            const compRes = await fetch(campaign.composite_images[0].image_url);
            if (compRes.ok) {
                const arrayBuffer = await compRes.arrayBuffer();
                zip.addFile('composite.jpg', Buffer.from(arrayBuffer));
            }
        }

        // Fetch and add Product Images
        let i = 1;
        for (const product of campaign.products) {
            if (product.styled_image_url) {
                const pRes = await fetch(product.styled_image_url);
                if (pRes.ok) {
                    const arrayBuffer = await pRes.arrayBuffer();
                    const safeName = product.name.replace(/\W+/g, '_');
                    zip.addFile(`${safeName}_styled_${i}.jpg`, Buffer.from(arrayBuffer));
                }
            }
            i++;
        }

        const zipBuffer = zip.toBuffer();

        return new NextResponse(zipBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="campaign_${campaignId}_assets.zip"`,
            }
        });

    } catch (error) {
        console.error('Error generating ZIP:', error);
        return NextResponse.json({ error: 'Failed to generate ZIP file' }, { status: 500 });
    }
}
