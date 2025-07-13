"use client";
import { Loader } from "@/components/loaders";
import { useGetLoggedInUser } from "@/features/user/api";
import {
  useStoreAuthActions,
  useStoreUserIsAuthenticating,
} from "@/store/userAuthStore";
import { ReactNode, useEffect } from "react";
import SocketContextProvider from "./SocketProvider";

type IAppWrapper = {
  children: ReactNode;
};

const AppWrapper = ({ children }: IAppWrapper) => {
  const { data: userData, isFetching } = useGetLoggedInUser();
  const { setUser } = useStoreAuthActions();
  const isAuthenticating = useStoreUserIsAuthenticating();

  useEffect(() => {
    if (isFetching) return;
    if (userData?.data) {
      const { accounts, ...rest } = userData.data;
      setUser({
        user: rest,
        accounts,
        isAuthenticated: true,
        isLoggedIn: true,
        isAuthenticating: false,
        isTokensRefreshing: false,
      });
      return;
    }
    setUser({
      user: undefined,
      accounts: undefined,
      isAuthenticated: false,
      isLoggedIn: false,
      isAuthenticating: false,
      isTokensRefreshing: false,
    });
    return () => {};
  }, [isFetching]);

  const isLoading = isFetching || isAuthenticating;
  if (isLoading) {
    return <Loader className="h-12 w-12" size="xlg" full />;
  }

  return <SocketContextProvider>{children}</SocketContextProvider>;
};

export default AppWrapper;
