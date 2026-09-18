export default function LoadingNews() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 animate-pulse">
      <div className="h-8 w-64 bg-rule mb-2" />
      <div className="h-4 w-96 max-w-full bg-rule mb-6" />
      <div className="h-10 w-full bg-rule mb-6" />
      <ul className="divide-y divide-rule">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="py-4">
            <div className="h-5 w-3/4 bg-rule mb-2" />
            <div className="h-4 w-full bg-rule mb-1" />
            <div className="h-3 w-1/3 bg-rule" />
          </li>
        ))}
      </ul>
    </div>
  );
}
