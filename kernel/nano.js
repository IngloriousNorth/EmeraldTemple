// nano.js (Unified Service Worker Kernel & PEX Engine)
import WebTorrent from '../lib/webtorrent.min.js';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { bytesToHex } from '@noble/hashes/utils';

let streamCancelled = false;

console.info("[NANO SERVICE WORKER] Initialized unified PEX proxy & message-driven kernel.");

// --- Lifecycle ---
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });

// --- WebTorrent Client Setup ---
const client = new WebTorrent({
    dht: false,
    tracker: false,
    pex: true
});
self.client = client;
self.infoHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4"; // Default fallback

// --- Message-Driven Decryption & Swarm Synchronization Pipeline ---
self.addEventListener('message', async (event) => {
    if (!event.data) return;

    // 1. Handle bundle compilation & AES-GCM decryption triggered by Enter key
    if (event.data.type === "COMPILE_BUNDLE") {
        try {
            console.info('[nano.js] COMPILE_BUNDLE requested via Enter key. Fetching Gate.bundle.enc...');

            const res = await fetch('./src/Gate.bundle.enc');
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const packageData = await res.json();

            if (packageData.cipherProtocol !== 'GFQM') {
                throw new Error('Unsupported cipher protocol');
            }

            const iv = Uint8Array.from(matchHex(packageData.iv));
            const keyBytes = Uint8Array.from(matchHex(packageData.secretKeyMock));
            const authTag = Uint8Array.from(matchHex(packageData.authTag));
            
            const rawCiphertext = Uint8Array.from(atob(packageData.ciphertext), c => c.charCodeAt(0));
            
            const encryptedData = new Uint8Array(rawCiphertext.length + authTag.length);
            encryptedData.set(rawCiphertext);
            encryptedData.set(authTag, rawCiphertext.length);

            // Decrypt payload via browser-native SubtleCrypto (AES-GCM verifies authTag automatically)
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

            // Send the decrypted code back to the client window that pressed Enter
            event.source.postMessage({
                type: "BUNDLE_READY",
                code: decryptedCode
            });

        } catch (err) {
            console.error('[nano.js ERROR]: Failed to process bundle on COMPILE_BUNDLE:', err);
            if (event.source) {
                event.source.postMessage({
                    type: "BUNDLE_ERROR",
                    error: err.message
                });
            }
        }
    }

    // 2. Handle synchronization of the hard-coded institutional infoHash from the decrypted bundle
    if (event.data.type === "SYNC_INSTITUTIONAL_INFOHASH" && event.data.infoHash) {
        self.infoHash = event.data.infoHash;
        console.info(`[nano.js PEX] Institutional infoHash synchronized: ${self.infoHash}`);

        const institutionalMagnet = `magnet:?xt=urn:btih:${self.infoHash}&dn=EmeraldTemple_Institutional_seed`;
        
        client.add(institutionalMagnet, { announce: [], pex: true }, (torrent) => {
            console.info(`[nano.js PEX] Swarm anchored successfully: ${torrent.infoHash}`);
        });

        if (event.source) {
            event.source.postMessage({ success: true });
        }
    }

    // 3. Handle infoHash status queries
    if (event.data.type === "GET_SEED_INFOHASH") {
        const seedInfoHash = (client.torrents && client.torrents.length > 0) 
            ? client.torrents[0].infoHash 
            : self.infoHash;

        if (event.source) {
            event.source.postMessage({ success: true, infoHash: seedInfoHash });
        }
    }
});

function matchHex(hexString) {
    return hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
}