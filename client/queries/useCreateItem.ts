/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  MutationKey,
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { produce } from "immer";

import { isArray } from "@/lib";
import { IRequestOptions } from "@/models";
import { ApiModelKey, IApiResponse, IResponseError } from "@/types/Iquery";
import {
  ApiModelDataTypes,
  ApiModelMapping,
  RequestOptions,
} from "./apiModelMapping";
type IQueryRequestOptions = RequestOptions & {
  requestOptions?: IRequestOptions;
};
type QueryParams<T> = {
  data: T;
  queryKey?: QueryKey;
  requestOptions?: IQueryRequestOptions;
};
type IQueryParams<T> = T extends never ? never : Partial<T>;
// type T = ApiModelNameKey;
type CreateMutationParams<T extends ApiModelKey, K, Q> = {
  modelName: T;
  requestOptions?: IQueryRequestOptions;
  mutationOptions?: Partial<
    UseMutationOptions<
      // ApiModelDataTypes[T],
      IApiResponse<ApiModelDataTypes<K>[T]>,
      IResponseError<null>,
      QueryParams<ApiModelDataTypes<IQueryParams<Q>>[T]>,
      unknown
    >
  >;
  queryKey?: MutationKey;
  isPaginated?: boolean;
};

export default function useCreateItem<
  T extends ApiModelKey,
  K = never,
  Q = never
>({
  modelName,
  queryKey = [],
  requestOptions = {},
  mutationOptions = {},
  isPaginated,
}: CreateMutationParams<T, K, Q>) {
  const queryClient = useQueryClient();

  return useMutation<
    IApiResponse<ApiModelDataTypes<K>[T]>,
    // ApiModelDataTypes[T],
    IResponseError<null>,
    QueryParams<ApiModelDataTypes<IQueryParams<Q>>[T]>
  >({
    mutationFn: async ({ data, requestOptions: rOptions = {} }) => {
      const res = await ApiModelMapping[modelName].model.create(data as any, {
        ...{ ...requestOptions, ...rOptions },
      });

      return res as IApiResponse<ApiModelDataTypes<K>[T]>;
    },

    onSuccess: (data, { queryKey: qk = [] }) => {
      let defaultQueryKey = qk.length ? qk : queryKey.length ? queryKey : [];
      const withoutmodel = defaultQueryKey.filter((f) => f != modelName);
      defaultQueryKey = [modelName, ...withoutmodel];

      queryClient.setQueryData(
        defaultQueryKey,
        (oldData: ApiModelDataTypes<K>[T][] = []) => {
          if (isArray(oldData)) {
            if (data) {
              return [...oldData, data];
            }
          }
          // If data is paginated add to first page
          if (isPaginated) {
            const paginatedData: any = oldData;
            if (
              isArray(paginatedData.pages) &&
              paginatedData.pages?.[0]?.data?.length > 0
            ) {
              const nextState = produce(paginatedData, (draftState: any) => {
                draftState.pages[0].data.unshift(data);
              });
              return nextState as any;
            } else {
              queryClient.invalidateQueries({
                queryKey: defaultQueryKey,
              });
            }
          }

          return oldData;
        }
      );
      return data;
    },
    mutationKey: queryKey,
    retry: false,
    ...mutationOptions,
  });
}
