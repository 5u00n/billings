import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'emerald';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-blue-600 text-white shadow-xs hover:bg-blue-700 active:scale-[0.98]',
      destructive: 'bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:scale-[0.98]',
      outline: 'border border-slate-200 bg-white shadow-2xs hover:bg-slate-100 hover:text-slate-900',
      secondary: 'bg-slate-100 text-slate-900 shadow-2xs hover:bg-slate-200/80',
      ghost: 'hover:bg-slate-100 hover:text-slate-900',
      link: 'text-blue-600 underline-offset-4 hover:underline',
      emerald: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98]',
    };

    const sizes = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-md px-8',
      icon: 'h-8 w-8',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
