import { db } from '../config/database';
import { cacheDel, cacheGet, cacheSet } from '../config/redis';
import { Media, MediaStats, CompressionMethod } from '../types';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { slugifyCompany } from '../utils/fileHelpers';
import fs from 'fs/promises';
import path from 'path';

export class MediaService {
  static async create(data: Partial<Media>): Promise<Media> {
    const [id] = await db('media').insert(data);
    await cacheDel('media:all');
    return db('media').where({ id }).first();
  }

  static async getAll(filters?: {
    companyId?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Media[]; total: number; page: number; totalPages: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let query = db('media')
      .leftJoin('companies', 'media.company_id', 'companies.id')
      .select(
        'media.*',
        'companies.company_name',
        'companies.slug as company_slug'
      );

    if (filters?.companyId) {
      query = query.where('media.company_id', filters.companyId);
    }
    if (filters?.status) {
      query = query.where('media.status', filters.status);
    }
    if (filters?.search) {
      query = query.where(function () {
        this.where('media.original_name', 'like', `%${filters.search}%`)
          .orWhere('companies.company_name', 'like', `%${filters.search}%`);
      });
    }

    const countResult = await query.clone().count('media.id as count').first();
    const total = (countResult as any)?.count || 0;

    const data = await query
      .orderBy('media.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getById(id: number): Promise<Media | undefined> {
    const cached = await cacheGet(`media:${id}`);
    if (cached) return JSON.parse(cached);

    const media = await db('media')
      .leftJoin('companies', 'media.company_id', 'companies.id')
      .select('media.*', 'companies.company_name', 'companies.slug as company_slug')
      .where('media.id', id)
      .first();

    if (media) {
      await cacheSet(`media:${id}`, JSON.stringify(media), 600);
    }
    return media;
  }

  static async updateStatus(id: number, status: string, extra?: Partial<Media>): Promise<void> {
    await db('media').where({ id }).update({ status, ...extra, updated_at: db.fn.now() });
    await cacheDel(`media:${id}`);
    await cacheDel('media:all');
  }

  static async update(id: number, data: Partial<Media>): Promise<Media> {
    await db('media').where({ id }).update({ ...data, updated_at: db.fn.now() });
    await cacheDel(`media:${id}`);
    await cacheDel('media:all');
    return db('media').where({ id }).first();
  }

  static async delete(id: number): Promise<void> {
    const media = await db('media').where({ id }).first();
    if (!media) return;

    const filesToDelete = [
      media.storage_path,
      media.compressed_path,
      media.thumbnail_path,
    ].filter(Boolean);

    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(path.resolve(filePath));
      } catch (e) {
        logger.warn(`Failed to delete file: ${filePath}`);
      }
    }

    await db('media').where({ id }).delete();
    await cacheDel(`media:${id}`);
    await cacheDel('media:all');
    logger.info(`Deleted media ${id}`);
  }

  static async bulkDelete(ids: number[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  static async getStats(companyId?: number): Promise<MediaStats> {
    let query = db('media');
    if (companyId) query = query.where({ company_id: companyId });

    const [stats] = await query.select(
      db.raw('COUNT(*) as total'),
      db.raw("SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 ELSE 0 END) as pending"),
      db.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed"),
      db.raw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed")
    );

    return {
      total: Number(stats.total) || 0,
      pending: Number(stats.pending) || 0,
      processing: 0,
      completed: Number(stats.completed) || 0,
      failed: Number(stats.failed) || 0,
    };
  }

  static async getPublicUrl(companySlug: string, fileName: string): Promise<Media | undefined> {
    return db('media')
      .leftJoin('companies', 'media.company_id', 'companies.id')
      .select('media.*')
      .where('companies.slug', companySlug)
      .where('media.file_name', fileName)
      .first();
  }

  static generatePublicUrl(companySlug: string, fileName: string): string {
    return `${env.baseUrl}/media/${companySlug}/${fileName}`;
  }
}
