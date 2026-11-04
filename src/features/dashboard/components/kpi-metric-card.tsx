import React from 'react';
import { CardSpotlight } from '@/components/aceternity/card-spotlight';
import { cn } from '@/lib/utils';

export interface KpiMetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  iconContainerClassName?: string;
  valueClassName?: string;
  spotlightColor?: string;
  hoverBorderClassName?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const KpiMetricCard: React.FC<KpiMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconContainerClassName = 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
  valueClassName = 'text-slate-900 dark:text-white',
  spotlightColor = 'rgba(59, 130, 246, 0.15)',
  hoverBorderClassName = 'hover:border-blue-300 dark:hover:border-blue-700',
  onClick,
  className,
  children,
}) => {
  return (
    <CardSpotlight
      onClick={onClick}
      color={spotlightColor}
      className={cn(
        'p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all shadow-2xs group flex flex-col justify-between min-h-[120px]',
        onClick ? 'cursor-pointer' : '',
        hoverBorderClassName,
        className
      )}
    >
      {children ?? (
        <>
          <div className="relative z-10 flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {title}
            </span>
            {icon && (
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  iconContainerClassName
                )}
              >
                {icon}
              </div>
            )}
          </div>
          <div className="relative z-10">
            <div className={cn('text-xl font-bold font-mono tracking-tight', valueClassName)}>
              {value}
            </div>
            {subtitle && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {subtitle}
              </div>
            )}
          </div>
        </>
      )}
    </CardSpotlight>
  );
};

export default KpiMetricCard;

