(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Gate = void 0;
const Gate = exports.Gate = {
  initialized: false,
  authTriggered: false,
  init() {
    if (this.initialized) {
      console.warn("[GATE] Gate.init() already executed.");
      return;
    }
    this.initialized = true;
    console.info("[GATE] Initializing Emerald Temple Institutional Enclave (Foobar Test Mode)...");

    // Automatically execute authentication using the hardcoded university key
    this.authenticateWithHardcodedKey();
  },
  async authenticateWithHardcodedKey() {
    if (this.authTriggered) return;
    this.authTriggered = true;
    try {
      // HARDCODED "FOOBAR" UNIVERSITY PRIVATE KEY / TOKEN FOR TESTING
      const HARDCODED_UNIVERSITY_KEY = "foobar-institutional-harbor-master-key-2026";
      console.info("[AUTH] Processing hardcoded institutional key payload...");
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(HARDCODED_UNIVERSITY_KEY);

      // Compute RIPEMD-160 hash via @noble/hashes
      const hashDigest = ripemd160(keyBytes);
      const institutionalHash = bytesToHex(hashDigest);
      console.info(`[HARBOR LOCKED] Derived Institutional InfoHash: ${institutionalHash}`);

      // ==========================================
      // GLOBAL SCOPE BINDINGS (Access via window.infoHash)
      // ==========================================
      window.infoHash = institutionalHash;
      self.infoHash = institutionalHash;
      window.seedInfoHash = institutionalHash;
      if (window.client) {
        window.client.lockedPexHash = institutionalHash;
      }

      // Broadcast infoHash to background service worker
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: "UPDATE_BACKGROUND_SEED_INFOHASH",
          infoHash: institutionalHash
        }, response => {
          if (response && response.success) {
            console.info("[GATE] Background service worker synchronized with infoHash.");
          }
        });
      }

      // Visual confirmation and bundle injection
      this.injectBundleAndUnlock();
    } catch (err) {
      console.error("[AUTH ERROR] Hardcoded key derivation failed:", err);
      this.authTriggered = false;
    }
  },
  injectBundleAndUnlock() {
    console.info("[SUCCESS] Enclave gate unlocked via hardcoded institutional credentials.");

    // Dynamically inject bundle.js into the HTML head
    if (!document.querySelector('script[src="src/bundle.js"]')) {
      const bundleScript = document.createElement('script');
      bundleScript.type = 'module';
      bundleScript.src = 'src/bundle.js';
      bundleScript.onload = async () => {
        console.info("[GATE] bundle.js loaded successfully.");
        try {
          await import('./Index.js');
        } catch (e) {
          console.info("[GATE] Index.js execution bound.");
        }
      };
      bundleScript.onerror = err => {
        console.error("[GATE ERROR] Failed to load bundle.js:", err);
      };
      document.head.appendChild(bundleScript);
      console.info("[GATE] bundle.js dynamically injected into HTML head.");
    } else {
      import('./Index.js').catch(() => {});
    }

    // Fade out crossRoad / gate overlay if present
    if (typeof $ !== 'undefined' && $(".crossRoad").length) {
      $(".crossRoad").fadeOut(777);
    }
  }
};

// Auto-initialize upon script load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Gate.init(), {
    once: true
  });
} else {
  Gate.init();
}
var _default = exports.default = Gate;

},{}]},{},[1]);
