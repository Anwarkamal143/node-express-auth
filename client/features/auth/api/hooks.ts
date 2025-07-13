/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiModels } from "@/queries/apiModelMapping";
import useCreateItem from "@/queries/useCreateItem";
import { useStoreAuthActions } from "@/store/userAuthStore";

import { IAppUser } from "@/types/user";
import { SignInSchemaType, SignUpSchemaType } from "../schema";
const AUTH_QUERY_KEYS = {
  register: "register",
  login: "login",
};
const AUTH_QUERY_PATHS = {
  register: "register",
  login: "login",
};

export function useSignIn() {
  const { mutateAsync, isError, isPending, isSuccess, error } = useCreateItem<
    typeof ApiModels.Auth,
    { accessToken: string; refreshToken: string }
  >({
    modelName: ApiModels.Auth,
    queryKey: ["login"],

    requestOptions: {
      path: "login",
    },
  });

  const handleSignIn = async (data: SignInSchemaType) => {
    const res = await mutateAsync({
      data: data as IAppUser,
    });

    return res;
  };
  return { handleSignIn, isError, isPending, isSuccess, error };
}

type ITokens = { accessToken: string; refreshToken: string };
export function useRegisterUser() {
  const { setTokens } = useStoreAuthActions();
  const { mutateAsync, isError, isPending, isSuccess, error } = useCreateItem<
    typeof ApiModels.Auth,
    ITokens
  >({
    modelName: ApiModels.Auth,
    queryKey: [AUTH_QUERY_KEYS.register],
    requestOptions: {
      path: AUTH_QUERY_PATHS.register,
    },
  });

  const handleRegister = async (data: SignUpSchemaType) => {
    const res = await mutateAsync({
      data: data as any,
    });
    if (res.data) {
      const { accessToken, refreshToken } = res.data;
      setTokens({
        accessToken: accessToken,
        refreshToken,
        isRefreshing: false,
      });
    }
    return res;
  };

  return { handleRegister, isError, isPending, isSuccess, error };
}
