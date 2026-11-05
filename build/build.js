// build.js
import esbuild from 'esbuild';
import browserify from 'browserify';
import esmify from 'esmify';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// University-grade static cryptographic constants for 100% deterministic builds
const STATIC_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 32 bytes (256-bit)
const STATIC_IV_HEX  = 'fedcba9876543210fedcba98'; // 12 bytes (96-bit for AES-GCM)

async function runBuild() {
    console.info('[BUILD] Initializing static AES-GCM deterministic compilation & packaging...');

    const targetClientDir = path.join(__dirname, 'client/src');
    fs.mkdirSync(targetClientDir, { recursive: true });

    // 1. Compile entry points via esbuild if needed
    const gateEntryPoint = path.join(__dirname, 'Gate.js');
    if (fs.existsSync(gateEntryPoint)) {
        await esbuild.build({
            entryPoints: [gateEntryPoint],
            bundle: true,
            format: 'esm',
            outfile: path.join(targetClientDir, 'Gate.js'),
            sourcemap: true,
        });
    }

    // 2. Compile main source bundle using Browserify + esmify
    const bundleEntryPoint = path.join(__dirname, 'nano.js');
    const tempBundlePath = path.join(targetClientDir, 'bundle.js');
    const encOutputPath = path.join(targetClientDir, 'bundle.enc');

    if (fs.existsSync(bundleEntryPoint)) {
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

        const encPackage = JSON.stringify({
            cipherProtocol: 'AES-GCM',
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            secretKeyMock: key.toString('hex'),
            ciphertext: encrypted.toString('base64')
        }, null, 2);

        fs.writeFileSync(encOutputPath, encPackage);
        
        if (fs.existsSync(tempBundlePath)) {
            fs.unlinkSync(tempBundlePath);
        }

        console.info(`[BUILD SUCCESS] Static deterministic AES-GCM bundle sealed at client/src/bundle.enc`);
    }
}

runBuild().catch((err) => {
    console.error('[BUILD ERROR]:', err);
    process.exit(1);
});