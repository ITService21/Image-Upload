import { LuLoaderCircle, LuCircleCheck, LuCircleX, LuClock, LuRotateCw } from 'react-icons/lu';

interface Props {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount?: number;
  onRetry?: () => void;
}

export default function StatusBadge({ status, retryCount = 0, onRetry }: Props) {
  switch (status) {
    case 'pending':
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" />
          Processing
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <LuCircleCheck className="h-3.5 w-3.5" />
          Completed
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
            <LuCircleX className="h-3.5 w-3.5" />
            Failed
          </span>
          {onRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <LuRotateCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </span>
      );
  }
}
