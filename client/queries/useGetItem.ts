import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query";

import { IRequestOptions } from "@/models";
import { ApiModelKey, IApiResponse, IResponseError } from "@/types/Iquery";
import {
  ApiModelDataTypes,
  ApiModelMapping,
  RequestOptions,
} from "./apiModelMapping";
// type QueryOptions<T extends ApiModelKey, K, isPaginated = never> = Partial<
//   UseQueryOptions<
//     // ApiModelDataTypes[T] | undefined,
//     [isPaginated] extends [never]
//       ? IApiResponse<ApiModelDataTypes<K>[T]> | null
//       : ApiModelDataTypes<K>[T] | null,
//     unknown,
//     // ApiModelDataTypes[T] | undefined,
//     [isPaginated] extends [never]
//       ? IApiResponse<ApiModelDataTypes<K>[T]>
//       : ApiModelDataTypes<K>[T],
//     QueryKey
//   >
// >;

type IsPaginated = {
  isPaginated?: boolean;
};

type GetQueryParams<T extends ApiModelKey, K> = IsPaginated & {
  modelName: T;
  slug?: string;
  requestOptions?: RequestOptions & { requestOptions?: IRequestOptions };
  queryKey?: QueryKey;
  queryOptions?: Partial<
    UseQueryOptions<
      // ApiModelDataTypes[T] | undefined,
      IApiResponse<ApiModelDataTypes<K>[T]> | null,
      IResponseError<null>,
      // ApiModelDataTypes[T] | undefined,
      IApiResponse<ApiModelDataTypes<K>[T]>,
      QueryKey
    >
  >;
};

//   | {
//       isPaginated?: false;
//       queryOptions?: Partial<
//         UseQueryOptions<
//           // ApiModelDataTypes[T] | undefined,
//           WithType<T, K> | null,
//           unknown,
//           // ApiModelDataTypes[T] | undefined,
//           WithType<T, K>,
//           QueryKey
//         >
//       >;
//     }
// );
export default function useGetItem<T extends ApiModelKey, K = never>({
  modelName,
  slug,
  requestOptions = {},
  queryOptions = {},
  queryKey = [],
}: GetQueryParams<T, K extends never ? never : K>) {
  // const newQueryKeys = queryKey.filter((f) => f !== modelName);
  // const newQueryKey = newQueryKeys?.includes(slug)
  //   ? [modelName, ...newQueryKeys]
  //   : [modelName, ...newQueryKeys, slug];

  return useQuery({
    queryKey: queryKey ? queryKey : [modelName, slug],
    // queryKey: newQueryKey,
    queryFn: async () => {
      if (slug) {
        const res = await ApiModelMapping[modelName].model.get(
          slug,
          requestOptions
        );

        return res as IApiResponse<ApiModelDataTypes<K>[T]>;
      }

      return await Promise.resolve(null);
    },

    enabled: !!slug,
    retry: false,
    ...queryOptions,
  });
}
