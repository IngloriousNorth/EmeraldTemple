// ==========================================
// src/Control/Ramosa.js - Full Controller Engine
// ==========================================

import MVC from '../MAINFRAME/MAINFRAME.js';
import RamosaModel from '../Model/Ramosa.js';
import WebTorrentControl from './WebTorrent.js';
import WebTorrentBase from '../Model/WebTorrent.js';
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers environment for browser execution
env.allowLocalModels = false;

class PipelineSingleton {
    static task = 'text-generation';
    static model = 'Xenova/Qwen1.5-0.5B-Chat';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (!this.instance) {
            this.instance = await pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

const RamosaControl = {
    pipelineInstance: null,

    toTitleCase(str) {
        if (!str) return "";
        let cleanStr = str.replace(/\s*\(.*?\)/g, '').trim();
        return cleanStr.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    },

    generateAPAAndDN(author, year, title, translator, publisher) {
        let cleanAuthor = author ? author.replace(/\*/g, '').trim() : "";
        if (/^unknown/i.test(cleanAuthor)) cleanAuthor = "";

        let baseTitle = title ? title.replace(/\*/g, '').trim().replace(/\s*\(.*?\)/g, '').trim() : "Historical Work";
        const cleanTitle = this.toTitleCase(baseTitle);
        
        let cleanPublisher = publisher ? publisher.replace(/\*/g, '').trim() : null;
        if (!cleanPublisher || /Public Domain Archive|Digital Archive|Internet Archive|archive\.org|Google Books/i.test(cleanPublisher)) {
            cleanPublisher = null;
        }

        const cleanTranslator = translator ? translator.replace(/\*/g, '').trim() : null;

        let apaString = cleanAuthor ? `${cleanAuthor} (${year}). ${cleanTitle}` : `(${year}). ${cleanTitle}`;
        apaString += cleanTranslator ? ` (${cleanTranslator}, Trans.).` : `.`;
        if (cleanPublisher) apaString += ` ${cleanPublisher}.`;

        return { apaString, dn: apaString, cleanTitle, cleanAuthor, cleanPublisher, cleanTranslator };
    },

    async extractFirst12PagesText(pdfFile) {
        let arrayBuffer;
        if (typeof pdfFile.arrayBuffer === 'function') {
            arrayBuffer = await pdfFile.arrayBuffer();
        } else if (pdfFile instanceof ArrayBuffer) {
            arrayBuffer = pdfFile;
        } else {
            throw new Error("[RAMOSA CONTROL] Invalid file reference passed to extractFirst12PagesText");
        }

        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPagesToScan = Math.min(pdfDoc.numPages, 12);
        let extractedText = "";

        for (let i = 1; i <= totalPagesToScan; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageString = textContent.items.map(item => item.str).join(" ");
            extractedText += `\n--- PAGE ${i} ---\n` + pageString;
        }

        return extractedText.trim();
    },

    async parseMetadata(pdfFile, userClasses = "Public Domain", sourceDate = null) {
        // Step 1: Extract text directly from the first 12 pages via pdfjsLib so the AI reads the title page
        const rawTitlePagesText = await this.extractFirst12PagesText(pdfFile);
        const cleanText = rawTitlePagesText.replace(/\s+/g, ' ').trim().substring(0, 4000);

        let extracted = { title: "Historical Work", author: "", year: sourceDate || "Pre-1931", publisher: null, translator: null };

        try {
            console.info("[RAMOSA CONTROL] Loading client-side local LLM pipeline via Transformers.js...");
            const generator = await PipelineSingleton.getInstance();

            // Step 2: Simple AI prompt covering all book cases for metadata extraction
            const prompt = `Analyze the following book opening pages and extract the metadata. Output strict JSON with keys: "title", "author", "original_published_date", "edition_published_date", "publisher", "translator".\n\nText:\n${cleanText}\n\nJSON:`;
            const output = await generator(prompt, { max_new_tokens: 150, temperature: 0.1 });
            
            const responseText = output[0]?.generated_text || "";
            const jsonStartIndex = responseText.indexOf('{');
            const jsonEndIndex = responseText.lastIndexOf('}');
            if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                const parsed = JSON.parse(responseText.substring(jsonStartIndex, jsonEndIndex + 1));
                extracted.title = parsed.title || extracted.title;
                extracted.author = parsed.author || extracted.author;
                extracted.year = parsed.original_published_date || extracted.year;
                extracted.publisher = parsed.publisher || extracted.publisher;
                extracted.translator = parsed.translator || extracted.translator;
            }
        } catch (err) {
            console.warn("[RAMOSA CONTROL] Local Transformers.js inference failed, falling back to defaults:", err);
        }

        const generated = this.generateAPAAndDN(extracted.author, extracted.year, extracted.title, extracted.translator, extracted.publisher);
        return {
            detectedCategory: "OPEN_AI_ARCHIVE",
            apaString: generated.apaString,
            dn: generated.dn,
            metadata: { title: generated.cleanTitle, author: generated.cleanAuthor, year: extracted.year, publisher: generated.cleanPublisher, translator: generated.cleanTranslator, userClasses }
        };
    },

    parseSpheres(apaString, commaSeparatedClasses, sourceDate = null, forcedTitle = null) {
        const authorMatch = apaString.match(/^(.*?)\s*\(/);
        const yearMatch = apaString.match(/\((\d{4}[a-z]?)\)/);
        const titleMatch = apaString.match(/\)\.\s+(.*?)\./);

        let author = authorMatch ? authorMatch[1].trim() : "Unknown Author";
        let year = sourceDate || (yearMatch ? yearMatch[1] : "n.d.");
        let title = forcedTitle || (titleMatch ? titleMatch[1].trim() : "Historical Work");

        const classList = commaSeparatedClasses ? (typeof commaSeparatedClasses === 'string' ? commaSeparatedClasses.split(',').map(c => c.trim()).filter(Boolean) : commaSeparatedClasses) : ["Public Domain"];

        return {
            rayVersion: "1.0",
            categoryType: "Open Archive",
            Sphere: {
                source: {
                    uuid: `src_${Math.random().toString(36).substring(2, 9)}`,
                    name: title,
                    genus: "Historical Book",
                    date: year,
                    cover_img: ""
                },
                persons: [{ name: author, links: [{ rel: "wrote_source", targetName: title }] }],
                classes: classList.map(cName => ({ name: cName, links: [{ rel: "contains_source", targetName: title }] })),
                institution: { name: "Public Domain Archive", genus: "Archive" },
                edition: {
                    uuid: `ed_${Math.random().toString(36).substring(2, 9)}`,
                    title: `${title} (Digital Edition)`,
                    date: year,
                    created_at: Date.now(),
                    APA: apaString,
                    webSeed: "",
                    torrents: []
                },
                Doc: []
            }
        };
    },

    async extractCompressedCoverArt(pdfFile) {
        let arrayBuffer;
        if (typeof pdfFile.arrayBuffer === 'function') {
            arrayBuffer = await pdfFile.arrayBuffer();
        } else if (pdfFile instanceof ArrayBuffer) {
            arrayBuffer = pdfFile;
        } else {
            throw new Error("[RAMOSA CONTROL] Invalid file reference passed to extractCompressedCoverArt");
        }

        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let targetPageNum = 1;
        let page1 = null;

        const maxScanPages = Math.min(pdfDoc.numPages, 5);
        for (let i = 1; i <= maxScanPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const textString = textContent.items.map(item => item.str).join(" ").trim();

            if (textString.length > 30 && !/google|digitized|preserved|library/i.test(textString.substring(0, 100))) {
                targetPageNum = i;
                page1 = page;
                break;
            }
        }

        if (!page1) {
            page1 = await pdfDoc.getPage(1);
        }

        const unscaledViewport = page1.getViewport({ scale: 1.0 });
        const targetWidth = 222;
        const scale = targetWidth / unscaledViewport.width;
        
        const viewport = page1.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = targetWidth;
        canvas.height = viewport.height;

        await page1.render({ canvasContext: context, viewport: viewport }).promise;

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.75);
        });
    },

    async process(pdfFile, fileText, webSeedUrl = null, sourceDate = null, userClasses = "Public Domain") {
        console.info("[RAMOSA CONTROL] Processing PDF via local Transformers.js pipeline (scanning first 12 pages)...");

        const apaCitation = await this.parseMetadata(pdfFile, userClasses, sourceDate);
        
        console.info(`[RAMOSA CONTROL] Active Metadata Category: ${apaCitation.detectedCategory}`);

        let rayPayload = this.parseSpheres(apaCitation.apaString, userClasses, sourceDate || apaCitation.metadata.year, apaCitation.metadata.title);
        
        const cover_img = await this.extractCompressedCoverArt(pdfFile);
        rayPayload.Sphere.source.cover_img = cover_img;

        let fileExtension = '.pdf';
        if (pdfFile && typeof pdfFile.name === 'string' && pdfFile.name.includes('.')) {
            fileExtension = pdfFile.name.substring(pdfFile.name.lastIndexOf('.'));
        }

        const cleanTorrentName = `${apaCitation.dn.replace(/[*_]/g, '').trim()}${fileExtension}`;
        const webseedList = webSeedUrl ? [webSeedUrl] : [];

        console.info(webseedList);

        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfLibFile = await pdfjsLib.getDocument({data : arrayBuffer}).promise;
        const pdfBuffer = pdfLibFile.getData();

        const fileBytes = new Uint8Array(pdfBuffer);
        
        const seedOptions = {
            name: cleanTorrentName,
            urlList: webseedList,
            info: JSON.stringify(rayPayload),
            dht: false,
            tracker: false,
            announce: [],
            pex: true
        };

        WebTorrentControl.seed(fileBytes, seedOptions, rayPayload, (torrent) => {
            torrent.RAy = torrent.infoHash;
            console.info(`[RAMOSA CONTROL] Torrent active! RAy GraphDB ID (InfoHash): ${torrent.RAy}`);

            rayPayload.Sphere.Doc = {
                format: fileExtension.replace('.', '').toUpperCase(),
                res: `Pre-1931 Archive Scan (${apaCitation.detectedCategory})`,
                RAy: torrent.RAy,
                size: pdfFile.size,
                webseeds: webseedList,
                torrentBuffer: torrent.torrentFile
            };

            WebTorrentBase.PEX.wires.forEach(wire => {
                if (wire.ramosa && typeof wire.ramosa.send === 'function') {
                    wire.ramosa.send(rayPayload);
                }
            });

            if (MVC.Base?.Ramosa && typeof MVC.Base.Ramosa.put === 'function') {
                MVC.Base.Ramosa.put(torrent.RAy, rayPayload);
                setTimeout(TEMPEST.route("#table"), 222);
            }
        });        

        return rayPayload;
    }
};

export default RamosaControl;