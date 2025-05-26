
import React from 'react';

interface ColorInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

export const ColorInput: React.FC<ColorInputProps> = ({ label, name, value, onChange, className, ...restProps }) => {
  return (
    <div className="w-full">
      <label htmlFor={name} className="block text-xs font-medium text-secondary-text mb-1">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <input
          id={name}
          name={name}
          type="color"
          value={value}
          onChange={onChange} // Explicitly pass onChange to the color input
          className={`w-10 h-8 p-0 border-none rounded-md cursor-pointer bg-light-highlight focus:ring-2 focus:ring-accent-green ${className || ''}`}
          style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none'}} // Better cross-browser appearance
          {...restProps} // Pass remaining props to the color input
        />
        <input
            id={name + "-text"}
            name={name}
            type="text"
            value={value}
            onChange={onChange as React.ChangeEventHandler<HTMLInputElement>} // Use the onChange from ColorInputProps
            className={`flex-1 p-2 bg-light-highlight border border-secondary-text rounded-md text-text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green text-sm transition-colors`}
            placeholder="#RRGGBB"
        />
      </div>
    </div>
  );
};
