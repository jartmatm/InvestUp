import { formatUnits, isAddress, type PublicClient } from 'viem';
import { polygon } from 'viem/chains';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

let publicClientPromise: Promise<PublicClient> | null = null;

const roundToSixDecimals = (value: number) => Number(value.toFixed(6));

const getPublicClient = async () => {
  if (!publicClientPromise) {
    publicClientPromise = (async () => {
      const [{ createPublicClient, http }] = await Promise.all([import('viem')]);

      return createPublicClient({
        chain: polygon,
        transport: http('https://polygon-mainnet.infura.io/v3/002caff678d04f258bed0609c0957c82'),
      });
    })();
  }

  return publicClientPromise;
};

export type WalletBalanceSyncResult = {
  available_wallet_usd: number;
  wallet_address: string | null;
  synced: boolean;
};

export async function refreshCurrentUserWalletBalance(userId: string): Promise<WalletBalanceSyncResult> {
  const supabase = getSupabaseAdminClient();

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('wallet_address,available_wallet_usd')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    throw new Error(userError.message);
  }

  const walletAddress =
    typeof userRow?.wallet_address === 'string' ? userRow.wallet_address.trim() : '';
  const currentAvailable = Number(userRow?.available_wallet_usd ?? 0);

  if (!walletAddress) {
    return {
      available_wallet_usd: Number.isFinite(currentAvailable) ? roundToSixDecimals(currentAvailable) : 0,
      wallet_address: null,
      synced: false,
    };
  }

  if (!isAddress(walletAddress)) {
    throw new Error('Invalid wallet address stored for the current user.');
  }

  const publicClient = await getPublicClient();
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [walletAddress as `0x${string}`],
  });

  const availableWalletUsd = roundToSixDecimals(Number(formatUnits(balance as bigint, 6)));
  const { error: updateError } = await supabase
    .from('users')
    .update({ available_wallet_usd: availableWalletUsd })
    .eq('id', userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    available_wallet_usd: availableWalletUsd,
    wallet_address: walletAddress,
    synced: true,
  };
}
