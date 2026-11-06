// nano.js (Unified Sovereign PEX Kernel & Decryption Engine)
import { ripemd160 } from '@noble/hashes/ripemd160';
import { bytesToHex } from '@noble/hashes/utils';

console.info("[nano.js KERNEL] Initialized sovereign PEX seed & add pipeline.");

(async function() {
    try {
        console.info('[nano.js] Fetching Gate.bundle.enc...');
        const res = await fetch('./src/Gate.bundle.enc');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const packageData = await res.json();

        if (packageData.cipherProtocol !== 'GFQM' && packageData.cipherProtocol !== 'AES-GCM') {
            throw new Error('Unsupported cipher protocol');
        }

        const iv = Uint8Array.from(matchHex(packageData.iv));
        const keyBytes = Uint8Array.from(matchHex(packageData.secretKeyMock));
        const authTag = Uint8Array.from(matchHex(packageData.authTag));
        const rawCiphertext = Uint8Array.from(atob(packageData.ciphertext), c => c.charCodeAt(0));

        // 1. Verify RIPEMD-160 integrity hash using raw ciphertext
        const computedHashDigest = ripemd160(rawCiphertext);
        const computedHashHex = bytesToHex(computedHashDigest);

        if (computedHashHex !== packageData.ripemd160Hash) {
            throw new Error(`[SECURITY ALERT] RIPEMD-160 mismatch! Expected ${packageData.ripemd160Hash}, got ${computedHashHex}`);
        }
        console.info('[nano.js] RIPEMD-160 integrity verified successfully.');

        // 2. Initialize WebTorrent Client
        const client = window.client || new WebTorrent({
            dht: false,
            tracker: false,
            pex: true
        });
        window.client = client;

        // 3. Seed the bundle buffer first to generate/register the torrent infoHash
        const seedBuffer = new TextEncoder().encode(JSON.stringify(packageData, null, 2));
        
        client.seed(seedBuffer, {
            name: 'Gate.bundle.enc',
            announce: [],
            dht: false,
            pex: true
        }, (seededTorrent) => {
            console.info(`[nano.js PEX] Seeded initial bundle. InfoHash: ${seededTorrent.infoHash}`);
            
            const deterministicInfoHash = seededTorrent.infoHash;

            // 4. Reset client.torrents array state, then cleanly add via infoHash
            client.torrents = [];

            const derivedMagnet = `magnet:?xt=urn:btih:${deterministicInfoHash}&dn=EmeraldTemple_Derived_seed`;
            client.add(derivedMagnet, {
                infoHash: deterministicInfoHash,
                announce: [],
                dht: false,
                pex: true
            }, (addedTorrent) => {
                console.info(`[nano.js PEX] Swarm anchored via added infoHash: ${addedTorrent.infoHash}`);
                window.activeGateInfoHash = addedTorrent.infoHash;
            });
        });

        // 5. Decrypt via browser-native SubtleCrypto
        const encryptedData = new Uint8Array(rawCiphertext.length + authTag.length);
        encryptedData.set(rawCiphertext);
        encryptedData.set(authTag, rawCiphertext.length);

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
        console.info('[nano.js SUCCESS] Gate bundle decrypted successfully.');

        // 6. Execute decrypted payload
        const executeCode = new Function(decryptedCode);
        executeCode();

    } catch (err) {
        console.error('[nano.js KERNEL ERROR]:', err);
    }
})();

function matchHex(hexString) {
    return hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
}