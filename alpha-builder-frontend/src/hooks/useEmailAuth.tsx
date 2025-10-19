import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type AuthStatus = "idle" | "authenticating" | "authenticated" | "error";

export type EmailAuthCredentials = {
  email: string;
  password: string;
  name?: string;
};

export type EmailAuthUser = {
  email: string;
  name?: string;
  [key: string]: unknown;
};

type AuthSession = {
  token: string;
  user: EmailAuthUser;
};

type AuthState = {
  status: AuthStatus;
  user?: EmailAuthUser;
  token?: string;
  error?: string;
};

type AuthContextValue = {
  status: AuthStatus;
  isLoading: boolean;
  user?: EmailAuthUser;
  token?: string;
  error?: string;
  login: (credentials: EmailAuthCredentials) => Promise<void>;
  signup: (credentials: EmailAuthCredentials) => Promise<void>;
  logout: () => void;
  dismissError: () => void;
};

const STORAGE_KEY = "emailAuthSession";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const AUTH_LOGIN_PATH =
  import.meta.env.VITE_AUTH_LOGIN_PATH?.trim() || "/auth/login";
const AUTH_SIGNUP_PATH =
  import.meta.env.VITE_AUTH_SIGNUP_PATH?.trim() || "/auth/signup";

const EmailAuthContext = createContext<AuthContextValue | undefined>(undefined);

const resolveEndpoint = (path: string) => {
  if (!API_BASE_URL) {
    return path;
  }
  try {
    return new URL(path, API_BASE_URL).toString();
  } catch {
    return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  }
};

const parseErrorMessage = async (response: Response) => {
  const defaultMessage = `Request failed with status ${response.status}`;
  try {
    const data = await response.json();
    if (typeof data === "string") {
      return data;
    }
    if (data && typeof data.message === "string") {
      return data.message;
    }
    if (data && data.error) {
      return String(data.error);
    }
  } catch {
    const text = await response.text().catch(() => "");
    if (text) {
      return text;
    }
    return defaultMessage;
  }
  return defaultMessage;
};

const loadStoredSession = (): AuthSession | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.token === "string" &&
      parsed.user &&
      typeof parsed.user.email === "string"
    ) {
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return undefined;
};

const persistSession = (session: AuthSession) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

const clearStoredSession = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
};

const requestAuthSession = async (
  path: string,
  body: EmailAuthCredentials
): Promise<AuthSession> => {
  const response = await fetch(resolveEndpoint(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const data = (await response.json()) as {
    token?: string;
    accessToken?: string;
    user?: EmailAuthUser;
    data?: {
      token?: string;
      accessToken?: string;
      user?: EmailAuthUser;
    };
  };

  if (!data) {
    throw new Error("No response body received from authentication endpoint.");
  }

  const payload = data.data ?? data;
  const token = payload.token ?? payload.accessToken;
  const user = payload.user;

  if (!token) {
    throw new Error("Authentication response is missing a token.");
  }
  if (!user || typeof user.email !== "string") {
    throw new Error("Authentication response is missing user details.");
  }

  return { token, user };
};

export const EmailAuthProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<AuthState>(() => {
    const stored = loadStoredSession();
    if (stored) {
      return {
        status: "authenticated",
        user: stored.user,
        token: stored.token,
      };
    }
    return { status: "idle" };
  });

  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (initialised) {
      return;
    }
    const stored = loadStoredSession();
    if (stored) {
      setState({
        status: "authenticated",
        user: stored.user,
        token: stored.token,
      });
    }
    setInitialised(true);
  }, [initialised]);

  const handleAuth = useCallback(
    async (path: string, credentials: EmailAuthCredentials) => {
      setState((prev) => ({
        ...prev,
        status: "authenticating",
        error: undefined,
      }));
      try {
        const session = await requestAuthSession(path, credentials);
        persistSession(session);
        setState({
          status: "authenticated",
          user: session.user,
          token: session.token,
          error: undefined,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    },
    []
  );

  const login = useCallback(
    (credentials: EmailAuthCredentials) =>
      handleAuth(AUTH_LOGIN_PATH, credentials),
    [handleAuth]
  );

  const signup = useCallback(
    (credentials: EmailAuthCredentials) =>
      handleAuth(AUTH_SIGNUP_PATH, credentials),
    [handleAuth]
  );

  const logout = useCallback(() => {
    clearStoredSession();
    setState({
      status: "idle",
      user: undefined,
      token: undefined,
      error: undefined,
    });
  }, []);

  const dismissError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: undefined,
      status:
        prev.status === "error"
          ? prev.user
            ? "authenticated"
            : "idle"
          : prev.status,
    }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      isLoading: state.status === "authenticating",
      user: state.user,
      token: state.token,
      error: state.error,
      login,
      signup,
      logout,
      dismissError,
    }),
    [state, login, signup, logout, dismissError]
  );

  return (
    <EmailAuthContext.Provider value={value}>
      {children}
    </EmailAuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useEmailAuth = () => {
  const context = useContext(EmailAuthContext);
  if (!context) {
    throw new Error("useEmailAuth must be used within an EmailAuthProvider.");
  }
  return context;
};
