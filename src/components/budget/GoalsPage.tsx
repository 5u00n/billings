import React, { useState, useEffect } from 'react';
import { FinancialGoal } from '../../types';
import { GoalsTrackerView } from './GoalsTrackerView';
import { Target, Plus } from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/budget/goals');
      const data = await res.json();
      setGoals(data || []);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Financial Goals & Asset Milestones
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track target asset milestones (Dad GPU, iPad Pro, Touring Bike, Land) with savings percentage allocations.
            </p>
          </div>
        </div>
      </div>

      {/* Goals Tracker View */}
      <GoalsTrackerView
        goals={goals}
        onRefresh={loadGoals}
      />
    </div>
  );
};
