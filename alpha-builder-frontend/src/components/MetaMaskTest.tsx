import { useMetaMaskAuth } from "@/hooks/useMetaMaskAuth";
import { Button } from "@/components/ui/button";

const MetaMaskTest = () => {
  const { 
    status, 
    user, 
    isLoading, 
    error, 
    connect, 
    disconnect, 
    dismissError 
  } = useMetaMaskAuth();

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h2 className="text-2xl font-bold">MetaMask Integration Test</h2>
      
      <div className="space-y-2">
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Loading:</strong> {isLoading ? "Yes" : "No"}</p>
        {user && (
          <>
            <p><strong>Address:</strong> {user.address}</p>
            <p><strong>Chain ID:</strong> {user.chainId}</p>
            {user.balance && <p><strong>Balance:</strong> {user.balance}</p>}
          </>
        )}
        {error && (
          <p className="text-red-500"><strong>Error:</strong> {error}</p>
        )}
      </div>

      <div className="space-y-2">
        {status === "connected" ? (
          <Button onClick={disconnect} variant="destructive">
            Disconnect MetaMask
          </Button>
        ) : (
          <Button onClick={connect} disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect MetaMask"}
          </Button>
        )}
        
        {error && (
          <Button onClick={dismissError} variant="outline">
            Dismiss Error
          </Button>
        )}
      </div>
    </div>
  );
};

export default MetaMaskTest;
