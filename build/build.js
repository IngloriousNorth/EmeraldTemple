// build.js
import browserify from 'browserify';
import esmify from 'esmify';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { bytesToHex } from '@noble/hashes/utils'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBuild() {
    console.info('[BUILD] Initializing unified GFQM (AES-256-GCM) compilation & encryption pipeline for Gate.bundle.enc...');

    const targetClientDir = path.join(__dirname, '../src');
    fs.mkdirSync(targetClientDir, { recursive: true });

    // Compile main source bundle from Gate.js using Browserify + esmify
    const bundleEntryPoint = path.join(__dirname, '../Gate.js');
    const tempBundlePath = path.join(targetClientDir, 'Gate.temp.js');
    const encOutputPath = path.join(targetClientDir, 'Gate.bundle.enc');

    if (fs.existsSync(bundleEntryPoint)) {
        console.info('[BUILD] Compiling Gate.js source bundle via Browserify...');
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

        // 1. Read compiled bundle code and wrap in a clean IIFE
        const rawBundleCode = fs.readFileSync(tempBundlePath, 'utf8');
        const iifeWrappedCode = `(function() {\n"use strict";\n${rawBundleCode}\n})();`;

        // 2. Encrypt via AES-256-GCM & generate RIPEMD-160 integrity hash
        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(12); // Standard 12-byte IV for GCM
        
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(iifeWrappedCode, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();

        const hashDigest = ripemd160(encrypted);
        const hashHex = bytesToHex(hashDigest);

        // 3. Construct the sealed metadata package for Gate.bundle.enc
        const encPackage = JSON.stringify({
            cipherProtocol: 'GFQM',
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            secretKeyMock: key.toString('hex'),
            ripemd160Hash: hashHex,
            ciphertext: encrypted.toString('base64')
        }, null, 2);

        fs.writeFileSync(encOutputPath, encPackage);
        
        // Clean up temporary unencrypted intermediate bundle
        if (fs.existsSync(tempBundlePath)) {
            fs.unlinkSync(tempBundlePath);
        }

        console.info(`[BUILD SUCCESS] Gate.js successfully bundled, IIFE-wrapped, encrypted via AES-256-GCM (GFQM), and sealed at client/src/Gate.bundle.enc`);
        console.info(`[RIPEMD-160 Integrity Hash]: ${hashHex}`);
    } else {
        console.warn('[BUILD WARNING] Gate.js entry point not found. Skipping bundle encryption step.');
    }
}

runBuild().catch((err) => {
    console.error('[BUILD ERROR]:', err);
    process.exit(1);
});