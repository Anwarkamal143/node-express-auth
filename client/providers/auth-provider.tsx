"use client";
import { PageLoader } from "@/components/loaders";
import { useSignOut } from "@/features/auth/api";
import {
  useStoreUserIsAuthenticated,
  useStoreUserIsAuthenticating,
} from "@/store/userAuthStore";
import { ReactNode, useEffect } from "react";

type IAuthProvider = {
  children: ReactNode;
  isServer?: boolean;
};

const AuthWrapper = ({ children }: IAuthProvider) => {
  const isAuthenticated = useStoreUserIsAuthenticated();
  const isAuthenticating = useStoreUserIsAuthenticating();
  const { signOut } = useSignOut();
  useEffect(() => {
    if (isAuthenticated) return;
    signOut(true);
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isAuthenticating) {
    return <PageLoader />;
  }

  return <>{children}</>;
};

export default AuthWrapper;
