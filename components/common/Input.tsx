
import React from 'react';
import { BRAND_COLORS } from '../../constants';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  name: string;
  type?: string;
  rows?: number; // For textarea
}

export const Input: React.FC<InputProps> = ({ label, name, type = 'text', rows, className, ...props }) => {
  const commonStyles = `w-full p-2 bg-light-highlight border border-secondary-text rounded-md text-text-white focus:border-accent-green focus:ring-1 focus:ring-accent-green placeholder-secondary-text text-sm transition-colors`;
  
  return (
    <div className="w-full">
      <label htmlFor={name} className="block text-xs font-medium text-secondary-text mb-1">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          rows={rows || 3}
          className={`${commonStyles} ${className || ''}`}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          className={`${commonStyles} ${className || ''}`}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
    </div>
  );
};
    