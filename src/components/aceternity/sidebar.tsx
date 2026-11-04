import React, { useState, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Links {
  label: string;
  href?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  badge?: React.ReactNode;
  active?: boolean;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar className={props.className}>
        {props.children as React.ReactNode}
      </MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        'h-screen px-3 py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 w-[270px] shrink-0 border-r border-neutral-200 dark:border-neutral-800 select-none no-print transition-colors duration-200',
        className
      )}
      animate={{
        width: animate ? (open ? '270px' : '68px') : '270px',
      }}
      transition={{
        duration: 0.25,
        ease: 'easeInOut',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const { open, setOpen } = useSidebar();
  return (
    <div className="md:hidden">
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className={cn(
                'fixed top-0 bottom-0 left-0 w-72 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 p-4 z-50 flex flex-col justify-between border-r border-neutral-200 dark:border-neutral-800 select-none shadow-2xl',
                className
              )}
            >
              <div
                className="absolute right-3 top-3 z-50 text-neutral-600 dark:text-neutral-400 cursor-pointer p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => setOpen(false)}
              >
                <X className="w-5 h-5" />
              </div>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  [key: string]: any;
}) => {
  const { open, animate } = useSidebar();
  return (
    <button
      type="button"
      onClick={link.onClick}
      className={cn(
        'w-full flex items-center justify-start gap-3 group/sidebar py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer relative',
        link.active
          ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50',
        !open && 'md:justify-center md:px-0',
        className
      )}
      title={!open ? link.label : undefined}
      {...props}
    >
      <div className="shrink-0 transition-transform duration-150 group-hover/sidebar:scale-105">
        {link.icon}
      </div>

      <motion.span
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.15 }}
        className="text-neutral-700 dark:text-neutral-200 text-xs group-hover/sidebar:translate-x-0.5 transition duration-150 whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left"
      >
        {link.label}
      </motion.span>

      {open && link.badge && (
        <div className="shrink-0 ml-auto">
          {link.badge}
        </div>
      )}

      {!open && link.badge && (
        <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-blue-500 absolute right-2 top-2" />
      )}
    </button>
  );
};
