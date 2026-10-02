'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  error?: string;
  /**
   * Makes the visible <label htmlFor> actually bind to this input. Without an
   * id the label is decorative and the field is only named by aria-label, which
   * breaks WCAG 2.5.3 (Label in Name) when the visible wording differs.
   */
  id?: string;
}

export default function AmountInput({
  value,
  onChange,
  currency = '€',
  placeholder = '0,00',
  disabled = false,
  min = 0,
  max,
  error,
  id,
}: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? formatAmount(value) : ''
  );
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function formatAmount(num: number): string {
    return num.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // `displayValue` used to be seeded once at mount and never resynchronised, so
  // any external change to `value` — the quick-amount buttons, the reset to 0
  // after a successful submission, the account switcher — left the input
  // showing a stale number (or nothing at all) while the real value had changed.
  // This keeps the field in step with its own state.
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (value === lastExternalValue.current) return;
    lastExternalValue.current = value;
    if (isFocused) return; // do not overwrite what the user is currently typing
    setDisplayValue(value > 0 ? formatAmount(value) : '');
  }, [value, isFocused]);

  function parseAmount(str: string): number {
    const cleaned = str.replace(/[^\d,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^\d,]/g, '');

    if (cleaned === '' || cleaned === ',') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const parts = cleaned.split(',');
    if (parts.length > 2) return;

    if (parts[1] && parts[1].length > 2) return;

    setDisplayValue(cleaned);
    onChange(parseAmount(cleaned));
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (value > 0) {
      setDisplayValue(formatAmount(value));
    }
  }, [value]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (value > 0) {
      const raw = value.toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setDisplayValue(raw);
    }
    inputRef.current?.select();
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const step = 10;
      const newVal = Math.min(max ?? Infinity, value + step);
      onChange(newVal);
      setDisplayValue(formatAmount(newVal));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const step = 10;
      const newVal = Math.max(min, value - step);
      onChange(newVal);
      setDisplayValue(formatAmount(newVal));
    }
  }, [value, min, max, onChange]);

  return (
    <div className="relative">
      {/* Screen-reader readout of the current value (ArrowUp/Down give no feedback otherwise) */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {formatAmount(value)} euro
      </span>
      <div
        className={`relative flex items-center justify-center rounded-2xl border-2 transition-all duration-200 ${
          error
            ? 'border-red-400 bg-red-50'
            : isFocused
            ? 'border-secondary bg-white shadow-lg shadow-secondary/10'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <span className={`text-xl sm:text-2xl font-black mr-2 transition-colors ${
          isFocused ? 'text-secondary-text' : 'text-slate-600'
        }`}>
          {currency}
        </span>
        <input
          ref={inputRef}
          id={id}
          name={id}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent text-2xl sm:text-3xl md:text-4xl font-black text-primary text-center outline-none py-4 sm:py-6 placeholder:text-slate-600"
          aria-label={id ? undefined : 'Importo'}
          aria-invalid={!!error}
          aria-describedby={error ? 'amount-error' : undefined}
        />
      </div>
      {error && (
        <p id="amount-error" className="mt-2 text-sm text-red-500 text-center font-black" role="alert">
          {error}
        </p>
      )}
      {isFocused && !error && (
        <p className="mt-2 text-xs text-slate-600 text-center">
          Usa ↑↓ per regolare di €10
        </p>
      )}
    </div>
  );
}
