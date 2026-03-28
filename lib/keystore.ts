// Browser-side key pair persistence.
// Private keys never leave the device. Public keys are also cached here
// so they can be re-uploaded if a previous upload failed.

const PRIV_PREFIX = 'le_pk_'
const PUB_PREFIX = 'le_pub_'

export function storeKeyPair(userId: string, privateBase64: string, publicBase64: string): void {
  localStorage.setItem(`${PRIV_PREFIX}${userId}`, privateBase64)
  localStorage.setItem(`${PUB_PREFIX}${userId}`, publicBase64)
}

export function loadPrivateKey(userId: string): string | null {
  return localStorage.getItem(`${PRIV_PREFIX}${userId}`)
}

export function loadPublicKey(userId: string): string | null {
  return localStorage.getItem(`${PUB_PREFIX}${userId}`)
}
