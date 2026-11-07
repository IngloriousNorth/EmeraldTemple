// nano.js (Unified Sovereign PEX Kernel & Decryption Engine)
import { ripemd160 } from '@noble/hashes/ripemd160';
import { bytesToHex } from '@noble/hashes/utils';

const webseedURL = "https://raw.githubusercontent.com/IngloriousNorth/EmeraldTemple/refs/heads/main/src/Gate.bundle.enc";

console.info("[nano.js KERNEL] Initialized sovereign PEX seed & decryption engine.");

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
        console.info('[nano.js KERNEL] RIPEMD-160 integrity verification passed securely.');

        // 2. Initialize or retrieve WebTorrent Client on window scope
        const client = window.client || (typeof WebTorrent !== 'undefined' ? new WebTorrent({
            dht: false,
            pex: true,
            announce: []
        }) : null);

        const seedBuffer = new TextEncoder().encode(JSON.stringify(packageData, null, 2));

        // 3. Seed and anchor the trackerless PEX swarm with strict Emerald Temple peer guarding
        client.seed(seedBuffer, {
            urlList : [webseedURL],
            name: 'EmeraldTemple Academic Enclave',
            dht: true,
            announce: [],//if you're in the future and dht doesn't work, add a LAN or web tracker to announce[]
            pex: true
        }, (torrent) => {
            console.info("[nano.js KERNEL] client seeded", torrent.infoHash);

            // Strict Peer Guard: Ensure connection is running on Emerald Temple / authorized handshake
            torrent.on('wire', (wire, addr) => {
                console.info(`[NANO PEX] Peer attempting connection: ${addr} | Peer ID: ${wire.peerId}`);

                // Check if peer presents valid EmeraldTemple criteria or extensions
                // Drop connection if it's an unauthorized node or failing protocol check
                const isEmeraldTemplePeer = wire.peerId && wire.extendedMapping?.ramosa !== undefined;

                if (!isEmeraldTemplePeer) { 
                    console.warn(`[SECURITY] Rejecting unauthorized non-EmeraldTemple peer: ${addr}`);
                    wire.destroy();
                    return;
                }

                console.info(`[SECURITY] Authorized EmeraldTemple peer connected: ${addr}`);
            });
        });

        // 4. Decrypt via browser-native SubtleCrypto
        const encryptedData = new Uint8Array(rawCiphertext.length + authTag.length);
        encryptedData.set(rawCiphertext);
        encryptedData.set(authTag, rawCiphertext.length);

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

        const decryptedCode = new TextDecoder().decode(decryptedBuffer);
        console.info('[nano.js KERNEL SUCCESS] Gate bundle decrypted successfully.');

        // 5. Execute decrypted payload
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