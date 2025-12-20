<script lang="ts">
  import SolanaWallet from './SolanaWallet.svelte';

  // * Props for callbacks
  interface Props {
    onConnected?: (walletAddress: string, email?: string) => void;
    onDisconnected?: () => void;
  }

  let { onConnected, onDisconnected }: Props = $props();

  // * Create wrapper functions that emit window events
  function handleConnected(walletAddress: string, email?: string) {
    if (onConnected) {
      onConnected(walletAddress, email);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wallet-connected', { 
        detail: { walletAddress, email } 
      }));
    }
  }

  function handleDisconnected() {
    if (onDisconnected) {
      onDisconnected();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wallet-disconnected'));
    }
  }
</script>

<SolanaWallet onConnected={handleConnected} onDisconnected={handleDisconnected} />

<style>
  :global(.wallet-connect-container) {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  :global(.email-input-container) {
    min-width: 300px;
    max-width: 400px;
  }

  :global(.wallet-status) {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>

