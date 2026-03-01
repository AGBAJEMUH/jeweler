import { db } from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage() {
    const campaigns = await db.campaign.findMany({
        orderBy: { created_at: 'desc' },
        include: {
            _count: {
                select: { products: true }
            }
        }
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
                <Link
                    href="/create"
                    className="bg-(--gold) text-(--foreground) px-4 py-2 font-semibold uppercase tracking-wider rounded hover:bg-yellow-600 transition"
                >
                    Create Campaign
                </Link>
            </div>

            {campaigns.length === 0 ? (
                <div className="text-center py-20 bg-(--card-background) border border-(--border) rounded shadow-sm">
                    <h2 className="text-xl font-medium mb-4">No campaigns yet.</h2>
                    <Link href="/create" className="text-sm font-medium text-(--gold) hover:underline">
                        Create your first campaign &rarr;
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {campaigns.map((campaign: any) => (
                        <div key={campaign.id} className="bg-(--card-background) border border-(--border) rounded shadow-sm p-4 hover:-translate-y-1 transition duration-200">
                            <h3 className="font-heading font-semibold text-lg mb-2 truncate" title={campaign.name}>{campaign.name}</h3>
                            <p className="text-sm text-gray-500 mb-1">Created: {new Date(campaign.created_at).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-500 mb-4">{campaign._count.products} Products</p>

                            <div className="flex items-center justify-between mt-4">
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${campaign.status === 'completed' ? 'bg-(--success) text-white' :
                                    campaign.status === 'processing' ? 'bg-(--warning) text-white' :
                                        campaign.status === 'failed' ? 'bg-(--error) text-white' :
                                            'bg-gray-200 text-gray-800'
                                    }`}>
                                    {campaign.status.toUpperCase()}
                                </span>

                                <Link href={`/campaigns/${campaign.id}`} className="text-sm font-medium text-(--gold) hover:underline">
                                    View
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
