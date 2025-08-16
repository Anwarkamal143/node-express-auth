/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  InfiniteData,
  QueryClient,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";

import { isArray } from "@/lib";
import { ApiModelKey, IApiResponse, IPaginationMeta } from "@/types/Iquery";
import { useRef } from "react";
import {
  ApiModelDataTypes,
  ApiModelMapping,
  RequestOptions,
} from "./apiModelMapping";
// type WithType<L extends ApiModelKey, M> = [M] extends [never]
//   ? ApiModelDataTypes[L][]
//   : ApiModelDataTypes<M>[L][];
export type ISelectType<
  T extends ApiModelKey,
  UseSelect
> = UseSelect extends true
  ? {
      meta: IPaginationMeta;
      data: ApiModelDataTypes[T][];
      pageParams: unknown[];
      extra: any;
    }
  : InfiniteData<IApiResponse<ApiModelDataTypes[T][]>, unknown> & {
      extra: any;
    };

// Conditionally determine the return type

// type QueryResultType<T extends ApiModelKey, UseSelect> = UseSelect extends true
//   ? // SelectFn extends (
//     //     meta: IPaginationMeta,
//     //     data: ApiModelDataTypes[T][]
//     //   ) => infer R
//     //   ? R // Infer transformed data type
//     //   :
//     ISelectType<T, UseSelect>
//   : IApiResponse<ApiModelDataTypes[T][]>;
const getEmptyPaginationMeta = (meta: any = {}) => ({
  nextCursor: null,
  totalRecords: 0,
  totalPages: 0,
  hasNextPage: false,
  pageSize: 2,
  ...meta,
});
type ListQueryParams<T extends ApiModelKey, K> = {
  modelName: T;
  queryKey?: QueryKey;
  requestOptions?: RequestOptions;
  // queryOptions?: UseInfiniteQueryOptions;
  queryOptions?: Partial<UseInfiniteQueryOptions>;
  // UseInfiniteQueryOptions<
  //   IApiResponse<WithType<T, K>>,
  //   unknown,
  //   IApiResponse<WithType<T, K>>,
  //   QueryKey
  // >

  isCursorBased?: boolean;
  limit?: number;
  select?: (
    meta: IPaginationMeta,
    data: ApiModelDataTypes[T][],
    pageParams: unknown[],
    extra: any
  ) => any[]; // Select function
  useSelect?: boolean;
};

const getCursorbasedPage = (
  client: QueryClient,
  pageParam: unknown,
  queryKey: unknown[]
) => {
  const page = (
    client.getQueryCache().find({
      queryKey,
    })?.state?.data as any
  )?.pageParams;
  if (page != null && isArray(page)) {
    const pageIndex = page.findIndex((p) => p === pageParam);
    if (pageIndex != -1) {
      return pageIndex + 1;
    }
    return page.length + 1;
  } else {
    return 1;
  }
};
// TypeScript: Conditional type check
export default function useListInfiniteItems<
  T extends ApiModelKey,
  K = never,
  L = false
>({
  modelName,
  requestOptions = {},
  queryOptions,
  queryKey = [],
  isCursorBased = false,
  limit = 20,
  useSelect = false,
  select,
}: ListQueryParams<T, K extends never ? never : K>) {
  const newQueryKeys = queryKey.filter((f) => f !== modelName);
  // const newQueryKey = [modelName, ...newQueryKeys];
  const newQueryKey = [...newQueryKeys];
  const { initialPageParam = 1, ...rest } = queryOptions || {
    initialPageParam: 1,
  };

  const nextfetchingCursor = useRef<number | string | undefined>(undefined);
  const Select = (
    data: InfiniteData<IApiResponse<ApiModelDataTypes[T][]>, unknown>
  ) => {
    // Flatten and apply selection function if provided
    const pages = data?.pages || [];
    const isPages = pages && !!pages?.length;
    const allItems = pages
      // .filter((p) => !!p.data?.length)
      .flatMap((page) => page.data!);
    const meta = isPages
      ? pages?.[pages?.length - 1]?.pagination_meta
      : getEmptyPaginationMeta({ pageSize: limit });
    const extra = isPages ? pages?.[0].extra : null;
    select?.(meta, allItems, data.pageParams, extra);
    return { meta, data: allItems, pageParams: data.pageParams, extra };
  };

  const resp = useInfiniteQuery<
    IApiResponse<ApiModelDataTypes[T][]> // Conditionally infer data type
  >({
    queryKey: newQueryKey,
    initialPageParam: initialPageParam,
    queryFn: async ({ pageParam, meta, client }) => {
      const queryOptions: any = {
        limit,
        page: pageParam,
        cursor_type: isCursorBased,
        cursor: nextfetchingCursor.current,
      };
      if (isCursorBased) {
        queryOptions["cursor"] = pageParam;
        queryOptions["page"] = getCursorbasedPage(
          client,
          pageParam,
          newQueryKey
        );
      }
      if (!isCursorBased) {
        queryOptions["page"] = pageParam;
      }
      const options = {
        ...requestOptions,
        query: { ...queryOptions, ...requestOptions.query },
      };
      const res = await ApiModelMapping[modelName].model.list<
        ApiModelDataTypes<K>[T]
      >(options);
      const { status, message, success, time, ...rest } = res;

      return rest;
    },

    getNextPageParam: (lastPage, pages, lastPageParam, allPagesParam) => {
      const pageParam: number = queryOptions?.initialPageParam as any;
      // console.log({ lastPage, pages, lastPageParam, allPagesParam, pageParam });
      const { hasMore, next } = (lastPage?.pagination_meta ||
        {}) as IPaginationMeta;
      nextfetchingCursor.current = next;

      return hasMore ? next : undefined;
      // return pages.length * 25;
    },
    getPreviousPageParam: (
      firstPage,
      pages,
      firstPagePageParam,
      allPagesParam
    ) => {
      // console.log({ lastPage, pages, lastPageParam, allPagesParam });
      const { previous } = (firstPage?.pagination_meta ||
        {}) as IPaginationMeta;
      // console.log(firstPage, firstPagePageParam, pages, allPagesParam);
      return previous ? previous : undefined;

      // return pages.length * 25;
    },

    select: useSelect ? Select : undefined,
    retry: false,

    ...((rest || {}) as any),
  });

  return { ...resp, data: resp.data as unknown as ISelectType<T, L> };
}
