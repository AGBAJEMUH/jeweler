import Navbar from '@/components/Navbar';

export const dynamic = 'force-dynamic';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-(--background) text-(--foreground)">
            <Navbar />
            <main className="max-w-7xl mx-auto p-4 sm:p-8">
                {children}
            </main>
        </div>
    );
}
