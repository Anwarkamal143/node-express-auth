type ApiResponse<T> = {
  data: T;
  cursor?: { [key: string]: string } | string | number;
  [key: string]: unknown;
};
type IPaginationMeta = {
  next?: number | string;
  previous?: number | string;
  totalRecords: number;
  totalPages: number;
  limit: number;
  current?: number | string;
  isFirst?: boolean;
  isLast?: boolean;
  direction?: 'next' | 'prev';
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
  'data' | 'errorHandled' | 'headers' | 'request'
> & {
  data: ICommon<T>;
};
type UnionIfBPresent<A, B> = [B] extends [never] ? A : A & B;
type ReturnModelType<A, B> = [B] extends [never]
  ? A
  : HasProperty<B, 'replace_type'> extends true
    ? B
    : UnionIfBPresent<A, B>;
