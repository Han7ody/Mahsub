export default function ProfileTransactionRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 animate-pulse">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-16"></div>
    </div>
  );
}
