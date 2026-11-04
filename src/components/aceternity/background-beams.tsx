import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const BackgroundBeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]',
        className
      )}
    >
      <svg
        className="absolute w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        fill="none"
      >
        <motion.path
          d="M -100 200 C 300 100, 700 600, 1500 400"
          stroke="url(#gradient-1)"
          strokeWidth="1.5"
          strokeOpacity="0.4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse' }}
        />
        <motion.path
          d="M -100 600 C 400 800, 900 200, 1500 700"
          stroke="url(#gradient-2)"
          strokeWidth="1.5"
          strokeOpacity="0.4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 5, repeat: Infinity, repeatType: 'reverse', delay: 1 }}
        />
        <motion.path
          d="M 200 -100 C 500 400, 700 700, 1100 1000"
          stroke="url(#gradient-1)"
          strokeWidth="1.5"
          strokeOpacity="0.3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 6, repeat: Infinity, repeatType: 'reverse', delay: 2 }}
        />
        <defs>
          <linearGradient id="gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

