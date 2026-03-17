import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setStatusFilter } from '../../store/mediaSlice';
import { useMediaStats } from '../../hooks/useMedia';
import { StatusFilter } from '../../types';
import { LuLayers, LuClock, LuCircleCheck, LuCircleX } from 'react-icons/lu';

export default function StatsBar() {
  const dispatch = useDispatch();
  const { statusFilter, companyFilter } = useSelector((state: RootState) => state.media);
  const { data: stats } = useMediaStats(companyFilter ?? undefined);

  const items: { key: StatusFilter; label: string; count: number; icon: typeof LuLayers; color: string; activeColor: string }[] = [
    { key: 'all', label: 'All', count: stats?.total || 0, icon: LuLayers, color: 'text-gray-500', activeColor: 'bg-indigo-600 text-white' },
    { key: 'pending', label: 'Pending', count: (stats?.pending || 0) + (stats?.processing || 0), icon: LuClock, color: 'text-amber-600', activeColor: 'bg-amber-500 text-white' },
    { key: 'completed', label: 'Completed', count: stats?.completed || 0, icon: LuCircleCheck, color: 'text-emerald-600', activeColor: 'bg-emerald-500 text-white' },
    { key: 'failed', label: 'Error', count: stats?.failed || 0, icon: LuCircleX, color: 'text-red-600', activeColor: 'bg-red-500 text-white' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ key, label, count, icon: Icon, color, activeColor }) => (
        <button
          key={key}
          onClick={() => dispatch(setStatusFilter(key))}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            statusFilter === key
              ? activeColor + ' shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Icon className={`h-4 w-4 ${statusFilter === key ? 'text-current' : color}`} />
          {label}
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            statusFilter === key ? 'bg-white/20' : 'bg-gray-100'
          }`}>
            {count}
          </span>
        </button>
      ))}
    </div>
  );
}
