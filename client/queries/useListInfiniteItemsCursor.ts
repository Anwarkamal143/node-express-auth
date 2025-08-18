/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  InfiniteData,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";

import {
  ApiModelKey,
  IApiResponse,
  IPaginatedReturnType,
  IPaginationMeta,
  IResponseError,
} from "@/types/Iquery";
import {
  ApiModelDataTypes,
  ApiModelMapping,
  RequestOptions,
} from "./apiModelMapping";

export type ISelectType<
  T extends ApiModelKey,
  UseSelect
> = UseSelect extends true
  ? {
      meta: IPaginationMeta;
      data: ApiModelDataTypes[T][];
      pageParams: unknown[];
    }
  : // : InfiniteData<IApiResponse<ApiModelDataTypes[T][]>, unknown>;
    InfiniteData<IPaginatedReturnType<ApiModelDataTypes[T][]>, unknown>;

const getEmptyPaginationMeta = (meta: any = {}) => ({
  next: null,
  totalRecords: 0,
  totalPages: 0,
  hasNextPage: false,
  limit: 2,
  ...meta,
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ListQueryParams<T extends ApiModelKey, K> = {
  modelName: T;
  queryKey?: QueryKey;
  mode: "offset" | "cursor";
  requestOptions?: RequestOptions;
  // queryOptions?: UseInfiniteQueryOptions;
  queryOptions?: Partial<
    UseInfiniteQueryOptions<
      IApiResponse<ApiModelDataTypes[T][]>, // Conditionally infer data type
      IResponseError<null>,
      InfiniteData<IPaginatedReturnType<ApiModelDataTypes[T][]>, unknown>,
      QueryKey
    >
  >;
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
    pageParams: unknown[]
  ) => any[]; // Select function
  useSelect?: boolean;
};
// TypeScript: Conditional type check
export default function useListInfiniteItemsCursor<
  T extends ApiModelKey,
  K = never,
  L = false
>({
  modelName,
  requestOptions = {},
  queryOptions,
  queryKey = [],

  limit = 20,
  useSelect = false,
  mode = "cursor",
  select,
}: ListQueryParams<T, K extends never ? never : K>) {
  const isCursor = mode === "cursor";
  const newQueryKeys = queryKey.filter((f) => f !== modelName);
  // const newQueryKey = [modelName, ...newQueryKeys];
  const newQueryKey = [...newQueryKeys];
  const { initialPageParam, ...rest } = queryOptions || {
    initialPageParam: -1,
  };
  const Select = (
    data: InfiniteData<IApiResponse<ApiModelDataTypes[T][]>, unknown>
  ) => {
    // Flatten and apply selection function if provided
    const isPages = data.pages.length > 0;
    const allItems = data.pages
      .filter((p) => !!p.data?.length)
      .flatMap((page) => page.data!);
    const meta = isPages
      ? data.pages?.[data.pages?.length - 1].pagination_meta
      : getEmptyPaginationMeta({ pageSize: limit });
    return select
      ? select(meta, allItems, data.pageParams)
      : { meta, data: allItems, pageParams: data.pageParams };
  };

  const resp = useInfiniteQuery<
    IApiResponse<ApiModelDataTypes[T][]>, // Conditionally infer data type
    IResponseError<null>,
    InfiniteData<IPaginatedReturnType<ApiModelDataTypes[T][]>, unknown>,
    QueryKey
  >({
    queryKey: newQueryKey,
    initialPageParam: initialPageParam,
    queryFn: async ({ pageParam }) => {
      const options = {
        ...requestOptions,
        query: {
          ...(!isCursor ? { page: pageParam } : { cursor: pageParam }),
          limit,
          ...requestOptions.query,
        },
      };
      const res = await ApiModelMapping[modelName].model.list<{
        data: ApiModelDataTypes[T][];
        pagination_meta: IPaginationMeta;
      }>(options);
      return res.data;
    },

    getNextPageParam: (lastPage, pages, lastPageParam, allPagesParam) => {
      const { hasMore, next } = (lastPage.pagination_meta ||
        {}) as IPaginationMeta;
      console.log({
        lastPage,
        pages,
        lastPageParam,
        allPagesParam,
        isCursor,
        hasMore,
        next,
      });

      return hasMore ? next : undefined;
      // if (isCursor) {
      //   return hasMore ? next : undefined;
      // }
      // return hasMore ? pages.length : undefined;
      // return pages.length * 25;
    },
    select: useSelect ? Select : undefined,
    retry: false,

    ...((rest || {}) as any),
  });

  return { ...resp, data: resp.data as unknown as ISelectType<T, L> };
}
