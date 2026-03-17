import { db } from '../config/database';
import { Company } from '../types';
import { slugifyCompany } from '../utils/fileHelpers';
import { logger } from '../utils/logger';

export class CompanyService {
  static async findOrCreate(companyName: string): Promise<Company> {
    const slug = slugifyCompany(companyName);

    let company = await db('companies').where({ slug }).first();
    if (company) return company;

    try {
      const [id] = await db('companies').insert({
        company_name: companyName,
        slug,
      });
      company = await db('companies').where({ id }).first();
      logger.info(`Created company: ${companyName} (${slug})`);
      return company;
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return db('companies').where({ slug }).first();
      }
      throw error;
    }
  }

  static async getAll(): Promise<Company[]> {
    return db('companies').orderBy('company_name', 'asc');
  }

  static async getById(id: number): Promise<Company | undefined> {
    return db('companies').where({ id }).first();
  }

  static async getBySlug(slug: string): Promise<Company | undefined> {
    return db('companies').where({ slug }).first();
  }
}
