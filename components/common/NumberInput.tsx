import React from 'react';
import { BRAND_COLORS } from '../../constants';

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  /**
   * When set to "range", renders a slider while preserving the same props/signature.
   * Defaults to "number" (classic numeric input).
   */
  mode?: 'number' | 'range';
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  name,
  className,
  mode = 'number',
  value,
  ...props
}) => {
  const isRange = mode === 'range';

  if (isRange) {
    // Slider variant with read-only value label for precision feedback
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={name} className="block text-xs font-medium text-secondary-text">
            {label}
          </label>
          <span className="text-xs text-secondary-text" aria-live="polite">
            {typeof value === 'number' ? value : value ?? ''}
          </span>
        </div>
        <input
          id={name}
          name={name}
          type="range"
          className={`w-full accent-accent-green bg-transparent [&::-webkit-slider-runnable-track]:bg-light-highlight [&::-moz-range-track]:bg-light-highlight [&::-webkit-slider-thumb]:bg-accent-green ${className || ''}`}
          value={value as any}
          {...props}
        />
      </div>
    );
  }

  // Default numeric input
  return (
    <div className="w-full">
      <label htmlFor={name} className="block text-xs font-medium text-secondary-text mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        className={`w-full p-2 bg-light-highlight border border-secondary-text rounded-md text-text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green text-sm transition-colors ${className || ''}`}
        value={value as any}
        {...props}
      />
    </div>
  );
};
    