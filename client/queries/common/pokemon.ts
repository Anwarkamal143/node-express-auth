import {
  ApiModelDataTypes,
  ApiModelMapping,
  RequestOptions,
} from "@/queries/apiModelMapping";
import { QueryKey, UseQueryOptions, queryOptions } from "@tanstack/react-query";

export const pokemonOptions = <T extends keyof typeof ApiModelMapping>(
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
    queryKey: queryKey,
    queryFn: async () => {
      const res = await ApiModelMapping[model].model.get<ApiModelDataTypes[T]>(
        slug,
        requestOptions
      );
      return res as unknown as ApiModelDataTypes[T];
    },
    ...queryOptioins,
  });
};

// export const pokemonOptions = queryOptions({
//   queryKey: ["pokemon"],
//   queryFn: async () => {
//     const response = await fetch("https://pokeapi.co/api/v2/pokemon/25");

//     return response.json();
//   },
// });
