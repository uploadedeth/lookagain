'use client'

import React from 'react';
import { QuotaStatus } from '../lib/quotas';

interface QuotaDisplayProps {
  quota: QuotaStatus;
  label?: string;
  showProgressBar?: boolean;
  className?: string;
}

const QuotaDisplay: React.FC<QuotaDisplayProps> = ({ 
  quota, 
  label = 'Games Created',
  showProgressBar = true,
  className = ''
}) => {
  const isNearLimit = quota.percentage >= 80;
  const isAtLimit = quota.remaining === 0;
  
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[#9aa0a6]">{label}</span>
        <span className={`text-sm font-medium ${
          isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-[#e3e3e3]'
        }`}>
          {quota.used} / {quota.limit}
        </span>
      </div>
      
      {showProgressBar && (
        <div className="w-full bg-[#262628] rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-[#fbbf24]'
            }`}
            style={{ width: `${quota.percentage}%` }}
          />
        </div>
      )}
      
      {isAtLimit && (
        <p className="text-xs text-red-400 mt-1">
          Quota limit reached
        </p>
      )}
    </div>
  );
};

export default QuotaDisplay;
