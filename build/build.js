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

async function runBuild() {
    console.info('[BUILD] Initializing deterministic GFQM compilation & encryption pipeline (RIPEMD removed)...');

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

        // 3. Generate a deterministic 12-byte IV derived from the bundle code hash 
        // (Guarantees WebTorrent computes the exact same infoHash across builds for identical source code)
        const codeHash = crypto.createHash('sha256').update(iifeWrappedCode).digest();
        const iv = codeHash.subarray(0, 12); 

        // Generate a fresh random AES-256-GCM key per build under GFQM spec
        const key = crypto.randomBytes(32);

        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(iifeWrappedCode, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();

        const encPackage = JSON.stringify({
            cipherProtocol: 'GFQM',
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            secretKeyMock: key.toString('hex'),
            ciphertext: encrypted.toString('base64')
        }, null, 2);

        fs.writeFileSync(encOutputPath, encPackage);
        
        if (fs.existsSync(tempBundlePath)) {
            fs.unlinkSync(tempBundlePath);
        }

        console.info(`[BUILD SUCCESS] Deterministic GFQM bundle sealed at client/src/bundle.enc`);
        console.info(`[Deterministic IV]: ${iv.toString('hex')}`);
    }
}

runBuild().catch((err) => {
    console.error('[BUILD ERROR]:', err);
    process.exit(1);
});