export default function EntityRowSkeleton() {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm animate-pulse">
      <div className="flex items-center gap-4">
        {/* Avatar circle */}
        <div className="size-12 rounded-full bg-slate-100"></div>
        <div>
          {/* Name and badge */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 bg-slate-200 rounded w-32"></div>
            <div className="h-4 bg-slate-100 rounded-full w-12"></div>
          </div>
          {/* Phone */}
          <div className="h-3 bg-slate-100 rounded w-24"></div>
        </div>
      </div>
      {/* Amount or Actions */}
      <div className="text-left flex flex-col items-end gap-1">
        <div className="h-6 bg-slate-200 rounded w-20"></div>
        <div className="h-3 bg-slate-100 rounded w-10"></div>
      </div>
    </div>
  );
}
