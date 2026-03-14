interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export default function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="rounded-full border border-lt-green-200 bg-lt-green-50 px-3 py-1 text-xs font-medium text-lt-green-700 transition hover:bg-lt-green-100 hover:border-lt-green-400 cursor-pointer"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
