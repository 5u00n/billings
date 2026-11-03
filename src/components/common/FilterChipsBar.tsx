import React from 'react';
import { X, RotateCcw } from 'lucide-react';

export interface ActiveFilterChip {
  key: string;
  label: string;
  valueDisplay: string;
  onRemove: () => void;
}

interface FilterChipsBarProps {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
  filteredCount: number;
  totalCount: number;
  className?: string;
  itemNoun?: string;
}

export const FilterChipsBar: React.FC<FilterChipsBarProps> = ({
  chips,
  onClearAll,
  filteredCount,
  totalCount,
  className = '',
  itemNoun = 'entries',
}) => {
  const hasActiveFilters = chips.length > 0;

  if (!hasActiveFilters && filteredCount === totalCount) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 ${className}`}
    >
      {/* Left: Active Chips list */}
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
          Active:
        </span>

        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 transition-colors"
          >
            <span className="font-semibold text-blue-800 dark:text-blue-200">{chip.label}:</span>
            <span className="truncate max-w-[140px]">{chip.valueDisplay}</span>
            <button
              type="button"
              onClick={chip.onRemove}
              className="p-0.5 rounded-full hover:bg-blue-200/70 dark:hover:bg-blue-900/70 text-blue-600 dark:text-blue-300 cursor-pointer"
              title={`Remove ${chip.label} filter`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset all
          </button>
        )}
      </div>

      {/* Right: Results counter */}
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
        Showing <span className="font-bold text-slate-900 dark:text-white">{filteredCount}</span> of{' '}
        <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> {itemNoun}
      </div>
    </div>
  );
};

