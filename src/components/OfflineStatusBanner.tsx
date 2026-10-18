import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

interface OfflineStatusBannerProps {
  onSync?: () => void;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({ onSync }) => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showReconnected, setShowReconnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      if (onSync) onSync();

      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onSync]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
      if (res.ok) {
        setIsOnline(true);
        setShowReconnected(true);
        if (onSync) onSync();
        setTimeout(() => setShowReconnected(false), 4000);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div className="bg-emerald-600 text-white text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-2 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2">
        <Wifi className="w-3.5 h-3.5" />
        <span>Connected — Back online and synchronized with Cloudflare!</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/90 dark:bg-amber-600/95 text-slate-950 dark:text-white text-xs font-medium py-1.5 px-4 flex items-center justify-between shadow-xs border-b border-amber-600/20 backdrop-blur-sm transition-all duration-300">
      <div className="flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 text-slate-950 dark:text-amber-100 shrink-0 animate-pulse" />
        <span>
          <strong className="font-bold">Offline Mode Active</strong> — Serving instant responses from local cache.
        </span>
      </div>
      <button
        onClick={handleManualCheck}
        disabled={isChecking}
        className="flex items-center gap-1.5 bg-slate-900/10 hover:bg-slate-900/20 dark:bg-black/20 dark:hover:bg-black/30 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
        title="Check connection and refresh"
      >
        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
        <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
      </button>
    </div>
  );
};
