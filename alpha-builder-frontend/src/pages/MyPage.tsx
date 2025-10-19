import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatEther, type Hex } from "viem";
import { Button } from "@/components/ui/button";
import { useEmailAuth } from "@/hooks/useEmailAuth";

const MyPage = () => {
  const navigate = useNavigate();
  const {
    status,
    isLoading,
    user,
    walletAddress,
    walletClient,
  } = useEmailAuth();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && status !== "authenticated") {
      navigate("/login", { replace: true });
    }
  }, [status, isLoading, navigate]);

  const loadBalance = useCallback(async () => {
    if (!walletClient) {
      setBalance(null);
      return;
    }
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const kernelClient = walletClient.client as unknown as {
        getBalance?: (params: { address: Hex }) => Promise<bigint>;
      };
      if (typeof kernelClient.getBalance !== "function") {
        throw new Error("Wallet client does not support balance lookup.");
      }
      const currentBalance = await kernelClient.getBalance({
        address: walletClient.address,
      });
      setBalance(currentBalance);
    } catch (error) {
      setBalance(null);
      setBalanceError(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setBalanceLoading(false);
    }
  }, [walletClient]);

  useEffect(() => {
    if (status === "authenticated" && walletClient) {
      void loadBalance();
    }
  }, [status, walletClient, loadBalance]);

  const formattedBalance = useMemo(() => {
    if (balance === null) {
      return "--";
    }
    return `${formatEther(balance)} ETH`;
  }, [balance]);

  const handleDeposit = () => {
    console.info("Deposit flow not implemented yet.");
  };

  const handleWithdraw = () => {
    console.info("Withdraw flow not implemented yet.");
  };

  if (status !== "authenticated") {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">My Account</h1>
        <p className="text-muted-foreground">
          Manage your Alpha Builder smart-wallet and review its status.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Wallet
            </h2>
            <p className="mt-1 font-mono text-sm break-all">
              {walletAddress ?? "Unavailable"}
            </p>
            {user?.email ? (
              <p className="text-xs text-muted-foreground">
                Linked email: {user.email}
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="text-lg font-medium">Balance</h3>
            <p className="text-2xl font-semibold">
              {balanceLoading ? "Loading…" : formattedBalance}
            </p>
            {balanceError ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {balanceError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={loadBalance} disabled={balanceLoading}>
              Refresh Balance
            </Button>
            <Button variant="secondary" onClick={handleDeposit}>
              Deposit
            </Button>
            <Button variant="outline" onClick={handleWithdraw}>
              Withdraw
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MyPage;
