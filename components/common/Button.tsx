
import React from 'react';
import { BRAND_COLORS } from '../../constants';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center justify-center space-x-2';
  
  let variantStyles = '';
  switch (variant) {
    case 'primary':
      variantStyles = `bg-button-green text-brand-black hover:bg-accent-green focus:ring-[${BRAND_COLORS.accentGreen}]`;
      break;
    case 'secondary':
      variantStyles = `bg-light-highlight text-text-white hover:bg-opacity-80 border border-accent-green hover:border-button-green focus:ring-[${BRAND_COLORS.accentGreen}]`;
      break;
    case 'danger':
      variantStyles = `bg-alert-orange text-text-white hover:bg-opacity-80 focus:ring-[${BRAND_COLORS.alertOrange}]`;
      break;
    case 'icon':
      variantStyles = `bg-transparent text-accent-green hover:text-text-white p-1 focus:ring-[${BRAND_COLORS.accentGreen}]`;
      break;
  }

  let sizeStyles = '';
  if (variant !== 'icon') {
    switch (size) {
      case 'sm':
        sizeStyles = 'px-3 py-1.5 text-xs'; // Standard small size
        break;
      case 'md':
        sizeStyles = 'px-4 py-2 text-sm'; // Standard medium size
        break;
      case 'lg':
        sizeStyles = 'px-6 py-3 text-base';
        break;
    }
  } else {
     switch (size) {
      case 'sm': sizeStyles = 'p-1'; break;
      case 'md': sizeStyles = 'p-1.5'; break; // Adjusted icon medium padding slightly
      case 'lg': sizeStyles = 'p-2'; break;  // Adjusted icon large padding slightly
      default: sizeStyles = 'p-1.5';
    }
  }


  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyles} ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {icon && <span className={(variant === 'icon' || !children) ? '' : 'mr-1.5'}>{icon}</span>}
      {variant !== 'icon' || (variant === 'icon' && children) ? children : null}
    </button>
  );
};
