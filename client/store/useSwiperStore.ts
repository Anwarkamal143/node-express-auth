import { IAsset } from "@/types/Iupload";
import { Swiper } from "swiper/types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { storeResetFns } from "./useGlobalStore";

type ISwiperState = {
  activeIndex?: number;
  items: IAsset[];
  onClose: (swiper?: Swiper) => void;
  isOpen?: boolean;
};

type ISwiperActions = {
  setState: (props: Partial<ISwiperState>) => void;
  reset: () => void;
};
const INITIAL_STATE = {
  acactiveIndex: 0,
  items: [],
  isOpen: false,
};
const useSwiperStore = create<ISwiperActions & ISwiperState>()(
  immer((set) => {
    storeResetFns.add(() => set(INITIAL_STATE));

    return {
      ...INITIAL_STATE,
      setState(props) {
        set(props);
      },
      onClose() {
        set(INITIAL_STATE);
      },
      reset() {
        set(INITIAL_STATE);
      },
    };
  })
);

export default useSwiperStore;

export const useStoreSwiperActiveIndex = () =>
  useSwiperStore((state) => state.activeIndex);
export const useStoreSwiperIsOpen = () =>
  useSwiperStore((state) => state.isOpen);
export const useStoreSwiperItems = () => useSwiperStore((state) => state.items);

export const useStoreSwiperActions = () => ({
  setState: useSwiperStore((state) => state.setState),
  onClose: useSwiperStore((state) => state.onClose),
  reset: useSwiperStore((state) => state.reset),
});
