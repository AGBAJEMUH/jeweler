import Link from 'next/link';
import { clearCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function handleLogout() {
    'use server';
    await clearCookie();
    redirect('/login');
}

export default function Navbar() {
    return (
        <nav className="sticky top-0 z-50 w-full h-[60px] bg-(--card-background) border-b border-(--border) flex items-center justify-between px-4 sm:px-8">
            <Link href="/dashboard" className="font-heading text-xl font-bold text-(--foreground)">
                JewelPromo AI
            </Link>

            <div className="flex items-center space-x-4">
                <Link
                    href="/dashboard"
                    className="text-sm font-medium hover:text-(--gold) transition hidden sm:block"
                >
                    Dashboard
                </Link>
                <Link
                    href="/create"
                    className="text-sm font-medium hover:text-(--gold) transition hidden sm:block"
                >
                    Create Campaign
                </Link>

                <form action={handleLogout}>
                    <button type="submit" className="text-sm text-gray-500 hover:text-(--error) transition">
                        Logout
                    </button>
                </form>
            </div>
        </nav>
    );
}
