export default function PassportLoading() {
  return (
    <div className="animate-pulse space-y-5 pt-2" aria-busy="true" aria-label="Loading passport">
      <div className="h-3 w-24 rounded-full bg-sky-100" />
      <div className="h-8 w-48 rounded-full bg-sky-100" />
      <div className="h-4 w-56 rounded-full bg-sky-100" />
      <div className="h-24 rounded-lg bg-sky-50" />
      <div className="flex gap-4 pt-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="stamp-md rounded-full bg-sky-100" />
        ))}
      </div>
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 rounded-lg bg-surface shadow-soft" />
        ))}
      </div>
    </div>
  );
}
