export default function LedgerRowSkeleton() {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm animate-pulse">
      <div className="flex items-center gap-5">
        {/* Icon circle */}
        <div className="size-12 rounded-full bg-slate-100"></div>
        <div>
          {/* Title and badge */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 bg-slate-200 rounded w-32"></div>
            <div className="h-4 bg-slate-100 rounded-full w-12"></div>
          </div>
          {/* Date */}
          <div className="h-3 bg-slate-100 rounded w-24"></div>
        </div>
      </div>
      {/* Amount */}
      <div className="text-left">
        <div className="h-6 bg-slate-200 rounded w-20 mb-1"></div>
        <div className="h-3 bg-slate-100 rounded w-8"></div>
      </div>
    </div>
  );
}
