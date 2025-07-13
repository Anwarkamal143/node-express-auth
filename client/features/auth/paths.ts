const prefix = "auth:";

export const AUTH_QUERY = {
  signOut: `${prefix}sign-out`,
} as const;
export const AUTH_PATHS = {
  signOut: "sign-out",
} as const;
