export function calculateTotalPages(total: number, limit: number): number {
  return total > 0 && limit > 0 ? Math.ceil(total / limit) : 0;
}
export function buildPaginationMetaCursor({
  items,
  limit,
  total,
  cursor,
  hasMore,
  columnName,
}: {
  items: any[];
  limit: number;
  total?: number;
  cursor: number | string;
  hasMore: boolean;
  columnName: string;
}): IPaginationMeta {
  return {
    hasMore,
    totalRecords: (total = 0),
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
export function buildPaginationMetaForOffset({
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
