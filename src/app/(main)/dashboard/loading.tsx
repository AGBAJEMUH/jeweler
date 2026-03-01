export default function DashboardLoading() {
    return (
        <div className="animate-pulse">
            <div className="flex items-center justify-between mb-8">
                <div className="h-10 bg-gray-200 rounded w-48 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-40 mb-4"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-(--card-background) border border-(--border) rounded shadow-sm p-4 h-40">
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3 mt-4"></div>

                        <div className="flex justify-between mt-auto pt-4">
                            <div className="h-6 bg-gray-200 rounded w-20"></div>
                            <div className="h-4 bg-gray-200 rounded w-12 mt-1"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
