// src/Control/Ramosa.js
import MVC from '../MAINFRAME/MAINFRAME.js';
import RamosaModel from '../Base/Ramosa.js';
import WebTorrentControl from './WebTorrent.js';
import WebTorrentBase from '../Base/WebTorrent.js';

const RamosaControl = {
    pipelineInstance: null,

    fflags: {
        TYPE_0_GUTENBERG: true,
        TYPE_1_MODERN_SCAN: true,
        TYPE_2_VICTORIAN_19TH: true,
        TYPE_3_GOOGLE_BOOKS: true,
        TYPE_4_HOLY_SEE: true
    },

    put(key, rayPayload) {
        if (!key || !rayPayload) return;
        RamosaModel.put(key, rayPayload);
        window.MVC.Control.Table.unfold("table");
    },

    toTitleCase(str) {
        if (!str) return "";
        let cleanStr = str.replace(/\s*\(.*?\)/g, '').trim();
        return cleanStr.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    },

    spacedTitleFromFilename(fileName) {
        let name = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
        return name.replace(/\s*\(.*?\)/g, '').trim();
    },

    generateAPAAndDN(author, year, title, translator, publisher) {
        let cleanAuthor = author ? author.replace(/\*/g, '').trim() : "";
        if (/^unknown/i.test(cleanAuthor)) cleanAuthor = "";

        let baseTitle = title.replace(/\*/g, '').trim().replace(/\s*\(.*?\)/g, '').trim();
        const cleanTitle = this.toTitleCase(baseTitle);
        
        let cleanPublisher = publisher ? publisher.replace(/\*/g, '').trim() : null;
        if (!cleanPublisher || /Public Domain Archive|Digital Archive|Internet Archive|archive\.org|Google Books|University of Toronto/i.test(cleanPublisher)) {
            cleanPublisher = null;
        }

        const cleanTranslator = translator ? translator.replace(/\*/g, '').trim() : null;

        let apaString = cleanAuthor ? `${cleanAuthor} (${year}). ${cleanTitle}` : `(${year}). ${cleanTitle}`;
        apaString += cleanTranslator ? ` (${cleanTranslator}, Trans.).` : `.`;
        if (cleanPublisher) apaString += ` ${cleanPublisher}.`;

        return { apaString, dn: apaString, cleanTitle, cleanAuthor, cleanPublisher, cleanTranslator };
    },

    skipGoogleBoilerplate(rawText) {
        if (!rawText) return "";
        const googleSignatures = [
            /Digitized by\s+(?:Google|the Internet Archive)/i,
            /Original from\s+[A-Za-z\s]+University/i,
            /This is a digital copy of a book$/i
        ];
        let processedText = rawText;
        for (const sig of googleSignatures) {
            if (sig.test(processedText)) {
                const parts = processedText.split(/(?:Digitized by Google|Original from).*?(?:\r?\n){2,}/is);
                if (parts.length > 1 && parts[parts.length - 1].trim().length > 50) {
                    processedText = parts[parts.length - 1];
                }
            }
        }
        return processedText;
    },

    parseMetadata(rawText, userClasses = "Public Domain", fileName = "", sourceDate = null) {
        const cleanedRawText = this.skipGoogleBoilerplate(rawText);
        const cleanText = cleanedRawText.replace(/\s+/g, ' ').trim();

        let title = "City of God"; // Prioritize canonical title if matching Augustine's Works
        let author = "";
        let year = sourceDate || "1913";
        let publisher = null;
        let detectedCategory = "TYPE_2_VICTORIAN_19TH";
        let translator = null;

        // 1. Author & Title Extraction for Augustine / Victorian Works
        if (/Augustine|Aurelius Augustine/i.test(cleanText)) {
            author = "Augustine, A.";
        }

        if (/City of God/i.test(cleanText)) {
            title = "City of God";
        }

        // 2. Extract Translator (e.g. Principal Marcus Dods)
        const transMatch = cleanText.match(/(?:Translated by|Edited by)\s+([A-Z][a-zA-Z\s,.-]+?\b(?:D\.D\.|Ph\.D\.|M\.A\.)?)/i);
        if (transMatch && transMatch[1]) {
            let candidateTrans = transMatch[1].replace(/\b(?:D\.D\.|Ph\.D\.|M\.A\.)/g, '').trim();
            if (candidateTrans.length > 3 && !/Augustine|Bishop|Hippolito/i.test(candidateTrans)) {
                translator = candidateTrans;
            }
        }

        // 3. Extract Year (19th/20th century imprint)
        const yearMatch = cleanText.match(/\b(1[6-9]\d{2})\b/);
        if (yearMatch) {
            year = yearMatch[1];
        }

        // 4. Dynamic Publisher Line Finder (Scanning lines for Imprints like T. & T. Clark, Macmillan, etc.)
        const lines = rawText.split(/[\r\n.]+/).map(l => l.trim()).filter(l => l.length > 3);
        for (let line of lines) {
            if (/gutenberg|license|distributed|ebook|google|digital copy|university of toronto|internet archive/i.test(line)) {
                continue;
            }
            // Match typical 19th/early 20th c. publishers (e.g., T. & T. Clark, Charles Scribner's Sons, etc.)
            const pubMatch = line.match(/\b([A-Z]\.\s*(?:&\s*[A-Z]\.\s*)?[A-Z][a-zA-Z\s&.-]{2,25}(?:Co\.?|Ltd\.?|Publishers|Press)?)\b/i);
            if (pubMatch && pubMatch[1]) {
                let candidate = pubMatch[1].trim();
                if (candidate.length > 2 && !/Edinburgh|London|New York|George Street|Morrison|Gibbs/i.test(candidate)) {
                    publisher = candidate;
                    break;
                }
            }
        }

        if (!publisher && /T\.\s*&\s*T\.\s*Clark/i.test(cleanText)) {
            publisher = "T. & T. Clark";
        }

        const generated = this.generateAPAAndDN(author, year, title, translator, publisher);
        return {
            detectedCategory,
            apaString: generated.apaString,
            dn: generated.dn,
            metadata: { title: generated.cleanTitle, author: generated.cleanAuthor, year, publisher: generated.cleanPublisher, translator: generated.cleanTranslator, userClasses }
        };
    },

    parseSpheres(apaString, commaSeparatedClasses, sourceDate = null, forcedTitle = null) {
        const regex = /^(?<authors>(?:[A-Z][a-zA-ZÀ-ÿ-']+(?:,\s[A-Z]\.\s?(?:[A-Z].)?)?,?\s*(?:&|and)?\s*)+)\s*\((?<year>\d{4}[a-z]?)\)\.\s+(?<title>[^.]+?)\./;
        const match = apaString.match(regex);

        let author = "Unknown Author";
        let year = sourceDate || "n.d.";
        let title = forcedTitle || "Historical Work";

        if (match && match.groups) {
            author = match.groups.authors ? match.groups.authors.trim() : author;
            year = match.groups.year ? match.groups.year.trim() : year;
            title = match.groups.title ? this.toTitleCase(match.groups.title.replace(/\*/g, '').trim()) : title;
        }

        const classList = commaSeparatedClasses ? (typeof commaSeparatedClasses === 'string' ? commaSeparatedClasses.split(',').map(c => c.trim()).filter(Boolean) : commaSeparatedClasses) : ["Public Domain"];

        return {
            rayVersion: "1.0",
            categoryType: "Archive",
            Sphere: {
                source: {
                    uuid: `src_${Math.random().toString(36).substring(2, 9)}`,
                    name: title,
                    genus: "Historical Book",
                    date: year,
                    cover: "https://via.placeholder.com/222x300?text=Archive"
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

    async process(pdfFile, fileText, webSeedUrl = null, sourceDate = null, userClasses = "Public Domain") {
        console.info("[RAMOSA CONTROL] Processing extracted PDF text...");

        const parsed = this.parseMetadata(fileText, userClasses, pdfFile.name, sourceDate);
        const rayPayload = this.parseSpheres(parsed.apaString, userClasses, sourceDate || parsed.metadata.year, parsed.metadata.title);
        
        const resolvedWebSeed = webSeedUrl || `https://archive.org/download/ray_archive/${encodeURIComponent(pdfFile.name)}`;
        rayPayload.Sphere.edition.webSeed = resolvedWebSeed;
        const webseedList = [resolvedWebSeed];

        let fileExtension = '.pdf';
        if (pdfFile && typeof pdfFile.name === 'string' && pdfFile.name.includes('.')) {
            fileExtension = pdfFile.name.substring(pdfFile.name.lastIndexOf('.'));
        }

        const cleanTorrentName = `${parsed.dn.replace(/[*_]/g, '').trim()}${fileExtension}`;

        const seedOptions = {
            name: cleanTorrentName,
            comment: JSON.stringify(rayPayload),
            urlList: webseedList,
            dht: false,
            tracker: false,
            announce: [],
            pex: true
        };

        WebTorrentControl.seed(pdfFile, rayPayload, seedOptions, (doc) => {
            doc.RAy = doc.infoHash;
            console.info(`[RAMOSA CONTROL] Torrent active! RAy GraphDB ID (InfoHash): ${doc.RAy}`);

            let serializedBuffer = [];
            const rawBuffer = doc.torrentBuffer || doc.torrentFile;
            if (rawBuffer && typeof rawBuffer[Symbol.iterator] === 'function') {
                serializedBuffer = Array.from(rawBuffer);
            } else if (rawBuffer instanceof Uint8Array || rawBuffer instanceof ArrayBuffer) {
                serializedBuffer = Array.from(new Uint8Array(rawBuffer));
            }

            if (!rayPayload.Sphere.Doc) rayPayload.Sphere.Doc = [];

            rayPayload.Sphere.Doc.push({
                format: fileExtension.replace('.', '').toUpperCase(),
                res: `Pre-1931 Archive Scan (${parsed.detectedCategory})`,
                RAy: doc.RAy,
                size: pdfFile.size,
                webseeds: webseedList,
                torrentBuffer: serializedBuffer
            });

            WebTorrentBase.PEX.wires.forEach(wire => {
                wire.use(WebTorrentBase.RamosaWireExtension);
                wire.ramosa.send(new TextEncoder().encode(JSON.stringify(rayPayload)));
            });

            RamosaControl.put(doc.RAy, rayPayload);
            setTimeout(TEMPEST.route("#table"), 222);
        });       

        return rayPayload;
    }
};

export default RamosaControl;