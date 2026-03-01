'use client';

import { useState } from 'react';

type Caption = {
    platform: string;
    caption_text: string;
    hashtags: string | null;
};

type Product = {
    id: number;
    name: string;
    styled_image_url: string | null;
    captions: Caption[];
};

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'X', 'WhatsApp'];

export default function ProductResultCard({ product }: { product: Product }) {
    const [activeTab, setActiveTab] = useState(PLATFORMS[0]);
    const [copied, setCopied] = useState(false);

    const activeCaption = product.captions.find(c => c.platform === activeTab);

    const handleCopy = async () => {
        if (!activeCaption) return;
        const textToCopy = `${activeCaption.caption_text}\n\n${activeCaption.hashtags || ''}`;
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleDownload = async () => {
        if (!product.styled_image_url) return;
        // Client-side download approach:
        const res = await fetch(product.styled_image_url);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${product.name.replace(/\s+/g, '_')}_styled.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    };

    return (
        <div className="bg-(--card-background) border border-(--border) rounded shadow-sm overflow-hidden flex flex-col">
            {/* Image Section */}
            <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
                {product.styled_image_url ? (
                    <img
                        src={product.styled_image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="text-gray-400 text-sm">Image processing...</span>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-heading font-semibold text-lg">{product.name}</h3>

                    <button
                        onClick={handleDownload}
                        disabled={!product.styled_image_url}
                        className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition disabled:opacity-50"
                        title="Download Image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                </div>

                {/* Platform Tabs */}
                <div className="border-b border-(--border) mb-3 flex overflow-x-auto scrollbar-hide">
                    {PLATFORMS.map(platform => (
                        <button
                            key={platform}
                            className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition border-b-2 ${activeTab === platform
                                ? 'border-(--gold) text-(--foreground)'
                                : 'border-transparent text-gray-500 hover:text-(--foreground)'
                                }`}
                            onClick={() => setActiveTab(platform)}
                        >
                            {platform}
                        </button>
                    ))}
                </div>

                {/* Caption Display */}
                <div className="flex-1 bg-gray-50 border border-(--border) rounded p-3 text-sm flex flex-col">
                    {activeCaption ? (
                        <div className="whitespace-pre-wrap flex-1 text-gray-700 overflow-y-auto max-h-[150px]">
                            <p>{activeCaption.caption_text}</p>
                            {activeCaption.hashtags && (
                                <p className="mt-2 text-(--gold)">{activeCaption.hashtags}</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Generating caption...
                        </div>
                    )}

                    <button
                        onClick={handleCopy}
                        disabled={!activeCaption}
                        className="mt-3 w-full py-1.5 text-xs font-semibold uppercase tracking-wider border border-(--gold) text-(--gold) rounded hover:bg-(--gold) hover:text-white transition disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
                    >
                        {copied ? 'Copied!' : 'Copy Caption'}
                    </button>
                </div>
            </div>
        </div>
    );
}
