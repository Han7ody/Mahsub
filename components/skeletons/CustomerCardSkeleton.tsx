import { SkeletonText } from "@/components/ui/skeleton-text";

export default function CustomerCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-5 border border-gray-100 animate-pulse">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="h-5 bg-gray-200 rounded w-28"></div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}
