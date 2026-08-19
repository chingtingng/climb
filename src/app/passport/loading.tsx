export default function PassportLoading() {
  return (
    <div className="animate-pulse space-y-5 pt-2" aria-busy="true" aria-label="Loading passport">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2.5">
          <div className="h-3 w-20 rounded-full bg-white/85" />
          <div className="h-7 w-44 rounded-full bg-white/85" />
          <div className="h-3.5 w-52 rounded-full bg-white/70" />
        </div>
        <div className="size-14 rounded-full bg-white/85" />
      </div>
      <div className="h-[5.5rem] rounded-[1.35rem] bg-white/85" />
      <div className="flex gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="size-[4.5rem] rounded-full bg-white/85" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[4.25rem] rounded-[1.35rem] bg-white/85" />
        ))}
      </div>
    </div>
  );
}
