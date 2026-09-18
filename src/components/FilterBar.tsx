import type { ReactNode } from "react";
import { Search } from "lucide-react";

interface FilterBarProps {
  children: ReactNode;
  onReset?: () => void;
  resetDisabled?: boolean;
  summary?: ReactNode;
}

export function FilterBar({
  children,
  onReset,
  resetDisabled = false,
  summary,
}: FilterBarProps) {
  return (
    <section className="filters" aria-label="Filters">
      <div className="filters__controls">{children}</div>
      <div className="filters__meta">
        {summary ? <p className="filters__count">{summary}</p> : null}
        {onReset ? (
          <button
            type="button"
            className="button button--quiet"
            onClick={onReset}
            disabled={resetDisabled}
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </section>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: FilterSelectProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="field__control"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FilterSearchProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FilterSearch({
  id,
  label,
  value,
  onChange,
  placeholder,
}: FilterSearchProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__wrap">
        <Search className="field__icon" size={14} aria-hidden="true" />
        <input
          id={id}
          type="search"
          className="field__control field__control--with-icon"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
