
import React from 'react';
import { FontOption } from '../../types'; // Assuming FontOption is a common type for select
import { BRAND_COLORS } from '../../constants';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: FontOption[]; // Make this more generic if needed
}

export const Select: React.FC<SelectProps> = ({ label, name, options, className, ...props }) => {
  return (
    <div className="w-full">
      <label htmlFor={name} className="block text-xs font-medium text-secondary-text mb-1">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className={`w-full p-2.5 bg-light-highlight border border-secondary-text rounded-md text-text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green text-sm appearance-none pr-8 bg-no-repeat bg-right transition-colors ${className || ''}`}
        style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23C4FF00' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundSize: '1.5em 1.5em',
        }}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} style={{backgroundColor: BRAND_COLORS.lightHighlight, color: BRAND_COLORS.textWhite}}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
    