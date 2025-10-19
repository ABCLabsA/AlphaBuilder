import { AlchemyChainMap, LocalAccountSigner } from "@alchemy/aa-core";
import {
  createLightAccountAlchemyClient,
  type AlchemyGasManagerConfig,
} from "@alchemy/aa-alchemy";
import type { Chain, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

type LightAccountClient = Awaited<
  ReturnType<typeof createLightAccountAlchemyClient>
>;

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
  walletAddress?: string;
};

type AuthState = {
  status: AuthStatus;
  user?: EmailAuthUser;
  token?: string;
  walletAddress?: string;
  error?: string;
};

type AuthContextValue = {
  status: AuthStatus;
  isLoading: boolean;
  user?: EmailAuthUser;
  token?: string;
  error?: string;
  walletAddress?: string;
  walletClient?: LightAccountClient;
  login: (credentials: EmailAuthCredentials) => Promise<void>;
  signup: (credentials: EmailAuthCredentials) => Promise<void>;
  logout: () => void;
  dismissError: () => void;
};

type WalletInstance = {
  address: string;
  client: LightAccountClient;
  privateKey: Hex;
};

const STORAGE_KEY = "emailAuthSession";
const WALLET_KEYS_STORAGE = "emailAuthWalletKeys";
const DEFAULT_CHAIN_ID = 84532;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const AUTH_LOGIN_PATH =
  import.meta.env.VITE_AUTH_LOGIN_PATH?.trim() || "/auth/login";
const AUTH_SIGNUP_PATH =
  import.meta.env.VITE_AUTH_SIGNUP_PATH?.trim() || "/auth/signup";
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const ALCHEMY_CHAIN = import.meta.env.VITE_ALCHEMY_CHAIN;
const ALCHEMY_GAS_POLICY_ID = import.meta.env.VITE_ALCHEMY_GAS_POLICY_ID;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const loadWalletKeyMap = (): Record<string, Hex> => {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = window.localStorage.getItem(WALLET_KEYS_STORAGE);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, value as Hex])
    );
  } catch {
    window.localStorage.removeItem(WALLET_KEYS_STORAGE);
    return {};
  }
};

const persistWalletKeyMap = (map: Record<string, Hex>) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(WALLET_KEYS_STORAGE, JSON.stringify(map));
};

const getOrCreateWalletKey = (normalizedEmail: string): Hex => {
  if (typeof window === "undefined") {
    throw new Error("Wallet initialization requires a browser environment.");
  }
  const map = loadWalletKeyMap();
  if (map[normalizedEmail]) {
    return map[normalizedEmail];
  }
  const privateKey = generatePrivateKey();
  map[normalizedEmail] = privateKey;
  persistWalletKeyMap(map);
  return privateKey;
};

const resolveChain = (value?: string): Chain => {
  const chains = Array.from(AlchemyChainMap.values());
  const defaultChain =
    chains.find((chain) => chain.id === DEFAULT_CHAIN_ID) ?? chains[0];
  if (!value) {
    if (!defaultChain) {
      throw new Error("Alchemy chain map is empty.");
    }
    return defaultChain;
  }
  const normalized = value.trim().toLowerCase();
  const directMatch = chains.find((chain) => {
    const aliases = [
      chain.id.toString(),
      chain.name.toLowerCase(),
      chain.network?.toLowerCase(),
    ].filter(Boolean);
    return aliases.includes(normalized);
  });
  if (directMatch) {
    return directMatch;
  }
  const numericId = Number(normalized);
  if (!Number.isNaN(numericId)) {
    const chain = AlchemyChainMap.get(numericId);
    if (chain) {
      return chain;
    }
  }
  throw new Error(`Unsupported chain alias "${value}" for Alchemy AA wallet.`);
};

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
        walletAddress: stored.walletAddress,
      };
    }
    return { status: "idle" };
  });

  const [initialised, setInitialised] = useState(false);
  const [walletClient, setWalletClient] = useState<LightAccountClient>();
  const walletPromises = useRef<Map<string, Promise<WalletInstance>>>(
    new Map()
  );

  const ensureWallet = useCallback(
    async (email: string) => {
      if (!email) {
        throw new Error("Email is required to initialize the AA wallet.");
      }
      if (!ALCHEMY_API_KEY) {
        throw new Error("Missing VITE_ALCHEMY_API_KEY for AA wallet provisioning.");
      }
      const normalized = normalizeEmail(email);
      let walletPromise = walletPromises.current.get(normalized);
      if (!walletPromise) {
        walletPromise = (async () => {
          const chain = resolveChain(ALCHEMY_CHAIN);
          const privateKey = getOrCreateWalletKey(normalized);
          const account = privateKeyToAccount(privateKey);
          const signer = new LocalAccountSigner(account);
          const config: Parameters<typeof createLightAccountAlchemyClient>[0] = {
            apiKey: ALCHEMY_API_KEY,
            chain,
            signer,
          };
          if (ALCHEMY_GAS_POLICY_ID) {
            const gasManagerConfig: AlchemyGasManagerConfig = {
              policyId: ALCHEMY_GAS_POLICY_ID,
            };
            config.gasManagerConfig = gasManagerConfig;
          }
          const client = await createLightAccountAlchemyClient(config);
          const address = client.getAddress();
          return { address, client, privateKey };
        })();
        walletPromises.current.set(normalized, walletPromise);
      }
      try {
        return await walletPromise;
      } catch (error) {
        walletPromises.current.delete(normalized);
        throw error;
      }
    },
    []
  );

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
        walletAddress: stored.walletAddress,
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
        const wallet = await ensureWallet(session.user.email);
        const nextSession: AuthSession = {
          token: session.token,
          user: session.user,
          walletAddress: wallet.address,
        };
        persistSession(nextSession);
        setWalletClient(wallet.client);
        setState({
          status: "authenticated",
          user: session.user,
          token: session.token,
          walletAddress: wallet.address,
          error: undefined,
        });
      } catch (error) {
        setWalletClient(undefined);
        setState((prev) => ({
          ...prev,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    },
    [ensureWallet]
  );

  useEffect(() => {
    if (state.status !== "authenticated" || !state.user) {
      return;
    }
    if (state.walletAddress && walletClient) {
      return;
    }
    let cancelled = false;
    ensureWallet(state.user.email)
      .then(({ address, client }) => {
        if (cancelled) {
          return;
        }
        setWalletClient(client);
        setState((prev) => {
          if (prev.status !== "authenticated" || prev.walletAddress === address) {
            return prev;
          }
          return { ...prev, walletAddress: address };
        });
        const stored = loadStoredSession();
        if (
          stored &&
          normalizeEmail(stored.user.email) === normalizeEmail(state.user.email)
        ) {
          persistSession({
            token: stored.token,
            user: stored.user,
            walletAddress: address,
          });
        } else if (state.token) {
          persistSession({
            token: state.token,
            user: state.user!,
            walletAddress: address,
          });
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Failed to initialize AA wallet", error);
        setState((prev) => ({
          ...prev,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [
    ensureWallet,
    state.status,
    state.user,
    state.walletAddress,
    state.token,
    walletClient,
  ]);

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
      walletAddress: undefined,
      error: undefined,
    });
    setWalletClient(undefined);
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
      walletAddress: state.walletAddress,
      walletClient,
      login,
      signup,
      logout,
      dismissError,
    }),
    [state, walletClient, login, signup, logout, dismissError]
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
