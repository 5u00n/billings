import React from 'react';
import { cn } from '@/lib/utils';

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        'grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  children,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        'row-span-1 rounded-2xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-slate-900 dark:border-white/[0.1] bg-white border border-slate-200/80 justify-between flex flex-col space-y-4',
        className
      )}
    >
      {header}
      {children}
      {(title || description || icon) && (
        <div className="group-hover/bento:translate-x-1 transition duration-200">
          {icon}
          {title && (
            <div className="font-bold text-slate-700 dark:text-slate-200 mb-1 mt-2 text-sm">
              {title}
            </div>
          )}
          {description && (
            <div className="font-normal text-slate-500 text-xs dark:text-slate-400">
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

