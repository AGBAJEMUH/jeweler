'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateCampaignPage() {
    const router = useRouter();

    // Campaign Details
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);

    // Products
    const [products, setProducts] = useState([{ id: Date.now(), name: '', price: '', desc: '', file: null as File | null }]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const addProduct = () => {
        if (products.length >= 10) return;
        setProducts([...products, { id: Date.now(), name: '', price: '', desc: '', file: null }]);
    };

    const removeProduct = (id: number) => {
        if (products.length === 1) return; // Prevent removing last product
        setProducts(products.filter(p => p.id !== id));
    };

    const updateProduct = (id: number, field: string, value: any) => {
        setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!name.trim()) return setError('Campaign name is required');
        if (products.some(p => !p.name.trim() || !p.file)) return setError('All products must have a name and an uploaded image');

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            if (logoFile) formData.append('logoFile', logoFile);

            const productsData = products.map(p => ({ name: p.name, price: p.price, desc: p.desc }));
            formData.append('productsData', JSON.stringify(productsData));

            products.forEach((p, index) => {
                if (p.file) formData.append(`productFile_${index}`, p.file);
            });

            const res = await fetch('/api/campaigns', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/campaigns/${data.campaignId}`);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create campaign');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="mb-8 border-b border-(--border) pb-4 flex justify-between items-center">
                <div>
                    <h1 className="font-heading text-3xl font-bold mb-2">Create New Campaign</h1>
                    <p className="text-gray-500">Upload your products and generate AI assets in seconds.</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-(--error) text-white text-sm rounded shadow-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10">

                {/* Campaign Info Section */}
                <section className="bg-(--card-background) p-6 rounded shadow-sm border border-(--border)">
                    <h2 className="font-heading text-xl font-semibold mb-4 border-b border-(--border) pb-2">1. Campaign Details</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="name">Campaign Name <span className="text-red-500">*</span></label>
                            <input
                                id="name"
                                type="text"
                                placeholder="e.g. Summer Gold Collection"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2 border border-(--border) rounded focus:ring-1 focus:ring-(--gold) focus:border-(--gold) outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="description">Campaign Description</label>
                            <textarea
                                id="description"
                                placeholder="Optional brief about the theme or target audience"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-(--border) rounded focus:ring-1 focus:ring-(--gold) focus:border-(--gold) outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Brand Logo (Optional for Watermarks)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setLogoFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-(--background) file:text-(--foreground) hover:file:bg-gray-100"
                            />
                        </div>
                    </div>
                </section>

                {/* Products Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-heading text-xl font-semibold">2. Product Images ({products.length}/10)</h2>
                        {products.length < 10 && (
                            <button
                                type="button"
                                onClick={addProduct}
                                className="text-sm font-medium text-(--gold) hover:underline"
                            >
                                + Add Another Product
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        {products.map((product, index) => (
                            <div key={product.id} className="relative bg-(--card-background) p-6 rounded shadow-sm border border-(--border) flex flex-col md:flex-row gap-6 hover:shadow-md transition">
                                {products.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeProduct(product.id)}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-(--error) transition"
                                        title="Remove product"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}

                                {/* Image Upload Area */}
                                <div className="w-full md:w-1/3 flex flex-col items-center justify-center border-2 border-dashed border-(--border) rounded bg-(--background) p-4 relative min-h-[200px]">
                                    {product.file ? (
                                        <>
                                            <img
                                                src={URL.createObjectURL(product.file)}
                                                alt="Preview"
                                                className="absolute inset-0 w-full h-full object-contain p-2"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => updateProduct(product.id, 'file', null)}
                                                className="absolute top-2 right-2 bg-white/80 rounded-full p-1 text-red-500 hover:bg-white"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </>
                                    ) : (
                                        <label className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
                                            <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span className="text-sm font-medium text-(--gold)">Upload a file</span>
                                            <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => updateProduct(product.id, 'file', e.target.files?.[0] || null)}
                                            />
                                        </label>
                                    )}
                                </div>

                                {/* Product Fields */}
                                <div className="w-full md:w-2/3 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Product Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Diamond Halo Ring"
                                            value={product.name}
                                            onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                                            className="w-full px-3 py-2 border border-(--border) rounded focus:ring-1 focus:ring-(--gold) focus:border-(--gold) outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Price (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1500.00"
                                            value={product.price}
                                            onChange={(e) => updateProduct(product.id, 'price', e.target.value)}
                                            className="w-full px-3 py-2 border border-(--border) rounded focus:ring-1 focus:ring-(--gold) focus:border-(--gold) outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                                        <textarea
                                            placeholder="Leave blank to let AI generate an elegant luxury description automatically."
                                            value={product.desc}
                                            onChange={(e) => updateProduct(product.id, 'desc', e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-(--border) rounded focus:ring-1 focus:ring-(--gold) focus:border-(--gold) outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Submission */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-(--border) flex justify-end px-4 sm:px-8 z-40">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-8 py-3 bg-(--gold) text-(--foreground) font-semibold uppercase tracking-wider rounded hover:bg-yellow-600 transition disabled:opacity-50"
                    >
                        {isSubmitting ? 'Uploading & Generating...' : 'Generate Campaign'}
                    </button>
                </div>
            </form>
        </div>
    );
}
