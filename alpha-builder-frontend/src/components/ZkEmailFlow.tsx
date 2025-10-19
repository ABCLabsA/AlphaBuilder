import { FormEvent, useState } from "react";

import { api, InitZkEmailResponse, VerifyZkEmailResponse } from "../api/client";

interface Props {
  onComplete: (result: VerifyZkEmailResponse) => void;
}

export function ZkEmailFlow({ onComplete }: Props) {
  const [email, setEmail] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [salt, setSalt] = useState("");
  const [session, setSession] = useState<InitZkEmailResponse | null>(null);
  const [proof, setProof] = useState("0x");
  const [nullifier, setNullifier] = useState("0x");
  const [userOpHash, setUserOpHash] = useState("0x");
  const [initLoading, setInitLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInitLoading(true);
    try {
      const response = await api.initZkEmail({
        email,
        ownerAddress,
        salt: salt || undefined
      });
      setSession(response);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInitLoading(false);
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) {
      setError("Missing session. Run the init step first.");
      return;
    }
    setError(null);
    setVerifyLoading(true);
    try {
      const result = await api.verifyZkEmail({
        sessionId: session.sessionId,
        proof: proof as `0x${string}`,
        nullifier: nullifier as `0x${string}`,
        userOpHash: userOpHash as `0x${string}`
      });
      onComplete(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleInit} className="space-y-4">
        <div>
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="alice@example.com"
            required
          />
        </div>
        <div>
          <label className="form-label">Owner EOA for Smart Account</label>
          <input
            className="form-input"
            value={ownerAddress}
            onChange={(event) => setOwnerAddress(event.target.value)}
            placeholder="0x..."
            pattern="^0x[a-fA-F0-9]{40}$"
            required
          />
        </div>
        <div>
          <label className="form-label">
            Deterministic Salt <span className="text-xs text-slate-400">(optional)</span>
          </label>
          <input
            className="form-input"
            value={salt}
            onChange={(event) => setSalt(event.target.value)}
            placeholder="Defaults to current timestamp"
          />
        </div>
        {error && !session ? <p className="text-sm text-red-500">{error}</p> : null}
        <button className="btn-primary" type="submit" disabled={initLoading}>
          {initLoading ? "Preparing session..." : "Generate Commitment"}
        </button>
      </form>

      {session ? (
        <div className="rounded-md border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-100">
          <p className="font-semibold text-slate-200">Session ready</p>
          <p>Session ID: {session.sessionId}</p>
          <p>Email commitment: {session.emailCommitment}</p>
          <p>Salt: {session.salt}</p>
          <p className="mt-2 text-xs text-slate-400">
            Generate the zk-email proof off-chain (Poseidon commitment) and paste it below together
            with the nullifier and the user operation hash you plan to submit.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="form-label">Proof (0x...)</label>
          <textarea
            className="form-input min-h-[120px]"
            value={proof}
            onChange={(event) => setProof(event.target.value)}
            disabled={!session}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            required
          />
        </div>
        <div>
          <label className="form-label">Nullifier</label>
          <input
            className="form-input"
            value={nullifier}
            onChange={(event) => setNullifier(event.target.value)}
            disabled={!session}
            placeholder="0x..."
            pattern="^0x[a-fA-F0-9]{64}$"
            required
          />
        </div>
        <div>
          <label className="form-label">User Operation Hash</label>
          <input
            className="form-input"
            value={userOpHash}
            onChange={(event) => setUserOpHash(event.target.value)}
            disabled={!session}
            placeholder="0x..."
            pattern="^0x[a-fA-F0-9]{64}$"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button className="btn-primary" type="submit" disabled={!session || verifyLoading}>
          {verifyLoading ? "Verifying proof..." : "Verify & Deploy"}
        </button>
      </form>
    </div>
  );
}
