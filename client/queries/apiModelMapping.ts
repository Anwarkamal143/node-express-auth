import authModelInstance from "@/models/Auth.model";
import userModelInstance from "@/models/User.model";
import { ReturnModelType } from "@/types/Iquery";
import { IAppUser } from "@/types/Iuser";

export const ApiModels = {
  Auth: "auth",
  User: "user",
} as const;

export const ThreePAppSubModels = {
  EShop: "EShop",
} as const;

export const ApiModelMapping = {
  [ApiModels.Auth]: {
    model: authModelInstance,
  },
  [ApiModels.User]: {
    model: userModelInstance,
  },
} as const;

// export type ApiModelDataTypes = {
//   [ApiModels.Auth]: IAppUser;
//   [ApiModels.Workspaces]: IWorkSpace;
//   [ApiModels.User]: IWorkSpace;
//   [ApiModels.Members]: IWorkspaceMember;
// };
export type ApiModelDataTypes<T = never> = {
  [ApiModels.Auth]: ReturnModelType<IAppUser, T>;
  [ApiModels.User]: ReturnModelType<IAppUser, T>;
};

export type RequestOptions = {
  query?: Record<string, any>;
  path?: string | undefined;
};

// type WithType<L extends keyof typeof ApiModelMapping, M> = [M] extends [never]
//   ? ApiModelDataTypes[L]
//   : ApiModelDataTypes[L] & M;

// type UnionIfBPresent<A, B> = [B] extends [never] ? A : A & B;
// type ReturnModelType<A, B> = [B] extends [never]
//   ? A
//   : HasProperty<B, "replace_type"> extends true
//   ? B
//   : UnionIfBPresent<A, B>;
// type ApiModelKey = keyof typeof ApiModelMapping;
