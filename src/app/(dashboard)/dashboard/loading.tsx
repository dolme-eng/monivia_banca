export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
        <p className="text-sm text-slate-400 font-black">Caricamento...</p>
      </div>
    </div>
  );
}
