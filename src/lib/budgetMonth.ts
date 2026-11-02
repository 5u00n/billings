import { useEffect, useRef, useState } from 'react';

/** Use the device's calendar month, including around local midnight. */
export function getCurrentBudgetMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function includeCurrentBudgetMonth(months: unknown): string[] {
  const validMonths = Array.isArray(months)
    ? months.filter((month): month is string => typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    : [];
  return Array.from(new Set([...validMonths, getCurrentBudgetMonth()])).sort().reverse();
}

/** Follow month rollover while preserving a selected historical month or lifetime view. */
export function useBudgetMonth() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentBudgetMonth);
  const lastCurrentMonth = useRef(getCurrentBudgetMonth());

  useEffect(() => {
    const checkMonth = () => {
      const currentMonth = getCurrentBudgetMonth();
      const previousMonth = lastCurrentMonth.current;
      if (currentMonth !== previousMonth) {
        lastCurrentMonth.current = currentMonth;
        setSelectedMonth((selected) => selected === previousMonth ? currentMonth : selected);
      }
    };
    const timer = window.setInterval(checkMonth, 60_000);
    window.addEventListener('focus', checkMonth);
    document.addEventListener('visibilitychange', checkMonth);
    checkMonth();
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', checkMonth);
      document.removeEventListener('visibilitychange', checkMonth);
    };
  }, []);

  return [selectedMonth, setSelectedMonth] as const;
}
