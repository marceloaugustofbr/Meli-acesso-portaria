// Cloudinary signature generation for Workers
// Usa crypto.subtle.digest (SHA-1) nativo do runtime

/**
 * Gera uma assinatura para uploads seguros ao Cloudinary
 */
export async function generateCloudinarySignature(params, env) {
  const apiSecret = env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    throw new Error('CLOUDINARY_API_SECRET não configurado');
  }

  // Ordena os parâmetros alfabeticamente e concatena
  const sortedKeys = Object.keys(params).sort();
  const signingString = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join('&') + apiSecret;

  // SHA-1 via Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(signingString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
