// src/Hook/Ramosa.js
import MVC from '../MAINFRAME/MAINFRAME.js';

//imports webtorrent upload fn() with hard-coded whitelist
//EmeraldTemple's *original public domain whitelist, via Open Source coding intent* can be found in Hook/webtorrent.js
import WebTorrentControl from '../Control/webtorrent.js';
//extra control factor
//FF

const RamosaHook = {
    unfurl: function(selector = 'body') {
        if (!window.dragDrop) {
            console.error("[RAMOSA HOOK ERROR] window.dragDrop is not attached to window.");
            return;
        }

        window.dragDrop(document.body, (files, pos, fileList, directories) => {
            const targetElement = document.elementFromPoint(pos.x, pos.y);
            const dropMatch = targetElement ? targetElement.closest(selector) : null;

            if (!dropMatch) return;
            if (!files || files.length === 0) return;

            const droppedFile = files[0];
            if (droppedFile.type !== 'application/pdf' && !droppedFile.name.toLowerCase().endsWith('.pdf')) {
                console.warn("[RAMOSA HOOK] Dropped file is not a valid PDF.");
                return;
            }

            console.info(`[RAMOSA HOOK] PDF dropped: "${droppedFile.name}". Extracting text via pdfjs...`);

            (async () => {
                try {
                    const arrayBuffer = await droppedFile.arrayBuffer();
                    const pdfDoc = await window.pdfjs.getDocument({ 
                        data: arrayBuffer, 
                        password: '' 
                    }).promise;
                    
                    let extractedText = "";
                    const maxPages = Math.min(pdfDoc.numPages, 3);
                    for (let i = 1; i <= maxPages; i++) {
                        const page = await pdfDoc.getPage(i);
                        const textContent = await page.getTextContent();
                        extractedText += textContent.items.map(item => item.str).join(" ") + "\n";
                    }

                    console.info(`[RAMOSA HOOK] Extracted ${extractedText.length} characters. Requesting user metadata...`);

                    // ── Prompt Sequence ──────────────────────────────────
                    const webSeedUrl  = prompt("1/3. Enter whitelisted Web Seed URL:", `https://dn721902.ca.archive.org/0/items/citygod00dodsgoog/citygod00dodsgoog_text.pdf`);
                    const sourceDate  = prompt("2/3. Enter Source Publication Date (e.g. 1921 or n.d.):", "2010");
                    const userClasses = prompt("3/3. Enter comma-separated classes/categories:", "Public Domain, History");
                    // ─────────────────────────────────────────────────────

                    if(!webSeedUrl){
                        return;
                    }
                    if (webSeedUrl && webSeedUrl.trim() !== "") {
                        if (!WebTorrentControl.isWhitelisted(webSeedUrl)) {
                            console.error("[MVC.Hook.Webtorrent] Security check failed: Webseed URL is not whitelisted. Aborted.");
                            alert("[REJECTED] The entered Web Seed URL is not whitelisted.");
                            return;
                        }
                    }

                    // Correct argument order matching controller signature:
                    // async process(pdfFile, fileText, webSeedUrl, sourceDate, userClasses)
                    await MVC.Control.Ramosa.process(
                        droppedFile, 
                        extractedText, 
                        webSeedUrl || "", 
                        sourceDate || "n.d.", 
                        userClasses || "Public Domain"
                    );

                } catch (err) {
                    console.error("[RAMOSA HOOK ERROR] Failed to parse PDF via pdfjs:", err);
                }
            })();
        });

        console.info(`[RAMOSA HOOK] unfurl() bound successfully to drag zone selector: ${selector}`);
    }
};

export default RamosaHook;