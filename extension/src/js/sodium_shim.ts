import sodium from "libsodium-wrappers";

type ShimmedFunctions =
  | "crypto_scalarmult"
  | "crypto_sign_detached"
  | "crypto_aead_chacha20poly1305_ietf_encrypt"
  | "crypto_aead_chacha20poly1305_ietf_decrypt";

type ShimmedLengthFunctions = "crypto_generichash" | "randombytes_buf";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
type ExtendedSodium = Writeable<
  Omit<typeof sodium, "crypto_kx_keypair" | ShimmedFunctions>
> &
  {
    [K in ShimmedFunctions]?: typeof sodium[K] extends (...args: infer A) => any
      ? (buf: Uint8Array, ...args: A) => number
      : never;
  } &
  {
    [K in ShimmedLengthFunctions]?: typeof sodium[K] extends (
      len: number,
      ...args: infer A
    ) => any
      ? (buf: Uint8Array, ...args: A) => number
      : never;
  } & {
    crypto_kx_keypair(pk: Uint8Array, sk: Uint8Array): void;
    crypto_generichash_batch(
      buf: Uint8Array,
      array: Uint8Array[],
      key: Uint8Array
    ): number;
    sodium_memzero: typeof sodium["memzero"];
    sodium_memcmp: typeof sodium["memcmp"];
    sodium_is_zero: typeof sodium["is_zero"];
    sodium_increment: typeof sodium["increment"];
    sodium_malloc(size: number): Uint8Array;
    sodium_free(): void;
  };

const newSodium = {} as ExtendedSodium;

newSodium.ready = sodium.ready.then(() => {
  Object.assign(newSodium, sodium);

  newSodium.crypto_kx_keypair = (pk, sk) => {
    const { publicKey, privateKey } = sodium.crypto_kx_keypair();
    pk.set(publicKey);
    sk.set(privateKey);
  };

  newSodium.crypto_generichash_batch = (buf, array, key) => {
    const state = sodium.crypto_generichash_init(key, buf.length);
    array.forEach((b) => sodium.crypto_generichash_update(state, b));
    const outBuf = sodium.crypto_generichash_final(state, buf.length);
    buf.set(outBuf);
    return outBuf.length;
  };

  function wrapOutBuf<T extends ShimmedFunctions>(functionName: T) {
    newSodium[functionName] = (buf: Uint8Array, ...args: any) => {
      const outBuf = (sodium as any)[functionName](...args);
      buf.set(outBuf);
      return outBuf.length;
    };
  }

  function wrapOutBufLength<T extends ShimmedLengthFunctions>(functionName: T) {
    (newSodium as any)[functionName] = (buf: Uint8Array, ...args: any) => {
      const outBuf = (sodium as any)[functionName](
        buf.length,
        ...args
      ) as Uint8Array;
      buf.set(outBuf);
      return outBuf.length;
    };
  }

  wrapOutBufLength("crypto_generichash");
  wrapOutBufLength("randombytes_buf");
  wrapOutBuf("crypto_sign_detached");
  wrapOutBuf("crypto_scalarmult");
  wrapOutBuf("crypto_aead_chacha20poly1305_ietf_encrypt");
  wrapOutBuf("crypto_aead_chacha20poly1305_ietf_decrypt");

  newSodium.sodium_memzero = sodium.memzero;
  newSodium.sodium_malloc = (s) => new Uint8Array(s);
  newSodium.sodium_free = () => {};
  newSodium.sodium_memcmp = sodium.memcmp;
  newSodium.sodium_is_zero = sodium.is_zero;
  newSodium.sodium_increment = sodium.increment;
});

export default newSodium;
