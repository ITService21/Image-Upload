import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { removeFile, updateFileName, updateFileCompression, toggleFileCompression } from '../../store/uploadSlice';
import { CompressionMethod } from '../../types';
import { formatFileSize } from '../../utils/format';
import { LuX, LuImage, LuVideo } from 'react-icons/lu';

export default function FilePreviewList() {
  const dispatch = useDispatch();
  const { files } = useSelector((state: RootState) => state.upload);

  if (files.length === 0) {
    return <p className="text-center text-gray-500 py-12">No files selected. Go back to add files.</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">{files.length} file(s) ready for upload</h3>

      <div className="space-y-3">
        {files.map((item) => {
          const isImg = item.file.type.startsWith('image/');
          return (
            <div key={item.id} className="card flex flex-col sm:flex-row items-start gap-4 p-4">
              {/* Preview */}
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {isImg ? (
                  <img src={item.preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <LuVideo className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 space-y-2 w-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.fileName}
                      onChange={(e) => dispatch(updateFileName({ id: item.id, fileName: e.target.value }))}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                      placeholder="Enter filename"
                    />
                    <p className="mt-1 text-xs text-gray-500 truncate">{item.file.name}</p>
                  </div>
                  <button
                    onClick={() => dispatch(removeFile(item.id))}
                    className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <LuX className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-gray-500">{formatFileSize(item.file.size)}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    isImg ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {isImg ? <LuImage className="h-3 w-3" /> : <LuVideo className="h-3 w-3" />}
                    {item.file.type.split('/')[1].toUpperCase()}
                  </span>

                  {/* Per-file compression method */}
                  <select
                    value={item.compressionMethod}
                    onChange={(e) => dispatch(updateFileCompression({ id: item.id, method: e.target.value as CompressionMethod }))}
                    className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="sharp">Sharp</option>
                    <option value="imagemin">Imagemin</option>
                    <option value="squoosh">Squoosh</option>
                    <option value="imagemagick">ImageMagick</option>
                  </select>

                  {/* Per-file compression toggle */}
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={item.compressionEnabled}
                      onChange={() => dispatch(toggleFileCompression(item.id))}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full"></div>
                    <span className="ml-1.5 text-xs text-gray-600">Compress</span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
