'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteCampaignButton({ campaignId }: { campaignId: number }) {
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
            if (res.ok) {
                router.refresh(); // re-fetch the dashboard list
            } else {
                console.error('Failed to delete campaign');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setConfirming(false);
        }
    };

    if (confirming) {
        return (
            <div className="flex items-center gap-1">
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="text-xs font-semibold text-white bg-(--error) px-2 py-1 rounded hover:opacity-90 transition disabled:opacity-50"
                >
                    {loading ? '…' : 'Confirm'}
                </button>
                <button
                    onClick={() => setConfirming(false)}
                    className="text-xs text-gray-500 hover:text-(--foreground) transition px-1"
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setConfirming(true)}
            title="Delete campaign"
            className="p-1.5 rounded text-gray-400 hover:text-(--error) hover:bg-red-50 transition"
        >
            {/* Trash icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    );
}
