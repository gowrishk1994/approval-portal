import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface FeedbackBannerProps {
  kind: 'error' | 'success';
  message: string;
  onDismiss: () => void;
}

export function FeedbackBanner({ kind, message, onDismiss }: FeedbackBannerProps) {
  const Icon = kind === 'error' ? AlertCircle : CheckCircle2;
  return (
    <div className={`feedback-banner feedback-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" className="icon-button" onClick={onDismiss} aria-label="Dismiss message"><X size={16} /></button>
    </div>
  );
}
