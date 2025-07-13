/* eslint-disable @typescript-eslint/no-explicit-any */
import { appSignOut, withErrorHandler } from "@/lib";
import { ApiModels } from "@/queries/apiModelMapping";
import useCreateItem from "@/queries/useCreateItem";
import { AUTH_PATHS, AUTH_QUERY } from "../paths";

const useSignOut = () => {
  const {
    isPending: isLoading,
    mutateAsync,
    error,
  } = useCreateItem({
    queryKey: [AUTH_QUERY.signOut],
    modelName: ApiModels.Auth,
    requestOptions: {
      path: AUTH_PATHS.signOut,
    },
  });

  const signOut = withErrorHandler(async (redirect: boolean = true) => {
    try {
      const resp = await mutateAsync({
        data: {} as any,
      });
      if (redirect && resp?.success) {
        appSignOut();
        return;
      }
      if (resp?.success) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  return { signOut, error, isSigningOut: isLoading };
};

export default useSignOut;
