import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useSDK } from "@metamask/sdk-react";

type MetaMaskAuthStatus = "idle" | "connecting" | "connected" | "error";

export type MetaMaskUser = {
  address: string;
  chainId: string;
  balance?: string;
  [key: string]: unknown;
};

type MetaMaskAuthState = {
  status: MetaMaskAuthStatus;
  user?: MetaMaskUser;
  error?: string;
};

type MetaMaskAuthContextValue = {
  status: MetaMaskAuthStatus;
  isLoading: boolean;
  user?: MetaMaskUser;
  error?: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  dismissError: () => void;
  switchChain: (chainId: string) => Promise<void>;
};

const STORAGE_KEY = "metaMaskAuthSession";

const loadStoredSession = (): MetaMaskUser | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as MetaMaskUser;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.address === "string" &&
      typeof parsed.chainId === "string"
    ) {
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return undefined;
};

const persistSession = (user: MetaMaskUser) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

const clearStoredSession = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
};

const MetaMaskAuthContext = createContext<MetaMaskAuthContextValue | undefined>(undefined);

export const MetaMaskAuthProvider = ({ children }: PropsWithChildren) => {
  const { sdk, connected, connecting, account, chainId, balance, provider } = useSDK();
  const [state, setState] = useState<MetaMaskAuthState>(() => {
    const stored = loadStoredSession();
    if (stored) {
      return {
        status: "connected",
        user: stored,
      };
    }
    return { status: "idle" };
  });

  const [initialised, setInitialised] = useState(false);

  // Initialize from stored session
  useEffect(() => {
    if (initialised) {
      return;
    }
    const stored = loadStoredSession();
    if (stored) {
      setState({
        status: "connected",
        user: stored,
      });
    }
    setInitialised(true);
  }, [initialised]);

  // Sync with SDK state
  useEffect(() => {
    if (!initialised) {
      return;
    }

    if (connecting) {
      setState((prev) => ({
        ...prev,
        status: "connecting",
        error: undefined,
      }));
    } else if (connected && account && chainId) {
      const user: MetaMaskUser = {
        address: account,
        chainId,
        balance: balance ? balance.toString() : undefined,
      };
      
      setState({
        status: "connected",
        user,
        error: undefined,
      });
      
      // Persist the session
      persistSession(user);
    } else if (!connected && state.status === "connected") {
      // Handle disconnection
      setState({
        status: "idle",
        user: undefined,
        error: undefined,
      });
      clearStoredSession();
    }
  }, [connected, connecting, account, chainId, balance, initialised, state.status]);

  const connect = useCallback(async () => {
    if (!sdk) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: "MetaMask SDK not initialized",
      }));
      return;
    }

    try {
      setState((prev) => ({
        ...prev,
        status: "connecting",
        error: undefined,
      }));

      const accounts = await sdk.connect();
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from MetaMask");
      }

      // The SDK will handle the rest through the useEffect above
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [sdk]);

  const disconnect = useCallback(() => {
    if (sdk) {
      sdk.disconnect();
    }
    setState({
      status: "idle",
      user: undefined,
      error: undefined,
    });
    clearStoredSession();
  }, [sdk]);

  const switchChain = useCallback(async (newChainId: string) => {
    if (!provider) {
      throw new Error("Provider not available");
    }

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: newChainId }],
      });
    } catch (error) {
      // If the chain doesn't exist, try to add it
      if (error instanceof Error && error.message.includes("Unrecognized chain")) {
        // You can add common chains here or let the user handle it
        throw new Error(`Chain ${newChainId} not supported. Please add it to MetaMask.`);
      }
      throw error;
    }
  }, [provider]);

  const dismissError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: undefined,
      status:
        prev.status === "error"
          ? prev.user
            ? "connected"
            : "idle"
          : prev.status,
    }));
  }, []);

  const value = useMemo<MetaMaskAuthContextValue>(
    () => ({
      status: state.status,
      isLoading: state.status === "connecting",
      user: state.user,
      error: state.error,
      connect,
      disconnect,
      dismissError,
      switchChain,
    }),
    [state, connect, disconnect, dismissError, switchChain]
  );

  return (
    <MetaMaskAuthContext.Provider value={value}>
      {children}
    </MetaMaskAuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useMetaMaskAuth = () => {
  const context = useContext(MetaMaskAuthContext);
  if (!context) {
    throw new Error("useMetaMaskAuth must be used within a MetaMaskAuthProvider.");
  }
  return context;
};
