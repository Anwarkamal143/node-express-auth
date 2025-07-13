import { ApiModels } from "@/queries/apiModelMapping";
import useGetItem from "@/queries/useGetItem";
import { USER_PATHS, USER_QUERY } from "../paths";

export const useGetLoggedInUser = (isEnabled: boolean = true) => {
  return useGetItem({
    queryKey: [USER_QUERY.me],
    slug: USER_PATHS.me,
    modelName: ApiModels.User,
    queryOptions: {
      enabled: !!isEnabled,
      staleTime: 60 * 1000,
    },
  });
};
