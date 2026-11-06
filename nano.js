(async function() {
    console.info('[nano.js KERNEL] Initializing static AES-GCM PEX seeding & decryption pipeline...');

    try {
        const res = await fetch('./src/Gate.bundle.enc');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        // 1. Properly scope packageData
        const packageData = await res.json();

        // 2. Fetch the raw file bytes or convert ciphertext properly for WebTorrent
        // To match instant.io's infoHash of Gate.bundle.enc, we seed the exact JSON file buffer or the ciphertext bytes consistently.
        const fileBuffer = new TextEncoder().encode(JSON.stringify(packageData, null, 2));

        const client = window.client;
        if (client) {
            client.seed(fileBuffer, {
                name: 'Gate.bundle.enc',
                dht: false,
                tracker: false,
                announce: [],
                pex: true
            }, (torrent) => {
                console.info(`[nano.js KERNEL] Static sovereign PEX swarm anchored: ${torrent.infoHash}`);
                window.activeGateInfoHash = torrent.infoHash;
            });
        }

        // 3. Decode cryptographic parameters safely
        const rawCiphertext = Uint8Array.from(atob(packageData.ciphertext), c => c.charCodeAt(0));
        const iv = Uint8Array.from(matchHex(packageData.iv));
        const keyBytes = Uint8Array.from(matchHex(packageData.secretKeyMock));
        const authTag = Uint8Array.from(matchHex(packageData.authTag)); // Fixed: hex string -> Uint8Array

        // 4. Prepare AES-GCM payload buffer (ciphertext + authTag)
        const encryptedData = new Uint8Array(rawCiphertext.length + authTag.length);
        encryptedData.set(rawCiphertext);
        encryptedData.set(authTag, rawCiphertext.length);

        // 5. Decrypt via SubtleCrypto
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

        // 6. Execute decrypted bundle natively
        const executeCode = new Function(decryptedCode);
        executeCode();
        console.info('[nano.js KERNEL SUCCESS] Static AES-GCM bundle successfully compiled and executed.');

    } catch (err) {
        console.error('[nano.js KERNEL ERROR]:', err);
    }
})();

function matchHex(hexString) {
    return hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
}