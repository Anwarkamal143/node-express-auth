/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodeNumbers } from "@/lib/errorCodes";
import { CustomResponse } from "@/lib/request";
import { ApiModelDataTypes, ApiModelMapping } from "@/queries/apiModelMapping";

type ApiResponse<T> = {
  data: T;
  cursor?: { [key: string]: string } | string | number;
  [key: string]: unknown;
};
type IPaginationMeta = {
  nextCursor?: number | string;
  previousCursor?: number | string;
  previousCursor?: number | string;
  hasPreviousPage?: boolean;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  pageSize: number;
  page?: number;
  nextPage?: number;
  isFirstPage?: boolean;
  isLastPage?: boolean;
  currentPage?: number;
  previousPage?: number;
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
type IApiResponse1<T> = T & {
  cursor?: { [key: string]: string } | string | number;
  metadata?: { [key: string]: string } | string | number;
  pagination_meta?: IPaginationMeta;
  [key: string]: unknown;
};
type ISingleApiResponse<T> = T & {
  [key: string]: unknown;
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
  : HasProperty<B, "replace_type"> extends true
  ? B
  : UnionIfBPresent<A, B>;
type ApiModelKey = keyof typeof ApiModelMapping;
type WithType<L extends keyof typeof ApiModelMapping, M> = [M] extends [never]
  ? ApiModelDataTypes[L]
  : ApiModelDataTypes[L] & M;
