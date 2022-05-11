import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestsQueue = [];

export const api = axios.create({
  baseURL: "http://localhost:3333",
  headers: {
    Authorization: `Bearer ${cookies["nextauth.token"]}`,
  },
});

api.interceptors.request.use(async (config) => {
  const token = cookies["nextauth.token"];

  if (token !== "") {
    config.headers.common["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const statusCode = error?.response?.data as unknown as { code: string };
      if (statusCode.code === "token.expired") {
        // renovar o token
        cookies = parseCookies();
        const { "nextauth.refreshToken": refreshToken } = cookies;
        const originalConfig = error.config;

        if (!isRefreshing) {
          isRefreshing = true;
          api
            .post("/refresh", {
              refreshToken,
            })
            .then((response) => {
              const { token, refreshToken } = response.data;
              console.log("##token: ", token);
              console.log("##refreshTokens: ", refreshToken);

              setCookie(undefined, "nextauth.token", token, {
                maxAge: 60 * 60 * 24 * 30,
                path: "/",
              });

              setCookie(undefined, "nextauth.refreshToken", refreshToken, {
                maxAge: 60 * 60 * 24 * 30,
                path: "/",
              });

              api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

              failedRequestsQueue.forEach((request) =>
                request.onSuccess(token)
              );
              failedRequestsQueue = [];
            })
            .catch((error) => {
              failedRequestsQueue.forEach((request) =>
                request.onFailure(error)
              );
              failedRequestsQueue = [];
            })
            .finally(() => {
              isRefreshing = false;
            });
        }
        return new Promise((resolve, rejected) => {
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              if (!originalConfig?.headers) {
                originalConfig.headers["Authorization"] = `Bearer ${token}`;
                resolve(api(originalConfig));
              }
            },
            onFailure: (err: AxiosError) => {
              rejected(err);
            },
          });
        });
      } else {
        // deslogar
      }
    }
  }
);
