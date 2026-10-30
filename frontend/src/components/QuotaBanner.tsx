import React from 'react';
import { AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { QuotaStatus } from '../types';

interface QuotaBannerProps {
  quota: QuotaStatus | null;
  onOpenPricing: () => void;
}

export const QuotaBanner: React.FC<QuotaBannerProps> = ({ quota, onOpenPricing }) => {
  if (!quota) return null;

  if (quota.remaining_today === 0) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Daily processing limit reached ({quota.daily_limit}/{quota.daily_limit}).</strong> You can still edit, verify, and export all existing documents. Limit resets at midnight IST ({quota.resets_at_ist}).
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
