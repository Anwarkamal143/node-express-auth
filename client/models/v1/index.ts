/* eslint-disable @typescript-eslint/no-explicit-any */
import request, { API_POOL, IAxiosRequest } from "@/lib/request";
import { IApiResponse, IBIfNotA } from "@/types/Iquery";
import qs from "query-string";

export type IRequestOptions = IAxiosRequest;
class Model<
  EntityType = any,
  QueryParams extends Record<string, any> = Record<string, any>
> {
  private endpoint: string;
  private baseUrl: string;

  constructor(endpoint: string, apiPoolName?: keyof typeof API_POOL) {
    this.endpoint = endpoint;
    this.baseUrl = apiPoolName ? API_POOL[apiPoolName] : API_POOL["public-1"];
  }

  async sendRequest<T>(
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    data?: unknown,
    options: IRequestOptions = { handleError: true }
  ): Promise<IApiResponse<T>> {
    const res = await request(`${this.endpoint}${path}`, {
      method,
      data,
      baseURL: this.baseUrl,
      ...options,
    });
    return res?.data as IApiResponse<T>;
  }

  async get<ReturnType = EntityType>(
    slug: string | number,
    options?: {
      query?: QueryParams;
      path?: string;
      requestOptions?: IRequestOptions;
    }
  ) {
    const queryString = options?.query ? `?${qs.stringify(options.query)}` : "";
    const path = `${options?.path ? `/${options.path}` : ""}${
      slug ? `/${slug}` : ""
    }${queryString}`;
    return this.sendRequest<ReturnType>(
      path,
      "GET",
      undefined,
      options?.requestOptions
    );
  }

  async list<ReturnType = EntityType>(options?: {
    query?: QueryParams;
    path?: string;
    requestOptions?: IRequestOptions;
  }) {
    let query = options?.query || ({} as QueryParams);
    if (query?.cursor && typeof query?.cursor === "object") {
      query = { ...query, cursor: JSON.stringify(query.cursor) };
    }
    const queryString = Object.keys(query).length
      ? `?${qs.stringify(query)}`
      : "";
    const path = `${options?.path ? `/${options.path}` : ""}${queryString}`;
    return this.sendRequest<IBIfNotA<ReturnType, EntityType>>(
      path,
      "GET",
      undefined,
      options?.requestOptions
    );
  }

  async create<ReturnType = EntityType>(
    data: Partial<EntityType>,
    // data: ReturnType & IPartialIfExist<Tvars>,
    options?: {
      query?: QueryParams;
      path?: string;
      requestOptions?: IRequestOptions;
    }
  ) {
    const queryString = options?.query ? `?${qs.stringify(options.query)}` : "";
    const path = `${options?.path ? `/${options.path}` : ""}${queryString}`;
    return this.sendRequest<ReturnType>(
      path,
      "POST",
      data,
      options?.requestOptions
    );
  }

  async update<ReturnType = EntityType>(
    slug: string | number,
    data: Partial<EntityType>,
    options?: {
      query?: QueryParams;
      path?: string;
      requestOptions?: IRequestOptions;
    }
  ) {
    const queryString = options?.query ? `?${qs.stringify(options.query)}` : "";
    const path = `${
      options?.path ? `/${options.path}` : ""
    }/${slug}${queryString}`;
    return this.sendRequest<ReturnType>(
      path,
      "PUT",
      data,
      options?.requestOptions
    );
  }

  async delete<ReturnType = EntityType | void>(
    slug: string | number,
    options?: {
      query?: QueryParams;
      path?: string;
      requestOptions?: IRequestOptions;
    }
  ) {
    const queryString = options?.query ? `?${qs.stringify(options.query)}` : "";
    const path = `${
      options?.path ? `/${options.path}` : ""
    }/${slug}${queryString}`;
    return this.sendRequest<ReturnType>(
      path,
      "DELETE",
      undefined,
      options?.requestOptions
    );
  }
}

export default Model;
