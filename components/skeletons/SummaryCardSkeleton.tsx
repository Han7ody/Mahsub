export function SummaryCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-5 border border-gray-100 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-32"></div>
      </div>
    </div>
  );
}
