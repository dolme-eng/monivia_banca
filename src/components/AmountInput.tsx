'use client';

import { useState, useRef, useCallback } from 'react';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  error?: string;
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
          isFocused ? 'text-secondary' : 'text-slate-400'
        }`}>
          {currency}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent text-2xl sm:text-3xl md:text-4xl font-black text-primary text-center outline-none py-4 sm:py-6 placeholder:text-slate-300"
          aria-label="Importo"
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
        <p className="mt-2 text-xs text-slate-400 text-center">
          Usa ↑↓ per regolare di €10
        </p>
      )}
    </div>
  );
}
