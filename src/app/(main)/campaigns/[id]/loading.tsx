export default function CampaignLoading() {
  return (
    <div className="pb-20 animate-pulse">
      <div className="mb-8 border-b border-(--border) pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="w-full">
          <div className="h-10 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-40"></div>
      </div>

      <div className="mb-12 bg-(--card-background) p-4 rounded border border-(--border) shadow-sm">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4 mx-auto"></div>
        <div className="w-full aspect-video bg-gray-200 rounded"></div>
      </div>

      <div>
        <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-(--card-background) border border-(--border) rounded flex flex-col h-[500px]">
              <div className="aspect-square bg-gray-200 w-full"></div>
              <div className="p-4 flex-1 flex flex-col gap-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
                <div className="flex-1 bg-gray-200 rounded w-full"></div>
                <div className="h-10 bg-gray-200 rounded w-full mt-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
