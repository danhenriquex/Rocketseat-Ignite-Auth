import {
  AxiosRequestConfig,
  AxiosRequestHeaders,
  HeadersDefaults,
} from "axios";
import { useRouter } from "next/router";
import Router from "next/router";
import { setCookie, parseCookies, destroyCookie } from "nookies";
import { createContext, ReactNode, useEffect, useState } from "react";
import { api } from "../services/api";

export interface SmartAxiosDefaults<D = any>
  extends Omit<AxiosRequestConfig<D>, "headers"> {
  headers: HeadersDefaults & AxiosRequestHeaders;
}

interface User {
  email: string;
  permissions: string[];
  roles: string[];
}

interface SignInCredentials {
  email: string;
  password: string;
}

interface AuthContextData {
  signIn(credentials: SignInCredentials): Promise<void>;
  isAuthenticated: boolean;
  user: User;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function signOut() {
  destroyCookie(undefined, "nextauth.token");
  destroyCookie(undefined, "nextauth.refreshToken");

  Router.push("/");
}

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>({} as User);
  const router = useRouter();
  const isAuthenticated = !!user;

  useEffect(() => {
    const { "nextauth.token": token } = parseCookies();

    if (token) {
      api
        .get("/me")
        .then((response) => {
          const { email, permissions, roles } = response.data;

          setUser({ email, permissions, roles });
        })
        .catch((error) => {
          signOut();
        });
    }
  }, []);

  async function signIn(credentials: SignInCredentials) {
    try {
      const response = await api.post("/sessions", credentials);

      const { token, refreshToken, permissions, roles } = response.data;

      setCookie(undefined, "nextauth.token", token, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });

      setCookie(undefined, "nextauth.refreshToken", refreshToken, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });

      setUser({
        email: credentials.email,
        permissions,
        roles,
      });
      const apiDefaults = api.defaults as SmartAxiosDefaults;

      apiDefaults.headers["Authorization"] = `Bearer ${token}`;

      router.push("/dashboard");
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <AuthContext.Provider value={{ user, signIn, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
