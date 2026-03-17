import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setCompanyFilter, setSearchQuery } from '../../store/mediaSlice';
import { useCompanies } from '../../hooks/useMedia';
import { LuSearch, LuX, LuBuilding2 } from 'react-icons/lu';
import { useState, useMemo } from 'react';

export default function CompanyFilter() {
  const dispatch = useDispatch();
  const { companyFilter, searchQuery } = useSelector((state: RootState) => state.media);
  const { data: companies } = useCompanies();
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (!localSearch) return companies;
    return companies.filter((c) =>
      c.company_name.toLowerCase().includes(localSearch.toLowerCase())
    );
  }, [companies, localSearch]);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          placeholder="Search files or companies..."
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {searchQuery && (
          <button
            onClick={() => dispatch(setSearchQuery(''))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <LuX className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Company dropdown */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <LuBuilding2 className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={companyFilter ?? ''}
            onChange={(e) => dispatch(setCompanyFilter(e.target.value ? Number(e.target.value) : null))}
            className="rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Companies</option>
            {companies?.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
