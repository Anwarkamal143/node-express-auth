// services/base.service.ts
import { HTTPSTATUS } from '@/config/http.config';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
} from '@/utils/catch-errors';

import { AnyColumn, asc, desc, SQL, sql } from 'drizzle-orm';
import { IndexColumn, PgTable, TableConfig } from 'drizzle-orm/pg-core';
import { db } from '../db';

export class BaseService<TInsert extends Record<string, any>, TSelect> {
  constructor(
    private table: PgTable<TableConfig>,
    private queryTable: {
      findFirst: (params: { where: SQL<unknown> }) => Promise<TSelect | undefined>;
      findMany: (params?: { where?: SQL<unknown> }) => Promise<TSelect[]>;
    }
  ) {}

  async create(values: TInsert) {
    try {
      const [record] = await db.insert(this.table).values(values).returning();
      if (!record) {
        return {
          data: null,
          error: new BadRequestException(`Record not created`),
        };
      }
      return {
        data: record as TSelect,
        status: HTTPSTATUS.CREATED,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async createMany(values: TInsert[]) {
    try {
      const records = await db.insert(this.table).values(values).returning();
      return {
        data: records,
        status: HTTPSTATUS.CREATED,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async findOne(where: SQL<unknown>) {
    try {
      const record = await this.queryTable.findFirst({ where });
      if (!record) {
        return {
          data: null,
          error: new NotFoundException(`Record not found`),
        };
      }
      return {
        data: record,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async findMany(where?: SQL<unknown>) {
    try {
      const records = await this.queryTable.findMany(where ? { where } : {});
      return {
        data: records,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async update(where: SQL<unknown>, values: Partial<TInsert>) {
    try {
      const result = await db.update(this.table).set(values).where(where).returning();
      return {
        data: result,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async delete(where: SQL<unknown>) {
    try {
      const result = await db.delete(this.table).where(where).returning();
      return {
        data: result,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  /**
   * Upsert: insert or update if conflict
   * Example: pass conflictTarget = ['user_id'], updateValues = { updated_at: new Date() }
   */
  async upsert(
    values: TInsert,
    conflictTarget: IndexColumn | IndexColumn[],
    updateValues: Partial<TInsert>
  ) {
    try {
      const [record] = await db
        .insert(this.table)
        .values(values)
        .onConflictDoUpdate({
          target: conflictTarget,
          set: updateValues,
        })
        .returning();

      return {
        data: record,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  /**
   * Soft delete by setting deleted_at timestamp
   * Requires `deleted_at` column in your schema
   */
  async softDelete(where: SQL<unknown>) {
    try {
      const result = await db
        .update(this.table)
        .set({ deleted_at: new Date() })
        .where(where)
        .returning();

      return {
        data: result,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  /**
   * Paginated results
   */
  async paginate(where: SQL<unknown> | undefined, options: { limit: number; offset: number }) {
    const { limit, offset } = options;

    try {
      const rows = await this.queryTable.findMany({
        where,
        // Add limit/offset via raw SQL expression (drizzle doesn't expose pagination yet)
      });

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(this.table)
        .where(where ?? sql`true`)
        .then((res) => Number(res[0]?.count || 0));

      return {
        data: rows,
        meta: {
          total,
          limit,
          offset,
        },
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        meta: null,
        error: new InternalServerException(),
      };
    }
  }
  /**
   * Cursor-based pagination using Drizzle's query builder
   */
  async paginateByCursor<TCursorValue>(
    cursorColumn: AnyColumn,
    cursor: TCursorValue | undefined,
    options: {
      limit: number;
      direction?: 'next' | 'prev';
      where?: SQL<unknown>;
      order?: 'asc' | 'desc';
    }
  ) {
    const { limit, direction = 'next', order = 'asc', where } = options;

    // Determine comparison operator and sort order
    const isAsc = order === 'asc';
    const comparator = cursor
      ? direction === 'next'
        ? isAsc
          ? sql`${cursorColumn} > ${cursor}`
          : sql`${cursorColumn} < ${cursor}`
        : isAsc
          ? sql`${cursorColumn} < ${cursor}`
          : sql`${cursorColumn} > ${cursor}`
      : undefined;

    const whereCondition =
      where && comparator ? sql`${comparator} and ${where}` : comparator || where;

    try {
      const query = db
        .select()
        .from(this.table)
        .where(whereCondition ?? sql`true`)
        .orderBy(order === 'asc' ? asc(cursorColumn) : desc(cursorColumn))
        .limit(limit + 1); // Fetch 1 extra for "hasMore"

      const result = await query;

      const items = result.slice(0, limit);
      const nextCursor =
        items.length > 0 ? (items[items.length - 1] as any)[cursorColumn.toString()] : null;

      return {
        data: items,
        meta: {
          nextCursor,
          hasMore: result.length > limit,
          limit,
          direction,
        },
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }
}
