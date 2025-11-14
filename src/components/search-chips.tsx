export function SearchChips() {
  const chips = ["Your Skill", "Programmer", "Software Engineer", "Photographer", "Digital Marketing"];
  return (
    <div className="flex flex-wrap gap-3">
      {chips.map((c) => (
        <span
          key={c}
          className="rounded-full border bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm dark:bg-neutral-900 dark:text-neutral-200"
        >
          {c}
        </span>
      ))}
    </div>
  );
}
