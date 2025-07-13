/* eslint-disable @typescript-eslint/no-explicit-any */
import { RefObject, useCallback, useEffect } from "react";
type Event = MouseEvent | TouchEvent;
// Hook
export const useOnClickOutside = (
  ref: RefObject<any>,
  // handler: (...arg: any[]) => void
  handler: (event: Event) => void
): Record<string, any> | null | void => {
  const eventHandler = useCallback(handler, [handler]);
  const listener = (event: MouseEvent | TouchEvent) => {
    const el = ref?.current;
    // Do nothing if clicking ref's element or descendent elements
    if (!el || el.contains(event.target)) {
      return;
    }

    eventHandler(event);
  };
  useEffect(
    () => {
      document.addEventListener("mousedown", listener);
      document.addEventListener("touchstart", listener);

      return () => {
        document.removeEventListener("mousedown", listener);
        document.removeEventListener("touchstart", listener);
      };
    },
    // Add ref and handler to effect dependencies
    // It's worth noting that because passed in handler is a new ...
    // ... function on every render that will cause this effect ...
    // ... callback/cleanup to run every render. It's not a big deal ...
    // ... but to optimize you can wrap handler in useCallback before ...
    // ... passing it into this hook.
    [ref, eventHandler]
  );
};
