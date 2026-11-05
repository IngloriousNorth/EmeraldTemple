// nano.js (Corrected Cryptographic Parsing)
(async function() {
    console.info('[nano.js KERNEL] seeding, and decryption pipeline...');

    try {
        const res = await fetch('./src/Gate.bundle.enc');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const packageData = await res.json();

        if (packageData.cipherProtocol !== 'GFQM') {
            throw new Error('Unsupported cipher protocol');
        }

        const rawCiphertext = Uint8Array.from(atob(packageData.ciphertext), c => c.charCodeAt(0));

        // 1. Use client.seed to anchor the PEX swarm deterministically
        const client = window.client;
        if (client) {
            client.seed(rawCiphertext, {
                name: 'Gate.bundle.enc',
                dht: false,
                tracker: false,
                pex: true
            }, (torrent) => {
                console.info(`[nano.js KERNEL] PEX swarm anchored via client.seed: ${torrent.infoHash}`);
            });
        }

        // 2. Properly decode all hex-encoded cryptographic parameters
        const iv = Uint8Array.from(matchHex(packageData.iv));
        const keyBytes = Uint8Array.from(matchHex(packageData.secretKeyMock));
        const authTag = Uint8Array.from(matchHex(packageData.authTag)); // <-- FIXED: converted hex string to Uint8Array

        // 3. Prepare AES-GCM data (append authTag to raw ciphertext for Web Crypto compliance)
        const encryptedData = new Uint8Array(rawCiphertext.length + authTag.length);
        encryptedData.set(rawCiphertext);
        encryptedData.set(authTag, rawCiphertext.length);

        // 4. Decrypt payload via SubtleCrypto
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

        // 5. Execute decrypted code natively in window scope
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