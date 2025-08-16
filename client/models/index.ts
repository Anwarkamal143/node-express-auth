/* eslint-disable @typescript-eslint/no-explicit-any */
import request, { API_POOL, IAxiosRequest } from "@/lib/request";
import { IApiResponse, IBIfNotA } from "@/types/Iquery";
import qs from "query-string";

export type IRequestOptions = IAxiosRequest;
class Model<ModelType = any> {
  private endpoint: string;
  private baseUrl = API_POOL["public-1"];

  constructor(endpoint: string, apiPoolName?: keyof typeof API_POOL) {
    this.endpoint = endpoint;
    if (apiPoolName) {
      this.baseUrl = API_POOL[apiPoolName];
    }
  }

  async sendRequest<DataType>(
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    data?: unknown,
    options: IRequestOptions = {
      handleError: true,
    }
  ) {
    const res = await request(`${this.endpoint}${path}`, {
      method,
      data,
      baseURL: this.baseUrl,
      ...options,
    });
    return res?.data as IApiResponse<DataType>;
  }

  async get<ReturnType = ModelType>(
    slug: string,
    options?: {
      query?: Record<string, any>;
      path?: string;
      requestOptions?: IRequestOptions;
    }
  ) {
    return await this.sendRequest<ReturnType>(
      `${options?.path ? `/${options.path}` : ""}${slug ? `/${slug}` : ""}${
        options?.query ? `?${qs.stringify(options.query)}` : ``
      }`,
      "GET",
      undefined,
      options?.requestOptions
    );
  }

  // async list<ReturnType = ModelType>(options?: {
  async list<ReturnType>(options?: {
    query?: Record<string, any>;
    path?: string;
    requestOptions?: IRequestOptions;
  }) {
    const cursor = options?.query?.cursor;
    if (options?.query?.cursor && typeof cursor === "object") {
      options.query.cursor = JSON.stringify(options.query.cursor);
    }
    // return await this.sendRequest<ReturnType[]>(
    return await this.sendRequest<IBIfNotA<ReturnType, ModelType>>(
      `${options?.path ? `/${options.path}` : ""}${
        options?.query ? `?${qs.stringify(options.query)}` : ``
      }`,
      "GET",
      undefined,
      options?.requestOptions
    );
  }

  async create<ReturnType = ModelType>(
    data: Partial<ModelType>,
    options?: {
      query?: Record<string, any>;
      path?: string;
      requestOptions?: IRequestOptions;
    }
  ) {
    return await this.sendRequest<ReturnType>(
      `${options?.path ? `/${options.path}` : ""}${
        options?.query ? `?${qs.stringify(options.query)}` : ``
      }`,
      "POST",
      data,
      options?.requestOptions
    );
  }

  async update<ReturnType = ModelType>(
    slug: string,
    data: Partial<ModelType>,
    options?: {
      query?: Record<string, any>;
      path?: string;
      requestOptions?: IRequestOptions;
    }
  ) {
    return await this.sendRequest<ReturnType>(
      `${options?.path ? `/${options.path}` : ""}${slug ? `/${slug}` : ""}${
        options?.query ? `?${qs.stringify(options.query)}` : ``
      }`,
      "PUT",
      data,
      options?.requestOptions
    );
  }

  async delete<ReturnType = ModelType | void>(
    slug: string,
    options?: {
      query?: Record<string, any>;
      path?: string;
      requestOptions?: IRequestOptions;
    }
  ) {
    return await this.sendRequest<ReturnType>(
      `${options?.path ? `/${options.path}` : ""}/${slug}${
        options?.query ? `?${qs.stringify(options.query)}` : ``
      }`,
      "DELETE",
      undefined,
      options?.requestOptions
    );
  }
}

export default Model;
