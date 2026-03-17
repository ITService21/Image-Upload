import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { LuX, LuUpload, LuChevronRight, LuChevronLeft } from 'react-icons/lu';
import { RootState } from '../../store';
import {
  setCompanyName, setDefaultCompressionMethod, setCompressionEnabled,
  setUploadProgress, setIsUploading, setStep, resetUpload, addFiles,
} from '../../store/uploadSlice';
import { mediaApi } from '../../api/mediaApi';
import { CompressionMethod, UploadFileItem } from '../../types';
import toast from 'react-hot-toast';
import DropZone from './DropZone';
import FilePreviewList from './FilePreviewList';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function UploadModal({ open, onClose }: Props) {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const {
    files, companyName, defaultCompressionMethod,
    compressionEnabled, uploadProgress, isUploading, step,
  } = useSelector((state: RootState) => state.upload);

  const handleFilesSelected = (newFiles: File[]) => {
    const items: UploadFileItem[] = newFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(file),
      fileName: file.name.replace(/\.[^/.]+$/, ''),
      compressionMethod: defaultCompressionMethod,
      compressionEnabled: compressionEnabled,
    }));
    dispatch(addFiles(items));
    if (step === 1) dispatch(setStep(2));
  };

  const handleUpload = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    dispatch(setIsUploading(true));
    dispatch(setUploadProgress(0));

    try {
      const fileCompressionMethods: Record<string, CompressionMethod> = {};
      files.forEach((f) => {
        fileCompressionMethods[f.file.name] = f.compressionMethod;
      });

      await mediaApi.upload(
        files.map((f) => f.file),
        companyName.trim(),
        compressionEnabled,
        defaultCompressionMethod,
        fileCompressionMethods,
        (progress) => dispatch(setUploadProgress(progress))
      );

      toast.success(`${files.length} file(s) uploaded successfully!`);
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['mediaStats'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      dispatch(resetUpload());
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      dispatch(setIsUploading(false));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload Media</h2>
            <p className="text-sm text-gray-500">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isUploading}>
            <LuX className="h-6 w-6" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-3">
          {[
            { n: 1, label: 'Select Files' },
            { n: 2, label: 'Company & Settings' },
            { n: 3, label: 'Preview & Upload' },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step >= s.n ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{s.n}</span>
              <span className={`text-sm font-medium ${step >= s.n ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
              {s.n < 3 && <LuChevronRight className="h-4 w-4 text-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <DropZone onFilesSelected={handleFilesSelected} />
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => dispatch(setCompanyName(e.target.value))}
                  placeholder="Enter company name (e.g., Apple, Google)"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Default Image Compression</label>
                  <select
                    value={defaultCompressionMethod}
                    onChange={(e) => dispatch(setDefaultCompressionMethod(e.target.value as CompressionMethod))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="sharp">Sharp (Default - Recommended)</option>
                    <option value="imagemin">Imagemin</option>
                    <option value="squoosh">Squoosh</option>
                    <option value="imagemagick">ImageMagick</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={compressionEnabled}
                      onChange={(e) => dispatch(setCompressionEnabled(e.target.checked))}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">Enable Compression</span>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                  <strong>{files.length}</strong> file(s) selected. You can change compression method per file in the next step.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <FilePreviewList />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <div>
            {isUploading && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-600">{uploadProgress}%</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {step > 1 && (
              <button className="btn-secondary" onClick={() => dispatch(setStep(step - 1))} disabled={isUploading}>
                <LuChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
            {step < 3 ? (
              <button
                className="btn-primary"
                onClick={() => {
                  if (step === 1 && files.length === 0) {
                    toast.error('Please select files first');
                    return;
                  }
                  dispatch(setStep(step + 1));
                }}
              >
                Next <LuChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button className="btn-primary" onClick={handleUpload} disabled={isUploading}>
                <LuUpload className="h-4 w-4" />
                {isUploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
