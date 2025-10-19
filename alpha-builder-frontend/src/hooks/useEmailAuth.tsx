import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  type CreateKernelAccountReturnType,
  type KernelAccountClient,
} from "@zerodev/sdk";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  createPublicClient,
  defineChain,
  http,
  type Chain,
  type Hex,
} from "viem";
import {
  generatePrivateKey,
  privateKeyToAccount,
  type PrivateKeyAccount,
} from "viem/accounts";
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

type KernelAccountInstance = CreateKernelAccountReturnType<"0.7">;

type ZeroDevWalletInstance = {
  address: Hex;
  account: KernelAccountInstance;
  client: KernelAccountClient;
  signer: PrivateKeyAccount;
  privateKey: Hex;
  chain: Chain;
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
  walletClient?: ZeroDevWalletInstance;
  login: (credentials: EmailAuthCredentials) => Promise<void>;
  signup: (credentials: EmailAuthCredentials) => Promise<void>;
  logout: () => void;
  dismissError: () => void;
};

const STORAGE_KEY = "emailAuthSession";
const WALLET_KEYS_STORAGE = "emailAuthWalletKeys";
const DEFAULT_ENTRY_POINT_VERSION = "0.7";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const AUTH_LOGIN_PATH =
  import.meta.env.VITE_AUTH_LOGIN_PATH?.trim() || "/auth/login";
const AUTH_SIGNUP_PATH =
  import.meta.env.VITE_AUTH_SIGNUP_PATH?.trim() || "/auth/signup";

const ZERODEV_RPC_URL = import.meta.env.VITE_ZERODEV_RPC_URL?.trim() ?? "";
const ZERODEV_CHAIN_ID = import.meta.env.VITE_ZERODEV_CHAIN_ID
  ? Number.parseInt(import.meta.env.VITE_ZERODEV_CHAIN_ID, 10)
  : undefined;
const ZERODEV_ENTRY_POINT =
  import.meta.env.VITE_ZERODEV_ENTRY_POINT?.trim() ?? "";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const loadWalletKeyMap = (): Record<string, string> => {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = window.localStorage.getItem(WALLET_KEYS_STORAGE);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed;
  } catch {
    window.localStorage.removeItem(WALLET_KEYS_STORAGE);
    return {};
  }
};

const persistWalletKeyMap = (map: Record<string, string>) => {
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
    return map[normalizedEmail] as Hex;
  }
  const privateKey = generatePrivateKey();
  map[normalizedEmail] = privateKey;
  persistWalletKeyMap(map);
  return privateKey;
};

const extractChainIdFromUrl = (rpcUrl: string): number | undefined => {
  try {
    const parsed = new URL(rpcUrl);
    const queryChainId = parsed.searchParams.get("chainId");
    if (queryChainId) {
      const candidate = Number.parseInt(queryChainId, 10);
      if (!Number.isNaN(candidate)) {
        return candidate;
      }
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      const candidate = Number.parseInt(segments[index] ?? "", 10);
      if (!Number.isNaN(candidate)) {
        return candidate;
      }
    }
  } catch {
    // ignore parsing errors so that we can fall back to an explicit override
  }
  return undefined;
};

const createZeroDevChain = (rpcUrl: string, explicitChainId?: number): Chain => {
  const resolvedChainId = explicitChainId ?? extractChainIdFromUrl(rpcUrl);
  if (!resolvedChainId) {
    throw new Error(
      "Unable to determine the ZeroDev chain id. Ensure the RPC URL includes the chain segment or set VITE_ZERODEV_CHAIN_ID."
    );
  }
  return defineChain({
    id: resolvedChainId,
    name: `ZeroDev Chain ${resolvedChainId}`,
    network: `zerodev-${resolvedChainId}`,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
      public: {
        http: [rpcUrl],
      },
    },
  });
};

const resolveEntryPoint = () => {
  const fallback = getEntryPoint(DEFAULT_ENTRY_POINT_VERSION);
  if (ZERODEV_ENTRY_POINT) {
    return {
      ...fallback,
      address: ZERODEV_ENTRY_POINT as Hex,
    };
  }
  return fallback;
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
  const [walletClient, setWalletClient] = useState<ZeroDevWalletInstance>();
  const walletPromises = useRef<Map<string, Promise<ZeroDevWalletInstance>>>(
    new Map()
  );

  const ensureWallet = useCallback(
    async (email: string): Promise<ZeroDevWalletInstance> => {
      if (!ZERODEV_RPC_URL) {
        throw new Error(
          "Missing VITE_ZERODEV_RPC_URL for AA wallet provisioning."
        );
      }
      if (!email) {
        throw new Error("Email is required to initialize the AA wallet.");
      }

      const normalized = normalizeEmail(email);
      let walletPromise = walletPromises.current.get(normalized);
      if (!walletPromise) {
        walletPromise = (async () => {
          const privateKey = getOrCreateWalletKey(normalized);
          const chain = createZeroDevChain(ZERODEV_RPC_URL, ZERODEV_CHAIN_ID);
          const entryPoint = resolveEntryPoint();
          const publicClient = createPublicClient({
            chain,
            transport: http(ZERODEV_RPC_URL),
          });

          const signer = privateKeyToAccount(privateKey);
          const validator = await signerToEcdsaValidator(publicClient, {
            signer,
            entryPoint,
            kernelVersion: KERNEL_V3_1,
          });

          const account = await createKernelAccount(publicClient, {
            entryPoint,
            plugins: {
              sudo: validator,
            },
            kernelVersion: KERNEL_V3_1,
          });

          const paymasterClient = createZeroDevPaymasterClient({
            chain,
            transport: http(ZERODEV_RPC_URL),
          });

          const client = createKernelAccountClient({
            account,
            chain,
            bundlerTransport: http(ZERODEV_RPC_URL),
            paymaster: {
              async getPaymasterData(userOperation) {
                return paymasterClient.sponsorUserOperation({
                  userOperation,
                });
              },
              async getPaymasterStubData(userOperation) {
                return paymasterClient.sponsorUserOperation({
                  userOperation,
                  shouldConsume: false,
                });
              },
            },
          });

          const address = client.account.address;

          return {
            address,
            account,
            client,
            signer,
            privateKey,
            chain,
          };
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
      if (stored.user?.email && stored.walletAddress) {
        void ensureWallet(stored.user.email)
          .then((instance) => {
            setWalletClient(instance);
          })
          .catch((error) => {
            console.error("Failed to restore ZeroDev wallet", error);
          });
      }
    }
    setInitialised(true);
  }, [ensureWallet, initialised]);

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
        setWalletClient(wallet);
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
      .then((wallet) => {
        if (cancelled) {
          return;
        }
        setWalletClient(wallet);
        setState((prev) => {
          if (prev.status !== "authenticated" || prev.walletAddress === wallet.address) {
            return prev;
          }
          const nextState = { ...prev, walletAddress: wallet.address };
          const storedSession = loadStoredSession();
          const tokenToPersist =
            nextState.token ?? storedSession?.token ?? prev.token;
          if (tokenToPersist && nextState.user) {
            persistSession({
              token: tokenToPersist,
              user: nextState.user,
              walletAddress: wallet.address,
            });
          }
          return nextState;
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Failed to initialize ZeroDev wallet", error);
        setState((prev) => ({
          ...prev,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [ensureWallet, state.status, state.user, state.walletAddress, walletClient]);

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
    setWalletClient(undefined);
    setState({
      status: "idle",
      user: undefined,
      token: undefined,
      walletAddress: undefined,
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
