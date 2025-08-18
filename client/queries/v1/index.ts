/* eslint-disable @typescript-eslint/no-explicit-any */
import { getQueryClient } from "@/get-query-client";
import { IRequestOptions } from "@/models";
import Model from "@/models/v1";
import {
  IApiResponse,
  IApiResponseHooks,
  IPaginatedReturnType,
  IPaginationMeta,
  IPartialIfExist,
  IResponseError,
  ReturnModelType,
} from "@/types/Iquery";
import {
  InfiniteData,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query";
// ----------------- Types -----------------
// type ICreateIfExist
type ISortOder = "asc" | "desc";

export type Id = string | number;
type IOptions = {
  query?: QueryParams;
  path?: string;
  requestOptions?: IRequestOptions;
};
export type CrudFactoryOptions<
  TParams = Record<string, any>,
  Prefix = string
> = {
  defaultParams?: TParams & { entity: Prefix };
};
type BaseParams = {
  entity?: string;
};

type OffsetParams = BaseParams & {
  page: number;
  limit: number;
  isEnabled?: boolean;
  sort?: ISortOder;
};

type CursorParams = BaseParams & {
  cursor?: string;
  limit: number;
  isEnabled?: boolean;
  sort?: ISortOder;
};

type QueryParams = (OffsetParams | CursorParams) & { [key: string]: any };
export type CallOptions = {
  params?: QueryParams;
  options?: IOptions;
};
export type ListCallOptions<T> = {
  options?: IOptions;
  queryOptions?: UseQueryOptions<
    IApiResponseHooks<T>,
    IResponseError<null>,
    { data: T; pagination_meta: IPaginationMeta },
    QueryKey
  >;
  infiniteOptions?: Partial<
    UseInfiniteQueryOptions<
      IApiResponseHooks<T>,
      IResponseError<null>,
      InfiniteData<{ data: T; pagination_meta: IPaginationMeta }, unknown>,
      QueryKey
    >
  >;
  getNextPageParam?: UseInfiniteQueryOptions<
    IApiResponseHooks<T>,
    IResponseError<null>
  >["getNextPageParam"];
};
export type CursorCallOptions<T> = {
  params: CursorParams;
} & ListCallOptions<T>;
export type OffsetCallOptions<T> = {
  params: OffsetParams;
} & ListCallOptions<T>;
export type MutateCallOptions<TData = any, TVars = any> = {
  // options?: IOptions;
  params?: Record<string, any>;
  options?: IOptions;
  mutationOptions?: UseMutationOptions<
    IApiResponse<TData>,
    IResponseError<null>,
    TVars
  >;
};
type IMergeTypes<T, R> = ReturnModelType<T, R>;

// ---------------- HELPERS ---------------------- //
function deepMerge<T extends QueryParams>(target: T, source: T): T {
  const output = { ...target };

  for (const key in source) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal)
    ) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //   @ts-ignore
      output[key] = deepMerge(
        (targetVal as QueryParams) || {},
        sourceVal as QueryParams
      );
    } else {
      // Replace arrays or primitive values directly
      output[key] = sourceVal;
    }
  }

  return output;
}

const getEmptyPaginationMeta = (meta: any = {}) =>
  ({
    next: null,
    totalRecords: 0,
    totalPages: 0,
    hasNextPage: false,
    limit: 2,

    ...meta,
  } as IPaginationMeta);
