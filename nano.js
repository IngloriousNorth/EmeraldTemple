// nano.js
import './lib/util.js'
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ripemd160 } from './lib/@noble/hashes/ripemd160.js';
import { fileURLToPath } from 'url';

// nano.js
(async function() {
    console.info('[nano.js] Initializing gate decryption & compilation pipeline...');

    try {
        // 1. Fetch the encrypted bundle package
        const res = await fetch(chrome.runtime.getURL('src/Gate.bundle.enc'));
        const packageData = await res.json();

        if (packageData.cipherProtocol !== 'GFQM') {
            throw new Error('Unsupported cipher protocol');
        }

        // 2. Parse hex strings back into Uint8Arrays for Web Crypto
        const iv = Uint8Array.from(matchHex(packageData.iv));
        const keyBytes = Uint8Array.from(matchHex(packageData.secretKeyMock));
        const authTag = Uint8Array.from(matchHex(packageData.authTag));
        
        // Decode base64 ciphertext
        const rawCiphertext = Uint8Array.from(atob(packageData.ciphertext), c => c.charCodeAt(0));
        
        // Append authTag to ciphertext for Web Crypto GCM compliance
        const encryptedData = new Uint8Array(rawCiphertext.length + authTag.length);
        encryptedData.set(rawCiphertext);
        encryptedData.set(authTag, rawCiphertext.length);

        // 3. Import key and decrypt via SubtleCrypto
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv, tagLength: 128 },
            cryptoKey,
            encryptedData
        );

        const decoder = new TextDecoder();
        const decryptedCode = decoder.decode(decryptedBuffer);

        // 4. Compile/Inject the decrypted IIFE bundle into the DOM
        const scriptEl = document.createElement('script');
        scriptEl.textContent = decryptedCode;
        document.head.appendChild(scriptEl);
        
        console.info('[nano.js SUCCESS] Gate.bundle.enc successfully compiled and executed.');

    } catch (err) {
        console.error('[nano.js ERROR]: Failed to decrypt/compile Gate.bundle.enc:', err);
    }
})();

function matchHex(hexString) {
    return hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
}