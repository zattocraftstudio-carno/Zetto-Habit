import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-8',
  }[padding];

  return (
    <div
      className={`rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] ${paddingClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
