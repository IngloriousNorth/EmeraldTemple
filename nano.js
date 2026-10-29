// nano.js
import './lib/util.js'
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ripemd160 } from './lib/@noble/hashes/ripemd160.js';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Native zero-dependency byte-to-hex helper
function bytesToHex(uint8Array) {
    return Array.from(uint8Array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function decryptAndVerifyGate() {
    console.info('[NANO] Initializing TEMPEST kernel decryption and verification pipeline...');

    const encPath = path.join(__dirname, 'client/src/bundle.enc');
    
    if (!fs.existsSync(encPath)) {
        console.error(`[NANO ERROR] Encrypted bundle not found at: ${encPath}`);
        process.exit(1);
    }

    try {
        // 1. Read sealed package
        const rawPackage = fs.readFileSync(encPath, 'utf8');
        const pkg = JSON.parse(rawPackage);

        console.info(`[NANO] Cipher Protocol: ${pkg.cipherProtocol} [Active]`);

        const ciphertextBuffer = Buffer.from(pkg.ciphertext, 'base64');
        const ivBuffer = Buffer.from(pkg.iv, 'hex');
        const authTagBuffer = Buffer.from(pkg.authTag, 'hex');
        const secretKeyBuffer = Buffer.from(pkg.secretKeyMock, 'hex');

        // 2. Perform RIPEMD-160 integrity verification
        const computedHashDigest = ripemd160(ciphertextBuffer);
        const computedHashHex = bytesToHex(computedHashDigest);

        if (computedHashHex !== pkg.ripemd160Hash) {
            throw new Error(`[SECURITY ALERT] RIPEMD-160 integrity verification failed! Expected ${pkg.ripemd160Hash}, got ${computedHashHex}`);
        }

        console.info('[NANO] RIPEMD-160 integrity verification passed securely.');

        // 3. Perform AES-256-GCM Decryption
        const decipher = crypto.createDecipheriv('aes-256-gcm', secretKeyBuffer, ivBuffer);
        decipher.setAuthTag(authTagBuffer);

        let decryptedCode = decipher.update(ciphertextBuffer, undefined, 'utf8');
        decryptedCode += decipher.final('utf8');

        console.info('[NANO SUCCESS] bundle.enc decrypted and verified successfully.');
        return decryptedCode;

    } catch (err) {
        console.error('[NANO ERROR] Decryption or verification failed:', err);
        process.exit(1);
    }
}

decryptAndVerifyGate();