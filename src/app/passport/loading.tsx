export default function PassportLoading() {
  return (
    <div className="animate-pulse space-y-5 pt-2" aria-busy="true" aria-label="Loading passport">
      <div className="h-3 w-24 rounded-full bg-white/80" />
      <div className="h-8 w-48 rounded-full bg-white/80" />
      <div className="h-4 w-56 rounded-full bg-white/70" />
      <div className="grid grid-cols-4 gap-2 pt-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-14 rounded-2xl bg-white/80" />
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="size-[4.35rem] rounded-full bg-white/80" />
        ))}
      </div>
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 rounded-[1.25rem] bg-white/80" />
        ))}
      </div>
    </div>
  );
}
