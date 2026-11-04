/**
 * Ramosa Metadata Parser Engine (Mobile-Safe, <4MB, Zero AI/WASM Dependencies)
 * Categorizes public domain PDF title pages into discrete types using fflags
 * and routes them through specialized regex conditional blocks.
 */
import MVC from '../MAINFRAME/MAINFRAME.js';
import WebTorrentControl from './webtorrent.js';

const RamosaControl = {
    
    // Feature Flags (fflags) for Public Domain Title Page Categories
    fflags: {
        TYPE_1_MODERN_SCAN: true,      // Modern digital re-typesets & standard OCR reprints
        TYPE_2_VICTORIAN_19TH: true,   // 19th-century ornate typography, formal volume/series headers
        TYPE_3_GOOGLE_BOOKS: true,     // Google Books digitized institutional library scans
        TYPE_4_CLASSICAL_MANUSCRIPT: true // Historical manuscripts, classical treatises
    },

    /**
     * Categorizes raw text and extracts metadata using discrete regex conditional blocks
     */
    parseMetadata(rawText, userClasses = "Public Domain", fileName = "", sourceDate = null, webSeedUrl = null) {
        console.info("[RAMOSA CONTROL] Inspecting title page layout for category classification...");
        
        const cleanText = rawText.replace(/\s+/g, ' ').trim();
        let title = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        let author = "Unknown Author";
        let year = sourceDate || "Pre-1931";
        let publisher = "Public Domain Archive";
        let detectedCategory = "UNKNOWN";
        let translator = null;
        let volSubtitle = null;

        const isValidTitle = (t) => {
            if (!t) return false;
            return !/(?:Digitized by|Internet Archive|Google Books|Original from|University Library|Project Gutenberg|funding from|Microsoft Corporation|http|www\.|\b20\d{2}\b)/i.test(t) && t.length > 2;
        };

        if (!isValidTitle(title)) {
            title = "Historical Work";
        }

        // ==========================================
        // CATEGORY 1: Universal Project Gutenberg Parser
        // ==========================================
        if (this.fflags.TYPE_1_MODERN_SCAN && (/Project Gutenberg/i.test(cleanText) || /eBook of/i.test(cleanText) || /Release Date/i.test(cleanText))) {
            detectedCategory = "TYPE_1_MODERN_SCAN";
            console.info("[RAMOSA FFLAG] Routing via Category 1: Universal Gutenberg Regex Block");

            if (!sourceDate) {
                const yearMatch = cleanText.match(/(?:Release Date|EBook #\d+)[^\d]*(\d{4})/i) || cleanText.match(/\b(1[8-9]\d{2}|20\d{2})\b/);
                if (yearMatch) year = yearMatch[1];
            }

            const authorMatch = cleanText.match(/(?:Author:\s*|by\s+)([A-Z][a-zA-Z\s\.,-]+?)(?=\s+(?:This eBook|Release Date|EBook|Language:|The Project|Credits|Copyright|Translator|Contributor|$))/i);
            if (authorMatch) {
                author = authorMatch[1].replace(/(?:Author:|Contributor:|Translator:).*$/i, '').trim();
            }

            const titleMatch = cleanText.match(/Title:\s*([A-Z0-9\s,:;-]{2,120})(?=\s+(?:Author:|Release|This eBook|[$#]))/i);
            if (titleMatch && isValidTitle(titleMatch[1])) {
                title = titleMatch[1].trim();
            }

            publisher = "Project Gutenberg";
        }

        // ==========================================
        // CATEGORY 3: Google Books Institutional Scans
        // ==========================================
        else if (this.fflags.TYPE_3_GOOGLE_BOOKS && (/Google Books/i.test(cleanText) || /Digitized by Google/i.test(rawText) || /Original from\s+University/i.test(cleanText))) {
            detectedCategory = "TYPE_3_GOOGLE_BOOKS";
            console.info("[RAMOSA FFLAG] Routing via Category 3: Google Books Institutional Regex Block");

            publisher = "Google Books";

            if (!sourceDate) {
                const yearMatch = cleanText.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
                if (yearMatch) year = yearMatch[1];
            }

            const authorMatch = cleanText.match(/(?:by|Author:)\s+([A-Z][a-zA-Z\s\.]+?)(?=\.|\bDigitized\b|\bGoogle\b|$)/i);
            if (authorMatch && !/Digitized|Google/i.test(authorMatch[1])) author = authorMatch[1].trim();

            const titleMatch = cleanText.match(/^([A-Z][A-Za-z0-9\s,.:;-]{8,90})(?=\.|\n|\bDigitized\b|$)/i);
            if (titleMatch && isValidTitle(titleMatch[1])) {
                title = titleMatch[1].replace(/Digitized by.*$/i, '').trim();
            }
        }

        // ==========================================
        // CATEGORY 2: Victorian & 19th Century Ornate / Archival Scans
        // ==========================================
        else if (this.fflags.TYPE_2_VICTORIAN_19TH) {
            detectedCategory = "TYPE_2_VICTORIAN_19TH";
            console.info("[RAMOSA FFLAG] Routing via Category 2: Victorian/19th Century Ornate / Archival Regex Block");

            if (!sourceDate) {
                const yearMatch = cleanText.match(/\b(1[6-9]\d{2})\b/);
                if (yearMatch) year = yearMatch[1];
            }

            const authorMatch = cleanText.match(/(?:(?:By|AUTHOR)\s+|By\s+the\s+Author\s+of\s+)([A-Z][a-zA-Z\s\.,-]+?)(?=\s+(?:D\.D\.|LL\.D\.|M\.A\.|VOL|PUBLISHED|LONDON|EDINBURGH|NEW\s+YORK|\d{4}|$))/i);
            if (authorMatch && !/Internet Archive|Digitized|Microsoft|Google/i.test(authorMatch[1])) {
                author = authorMatch[1].trim();
            } else {
                const nameFallback = cleanText.match(/(?:AURELIUS\s+AUGUSTINE|AUGUSTINE|PLATO|ARISTOTLE|THOMAS\s+A\s+KEMPIS|JOHN\s+CALVIN|MARTIN\s+LUTHER)/i);
                if (nameFallback) author = nameFallback[0].trim();
            }

            const pubMatch = cleanText.match(/(?:([A-Z][a-zA-Z\s&,.-]{3,35})\s+(?:Co\.|Publishers|Sons|Brothers|Company|Limited|Ltd))\b/i) ||
                             cleanText.match(/(?:London|Edinburgh|Oxford|Cambridge|Dublin|Boston|New\s+York)[:,\s]+([A-Z][a-zA-Z\s&,.-]{3,35})/i);
            if (pubMatch) {
                const candidate = (pubMatch[1] || pubMatch[0]).trim();
                if (candidate && !/Internet Archive|Digitized|Microsoft|Google|http|www/i.test(candidate)) {
                    publisher = candidate;
                }
            }

            const worksMatch = cleanText.match(/(THE\s+WORKS(?:\s+OF\s+[A-Z\s,]+)?)/i);
            if (worksMatch) {
                title = worksMatch[1].trim();
            } else {
                const lines = cleanText.split(/[\r\n.]+/).map(l => l.trim()).filter(l => l.length > 3);
                for (let line of lines) {
                    if (isValidTitle(line) && !/BY|EDITION|TRANSLATION|EDITOR|VOL\.|FUNDING|DIGITAL/i.test(line)) {
                        title = line;
                        break;
                    }
                }
            }

            const volMatch = cleanText.match(/(VOL\.\s*[IVXLCDM]+\.?[\s\w,.-]{3,60})/i);
            if (volMatch) {
                volSubtitle = volMatch[1].trim();
            }
        }

        // ==========================================
        // CATEGORY 4: Classical Manuscript / Fallback
        // ==========================================
        else {
            detectedCategory = "TYPE_4_CLASSICAL_MANUSCRIPT";
            console.info("[RAMOSA FFLAG] Routing via Category 4: Classical / Legacy Fallback Regex Block");

            if (!sourceDate) {
                const yearMatch = cleanText.match(/\b(1[4-9]\d{2})\b/);
                if (yearMatch) year = yearMatch[1];
            }

            const authorMatch = cleanText.match(/(?:by|Author:|Writer:)\s+([A-Z][a-zA-Z\s]{3,35})/i);
            if (authorMatch) author = authorMatch[1].trim();

            const sentences = cleanText.split(/[\r\n.]+/).filter(s => s.trim().length > 3);
            if (sentences.length > 0 && isValidTitle(sentences[0])) {
                title = sentences[0].replace(/^(?:The|A)\s+/, '').trim() || title;
            }
        }

        if (/Internet Archive|archive\.org/i.test(publisher)) {
            publisher = "Public Domain Archive";
        }

        console.info(`[RAMOSA ENGINE] Extraction complete. Category: ${detectedCategory} | Title: "${title}" | Author: "${author}" | Year: ${year} | Publisher: "${publisher}"`);

        const displayTitle = volSubtitle ? `${title}: ${volSubtitle}` : title;
        const apaString = translator 
            ? `${author} (${year}). ${displayTitle} (${translator}, Trans.). ${publisher}.`
            : `${author} (${year}). ${displayTitle}. ${publisher}.`;

        const classList = userClasses ? userClasses.split(',').map(c => c.trim()).filter(Boolean) : ["Public Domain"];

        return {
            rayVersion: "1.0",
            categoryType: detectedCategory,
            Sphere: {
                source: {
                    name: title,
                    genus: "Historical Book",
                    date: year
                },
                persons: [
                    { name: author, links: [{ rel: "wrote_source", targetName: title }] },
                    ...(translator ? [{ name: translator, links: [{ rel: "translated_source", targetName: title }] }] : [])
                ],
                classes: classList.map(cName => ({ name: cName, links: [{ rel: "contains_source", targetName: title }] })),
                institution: { name: publisher, genus: "Archive" },
                edition: {
                    title: `${displayTitle} (Digital Edition)`,
                    date: year,
                    vol: volSubtitle || null,
                    APA: apaString,
                    webSeed: webSeedUrl || null,
                    torrents: []
                },
                Doc: []
            }
        };
    },

    /**
     * Core processing loop connecting PDF extraction, webseed configuration, and Ramosa model storage
     */
    async process(pdfFile, fileText, webSeedUrl, sourceDate, userClasses) {
        console.info("[RAMOSA CONTROL] Processing extracted PDF text via fflag router with webseed options...");

        const rayPayload = this.parseMetadata(fileText, userClasses, pdfFile.name, sourceDate, webSeedUrl);
        console.info(`[RAMOSA CONTROL] Generated local APA: ${rayPayload.Sphere.edition.APA}`);

        const client = window.client || window.webtorrentClient;
        if (!client) {
            console.error("[RAMOSA CONTROL ERROR] WebTorrent client instance not found.");
            return;
        }

        const cleanTorrentName = rayPayload.Sphere.edition.APA.replace(/[*_]/g, '');

        const seedOptions = {
            name: cleanTorrentName,
            comment: JSON.stringify(rayPayload),
            urlList: webSeedUrl ? [webSeedUrl] : [],
            dht: false,
            tracker: false,
            pex: true,
            path: false
        };

        if (!rayPayload.Sphere.Doc) {
            rayPayload.Sphere.Doc = [];
        }

        // Ensure webseed array is populated and stored under Sphere.Doc.webseeds[]
        const webseedList = webSeedUrl ? [webSeedUrl] : [];

        

        WebTorrentControl.seed(pdfFile, rayPayLoad, seedOptions, (doc)=>{
            rayPayload.Sphere.Doc.push({
                format: "PDF",
                res: `Pre-1931 Archive Scan (${rayPayload.categoryType})`,
                RAy: doc.RAy,
                size: pdfFile.size,
                release: `${rayPayload.Sphere.institution.name}-${rayPayload.Sphere.source.date}-${rayPayload.Sphere.source.name.replace(/\s+/g, '-')}`,
                webseeds: webseedList
            });
        })

    }
};

export default RamosaControl;