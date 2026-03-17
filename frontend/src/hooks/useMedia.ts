import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '../api/mediaApi';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { CompressionMethod } from '../types';
import toast from 'react-hot-toast';

export function useMediaList(page = 1) {
  const { statusFilter, companyFilter, searchQuery } = useSelector(
    (state: RootState) => state.media
  );

  return useQuery({
    queryKey: ['media', page, statusFilter, companyFilter, searchQuery],
    queryFn: () =>
      mediaApi.getAll({
        page,
        limit: 50,
        companyId: companyFilter ?? undefined,
        status: statusFilter === 'all' ? undefined : statusFilter === 'pending' ? 'pending' : statusFilter,
        search: searchQuery || undefined,
      }),
  });
}

export function useMediaStats(companyId?: number) {
  return useQuery({
    queryKey: ['mediaStats', companyId],
    queryFn: () => mediaApi.getStats(companyId ?? undefined),
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: mediaApi.getCompanies,
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mediaApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['mediaStats'] });
      toast.success('Media deleted successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mediaApi.bulkDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['mediaStats'] });
      toast.success('Selected media deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useEditImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, operations }: { id: number; operations: any }) =>
      mediaApi.editImage(id, operations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Image edited successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRecompress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, method }: { id: number; method: CompressionMethod }) =>
      mediaApi.recompress(id, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Recompression queued');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRetry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mediaApi.retry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Retry queued');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
