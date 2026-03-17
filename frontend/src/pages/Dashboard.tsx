import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { LuPlus, LuImage } from 'react-icons/lu';
import { useMediaList } from '../hooks/useMedia';
import { resetUpload } from '../store/uploadSlice';
import { Media } from '../types';
import MediaCard from '../components/gallery/MediaCard';
import StatsBar from '../components/gallery/StatsBar';
import CompanyFilter from '../components/gallery/CompanyFilter';
import BulkActions from '../components/gallery/BulkActions';
import UploadModal from '../components/upload/UploadModal';
import ImageEditor from '../components/editor/ImageEditor';

export default function Dashboard() {
  const dispatch = useDispatch();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editMedia, setEditMedia] = useState<Media | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMediaList(page);

  const handleOpenUpload = () => {
    dispatch(resetUpload());
    setUploadOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <LuImage className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Media Storage</h1>
              <p className="hidden text-xs text-gray-500 sm:block">Enterprise media management</p>
            </div>
          </div>
          <button className="btn-primary" onClick={handleOpenUpload}>
            <LuPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Media</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Stats */}
        <div className="mb-6">
          <StatsBar />
        </div>

        {/* Filters & Search */}
        <div className="mb-6">
          <CompanyFilter />
        </div>

        {/* Bulk Actions */}
        <div className="mb-4">
          <BulkActions allMedia={data?.data || []} />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {data.data.map((media) => (
                <MediaCard key={media.id} media={media} onEdit={setEditMedia} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {data.page} of {data.totalPages}
                </span>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <LuImage className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No media found</h3>
            <p className="mt-1 text-sm text-gray-500">Upload your first images or videos to get started</p>
            <button className="btn-primary mt-4" onClick={handleOpenUpload}>
              <LuPlus className="h-4 w-4" /> Upload Media
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      {editMedia && <ImageEditor media={editMedia} onClose={() => setEditMedia(null)} />}
    </div>
  );
}
