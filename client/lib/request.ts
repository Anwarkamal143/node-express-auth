/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_BASE_URL, POKEMON_API_BASE_URL } from "@/config";
import useAuthStore from "@/store/userAuthStore";
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import { appSignOut } from ".";

const codeMessage: { [key: string]: string } = {
  200: "The request has succeeded",
  201: "New resource has been created ",
  202: "The request has been received",
  204: "No Content",
  400: "The server could not understand the request due to invalid syntax.",
  401: "Unauthorized Operation",
  403: "You do not have access rights to the content",
  404: "Not Found",
  406: "Not Acceptable",
  410: "The request content is not longer available",
  422: "The request was well-formed but was unable to be followed due to semantic errors.",
  500: "The server has encountered a situation it doesn't know how to handle",
  502: "Bad Gateway",
  503: "The server is not ready to handle the request",
  504: "Timeout",
};

export const API_POOL = {
  //   "user-mng": process.env.REACT_APP_USER_MNG_BASE_URL,
  //   "dev-sett": process.env.REACT_APP_DEV_SETT_BASE_URL,
  //   "gui-fusion": process.env.REACT_APP_GUI_FUSION_BASE_URL,
  //   "data-mng": process.env.REACT_APP_DATA_MNG_BASE_URL,
  //   contact: process.env.REACT_APP_CONTACT_BASE_URL,
  //   "public-1": process.env.REACT_APP_PUBLIC_API_1_BASE_URL,
  "public-1": API_BASE_URL,
  "pokemon-1": POKEMON_API_BASE_URL,
} as const;

const baseURL = API_POOL["public-1"];
// const baseURL = 'https://401d-182-184-90-121.eu.ngrok.io';

const TOKEN_PAYLOAD_KEY = "authorization";

export interface IAxiosRequest extends Partial<AxiosRequestConfig> {
  public?: boolean;
  handleError?: boolean;
  attachToken?: boolean;
  attachAccountId?: boolean;
  token?: string;
  _retry?: boolean; // Internal flag to avoid infinite loops
}

function createAxiosInstance(base: string) {
  return axios.create({
    baseURL: base,
    timeout: 60000,
    withCredentials: true,
  });
}
const axiosRequest = createAxiosInstance(baseURL);
const axiosSecondaryRequest = createAxiosInstance(baseURL);

// export let requestQueue: any = [];
type RequestQueueCallback = () => void;
export let requestQueue: RequestQueueCallback[] = []; // Queue to hold pending requests
// Add request interceptor

axiosRequest.interceptors.request.use(
  (reqConfig: InternalAxiosRequestConfig<any> & IAxiosRequest) => {
    const { attachToken = true, token = "", ...config } = reqConfig;
    const authStore = useAuthStore.getState();
    if (attachToken) {
      // const token = getLocalStorage("token", false);
      const jToken = token || authStore.accessToken;

      const jwtToken = `Bearer ${jToken}`;

      if (jToken) {
        config.headers[TOKEN_PAYLOAD_KEY] = jwtToken;
      }

      if (!jToken && !config.public) {
        return Promise.reject("Attach a token in request or mark it public");
      }
    }
    return config;
  },
  (error) => {
    // Do something with request error here
    // notification.error({
    // 	message: 'Error'
    // })
    Promise.reject(error);
  }
);

