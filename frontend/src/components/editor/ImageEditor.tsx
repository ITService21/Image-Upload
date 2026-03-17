import { useRef, useState, useCallback } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { LuX, LuCrop, LuRotateCw, LuRotateCcw, LuFlipHorizontal2, LuFlipVertical2, LuMaximize2, LuSave, LuUndo2 } from 'react-icons/lu';
import { Media, CompressionMethod } from '../../types';
import { useEditImage, useRecompress } from '../../hooks/useMedia';
import { getMediaUrl, formatFileSize } from '../../utils/format';

interface Props {
  media: Media;
  onClose: () => void;
}

export default function ImageEditor({ media, onClose }: Props) {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [mode, setMode] = useState<'crop' | 'none'>('none');
  const [recompressMethod, setRecompressMethod] = useState<CompressionMethod>(media.compression_method);
  const editMutation = useEditImage();
  const recompressMutation = useRecompress();

  const imageSrc = getMediaUrl(media.id, 'original') + '?t=' + Date.now();
  const compressedSrc = media.compressed_path ? getMediaUrl(media.id, 'compressed') + '?t=' + Date.now() : null;

  const handleRotate = useCallback((deg: number) => {
    cropperRef.current?.cropper.rotate(deg);
  }, []);

  const handleFlipH = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const data = cropper.getData();
      cropper.scaleX(data.scaleX === -1 ? 1 : -1);
    }
  }, []);

  const handleFlipV = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const data = cropper.getData();
      cropper.scaleY(data.scaleY === -1 ? 1 : -1);
    }
  }, []);

  const handleReset = useCallback(() => {
    cropperRef.current?.cropper.reset();
    setMode('none');
  }, []);

  const handleSave = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const cropData = cropper.getData();
    const canvasData = cropper.getCanvasData();
    const imageData = cropper.getImageData();

    const operations: any = {};

    if (cropData.rotate !== 0) {
      operations.rotate = cropData.rotate;
    }
    if (cropData.scaleX === -1) {
      operations.flop = true;
    }
    if (cropData.scaleY === -1) {
      operations.flip = true;
    }

    if (mode === 'crop') {
      const cropBox = cropper.getCropBoxData();
      const ratio = imageData.naturalWidth / imageData.width;

      operations.crop = {
        left: Math.round((cropBox.left - canvasData.left) * ratio),
        top: Math.round((cropBox.top - canvasData.top) * ratio),
        width: Math.round(cropBox.width * ratio),
        height: Math.round(cropBox.height * ratio),
      };
    }

    if (Object.keys(operations).length === 0) {
      onClose();
      return;
    }

    editMutation.mutate(
      { id: media.id, operations },
      { onSuccess: () => onClose() }
    );
  }, [editMutation, media.id, mode, onClose]);

  const handleRecompress = () => {
    recompressMutation.mutate(
      { id: media.id, method: recompressMethod },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Edit Image - {media.original_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <LuX className="h-6 w-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-6 py-3">
          <button
            onClick={() => setMode(mode === 'crop' ? 'none' : 'crop')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              mode === 'crop' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LuCrop className="h-4 w-4" /> Crop
          </button>
          <button onClick={() => handleRotate(90)} className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200" title="Rotate Right">
            <LuRotateCw className="h-4 w-4" />
          </button>
          <button onClick={() => handleRotate(-90)} className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200" title="Rotate Left">
            <LuRotateCcw className="h-4 w-4" />
          </button>
          <button onClick={handleFlipH} className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200" title="Flip Horizontal">
            <LuFlipHorizontal2 className="h-4 w-4" />
          </button>
          <button onClick={handleFlipV} className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200" title="Flip Vertical">
            <LuFlipVertical2 className="h-4 w-4" />
          </button>
          <button onClick={handleReset} className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200" title="Reset">
            <LuUndo2 className="h-4 w-4" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={recompressMethod}
              onChange={(e) => setRecompressMethod(e.target.value as CompressionMethod)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="sharp">Sharp</option>
              <option value="imagemin">Imagemin</option>
              <option value="squoosh">Squoosh</option>
              <option value="imagemagick">ImageMagick</option>
            </select>
            <button onClick={handleRecompress} className="btn-secondary text-sm">
              Recompress
            </button>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original / Editor */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Original ({formatFileSize(media.file_size)})
              </h3>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100" style={{ maxHeight: '60vh' }}>
                <Cropper
                  ref={cropperRef}
                  src={imageSrc}
                  style={{ height: '100%', width: '100%', maxHeight: '55vh' }}
                  guides={true}
                  viewMode={1}
                  dragMode={mode === 'crop' ? 'crop' : 'move'}
                  autoCrop={mode === 'crop'}
                  background={false}
                  responsive={true}
                  checkOrientation={false}
                />
              </div>
            </div>

            {/* Compressed preview */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Compressed
                {media.compressed_size && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    ({formatFileSize(media.compressed_size)})
                    {media.compression_ratio != null && (
                      <span className="ml-1 text-emerald-600">-{media.compression_ratio.toFixed(1)}%</span>
                    )}
                  </span>
                )}
              </h3>
              <div className="flex items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100" style={{ maxHeight: '60vh' }}>
                {compressedSrc ? (
                  <img src={compressedSrc} alt="Compressed" className="max-h-[55vh] max-w-full object-contain" />
                ) : (
                  <p className="p-8 text-sm text-gray-400">No compressed version available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={editMutation.isPending}
          >
            <LuSave className="h-4 w-4" />
            {editMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
