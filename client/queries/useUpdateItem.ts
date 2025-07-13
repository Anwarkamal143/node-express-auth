/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
// import isArray from "lodash/isArray";

import { isArray, normalizeObjectForAPI } from "@/lib";
import {
  ApiModelKey,
  IApiResponse,
  IResponseError,
  WithType,
} from "@/types/Iquery";
import {
  ApiModelDataTypes,
  ApiModelMapping,
  RequestOptions,
} from "./apiModelMapping";
type NormalizeObjectOptions<T> = {
  omit: (keyof T)[];
  ignore: (keyof T)[];
};
type QueryParams<T> = {
  slug: string;
  data: Partial<T>;
  queryKey?: QueryKey;
  listQueryKey?: QueryKey;
  dataKey?: keyof T;
};
export type UpdateMutationParams<
  T extends ApiModelKey,
  // TData = unknown,
  // TError = unknown,
  // TVariables = void,
  // TContext = unknown,
  K = never
> = {
  modelName: T;
  requestOptions?: RequestOptions;
  mutationOptions?: UseMutationOptions<
    IApiResponse<ApiModelDataTypes<K>[T]>,
    IResponseError<null>,
    QueryParams<ApiModelDataTypes<K>[T]>,
    unknown
  >;
  queryKey?: QueryKey;
  listQueryKey?: QueryKey;
  dataKey?: keyof ApiModelDataTypes<K>[T];
  normalizeObjectOptions?: NormalizeObjectOptions<ApiModelDataTypes<K>[T]>;
};

export default function useUpdateItem<T extends ApiModelKey, K = never>({
  modelName,
  requestOptions = {},
  mutationOptions = {},
  queryKey = [],
  listQueryKey = [],
  dataKey,
  normalizeObjectOptions = { omit: [], ignore: [] },
}: UpdateMutationParams<T, K>) {
  const queryClient = useQueryClient();
  const { model } = ApiModelMapping[modelName];

  const { omit = [], ignore = [] } = normalizeObjectOptions;

  return useMutation<
    IApiResponse<ApiModelDataTypes<K>[T]>,
    IResponseError<null>,
    QueryParams<ApiModelDataTypes<K>[T]>
  >({
    mutationFn: async ({ slug, data }) => {
      const res = await model.update(
        slug,
        normalizeObjectForAPI(
          data as ApiModelDataTypes<K>[T],
          omit,
          ignore
        ) as any,
        requestOptions
      );
      // return res.data as WithType<T, K>;
      return res as IApiResponse<ApiModelDataTypes<K>[T]>;
    },
    onSuccess: (
      _,
      { slug, data, queryKey: qk = [], listQueryKey: lk = [], dataKey: dk }
    ) => {
      // const defaultQueryKey = qk ? qk : queryKey ? queryKey : [modelName, slug];
      // let defaultQueryKey = qk.length ? qk : queryKey.length ? queryKey : [];
      // const withoutmodelandslug = defaultQueryKey
      //   .filter((f) => f != modelName)
      //   .filter((a) => a !== slug);
      // defaultQueryKey = [modelName, ...withoutmodelandslug, slug];

      // queryClient.setQueryData(
      //   defaultQueryKey,
      //   (oldData?: ApiModelDataTypes[T]) => {
      //     if (oldData) {
      //       const mewData = {
      //         ...oldData,
      //         ...data,
      //       };
      //       return mewData;
      //     }

      //     return oldData;
      //   }
      // );
      let lsQueryKey = lk.length ? lk : listQueryKey.length ? listQueryKey : [];
      lsQueryKey = lsQueryKey.filter((lf) => lf != modelName);
      lsQueryKey = [modelName, ...lsQueryKey];

      queryClient.setQueryData(lsQueryKey, (oldData: WithType<T, K>[] = []) => {
        if (isArray(oldData)) {
          return oldData.map((item) =>
            (item as any)[dk || dataKey || "id"] === slug
              ? { ...item, ...data }
              : item
          );
        }

        return oldData;
      });
    },
    retry: false,
    ...mutationOptions,
  });
}
