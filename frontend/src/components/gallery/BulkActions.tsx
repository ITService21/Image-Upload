import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { selectAll, clearSelection } from '../../store/mediaSlice';
import { useBulkDelete } from '../../hooks/useMedia';
import { LuTrash2, LuCopy, LuSquareCheck, LuSquareX } from 'react-icons/lu';
import { Media } from '../../types';
import ConfirmModal from '../common/ConfirmModal';
import toast from 'react-hot-toast';

interface Props {
  allMedia: Media[];
}

export default function BulkActions({ allMedia }: Props) {
  const dispatch = useDispatch();
  const selectedIds = useSelector((state: RootState) => state.media.selectedIds);
  const bulkDelete = useBulkDelete();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSelectAll = () => {
    dispatch(selectAll(allMedia.map((m) => m.id)));
  };

  const handleCopyLinks = async () => {
    const selected = allMedia.filter((m) => selectedIds.includes(m.id));
    const links = selected.map((m) => m.public_url).join('\n');
    try {
      await navigator.clipboard.writeText(links);
      toast.success(`${selected.length} link(s) copied!`);
    } catch {
      toast.error('Failed to copy links');
    }
  };

  const handleBulkDelete = () => {
    bulkDelete.mutate(selectedIds);
    dispatch(clearSelection());
    setConfirmDelete(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary text-xs sm:text-sm" onClick={handleSelectAll}>
          <LuSquareCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Select All</span>
        </button>
        <button className="btn-secondary text-xs sm:text-sm" onClick={() => dispatch(clearSelection())}>
          <LuSquareX className="h-4 w-4" />
          <span className="hidden sm:inline">Clear</span>
        </button>

        {selectedIds.length > 0 && (
          <>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <span className="text-xs font-medium text-indigo-600">
              {selectedIds.length} selected
            </span>
            <button className="btn-secondary text-xs sm:text-sm" onClick={handleCopyLinks}>
              <LuCopy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy Links</span>
            </button>
            <button className="btn-danger text-xs sm:text-sm" onClick={() => setConfirmDelete(true)}>
              <LuTrash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Selected Media"
        message={`Are you sure you want to permanently delete ${selectedIds.length} item(s)? This cannot be undone.`}
        confirmLabel="Delete All Selected"
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
        danger
      />
    </>
  );
}
