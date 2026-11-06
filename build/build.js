// build.js
import browserify from 'browserify';
import esmify from 'esmify';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Native zero-dependency byte-to-hex helper for RIPEMD-160 digest
function bytesToHex(uint8Array) {
    return Array.from(uint8Array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// University-grade static cryptographic constants for 100% deterministic builds
const STATIC_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 32 bytes (256-bit)
const STATIC_IV_HEX  = 'fedcba9876543210fedcba98'; // 12 bytes (96-bit for AES-GCM)

async function runBuild() {
    console.info('[BUILD] Initializing static AES-GCM deterministic compilation & RIPEMD-160 sealing...');

    // Output target directory: EmeraldTemple/src
    const targetClientDir = path.join(__dirname, '../src');
    fs.mkdirSync(targetClientDir, { recursive: true });

    // Compile main source bundle using Browserify + esmify
    const bundleEntryPoint = path.join(__dirname, '../Gate.js');
    const tempBundlePath = path.join(targetClientDir, 'bundle.temp.js');
    const encOutputPath = path.join(targetClientDir, 'Gate.bundle.enc');

    if (!fs.existsSync(bundleEntryPoint)) {
        throw new Error(`Entry point not found: ${bundleEntryPoint}`);
    }

    const mainB = browserify(bundleEntryPoint, {
        plugin: [esmify],
        debug: true
    });

    await new Promise((resolve, reject) => {
        mainB.bundle()
            .on('error', reject)
            .pipe(fs.createWriteStream(tempBundlePath))
            .on('finish', resolve);
    });

    const rawBundleCode = fs.readFileSync(tempBundlePath, 'utf8');
    const iifeWrappedCode = `(function() {\n"use strict";\n${rawBundleCode}\n})();`;

    const key = Buffer.from(STATIC_KEY_HEX, 'hex');
    const iv = Buffer.from(STATIC_IV_HEX, 'hex');

    // Encrypt with static key and IV -> guaranteed identical ciphertext bytes per build
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(iifeWrappedCode, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Compute RIPEMD-160 integrity hash over the ciphertext buffer
    const hashDigest = ripemd160(encrypted);
    const hashHex = bytesToHex(hashDigest);

    const encPackage = JSON.stringify({
        cipherProtocol: 'GFQM',
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        secretKeyMock: key.toString('hex'),
        ripemd160Hash: hashHex,
        ciphertext: encrypted.toString('base64')
    }, null, 2);

    fs.writeFileSync(encOutputPath, encPackage);
    
    if (fs.existsSync(tempBundlePath)) {
        fs.unlinkSync(tempBundlePath);
    }

    console.info(`[BUILD SUCCESS] Static deterministic AES-GCM bundle sealed at src/Gate.bundle.enc`);
    console.info(`[RIPEMD-160 Integrity Hash]: ${hashHex}`);
}

runBuild().catch((err) => {
    console.error('[BUILD ERROR]:', err);
    process.exit(1);
});