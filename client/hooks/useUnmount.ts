import { useEffect } from "react";

/**
 * Runs a function only when the component unmounts.
 * @param cleanupFn - Function to run on unmount
 */
export function useUnmount(cleanupFn: () => void) {
  useEffect(() => {
    return () => {
      cleanupFn();
    };
  }, []);
}
