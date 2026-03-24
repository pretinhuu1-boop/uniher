import webPush from 'web-push';

// VAPID keys should be generated once and stored in .env
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

let configured = false;

function ensureConfigured() {
  if (configured || !VAPID_PUBLIC || !VAPID_PRIVATE) return;
  webPush.setVapidDetails(
    'mailto:suporte@uniher.com.br',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
  configured = true;
}

export function isPushEnabled(): boolean {
  return !!(VAPID_PUBLIC && VAPID_PRIVATE);
}

export function getPublicVapidKey(): string {
  return VAPID_PUBLIC;
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; icon?: string; url?: string }
): Promise<boolean> {
  if (!isPushEnabled()) return false;
  ensureConfigured();
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired/invalid — should be removed from DB
      return false;
    }
    console.error('[PUSH] Error:', err.message);
    return false;
  }
}
