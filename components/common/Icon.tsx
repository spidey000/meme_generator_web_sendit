
import React from 'react';

interface IconProps {
  path: string; // SVG path data
  className?: string;
  viewBox?: string;
  strokeWidth?: number;
  fill?: string;
  stroke?: string;
}

export const Icon: React.FC<IconProps> = ({ 
  path, 
  className = 'w-5 h-5', 
  viewBox = '0 0 20 20', 
  strokeWidth = 1.5,
  fill = "none",
  stroke = "currentColor" 
}) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox={viewBox} 
    className={className}
    fill={fill === "currentColor" ? "currentColor" : fill}
    stroke={stroke === "currentColor" ? "currentColor" : stroke}
    strokeWidth={strokeWidth}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);
    