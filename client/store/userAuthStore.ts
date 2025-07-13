import { IAccount, IUser } from "@/types/user";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { storeResetFns } from "./useGlobalStore";

type IAuthState = {
  user?: IUser;
  accounts?: IAccount[];
  isAuthenticated?: boolean;
  isLoggedIn?: boolean;
  isAuthenticating?: boolean;
  accessToken?: string;
  refreshToken?: string;
  isTokensRefreshing?: boolean;
};

type IUserActions = {
  setUser: (props: IAuthState) => void;

  reset: () => void;
  setTokens: (props: {
    accessToken?: string;
    refreshToken?: string;
    isRefreshing?: boolean;
  }) => void;
  setIsTokensRefreshing: (isRefreshing: boolean) => void;
};
const INITIAL_STATE: IAuthState = {
  user: undefined,
  accounts: [],
  isAuthenticated: false,
  isLoggedIn: false,
  isAuthenticating: false,
  accessToken: undefined,
  refreshToken: undefined,
  isTokensRefreshing: false,
};
const useAuthStore = create<IUserActions & IAuthState>()(
  immer((set) => {
    storeResetFns.add(() => set(INITIAL_STATE));

    return {
      ...INITIAL_STATE,
      isAuthenticating: true,
      setUser(props) {
        set((state) => {
          Object.assign(state, props);
        });
      },
      setTokens({ accessToken, refreshToken, isRefreshing = false }) {
        set((state) => {
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isTokensRefreshing = isRefreshing;
        });
      },
      setIsTokensRefreshing(isRefreshing) {
        set((state) => {
          state.isTokensRefreshing = isRefreshing;
        });
      },
      reset() {
        set(INITIAL_STATE);
      },
    };
  })
);

export default useAuthStore;

export const useStoreUserIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useStoreUserIsLoggedIn = () =>
  useAuthStore((state) => state.isLoggedIn);
export const useStoreUserAccounts = () =>
  useAuthStore((state) => state.accounts);
export const useStoreUser = () => useAuthStore((state) => state.user);
export const useStoreUserIsAuthenticating = () =>
  useAuthStore((state) => state.isAuthenticating);
export const useAuthAccessToken = () =>
  useAuthStore((state) => state.accessToken);
export const useAuthRefreshToken = () =>
  useAuthStore((state) => state.refreshToken);
export const useAuthIsTokensRefreshing = () =>
  useAuthStore((state) => state.isTokensRefreshing);
export const authStore = () => useAuthStore.getState();

export const useStoreAuthActions = () => ({
  setUser: useAuthStore((state) => state.setUser),
  reset: useAuthStore((state) => state.reset),
  setTokens: useAuthStore((state) => state.setTokens),
  setIsTokensRefreshing: useAuthStore((state) => state.setIsTokensRefreshing),
});
