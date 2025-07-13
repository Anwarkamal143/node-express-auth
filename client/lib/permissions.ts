/* eslint-disable @typescript-eslint/no-explicit-any */
import { IRole, Role } from "@/lib/enumTypes";

type IPermissions = {
  role: IRole | null;
  [key: string]: any;
};
export const canAccess = (
  data?: IPermissions | null,
  roles: IRole[] = [Role.ADMIN]
) => {
  if (!data?.role) {
    return false;
  }
  return roles.includes(data.role);
};
