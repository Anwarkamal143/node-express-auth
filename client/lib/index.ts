/* eslint-disable @typescript-eslint/no-explicit-any */
import { getQueryClient } from "@/get-query-client";
import { resetAllStores } from "@/store/useGlobalStore";
import { IResponseError } from "@/types/Iquery";

export function _omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = {} as Omit<T, K>;
  for (const key in obj) {
    if (!keys.includes(key as unknown as K)) {
      (result as any)[key] = obj[key];
    }
  }
  return result;
}
export const stringToNumber = (strNumber?: string): number | undefined => {
  if (strNumber === null || strNumber === undefined) return undefined;
  const strTypeof = typeof strNumber;
  if (strTypeof !== "string" && strTypeof !== "number") return undefined;
  if (strTypeof === "string" && strNumber.trim() == "") return undefined;
  const number = 1 * (strNumber as unknown as number);
  return isNaN(number) ? undefined : number;
};
export const isArray = (args: any) => Array.isArray(args);

export const wait = async (time: number = 0) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return new Promise((resolve, _reject) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
};

export const normalizeObjectForAPI = <T>(
  object: T,
  omit: (keyof T)[] = [],
  ignore: (keyof T)[] = []
): Partial<T> => {
  return _omit(
    object as any,
    ["created_at", "slug", "updated_at", "id", "is_deleted", ...omit].filter(
      (item) => !ignore.includes(item as keyof T)
    )
  ) as Partial<T>;
};

export function generateUUID() {
  let dt = new Date().getTime();
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c) {
      const r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    }
  );
  return uuid;
}

export const withErrorHandler = <TArgs extends any[], TResponse>(
  handler: (...args: TArgs) => Promise<TResponse>
): ((...args: TArgs) => Promise<TResponse>) => {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error: any) {
      console.error("An error occurred:", error instanceof Error, error);
      if (error.data) {
        const { message, data = {}, statusText, status } = error as any;
        return {
          ...data,
          statusText,
          result: data.status,
          status: status,
          message: data.message || message,
          success: false,
        };
      }
      return error as IResponseError<TResponse>;
    }
  };
};

export const isServer = typeof window === "undefined" || "Deno" in globalThis;

export const appSignOut = () => {
  const client = getQueryClient();
  client.clear();
  resetAllStores();
  // 5. Navigate and refresh cleanly
  window.location.replace("/login");
};
