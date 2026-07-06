import { ripemd160 } from 'https://cdn.jsdelivr.net/npm/@noble/hashes@1.3.1/ripemd160.js';
import { sha256 } from 'https://cdn.jsdelivr.net/npm/@noble/hashes@1.3.1/sha256.js';
import { secp256k1 } from 'https://cdn.jsdelivr.net/npm/@noble/curves@1.2.0/secp256k1.js';
import { base58check } from 'https://cdn.jsdelivr.net/npm/@scure/base@1.1.1/index.js';

// Helper to convert hex string to Uint8Array
function hexToBytes(hex) {
  return Uint8Array.from(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// Helper to convert Uint8Array to hex string
function bytesToHex(bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}

// Function to generate a Bitcoin address from a private key (hex string)
function getBitcoinAddress(privateKeyHex) {
  const privateKeyBytes = hexToBytes(privateKeyHex);
  const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes, true); // compressed public key

  const sha256Hash = sha256(publicKeyBytes);
  const ripemd160Hash = ripemd160(sha256Hash);

  const address = base58check.encode(ripemd160Hash, 0x00); // 0x00 for P2PKH mainnet
  return address;
}

self.onmessage = async (e) => {
  const { startRange, endRange, puzzleId, targetAddress } = e.data;
  console.log(`Worker: Starting Brute Force for puzzle ${puzzleId} from ${startRange} to ${endRange}`);

  let currentKey = BigInt(startRange);
  const endKey = BigInt(endRange);
  let count = 0;
  const totalKeys = endKey - currentKey;

  while (currentKey <= endKey) {
    const privateKeyHex = currentKey.toString(16).padStart(64, '0');
    const address = getBitcoinAddress(privateKeyHex);

    if (address === targetAddress) {
      self.postMessage({ type: 'found', privateKey: privateKeyHex, address: address });
      return;
    }

    count++;
    if (count % 10000 === 0) { // Report progress every 10,000 keys
      self.postMessage({ type: 'progress', progress: Number(currentKey - BigInt(startRange)) / Number(totalKeys) });
    }

    currentKey++;
  }

  self.postMessage({ type: 'complete', result: 'No key found in range' });
};
