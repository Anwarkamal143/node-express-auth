import { secondaryRequest } from "@/lib/request";
import useSignOut from "./use-sign-out";
export const getRefreshToken = async (
  token?: string,
  refreshToken?: string
) => {
  let headers = {};
  if (token && refreshToken) {
    headers = {
      authorization: `Bearer ${token}`,
      refreshToken,
    };
  }
  const res = await secondaryRequest("auth/refresh-tokens", {
    headers,
  });

  return res.data;
};
export { useSignOut };
