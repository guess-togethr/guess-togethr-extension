const sodium = require("libsodium-wrappers");

sodium.ready.then(() => {
  const oSodium = { ...sodium };

  sodium.crypto_kx_keypair = (pk, sk) => {
    const { publicKey, privateKey } = oSodium.crypto_kx_keypair();
    pk.set(publicKey);
    sk.set(privateKey);
  };

  sodium.crypto_generichash_batch = (buf, array, key) => {
    const state = oSodium.crypto_generichash_init(key, buf.length);
    array.forEach((b) => oSodium.crypto_generichash_update(state, b));
    const outBuf = oSodium.crypto_generichash_final(state, buf.length);
    buf.set(outBuf);
    return outBuf.length;
  };

  function wrapOutBuf(functionName) {
    sodium[functionName] = (buf, ...args) => {
      const outBuf = oSodium[functionName](...args);
      buf.set(outBuf);
      return outBuf.length;
    };
  }

  function wrapOutBufLength(functionName) {
    sodium[functionName] = (buf, ...args) => {
      const outBuf = oSodium[functionName](buf.length, ...args);
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

  sodium.sodium_memzero = sodium.memzero;
  sodium.sodium_malloc = (s) => new Uint8Array(s);
  sodium.sodium_free = () => {};
  sodium.sodium_memcmp = sodium.memcmp;
  sodium.sodium_is_zero = sodium.is_zero;
  sodium.sodium_increment = sodium.increment;
});

module.exports = sodium;
