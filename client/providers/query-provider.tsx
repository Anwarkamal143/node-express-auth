"use client";
import NetWorkStatus from "@/components/network-status";
import { getQueryClient } from "@/get-query-client";

import { Toaster } from "@/components/ui/sonner";
// import useRefreshToken from "@/hooks/useRefreshToken";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import AppWrapper from "./app-wrapper";

// const RefreshTokens = () => {
//   useRefreshToken();

//   // console.log({ refreshTokenData, accessTokenData, userData });
//   return null;
// };

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {/* <RefreshTokens /> */}
      <NetWorkStatus />
      <AppWrapper>{children}</AppWrapper>
      <Toaster richColors />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
