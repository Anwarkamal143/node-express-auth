import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type IUserActions = {
  reset: () => void;
};
const INITIAL_STATE = {};
export const storeResetFns = new Set<() => void>();
export const resetAllStores = () => {
  storeResetFns.forEach((resetFn) => {
    resetFn();
  });
};
const useGlobalStore = create<IUserActions>()(
  immer((set) => {
    storeResetFns.add(() => set(INITIAL_STATE));
    return {
      ...INITIAL_STATE,

      reset() {
        set(INITIAL_STATE);
      },
    };
  })
);

export default useGlobalStore;

export const useGlobalStoreActions = () => ({
  reset: useGlobalStore((state) => state.reset),
});
