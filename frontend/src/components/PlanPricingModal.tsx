import React, { useState } from 'react';
import { X, Check, Crown, Zap, Shield, Sparkles } from 'lucide-react';
import { QuotaStatus } from '../types';
import { api } from '../api/client';

interface PlanPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuota: QuotaStatus | null;
  onPlanChanged: (newQuota: QuotaStatus) => void;
}

export const PlanPricingModal: React.FC<PlanPricingModalProps> = ({
  isOpen,
  onClose,
  currentQuota,
  onPlanChanged
}) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPlan = async (planId: string) => {
    try {
      setLoadingPlan(planId);
      const updated = await api.setPlan(planId);
      onPlanChanged(updated);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to change plan');
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free Starter',
      price: '₹0',
      period: 'forever',
      description: 'Ideal for students and everyday users with occasional scanning tasks.',
      allowance: '3 documents / day',
      pageLimit: 'Up to 5 pages per document',
      features: [
        '3 documents per day (resets at midnight IST)',
        'Basic OpenCV image enhancement',
        'Dual-pane online rich-text editor',
        'PDF and TXT clean export',
        'Standard OCR & table recognition',
        'Unlimited access to saved library'
      ],
      badge: 'Current Plan',
      buttonText: 'Current Plan',
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro Professional',
      price: '₹99',
      period: 'per month',
      description: 'For working professionals and small businesses digitizing paperwork.',
      allowance: '30 documents / day',
      pageLimit: 'Up to 20 pages per document',
      features: [
        '30 documents per day',
        'Advanced OCR with handwriting support',
        'Layout-preservation mode',
        'DOCX, PDF, XLSX (tables), and TXT export',
        'AI corrections & typo autofix',
        'Synchronized uncertain word highlighting',
        'Priority queue processing'
      ],
      badge: 'Most Popular',
      buttonText: 'Switch to Pro',
      popular: true
    },
    {
      id: 'plus',
      name: 'Plus Enterprise',
      price: '₹199',
      period: 'per month',
      description: 'Maximum volume for intensive administrative and accounting operations.',
      allowance: '100 documents / day',
      pageLimit: 'Up to 50 pages per document',
      features: [
        '100 documents per day',
        'Batch multi-document processing',
        'Grounded AI Q&A with citations',
        'Bilingual translation (Hindi ⇄ English)',
        'Form-field key-value extraction',
        'Highest priority dedicated pipeline',
        'Audit logs & retention configuration'
      ],
      badge: 'Power Users',
      buttonText: 'Switch to Plus',
      popular: false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 p-6 sm:p-8 my-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Plans & Pricing
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Daily allowances reset at midnight Indian Standard Time (IST). Even after quota limits, your saved documents and online editor remain fully accessible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = currentQuota?.plan_id === p.id;
            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between rounded-xl border p-6 transition-all ${
                  p.popular
                    ? 'border-[#00a651] bg-emerald-50/10 shadow-md ring-1 ring-[#00a651]'
                    : isCurrent
                    ? 'border-slate-300 bg-slate-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00a651] px-3 py-0.5 text-[11px] font-semibold text-white shadow-2xs">
                    {p.badge}
                  </div>
                )}
                {isCurrent && !p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 px-3 py-0.5 text-[11px] font-semibold text-white shadow-2xs">
                    Current Plan
                  </div>
                )}

                <div>
                  <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 min-h-[36px]">{p.description}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900">{p.price}</span>
                    <span className="text-xs text-slate-500">/{p.period}</span>
                  </div>

                  <div className="mt-3 rounded-md bg-slate-50 border border-slate-100 p-2 text-xs text-slate-700 space-y-0.5">
                    <div className="font-semibold text-slate-900">{p.allowance}</div>
                    <div className="text-[11px] text-slate-500">{p.pageLimit}</div>
                  </div>

                  <ul className="mt-5 space-y-2 text-xs text-slate-600">
                    {p.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 shrink-0 text-[#00a651] mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    disabled={isCurrent || loadingPlan !== null}
                    onClick={() => handleSelectPlan(p.id)}
                    className={`w-full rounded-md py-2.5 text-xs font-semibold shadow-xs transition-all ${
                      isCurrent
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : p.popular
                        ? 'bg-[#00a651] text-white hover:bg-[#008f45]'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {isCurrent ? 'Active Plan' : loadingPlan === p.id ? 'Updating...' : p.buttonText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Quota check is enforced strictly on the server before billable processing begins. Retries use idempotency keys to avoid duplicate deductions.
        </div>
      </div>
    </div>
  );
};
