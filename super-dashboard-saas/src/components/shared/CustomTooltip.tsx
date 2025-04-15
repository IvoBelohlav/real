'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility exists for class names

interface CustomTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode | string;
  className?: string;
  contentClassName?: string;
  position?: 'top' | 'bottom' | 'left' | 'right'; // Optional positioning
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  children,
  content,
  className,
  contentClassName,
  position = 'top', // Default to top
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)} // Show on focus for accessibility
      onBlur={() => setIsVisible(false)}  // Hide on blur for accessibility
      tabIndex={0} // Make it focusable if the child isn't naturally focusable
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-md shadow-sm whitespace-nowrap',
            'opacity-100 transition-opacity duration-150', // Basic styling, adjust as needed
            positionClasses[position],
            contentClassName
          )}
        >
          {content}
          {/* Optional: Add an arrow/pointer if desired */}
          {/* <div className="absolute ..."></div> */}
        </div>
      )}
    </div>
  );
};

export default CustomTooltip;
