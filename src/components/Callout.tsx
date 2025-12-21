import { ReactNode } from 'react';
import { FiInfo, FiAlertCircle, FiCheckCircle, FiXCircle, FiAlertTriangle, FiZap, FiHelpCircle } from 'react-icons/fi';

interface CalloutProps {
  type: string;
  title?: string | null;
  children: ReactNode;
}

const calloutConfig: Record<string, { icon: any; bgColor: string; borderColor: string; textColor: string; titleColor: string }> = {
  note: {
    icon: FiInfo,
    bgColor: 'color-mix(in srgb, var(--theme-accent) 10%, transparent)',
    borderColor: 'var(--theme-accent)',
    textColor: 'var(--theme-text-primary)',
    titleColor: 'var(--theme-accent)',
  },
  info: {
    icon: FiInfo,
    bgColor: 'color-mix(in srgb, #3b82f6 10%, transparent)',
    borderColor: '#3b82f6',
    textColor: 'var(--theme-text-primary)',
    titleColor: '#3b82f6',
  },
  tip: {
    icon: FiZap,
    bgColor: 'color-mix(in srgb, #10b981 10%, transparent)',
    borderColor: '#10b981',
    textColor: 'var(--theme-text-primary)',
    titleColor: '#10b981',
  },
  success: {
    icon: FiCheckCircle,
    bgColor: 'color-mix(in srgb, #10b981 10%, transparent)',
    borderColor: '#10b981',
    textColor: 'var(--theme-text-primary)',
    titleColor: '#10b981',
  },
  warning: {
    icon: FiAlertTriangle,
    bgColor: 'color-mix(in srgb, #f59e0b 10%, transparent)',
    borderColor: '#f59e0b',
    textColor: 'var(--theme-text-primary)',
    titleColor: '#f59e0b',
  },
  danger: {
    icon: FiXCircle,
    bgColor: 'color-mix(in srgb, #ef4444 10%, transparent)',
    borderColor: '#ef4444',
    textColor: 'var(--theme-text-primary)',
    titleColor: '#ef4444',
  },
  error: {
    icon: FiXCircle,
    bgColor: 'color-mix(in srgb, #ef4444 10%, transparent)',
    borderColor: '#ef4444',
    textColor: 'var(--theme-text-primary)',
    titleColor: '#ef4444',
  },
  important: {
    icon: FiZap,
    bgColor: 'color-mix(in srgb, #8b5cf6 10%, transparent)',
    borderColor: '#8b5cf6',
    textColor: 'var(--theme-text-primary)',
    titleColor: '#8b5cf6',
  },
  question: {
    icon: FiHelpCircle,
    bgColor: 'color-mix(in srgb, #6366f1 10%, transparent)',
    borderColor: '#6366f1',
    textColor: 'var(--theme-text-primary)',
    titleColor: '#6366f1',
  },
};

export function Callout({ type, title, children }: CalloutProps) {
  const config = calloutConfig[type.toLowerCase()] || calloutConfig.note;
  const Icon = config.icon;
  
  return (
    <div
      className="my-4 rounded-lg border-l-4 p-4"
      style={{
        backgroundColor: config.bgColor,
        borderLeftColor: config.borderColor,
        color: config.textColor,
      }}
    >
      <div className="flex items-start gap-3">
        <Icon
          className="mt-0.5 flex-shrink-0"
          style={{ color: config.borderColor }}
          size={20}
        />
        <div className="flex-1 min-w-0">
          {title && (
            <div
              className="font-semibold mb-2"
              style={{ color: config.titleColor }}
            >
              {title}
            </div>
          )}
          <div className="callout-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

