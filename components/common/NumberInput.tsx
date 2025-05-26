
import React from 'react';
import { BRAND_COLORS } from '../../constants';

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({ label, name, className, ...props }) => {
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
        {...props}
      />
    </div>
  );
};
    