// Shared CORS utilities for all Edge Functions.
//
// Allow-Origin is `*` because functions are invoked from:
//   - Expo web bundle on https://moneyspender.vercel.app
//   - Expo Go on iPhone (origin: capacitor:// or null in some flows)
//   - localhost during dev (`npm run web` on :8081, `expo start` on :19006)
//
// We don't gate by origin because each function still requires a valid
// Supabase anon-key in the Authorization header (Supabase enforces this
// automatically for invoke()). Anyone reaching a function has already
// passed that gate; CORS would only stop honest browsers, not attackers.

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function handleCorsPreflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
