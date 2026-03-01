import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import ProductResultCard from '@/components/ProductResultCard';

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function CampaignDetailPage({ params }: PageProps) {
    const resolvedParams = await params;
    const campaignId = parseInt(resolvedParams.id, 10);

    if (isNaN(campaignId)) return notFound();

    const campaign = await db.campaign.findUnique({
        where: { id: campaignId },
        include: {
            composite_images: true,
            products: {
                include: {
                    captions: true,
                }
            }
        }
    });

    if (!campaign) return notFound();

    const compositeImage = campaign.composite_images[0]?.image_url;

    // Serialize Prisma Decimal fields to plain numbers so they can be passed to Client Components
    const products = campaign.products.map((p) => ({
        ...p,
        price: p.price !== null ? Number(p.price) : null,
    }));

    return (
        <div className="pb-20">
            <div className="mb-8 border-b border-(--border) pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                <div>
                    <h1 className="font-heading text-3xl font-bold mb-2">{campaign.name}</h1>
                    <p className="text-gray-500 text-sm sm:text-base">
                        Created on {new Date(campaign.created_at).toLocaleDateString()}
                        <span className="mx-2">•</span>
                        Status: <span className={`uppercase font-semibold ${campaign.status === 'completed' ? 'text-(--success)' :
                            campaign.status === 'processing' ? 'text-(--warning)' :
                                campaign.status === 'failed' ? 'text-(--error)' :
                                    'text-gray-600'
                            }`}>{campaign.status}</span>
                    </p>
                </div>
                <div>
                    {campaign.status === 'completed' && (
                        <a
                            href={`/api/campaigns/${campaign.id}/download`}
                            className="px-6 py-2 bg-(--foreground) text-(--background) rounded hover:bg-gray-800 transition font-semibold block text-center"
                        >
                            Download All (ZIP)
                        </a>
                    )}
                </div>
            </div>

            {/* Composite Image hero */}
            {compositeImage && (
                <div className="mb-12 bg-(--card-background) p-4 rounded border border-(--border) shadow-sm">
                    <h2 className="font-heading text-xl font-semibold mb-4 text-center">Campaign Collection</h2>
                    <div className="relative w-full aspect-video bg-gray-100 flex items-center justify-center overflow-hidden rounded">
                        <img
                            src={compositeImage}
                            alt="Composite Collection"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>
            )}

            {/* Products Grid */}
            <div>
                <h2 className="font-heading text-2xl font-bold mb-6">Generated Assets ({products.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.map(product => (
                        <ProductResultCard key={product.id} product={product as any} />
                    ))}
                </div>
            </div>
        </div>
    );
}
