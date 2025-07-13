import { QueryKey, useQueries, UseQueryOptions } from "@tanstack/react-query";

import { ApiModelKey, IApiResponse, IResponseError } from "@/types/Iquery";
import {
  ApiModelDataTypes,
  ApiModelMapping,
  RequestOptions,
} from "./apiModelMapping";
// type WithType<L extends ApiModelKey, M> = [M] extends [never]
//   ? ApiModelDataTypes[L][]
//   : (ApiModelDataTypes[L] & M)[];
type GetQueryParams<T extends ApiModelKey, K> = {
  modelName: T;
  slugs?: (string | undefined)[];
  requestOptions?: RequestOptions;
  queryOptions?: Partial<
    UseQueryOptions<
      IApiResponse<ApiModelDataTypes<K>[T]> | undefined,
      IResponseError<null>,
      IApiResponse<ApiModelDataTypes<K>[T]> | undefined,
      QueryKey
    >
  >;
  queryKey?: QueryKey;
};

export default function useGetItems<T extends ApiModelKey, K = never>({
  modelName,
  slugs,
  requestOptions = {},
  queryOptions = {},
  queryKey = [],
}: GetQueryParams<T, K extends never ? never : K>) {
  // const newQueryKeys = queryKey.filter((f) => f !== modelName);
  return useQueries({
    queries: (slugs || [])?.map((slug) => {
      // const newQueryKey = newQueryKeys?.includes(slug)
      //   ? [modelName, ...newQueryKeys]
      //   : [modelName, ...newQueryKeys, slug];
      return {
        queryKey: queryKey ? queryKey : [modelName, slug],
        // queryKey: newQueryKey,
        queryFn: async () => {
          if (slug) {
            const res = await ApiModelMapping[modelName].model.get<
              IApiResponse<ApiModelDataTypes<K>[T]>
            >(slug, requestOptions);
            return res.data;
          }
        },
        enabled: !!slug,
        retry: false,
        ...queryOptions,
      };
    }),
    combine: (results) => {
      return {
        data: results.map((result) => result.data),
        isLoading: results.some((result) => result.isLoading),
        error: results.map((result) => result.error),
      };
    },
  });
}
