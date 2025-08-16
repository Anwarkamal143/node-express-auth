/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodeNumbers } from "@/lib/errorCodes";
import { CustomResponse } from "@/lib/requestBackup";
import { ApiModelDataTypes, ApiModelMapping } from "@/queries/apiModelMapping";
type IPartialIfExist<T> = T extends never ? never : Partial<T>;
type IBIfNotA<A, B> = A extends never ? B : A;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
// type ApiResponse<T> = {
//   data: T;
//   cursor?: { [key: string]: string } | string | number;
//   [key: string]: unknown;
// };
type IPaginationMeta = {
  isFirst?: boolean;
  isLast?: boolean;
  current?: number | string;
  next?: number | string;
  previous?: number | string;
  totalRecords: number;
  totalPages: number;
  limit: number;
  direction?: "next" | "prev";
  hasMore?: boolean;
};

type ICommon<T> = {
  message: string;
  data?: T;
  extra?: T | any;
  success?: true | false;
  status: StatusCodeNumbers;
  time: number;
};
type IApiResponse<T> = ICommon<T> & {
  cursor?: { [key: string]: string } | string | number;
  metadata?: { [key: string]: string } | string | number;
  pagination_meta?: IPaginationMeta;
  [key: string]: unknown;
};
type IApiResponseHooks<T> = Omit<ICommon<T>, "status" | "time" | "message"> & {
  cursor?: { [key: string]: string } | string | number;
  metadata?: { [key: string]: string } | string | number;
  pagination_meta?: IPaginationMeta;
  [key: string]: unknown;
};
type IPaginatedReturnType<T> = {
  data: T;
  pagination_meta: IPaginationMeta;
};
type IResponseError<T = never> = Omit<
  CustomResponse,
  "data" | "errorHandled" | "headers" | "request"
> & {
  data: ICommon<T>;
};
type UnionIfBPresent<A, B> = [B] extends [never] ? A : A & B;
type ReturnModelType<A, B> = [B] extends [never]
  ? A
  : HasKey<B, "replace_type"> extends true
  ? B
  : UnionIfBPresent<A, B>;
type ApiModelKey = keyof typeof ApiModelMapping;
type WithType<L extends keyof typeof ApiModelMapping, M> = [M] extends [never]
  ? ApiModelDataTypes[L]
  : ApiModelDataTypes[L] & M;
