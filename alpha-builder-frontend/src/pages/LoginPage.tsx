import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEmailAuth } from "@/hooks/useEmailAuth";
import { useMetaMaskAuth } from "@/hooks/useMetaMaskAuth";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, status, user, isLoading, error, dismissError } =
    useEmailAuth();
  const { 
    connect: connectMetaMask, 
    status: metaMaskStatus, 
    user: metaMaskUser, 
    isLoading: isMetaMaskLoading, 
    error: metaMaskError, 
    dismissError: dismissMetaMaskError 
  } = useMetaMaskAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status === "authenticated" && user) {
      navigate("/", { replace: true });
    }
  }, [status, user, navigate]);

  useEffect(() => {
    if (metaMaskStatus === "connected" && metaMaskUser) {
      navigate("/", { replace: true });
    }
  }, [metaMaskStatus, metaMaskUser, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      return;
    }
    await login({ email, password });
  };

  const handleInputChange = (
    updater: (value: string) => void,
    value: string
  ) => {
    if (error) {
      dismissError();
    }
    if (metaMaskError) {
      dismissMetaMaskError();
    }
    updater(value);
  };

  const handleMetaMaskConnect = async () => {
    if (metaMaskError) {
      dismissMetaMaskError();
    }
    await connectMetaMask();
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="text-muted-foreground">
          Connect with MetaMask or enter your email and password.
        </p>
      </header>
      
      {/* MetaMask Login Option */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="default"
          className="w-full"
          onClick={handleMetaMaskConnect}
          disabled={isMetaMaskLoading}
        >
          {isMetaMaskLoading ? "Connecting..." : "Connect with MetaMask"}
        </Button>
        
        {metaMaskError ? (
          <p className="text-sm text-destructive" role="alert">
            {metaMaskError}
          </p>
        ) : null}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) =>
              handleInputChange(setEmail, event.target.value.trim())
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) =>
              handleInputChange(setPassword, event.target.value)
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="********"
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          size="default"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Log in"}
        </Button>
      </form>
      <footer className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </footer>
    </div>
  );
};

export default LoginPage;
