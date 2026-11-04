import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface DistinctFilterOption {
  value: string;
  label: string;
  count?: number;
  badge?: string;
}

interface DistinctDropdownFilterProps {
  label: string;
  icon?: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  options: DistinctFilterOption[];
  allLabel?: string;
  className?: string;
  align?: 'left' | 'right';
}

export const DistinctDropdownFilter: React.FC<DistinctDropdownFilterProps> = ({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  allLabel,
  className = '',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isFiltered = value !== 'all' && value !== '';
  const currentOption = options.find((o) => o.value === value);
  const displayLabel = isFiltered
    ? currentOption
      ? currentOption.label
      : value
    : allLabel || `All ${label}s`;

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && options.length > 5) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen, options.length]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('all');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none',
            isFiltered
              ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold'
              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60',
            className
          )}
          title={`${label}: ${displayLabel}`}
        >
          {Icon && (
            <Icon
              className={cn(
                'w-3.5 h-3.5 shrink-0',
                isFiltered
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            />
          )}
          <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mr-0.5">
            {label}:
          </span>
          <span className="truncate max-w-[120px]">{displayLabel}</span>

          {isFiltered ? (
            <span
              onClick={handleClear}
              className="p-0.5 ml-0.5 rounded-full hover:bg-blue-200/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 transition-colors"
              title="Clear filter"
            >
              <X className="w-3 h-3" />
            </span>
          ) : (
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-slate-400 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align === 'right' ? 'end' : 'start'}
        className="w-64 p-0 shadow-lg"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <span>Filter by {label}</span>
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelect('all')}
              className="h-auto p-0 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer lowercase text-[11px] font-medium"
            >
              reset
            </Button>
          )}
        </div>

        {/* Quick Search if more than 5 options */}
        {options.length > 5 && (
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-2.5 h-8 text-xs bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
        )}

        {/* Options list */}
        <div className="max-h-56 overflow-y-auto py-1">
          {/* "All" default option */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleSelect('all')}
            className={cn(
              'w-full px-3 py-1.5 h-auto text-left justify-between hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer text-xs font-normal rounded-none',
              !isFiltered &&
                'bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold'
            )}
          >
            <span className="truncate">{allLabel || `All ${label}s`}</span>
            {!isFiltered && (
              <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
          </Button>

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-center text-slate-400 text-xs italic">
              No matching {label.toLowerCase()} options
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <Button
                  key={opt.value}
                  type="button"
                  variant="ghost"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full px-3 py-1.5 h-auto text-left justify-between hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer text-xs font-normal rounded-none',
                    isSelected &&
                      'bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold'
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <span className="truncate">{opt.label}</span>
                    {opt.badge && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1 py-0 h-4 shrink-0 font-normal"
                      >
                        {opt.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.count !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {opt.count}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                </Button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
