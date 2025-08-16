// services/base.service.ts
import { HTTPSTATUS } from '@/config/http.config';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
} from '@/utils/catch-errors';

import { AnyColumn, asc, desc, SQL, sql } from 'drizzle-orm';
import { AnyPgTable, getTableConfig, IndexColumn } from 'drizzle-orm/pg-core';
import { db } from '../db';

export type IPaginationOrder = 'asc' | 'desc';
export type IPaginationModes = 'cursor' | 'offset';
export type IPaginatedParams =
  | {
      cursor: number | string | null;
      limit: number | string;
      mode: 'cursor';
      sortOrder: IPaginationOrder;
    }
  | {
      page: number | string | null;
      limit: number | string;
      mode: 'offset';
      sortOrder: IPaginationOrder;
    };
type PaginationOffsetOptions<TTable extends AnyPgTable> = {
  limit: number;
  page: number;
  where?: SQL<unknown>;
  order?: 'asc' | 'desc';
  cursorColumn?: (tableCols: TTable) => AnyColumn;
};
type PaginationCursortOptions<TCursorValue, TTable extends AnyPgTable> = {
  limit: number;
  cursor?: TCursorValue;
  cursorColumn: (tableCols: TTable) => AnyColumn;
  direction?: 'next' | 'prev';
  order?: 'asc' | 'desc';
  where?: SQL<unknown>;
};

/**
 * Calculates total pages safely.
 */
function calculateTotalPages(total: number, limit: number): number {
  return total > 0 && limit > 0 ? Math.ceil(total / limit) : 0;
}
/**
 * Builds pagination meta info.
 */
function buildPaginationMetaCursor({
  items,
  limit,
  total,
  cursor,
  hasMore,
  columnName,
}: {
  items: any[];
  limit: number;
  total: number;
  cursor: number | string;
  hasMore: boolean;
  columnName: string;
}): IPaginationMeta {
  return {
    hasMore,
    totalRecords: total,
    isLast: !hasMore,
    next:
      items.length > 0 && hasMore
        ? (items[items.length - 1][`${columnName}`] as string)
        : undefined,
    limit,
    totalPages: calculateTotalPages(total, limit),
    isFirst: cursor == null,
    current: cursor,
  };
}
function buildPaginationMetaForOffset({
  limit,
  total,
  page,
  hasMore,
}: {
  limit: number;
  total: number;
  page: number;
  hasMore: boolean;
}): IPaginationMeta {
  return {
    hasMore,
    totalRecords: total,
    isLast: !hasMore,

    limit,
    totalPages: calculateTotalPages(total, limit),
    isFirst: page === 0,
    current: page,
    next: page + 1,
    previous: page > 0 ? page - 1 : undefined,
  };
}
// Update the queryTable function to be more specific about the return type

export class BaseService<TTable extends AnyPgTable, TInsert extends Record<string, any>, TSelect> {
  queryName: keyof typeof db.query;
  constructor(public table: TTable) {
    if (!table) {
      throw new Error(`Provide a table`);
    }
    const config = getTableConfig(table);

    this.queryName = config.name as keyof typeof db.query;
  }
  queryTable<K extends keyof typeof db.query>(
    dbb: typeof db,
    key: K
  ): {
    findFirst: (params: { where: SQL<unknown> | undefined }) => Promise<TTable['$inferSelect']>;
    findMany: (params?: { where?: SQL<unknown> | undefined }) => Promise<TTable['$inferSelect'][]>;
  } {
    return dbb.query[key] as any; // We need to cast here because of Drizzle's complex types
  }
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

  async findOne(where: (table: TTable) => SQL<unknown> | undefined) {
    try {
      const record = await this.queryTable(db, this.queryName).findFirst({
        where: where(this.table),
      });
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
      const records = await this.queryTable(db, this.queryName).findMany(where ? { where } : {});
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
  async softDelete(
    where: (tableCols: TTable) => SQL<unknown>,
    set: Partial<TTable['$inferInsert']>
  ) {
    try {
      const result = await db.update(this.table).set(set).where(where(this.table)).returning();

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
   * Handles offset-based pagination.
   */
  async paginateOffset(options: PaginationOffsetOptions<TTable>) {
    const {
      limit,
      where,
      page,
      cursorColumn = (table: any) => table.id as AnyColumn,
      order = 'asc',
    } = options;
    if (!Number.isFinite(limit) || limit <= 0) {
      return { data: null, error: new BadRequestException('Limit must be greater than zero') };
    }
    if (!Number.isFinite(page) || page < 0) {
      return {
        data: null,
        error: new BadRequestException('Page must be zero or a positive integer'),
      };
    }
    const cursorCol = cursorColumn(this.table);
    try {
      const limitPlusOne = limit + 1;
      const offset = page * limit;

      const result = await db
        .select()
        .from(this.table as AnyPgTable)
        .where(where ?? sql`true`)
        .orderBy(order === 'asc' ? asc(cursorCol) : desc(cursorCol))
        .limit(limitPlusOne)
        .offset(offset);

      const total = await db.$count(this.table, where || sql`true`);
      const items = result.slice(0, limit);
      const hasMore = result.length > limit;

      return {
        data: items,
        pagination_meta: buildPaginationMetaForOffset({
          limit,
          total,
          page,
          hasMore,
        }),
        status: HTTPSTATUS.OK,
      };
    } catch (err) {
      console.error('Offset pagination error:', err);
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  /**
   * Handles cursor-based pagination.
   */
  async paginateCursor<TCursorValue = unknown>(
    options: PaginationCursortOptions<TCursorValue, TTable>
  ) {
    const {
      limit,
      cursor,
      cursorColumn = (table: any) => table.id as AnyColumn,
      direction = 'next',
      order = 'asc',
      where,
    } = options;
    if (!Number.isFinite(limit) || limit <= 0) {
      return {
        data: null,
        error: new BadRequestException('Limit must be greater than zero'),
      };
    }
    const cursorCol = cursorColumn(this.table);
    const isAsc = order === 'asc';
    const limitPlusOne = limit + 1;
    try {
      const comparator = cursor
        ? direction === 'next'
          ? isAsc
            ? sql`${cursorCol} > ${cursor}`
            : sql`${cursorCol} < ${cursor}`
          : isAsc
            ? sql`${cursorCol} < ${cursor}`
            : sql`${cursorCol} > ${cursor}`
        : undefined;

      const whereCondition =
        where && comparator ? sql`${comparator} AND ${where}` : comparator || where;

      const result = await db
        .select()
        .from(this.table as AnyPgTable)
        .where(whereCondition ?? sql`true`)
        .orderBy(order === 'asc' ? asc(cursorCol) : desc(cursorCol))
        .limit(limitPlusOne);

      const total = await db.$count(this.table, where || sql`true`);
      const items = result.slice(0, limit);
      const hasMore = result.length > limit;
      return {
        data: items,
        pagination_meta: {
          ...buildPaginationMetaCursor({
            items,
            limit,
            total,
            cursor: cursor as string,
            hasMore,
            columnName: cursorCol?.name,
          }),
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
