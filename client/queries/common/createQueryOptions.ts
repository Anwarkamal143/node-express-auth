import {
  ApiModelDataTypes,
  ApiModelMapping,
  RequestOptions,
} from "@/queries/apiModelMapping";
import { QueryKey, UseQueryOptions, queryOptions } from "@tanstack/react-query";

export const createQueryOptions = <T extends keyof typeof ApiModelMapping>(
  model: T,
  queryKey: QueryKey,
  options: {
    slug?: string;
    requestOptions?: RequestOptions;
    queryOptioins?: UseQueryOptions<
      ApiModelDataTypes[T],
      Error,
      ApiModelDataTypes[T],
      QueryKey
    >;
  } = {}
) => {
  const { slug = "", requestOptions = {}, queryOptioins = {} } = options;

  return queryOptions({
    queryKey: queryKey ? queryKey : [model, slug],
    // queryKey: queryKey,
    queryFn: async () => {
      const res = await ApiModelMapping[model].model.get<ApiModelDataTypes[T]>(
        slug,
        requestOptions
      );
      return res.data;
    },
    ...queryOptioins,
  });
};
