import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const HoverEffect = ({
  items,
  className,
}: {
  items: {
    title: string;
    description: string;
    link?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
  }[];
  className?: string;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-4 gap-4',
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={item?.title || idx}
          className="relative group block p-2 h-full w-full cursor-pointer"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={item.onClick}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-blue-100/60 dark:bg-slate-800/[0.8] block rounded-2xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <div className="rounded-xl h-full w-full p-4 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative z-20 group-hover:border-blue-500/40 transition duration-300">
            <div className="flex items-center gap-3">
              {item.icon && <div className="text-blue-600 dark:text-blue-400">{item.icon}</div>}
              <h4 className="text-slate-900 dark:text-white font-bold tracking-wide text-sm">
                {item.title}
              </h4>
            </div>
            <p className="mt-2 text-slate-500 dark:text-slate-400 tracking-wide leading-relaxed text-xs">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

