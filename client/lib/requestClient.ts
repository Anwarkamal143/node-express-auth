// apiClient.ts
import { API_BASE_URL } from "@/config";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { axiosRequest } from "./request";

/**
 * Creates a configured axios instance.
 * You can provide your own instance to the factory to use custom interceptors/auth.
 */
export function createAxiosInstance(
  baseURL: string = API_BASE_URL,
  config?: AxiosRequestConfig
): AxiosInstance {
  return axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
    ...config,
  });
}
export const defaultAciosIntance = createAxiosInstance();
/**
 * Generic request helper that returns `response.data`.
 * Using this keeps a single place where axios is called.
 */
export async function httpRequest<T>(
  // axiosInstance: AxiosInstance = defaultAciosIntance,
  cfg: AxiosRequestConfig
): Promise<T> {
  // const res = await axiosInstance.request<T>(cfg);
  const res = await axiosRequest.request<T>(cfg);
  return res.data;
}

/** Generic request helper that returns response.data */
export async function http<T>(
  // axiosInstance: AxiosInstance,
  cfg: AxiosRequestConfig
): Promise<T> {
  // const res = await axiosInstance.request<T>(cfg);
  const res = await axiosRequest.request<T>(cfg);
  return res.data;
}
