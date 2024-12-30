import * as bip39 from "npm:bip39";
import { BIP32Factory } from "npm:bip32";
import * as ecc from "npm:tiny-secp256k1";
import { Buffer } from "node:buffer";
import { encode } from "npm:@stablelib/hex";

// Create a BIP32 instance with the required elliptic curve implementation
const bip32 = BIP32Factory(ecc);

// Example mnemonic phrase (ensure this is securely stored/handled)
const mnemonic = "test test test test test test test test test test test junk"; 

// Derivation path (e.g., Ethereum uses m/44'/60'/0'/0/0)
const derivationPath = "m/44'/60'/0'/0/0"; 

async function derivePrivateKey(mnemonic: string, derivationPath: string): Promise<string> {
  // Step 1: Validate the mnemonic
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic");
  }

  // Step 2: Convert mnemonic to seed
  const seed = await bip39.mnemonicToSeed(mnemonic);

  // Step 3: Create a root node from the seed
  const root = bip32.fromSeed(Buffer.from(seed));

  // Step 4: Derive the child key using the path
  const child = root.derivePath(derivationPath);

  // Step 5: Return the private key in hexadecimal format
  if (!child.privateKey) {
    throw new Error("Unable to derive private key");
  }

  return encode(child.privateKey);
}

derivePrivateKey(mnemonic, derivationPath)
  .then((privateKey) => console.log("Derived Private Key:", privateKey))
  .catch((err) => console.error("Error:", err));
