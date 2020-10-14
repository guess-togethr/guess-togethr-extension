import sodium from "./sodium_shim";
import { bufferToBase64, base64ToBuffer, crc32 } from "../utils";

export function generateLobbyId(seed?: Uint8Array) {
  const id = new Uint8Array(sodium.crypto_sign_PUBLICKEYBYTES + 4);
  const { publicKey, privateKey } = seed
    ? sodium.crypto_sign_seed_keypair(seed)
    : sodium.crypto_sign_keypair();
  id.set(publicKey);
  new DataView(id.buffer).setUint32(
    sodium.crypto_sign_PUBLICKEYBYTES,
    crc32(publicKey)
  );
  return { publicKey, privateKey, lobbyId: bufferToBase64(id) };
}

export function decodeLobbyId(id: string) {
  try {
    const buf = base64ToBuffer(id);
    if (buf.length !== sodium.crypto_sign_PUBLICKEYBYTES + 4) {
      return null;
    }
    const publicKey = buf.subarray(0, sodium.crypto_sign_PUBLICKEYBYTES);
    if (
      crc32(publicKey) !==
      new DataView(buf.buffer).getUint32(sodium.crypto_sign_PUBLICKEYBYTES)
    ) {
      return null;
    }
    return publicKey;
  } catch (e) {
    return null;
  }
}

export function generateNoiseKeypair() {
  const pair = {
    publicKey: new Uint8Array(sodium.crypto_kx_PUBLICKEYBYTES),
    privateKey: new Uint8Array(sodium.crypto_kx_SECRETKEYBYTES),
  };

  sodium.crypto_kx_keypair(pair.publicKey, pair.privateKey);
  return {
    publicKey: bufferToBase64(pair.publicKey),
    privateKey: bufferToBase64(pair.privateKey),
  };
}