axiosRequest.interceptors.response.use(
  (response: AxiosResponse) => {
    // if (
    //   ["post", "put", "patch", "delete"].includes(response.config.method || "")
    // ) {
    //   toast.success(response.data?.message || "Success");
    // }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as IAxiosRequest;
    const authStore = useAuthStore.getState();
    console.log(error.response?.data, "checking error");
    // Skip if already retried
    if (
      error?.response?.status === 401 &&
      error.response?.data?.code === "AUTH_EXPIRED_TOKEN" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      authStore.setIsTokensRefreshing(true);

      try {
        const refreshtoken = authStore.refreshToken;
        if (!refreshtoken) throw new Error("No refresh token");

        const res = await axiosSecondaryRequest.post(
          `${baseURL}/auth/refresh-tokens`,
          null,
          {
            headers: {
              refreshtoken,
            },
          }
        );

        const newAccessToken = res?.data?.accessToken;
        const newRefreshToken = res?.data?.refreshToken;
        authStore.setTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          isRefreshing: false,
        });

        originalRequest.headers![
          TOKEN_PAYLOAD_KEY
        ] = `Bearer ${newAccessToken}`;

        // Resolve queued requests
        requestQueue.forEach((cb) => cb());
        requestQueue = [];

        return axiosRequest(originalRequest).catch((e) => {
          const handleError = originalRequest.handleError ?? true;
          if (handleError) {
            throw errorHandler(e as RequestError);
          } else {
            throw e;
          }
        }); // retry the original request
      } catch (err) {
        appSignOut();
        toast.error("Session expired. Please login again.");
        requestQueue = [];
        return Promise.reject(err);
      }
    }

    // All other errors
    const status = error?.response?.status;
    const message =
      error?.response?.data?.message || codeMessage[status] || "Unknown error";

    if (status && codeMessage[status]) {
      toast.error(message);
    }

    return Promise.reject(error);

    // return Promise.reject({
    //   ...error.response,
    //   success: false,
    //   errorHandled: true,
    //   reason: message,
    // });
  }
);

export type CustomResponse = {
  success?: boolean;
  errorHandled?: boolean;
  reason?: string;
  message?: string;
} & Partial<AxiosResponse>;

type RequestError = { response: CustomResponse };

const errorHandler = (error: RequestError): CustomResponse => {
  // if (error instanceof axios.Cancel) {
  if (axios.isCancel(error)) {
    return {
      success: false,
      errorHandled: true,
      reason: "cancelled",

      ...error,
    };
  }

  const { response } = error;

  if (response && response.status) {
    // if (response.status === 400) {
    //   notification.error({
    //     message: response.data?.message || codeMessage[response.status],
    //   });
    // }
    response.success = false;
    response.errorHandled = true;
    const errorText = codeMessage[response.status];
    return {
      message: response?.data?.message || response?.message,
      ...response,
      success: false,
      errorHandled: true,
      reason: errorText,
    };
  } else if (!response) {
    return {
      success: false,
      errorHandled: true,
      reason: axios.isCancel(error) ? "cancelled" : "network",
      message: axios.isCancel(error) ? "Request cancelled" : "Network error",
    };
  }

  return {
    message: response?.data?.message || response?.message,
    ...response,
    success: false,
    errorHandled: true,
    reason: "network",
  };
};

/**
 * Fetch data from given url
 * @param {*} url
 * @param {*} options
 *
 * Note Don't add anymore params if needed add a object type called 'extra' or something
 * can tell me what's the need for includeAuthHead?
 */
async function request(
  url: string,
  options: IAxiosRequest = {
    handleError: true,
    public: true,
  }
) {
  const handleError = options.handleError ?? true;
  options.handleError = handleError;
  const isPublic = options.public != null ? options.public : true;
  options.public = isPublic;
  try {
    const res = await axiosRequest(url, options);
    return res;
  } catch (e) {
    console.log(e, "error top level");
    if (handleError) {
      throw errorHandler(e as RequestError);
    } else {
      throw e;
    }
  }
}
const secondaryRequest = async (
  url: string,
  options: IAxiosRequest = {
    handleError: true,
  }
) => {
  const handleError = options.handleError ?? true;
  const isPublic = options.public != null ? options.public : true;
  options.public = isPublic;
  try {
    const res = await axiosSecondaryRequest(url, options);
    return res;
  } catch (e) {
    if (handleError) {
      throw errorHandler(e as RequestError);
    } else {
      throw e;
    }
  }
};

export default request;
export { axiosRequest, axiosSecondaryRequest, secondaryRequest };
