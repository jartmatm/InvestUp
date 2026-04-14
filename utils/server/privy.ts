import { PrivyClient } from '@privy-io/node';

type VerifiedPrivyAccessToken = {
  appId: string;
  sessionId: string;
  userId: string;
};

let cachedPrivyClient: PrivyClient | null = null;

const getPrivyClient = () => {
  const appId = process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId) {
    throw new Error('Missing PRIVY_APP_ID (or NEXT_PUBLIC_PRIVY_APP_ID).');
  }

  if (!appSecret) {
    throw new Error('Missing PRIVY_APP_SECRET.');
  }

  if (!cachedPrivyClient) {
    cachedPrivyClient = new PrivyClient({ appId, appSecret });
  }

  return cachedPrivyClient;
};

export const extractBearerToken = (authorizationHeader: string | null | undefined) => {
  if (!authorizationHeader) return '';
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/iu);
  return match?.[1]?.trim() ?? '';
};

export async function verifyPrivyAccessToken(accessToken: string): Promise<VerifiedPrivyAccessToken> {
  const client = getPrivyClient();
  const payload = await client.utils().auth().verifyAccessToken(accessToken);

  return {
    appId: payload.app_id,
    sessionId: payload.session_id,
    userId: payload.user_id,
  };
}

