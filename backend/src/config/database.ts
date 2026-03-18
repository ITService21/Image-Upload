import knex, { Knex } from 'knex';
import { env } from './env';
import { logger } from '../utils/logger';

const config: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    charset: 'utf8mb4',
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
  },
  migrations: {
    directory: __dirname + '/migrations',
  },
};

export const db = knex(config);

export async function initDatabase(): Promise<void> {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connected', { host: env.db.host, database: env.db.name });
    await runMigrations();
  } catch (error: any) {
    logger.error('Database connection failed', { host: env.db.host, database: env.db.name, error: error.message });
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  try {
    await db.schema.hasTable('companies').then(async (exists) => {
      if (!exists) {
        await db.schema.createTable('companies', (table) => {
          table.increments('id').primary();
          table.string('company_name', 255).notNullable();
          table.string('slug', 255).notNullable().unique();
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.timestamp('updated_at').defaultTo(db.fn.now());
          table.index(['slug']);
        });
        logger.info('Migration: created companies table');
      }
    });

    await db.schema.hasTable('media').then(async (exists) => {
      if (!exists) {
        await db.schema.createTable('media', (table) => {
          table.increments('id').primary();
          table.integer('company_id').unsigned().notNullable();
          table.string('file_name', 500).notNullable();
          table.string('original_name', 500).notNullable();
          table.string('file_type', 50).notNullable();
          table.string('mime_type', 100).notNullable();
          table.bigInteger('file_size').notNullable();
          table.bigInteger('compressed_size').nullable();
          table.integer('width').nullable();
          table.integer('height').nullable();
          table.float('duration').nullable();
          table.string('storage_path', 1000).notNullable();
          table.string('compressed_path', 1000).nullable();
          table.string('thumbnail_path', 1000).nullable();
          table.string('public_url', 1000).notNullable();
          table.boolean('is_compressed').defaultTo(false);
          table.float('compression_ratio').nullable();
          table.string('compression_method', 50).defaultTo('sharp');
          table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
          table.integer('retry_count').defaultTo(0);
          table.text('error_message').nullable();
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.timestamp('updated_at').defaultTo(db.fn.now());

          table.foreign('company_id').references('companies.id').onDelete('CASCADE');
          table.index(['company_id']);
          table.index(['status']);
          table.index(['file_type']);
          table.index(['created_at']);
        });
        logger.info('Migration: created media table');
      }
    });

    await db.schema.hasTable('upload_sessions').then(async (exists) => {
      if (!exists) {
        await db.schema.createTable('upload_sessions', (table) => {
          table.increments('id').primary();
          table.integer('company_id').unsigned().notNullable();
          table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
          table.integer('total_files').defaultTo(0);
          table.integer('processed_files').defaultTo(0);
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.timestamp('updated_at').defaultTo(db.fn.now());

          table.foreign('company_id').references('companies.id').onDelete('CASCADE');
          table.index(['company_id']);
          table.index(['status']);
        });
        logger.info('Migration: created upload_sessions table');
      }
    });

    logger.info('Database migrations completed');
  } catch (error: any) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    throw error;
  }
}
