type ChipSelectProps = {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
};

export function ChipSelect({ options, selected, onChange, max }: ChipSelectProps) {
  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((x) => x !== option));
      return;
    }
    if (max !== undefined && selected.length >= max) return;
    onChange([...selected, option]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        const disabled = !active && max !== undefined && selected.length >= max;
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            disabled={disabled}
            className={`rounded-full px-3 py-1.5 text-sm border transition-colors disabled:opacity-40 ${
              active
                ? "border-foreground bg-foreground/10 text-foreground"
                : "border-foreground/30 text-muted hover:border-foreground/50 hover:text-foreground"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
