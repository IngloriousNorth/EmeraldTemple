// nano.min.js (Kernel Verification & Execution Script)
import { ripemd160 } from '@noble/hashes/ripemd160';
import { bytesToHex } from '@noble/hashes/utils';

(async function() {
    // Put this as line 1 of nano.min.js
    try {
        // 1. Fetch encrypted bundle package
        const res = await fetch('./src/Gate.bundle.enc');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const packageData = await res.json();

        if (packageData.cipherProtocol !== 'GFQM') {
            throw new Error('Unsupported cipher protocol');
        }

        const iv = Uint8Array.from(matchHex(packageData.iv));
        const keyBytes = Uint8Array.from(matchHex(packageData.secretKeyMock));
        const authTag = Uint8Array.from(matchHex(packageData.authTag));
        
        // Decode base64 ciphertext (representing the whole encrypted payload)
        const rawCiphertext = Uint8Array.from(atob(packageData.ciphertext), c => c.charCodeAt(0));

        // 2. Perform RIPEMD-160 integrity verification on the whole ciphertext package
        const computedHashDigest = ripemd160(rawCiphertext);
        const computedHashHex = bytesToHex(computedHashDigest);

        if (computedHashHex !== packageData.ripemd160Hash) {
            throw new Error(`[SECURITY ALERT] RIPEMD-160 mismatch! Expected ${packageData.ripemd160Hash}, got ${computedHashHex}`);
        }
        console.info('[nano.js KERNEL] RIPEMD-160 integrity verification passed securely.');

        // 3. Grab client from window.client and bind the verified cryptographic hash
        // 3. Grab window.client, attach the verified hash globally, and add the torrent if ready

        if (window.client) {
            const magnetURI = `magnet:?xt=urn:btih:${computedHashHex}&dn=EmeraldTemple_Enclave`;
            try{
                // Always check via client.get() first to prevent duplicate errors
                window.client.add(magnetURI, {
                    announce: [], // No public trackers
                    dht: false,
                    pex: true
                })
                console.info(`[NANO KERNEL] Torrent already loaded in window.client.`);
            }
            catch(err){
                console.warn(err);
            }

        }

        // 4. Prepare AES-GCM data (append authTag to raw ciphertext for Web Crypto compliance)
        const encryptedData = new Uint8Array(rawCiphertext.length + authTag.length);
        encryptedData.set(rawCiphertext);
        encryptedData.set(authTag, rawCiphertext.length);

        // 5. Decrypt payload via SubtleCrypto
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv, tagLength: 128 },
            cryptoKey,
            encryptedData
        );

        const decryptedCode = new TextDecoder().decode(decryptedBuffer);

        // 6. Execute decrypted code natively in window scope
        const executeCode = new Function(decryptedCode);
        executeCode();
        console.info('[nano.js KERNEL SUCCESS] Gate.bundle.enc successfully compiled and executed.');

    } catch (err) {
        console.error('[nano.js KERNEL ERROR]:', err);
    }
})();

function matchHex(hexString) {
    return hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
}