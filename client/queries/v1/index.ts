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
  UnionIfBPresent,
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
export type MutateCallOptions<TVars = any> = {
  // options?: IOptions;
  params?: Record<string, any>;
  options?: IOptions;
  mutationOptions?: UseMutationOptions<any, IResponseError<null>, TVars>;
};

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
  async function listRaw(
    params: Record<string, any>,
    options?: IOptions
  ): Promise<IPaginatedReturnType<TEntity[]>> {
    const res = await model.list<IPaginatedReturnType<TEntity[]>>({
      path: options?.path,
      query: options?.query,
      requestOptions: {
        params: mergeParams(params),
        ...(options?.requestOptions || {}),
      },
    });

    return res.data!;
  }

  async function getRaw(
    id: Id,
    params: Record<string, any>,
    options?: IOptions
  ) {
    return model.get(`${id}`, {
      path: options?.path,
      query: options?.query,
      requestOptions: {
        ...(options?.requestOptions || {}),
        params: mergeParams(params, options?.requestOptions?.params),
      },
    });
  }

  async function createRaw(
    payload: Partial<TEntity>,
    params?: Record<string, any>,
    options?: IOptions
  ) {
    // return http<TEntity>(axiosInst, {
    return model.create(payload, {
      query: options?.query,
      path: options?.path,
      requestOptions: {
        ...(options?.requestOptions || {}),
        params: mergeParams(params, options?.requestOptions?.params),
      },
    });
  }

  async function updateRaw(
    id: Id,
    payload: Partial<TEntity>,
    params?: Record<string, any>,
    options?: IOptions
  ) {
    // return http<TEntity>(axiosInst, {
    return model.update(`/${id}`, payload, {
      path: options?.path,
      query: options?.query,
      requestOptions: {
        ...(options?.requestOptions || {}),
        params: mergeParams(params, options?.requestOptions?.params),
      },
    });
  }

  async function deleteRaw(
    id: Id,
    params?: Record<string, any>,
    options?: IOptions
  ) {
    // return http<void>(axiosInst, {
    return model.delete(`/${id}`, {
      path: options?.path,
      query: options?.query,
      requestOptions: {
        ...(options?.requestOptions || {}),
        params: mergeParams(params, options?.requestOptions?.params),
      },
    });
  }

  // ---------- React Query hooks ----------
  function useList(callOpts?: OffsetCallOptions<TEntity[]>) {
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
        return await listRaw(params, {
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

  function useCursorList(callOpts?: CursorCallOptions<TEntity[]>) {
    const params = mergeParams(callOpts?.params) as any;

    const { isEnabled = true } = params || { isEnabled: false };
    const { queryKey = [], ...rest } = callOpts?.infiniteOptions || {
      queryKey: [],
    };
    return useInfiniteQuery({
      queryKey: [params.entity, "cursor", params.limit, ...queryKey],
      queryFn: async ({ pageParam, signal }) => {
        if (pageParam) params.cursor = pageParam;
        return await listRaw(
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
    });
  }

  function useGet<Entity = never>(
    id?: Id,
    callOpts?: CallOptions & {
      queryOptions?: UseQueryOptions<
        UnionIfBPresent<TEntity, Entity>,
        IResponseError<null>,
        UnionIfBPresent<TEntity, Entity>,
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
        const res = await getRaw(id as Id, params, {
          ...callOpts?.options,
          requestOptions: {
            ...(callOpts?.options || {}),
            signal,
          },
        });
        // Cast the response to the expected type
        // return res.data as IApiResponse<UnionIfBPresent<TEntity, Entity>>;
        return res.data as UnionIfBPresent<TEntity, Entity>;
      },
      ...(rest ?? {}),
      enabled: !!id,
    });
  }

  function useCreate<Entity = never>(
    callOpts?: MutateCallOptions<Partial<TEntity>>
  ) {
    return useMutation<
      IApiResponse<TEntity & IPartialIfExist<Entity>>,
      // ApiModelDataTypes[T],
      IResponseError<null>,
      IPartialIfExist<TEntity>
    >({
      mutationFn: (payload: Partial<TEntity>) =>
        createRaw(payload, callOpts?.params, callOpts?.options),
      onSuccess: async (data) => {
        return data;
      },
      ...(callOpts?.mutationOptions ?? {}),
    });
  }
  function usePost<Entity = never>(
    callOpts?: MutateCallOptions<Partial<TEntity>>
  ) {
    return useMutation<
      IApiResponse<TEntity & IPartialIfExist<Entity>>,
      // ApiModelDataTypes[T],
      IResponseError<null>,
      IPartialIfExist<TEntity>
    >({
      mutationFn: (payload: Partial<TEntity>) =>
        createRaw(payload, callOpts?.params, callOpts?.options),
      onSuccess: async (data) => {
        return data;
      },
      ...(callOpts?.mutationOptions ?? {}),
    });
  }

  function useUpdate<Entity = never>(
    callOpts?: MutateCallOptions<{ id: Id; data: Partial<TEntity> }>
  ) {
    return useMutation<
      IApiResponse<TEntity & IPartialIfExist<Entity>>,
      // ApiModelDataTypes[T],
      IResponseError<null>,
      { id: Id; data: IPartialIfExist<TEntity> }
    >({
      mutationFn: ({ id, data }: { id: Id; data: Partial<TEntity> }) =>
        updateRaw(id, data, callOpts?.params, callOpts?.options),
      // onSuccess: async (_res, vars) => {},
      ...(callOpts?.mutationOptions ?? {}),
    });
  }

  function useDelete(callOpts?: MutateCallOptions<Id>) {
    return useMutation({
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
