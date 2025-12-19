import React, { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import bs58 from 'bs58';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001';
const SOLANA_NETWORK = (import.meta.env.PUBLIC_SOLANA_NETWORK || 'devnet') as WalletAdapterNetwork;

interface WalletConnectProps {
  onConnected?: (walletAddress: string, email?: string) => void;
  onDisconnected?: () => void;
}

function WalletConnectInner({ onConnected, onDisconnected }: WalletConnectProps) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<{
    exists: boolean;
    email?: string;
    verified?: boolean;
  } | null>(null);

  // Check wallet status when connected
  useEffect(() => {
    if (connected && publicKey) {
      checkWalletStatus();
    } else {
      setWalletStatus(null);
      setShowEmailInput(false);
    }
  }, [connected, publicKey]);

  async function checkWalletStatus() {
    if (!publicKey) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/internal/wallet-alerts/status?walletAddress=${publicKey.toBase58()}`
      );

      if (response.ok) {
        const data = await response.json();
        setWalletStatus(data);
        if (data.exists && data.email) {
          setEmail(data.email);
          onConnected?.(publicKey.toBase58(), data.email);
        } else {
          setShowEmailInput(true);
        }
      }
    } catch (err) {
      console.error('Failed to check wallet status:', err);
    }
  }

  async function handleVerify() {
    if (!publicKey || !signMessage) {
      setError('Wallet not connected');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Request nonce
      const nonceResponse = await fetch(
        `${API_BASE_URL}/api/internal/wallet-alerts/nonce?walletAddress=${publicKey.toBase58()}`
      );

      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce } = await nonceResponse.json();

      // Sign nonce
      const message = new TextEncoder().encode(nonce);
      const signature = await signMessage(message);

      // Encode signature to base58
      const signatureBase58 = bs58.encode(signature);

      // Verify with backend
      const verifyResponse = await fetch(`${API_BASE_URL}/api/internal/wallet-alerts/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: signatureBase58,
          nonce,
          email,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      const verifyData = await verifyResponse.json();
      setWalletStatus({ exists: true, email, verified: false });
      setShowEmailInput(false);
      
      // Update localStorage for other components
      localStorage.setItem('wallet_alert_state', JSON.stringify({
        walletAddress: publicKey.toBase58(),
        email,
        verified: false,
      }));
      
      // Emit custom event
      window.dispatchEvent(new CustomEvent('wallet-connected', {
        detail: { walletAddress: publicKey.toBase58(), email }
      }));
      
      onConnected?.(publicKey.toBase58(), email);
      alert('Wallet registered! Please check your email to verify your address.');
    } catch (err: any) {
      setError(err.message || 'Failed to verify wallet');
      console.error('Verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleDisconnect() {
    if (!publicKey || !signMessage) return;

    try {
      // Request nonce for disconnect
      const nonceResponse = await fetch(
        `${API_BASE_URL}/api/internal/wallet-alerts/nonce?walletAddress=${publicKey.toBase58()}`
      );

      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce } = await nonceResponse.json();

      // Sign nonce
      const message = new TextEncoder().encode(nonce);
      const signature = await signMessage(message);
      const signatureBase58 = bs58.encode(signature);

      // Disconnect from backend
      await fetch(`${API_BASE_URL}/api/internal/wallet-alerts/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: signatureBase58,
          nonce,
        }),
      });

      // Disconnect wallet
      await disconnect();
      setWalletStatus(null);
      setEmail('');
      setShowEmailInput(false);
      
      // Update localStorage
      localStorage.removeItem('wallet_alert_state');
      
      // Emit custom event
      window.dispatchEvent(new CustomEvent('wallet-disconnected'));
      
      onDisconnected?.();
    } catch (err) {
      console.error('Disconnect error:', err);
      // Still disconnect wallet even if backend call fails
      await disconnect();
      setWalletStatus(null);
      setEmail('');
      setShowEmailInput(false);
      onDisconnected?.();
    }
  }

  if (!connected) {
    return (
      <div className="wallet-connect-container">
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="wallet-connect-container">
      {showEmailInput && !walletStatus?.exists ? (
        <div className="email-input-container space-y-3">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-muted mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 bg-surface border-2 border-slate-700 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-text-muted mt-1">
              We'll send you free email alerts if your wallet is compromised
            </p>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleVerify}
            disabled={isVerifying || !email}
            className="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? 'Verifying...' : 'Register Email Alerts'}
          </button>
        </div>
      ) : (
        <div className="wallet-status">
          <WalletMultiButton />
          {walletStatus?.exists && (
            <div className="mt-2 text-sm text-text-muted">
              {walletStatus.verified ? (
                <span className="text-green-400">✓ Email verified</span>
              ) : (
                <span className="text-yellow-400">⚠ Check email to verify</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WalletConnect({ onConnected, onDisconnected }: WalletConnectProps) {
  const network = SOLANA_NETWORK;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletConnectInner onConnected={onConnected} onDisconnected={onDisconnected} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