// ---------------- CRUD Factory -----------------
export function createCrudClient<TEntity, TParams = Record<string, any>>(
  model: Model<TEntity>,
  opts?: CrudFactoryOptions<TParams>
) {
  const qs = getQueryClient();
  // const mergeParams = (callParams = {}) =>
  //   ({
  //     ...(opts?.defaultParams || {}),
  //     ...(callParams || {}),
  //   } as QueryParams);
  const mergeParams = (
    source: Record<string, any> = {},
    target: Record<string, any> = {},
    ...rest: QueryParams[]
  ): QueryParams => {
    let result = deepMerge(opts?.defaultParams || ({} as any), source);
    result = deepMerge(result, target);

    for (const obj of rest) {
      result = deepMerge(result, obj);
    }

    return result;
  };
  // ---------- Raw methods ----------
  async function listRaw<Entity = never>(
    params: Record<string, any>,
    options?: IOptions
  ): Promise<IPaginatedReturnType<IMergeTypes<TEntity, Entity>[]>> {
    const res = await model.list<
      IPaginatedReturnType<IMergeTypes<TEntity, Entity>[]>
    >({
      path: options?.path,
      query: options?.query,
      requestOptions: {
        params: mergeParams(params),
        ...(options?.requestOptions || {}),
      },
    });

    return res?.data as IPaginatedReturnType<IMergeTypes<TEntity, Entity>[]>;
  }

  async function getRaw<T = TEntity>(
    id: Id,
    params: Record<string, any>,
    options?: IOptions
  ) {
    return model.get<T>(`${id}`, {
      path: options?.path,
      query: options?.query,
      requestOptions: {
        ...(options?.requestOptions || {}),
        params: mergeParams(params, options?.requestOptions?.params),
      },
    });
  }

  async function createRaw<T = Partial<TEntity>, TVars = Partial<TEntity>>(
    payload: TVars,
    params?: Record<string, any>,
    options?: IOptions
  ) {
    // return http<TEntity>(axiosInst, {
    return model.create<T>(payload as Partial<TEntity>, {
      query: options?.query,
      path: options?.path,
      requestOptions: {
        ...(options?.requestOptions || {}),
        params: mergeParams(params, options?.requestOptions?.params),
      },
    });
  }

  async function updateRaw<T = Partial<TEntity>, TVars = Partial<TEntity>>(
    id: Id,
    payload: TVars,
    params?: Record<string, any>,
    options?: IOptions
  ) {
    // return http<TEntity>(axiosInst, {
    return model.update<T>(`/${id}`, payload as Partial<TEntity>, {
      path: options?.path,
      query: options?.query,
      requestOptions: {
        ...(options?.requestOptions || {}),
        params: mergeParams(params, options?.requestOptions?.params),
      },
    });
  }

  async function deleteRaw<T = Partial<TEntity>>(
    id: Id,
    params?: Record<string, any>,
    options?: IOptions
  ) {
    // return http<void>(axiosInst, {
    return model.delete<T>(`/${id}`, {
      path: options?.path,
      query: options?.query,
      requestOptions: {
        ...(options?.requestOptions || {}),
        params: mergeParams(params, options?.requestOptions?.params),
      },
    });
  }

  // ---------- React Query hooks ----------
  function useList<Entity = never>(
    callOpts?: OffsetCallOptions<IMergeTypes<TEntity, Entity>[]>
  ) {
    const params = mergeParams(callOpts?.params) as OffsetParams;
    const { isEnabled = true } = params || { isEnabled: false };
    const { queryKey = [], ...rest } = callOpts?.queryOptions || {
      queryKey: [],
    };
    return useQuery({
      queryKey: [
        params.entity,
        "offset",
        params.limit,
        params.page,
        ...queryKey,
      ],
      queryFn: async ({ signal }) => {
        return await listRaw<Entity>(params, {
          ...callOpts?.options,
          requestOptions: {
            ...(callOpts?.options?.requestOptions || {}),
            signal,
          },
        });
      },
      ...(rest || {}),
      enabled: isEnabled,
    });
  }

  function useCursorList<Entity = never>(
    callOpts?: CursorCallOptions<IMergeTypes<TEntity, Entity>[]>
  ) {
    const params = mergeParams(callOpts?.params) as any;

    const { isEnabled = true } = params || { isEnabled: false };
    const { queryKey = [], ...rest } = callOpts?.infiniteOptions || {
      queryKey: [],
    };
    const Select = (
      data: InfiniteData<
        IApiResponseHooks<IMergeTypes<TEntity, Entity>[]>,
        unknown
      >
    ) => {
      // Flatten and apply selection function if provided
      const isPages = data.pages?.length > 0;
      const allItems = data.pages
        .filter((p) => !!p.data?.length)
        .flatMap((page) => page.data!);
      const pagination_meta = isPages
        ? data.pages?.[data.pages?.length - 1]?.pagination_meta
        : getEmptyPaginationMeta({ limit: params.limit });
      return {
        pagination_meta,
        data: allItems,
        pageParams: data.pageParams,
        pages: data.pages as {
          data: IMergeTypes<TEntity, Entity>[];
          pagination_meta: IPaginationMeta;
        }[],
      };
      // ? select(meta, allItems, data.pageParams)
      // : { meta, data: allItems, pageParams: data.pageParams };
    };
    return useInfiniteQuery({
      queryKey: [params.entity, "cursor", params.limit, ...queryKey],
      queryFn: async ({ pageParam, signal }) => {
        if (pageParam) params.cursor = pageParam;
        return await listRaw<Entity>(
          { ...params, mode: "cursor" },
          {
            ...callOpts?.options,
            requestOptions: {
              ...(callOpts?.options?.requestOptions || {}),
              signal,
            },
          }
        );
      },
      getNextPageParam: (lastPage) => {
        // console.log(lastPage, "lastpage");

        // return lastPage?.nextCursor || undefined;
        return lastPage.pagination_meta?.next || undefined;
      },
      initialPageParam: (params as CursorParams)?.cursor || undefined,
      ...rest,
      enabled: isEnabled,
      select: Select,
    });
  }

  function useGet<Entity = never>(
    id?: Id,
    callOpts?: CallOptions & {
      queryOptions?: UseQueryOptions<
        IApiResponse<ReturnModelType<TEntity, Entity>>,
        IResponseError<null>,
        ReturnModelType<TEntity, Entity>,
        QueryKey
      >;
    }
  ) {
    const params = mergeParams(callOpts?.params);

    const { queryKey = [], ...rest } = callOpts?.queryOptions || {
      queryKey: [],
    };
    return useQuery({
      queryKey: [params.entity, id, ...(queryKey || [])],
      queryFn: async ({ signal }) => {
        const res = await getRaw<ReturnModelType<TEntity, Entity>>(
          id as Id,
          params,
          {
            ...callOpts?.options,
            requestOptions: {
              ...(callOpts?.options || {}),
              signal,
            },
          }
        );
        // Cast the response to the expected type
        // return res.data as IApiResponse<UnionIfBPresent<TEntity, Entity>>;
        return res;
      },
      ...(rest ?? {}),
      enabled: !!id,
    });
  }

  function useCreate<Entity = never, Tvars = never>(
    callOpts?: MutateCallOptions<
      IMergeTypes<TEntity, Entity>,
      Partial<ReturnModelType<TEntity, Tvars>>
    >
  ) {
    return useMutation<
      IApiResponse<IMergeTypes<TEntity, Entity>>,
      // ApiModelDataTypes[T],
      IResponseError<null>,
      Partial<ReturnModelType<TEntity, Tvars>>
    >({
      mutationFn: (payload: Partial<ReturnModelType<TEntity, Tvars>>) =>
        createRaw(payload, callOpts?.params, callOpts?.options),
      onSuccess: async (data) => {
        return data;
      },
      ...(callOpts?.mutationOptions ?? {}),
    });
  }
  function usePost<Entity = never, Tvars = never>(
    callOpts?: MutateCallOptions<
      IMergeTypes<TEntity, Entity>,
      Partial<ReturnModelType<TEntity, Tvars>>
    >
  ) {
    return useMutation<
      IApiResponse<IMergeTypes<TEntity, Entity>>,
      // ApiModelDataTypes[T],
      IResponseError<null>,
      Partial<ReturnModelType<TEntity, Tvars>>
    >({
      mutationFn: (payload: Partial<ReturnModelType<TEntity, Tvars>>) =>
        createRaw(payload, callOpts?.params, callOpts?.options),
      onSuccess: async (data) => {
        return data;
      },
      ...(callOpts?.mutationOptions ?? {}),
    });
  }

  function useUpdate<Entity = never, Tvars = never>(
    callOpts?: MutateCallOptions<
      { id: Id; data: TEntity & IPartialIfExist<Entity> },
      { id: Id; data: Partial<ReturnModelType<TEntity, Tvars>> }
    >
  ) {
    return useMutation<
      IApiResponse<{ id: Id; data: TEntity & IPartialIfExist<Entity> }>,
      // ApiModelDataTypes[T],
      IResponseError<null>,
      { id: Id; data: Partial<ReturnModelType<TEntity, Tvars>> }
    >({
      mutationFn: ({
        id,
        data,
      }: {
        id: Id;
        data: Partial<ReturnModelType<TEntity, Tvars>>;
      }) => updateRaw(id, data, callOpts?.params, callOpts?.options),
      onSuccess: async (_res) => {
        return _res;
      },
      ...(callOpts?.mutationOptions ?? {}),
    });
  }

  function useDelete(callOpts?: MutateCallOptions<Id, Id>) {
    return useMutation<IApiResponse<Id>, IResponseError<null>, Id>({
      mutationFn: (id: Id) =>
        deleteRaw(id, callOpts?.params, callOpts?.options),

      ...(callOpts?.mutationOptions ?? {}),
    });
  }

  function updateCacheById(
    id?: Id,
    payLoad?: Partial<TEntity>,
    queryKey?: QueryKey | string
  ) {
    if (!id) {
      return false;
    }
    const keys = [opts?.defaultParams?.entity, id, queryKey].filter(Boolean);
    qs.setQueryData(keys, (data: TEntity) => {
      if (!data) {
        return undefined;
      }
      return { ...data, ...payLoad };
    });
  }

  return {
    listRaw,
    getRaw,
    createRaw,
    updateRaw,
    deleteRaw,
    useList,
    useGet,
    useCreate,
    usePost,
    useUpdate,
    useDelete,
    useCursorList,
    updateCacheById,
  };
}
