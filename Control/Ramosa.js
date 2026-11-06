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
        if (!cleanPublisher || /Public Domain Archive|Digital Archive|Internet Archive|archive\.org|Google Books/i.test(cleanPublisher)) {
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

        let title = this.spacedTitleFromFilename(fileName);
        let author = "";
        let year = sourceDate || "Pre-1931";
        let publisher = null;
        let detectedCategory = "UNKNOWN";
        let translator = null;

        const isValidTitle = (t) => t && !/(?:Digitized by|Internet Archive|Google Books|Original from|University Library|Project Gutenberg|funding from|Microsoft Corporation|http|www\.|\b20\d{2}\b)/i.test(t) && t.length > 2;
        if (!isValidTitle(title)) title = "Historical Work";

        if (this.fflags.TYPE_4_HOLY_SEE && (/Holy See|Vatican|Pontifical|Apostolic|Encyclical|Cardinal|Archbishop|Bishop|Faith of Our Fathers|Gibbons|P\.? J\.? Kenedy|Printers to the Holy See/i.test(cleanText) || /vatican\.va/i.test(cleanText))) {
            detectedCategory = "TYPE_4_HOLY_SEE";
            year = sourceDate || cleanText.match(/\b(1[8-9]\d{2}|20\d{2})\b/)?.[1] || "Pre-1931";
            if (/James Gibbons/i.test(cleanText)) author = "James Gibbons";
            else if (/Leo XIII/i.test(cleanText)) author = "Leo XIII, Pope";
        } else if (this.fflags.TYPE_0_GUTENBERG && (/Project Gutenberg/i.test(cleanText) || /eBook of/i.test(cleanText))) {
            detectedCategory = "TYPE_0_GUTENBERG";
            publisher = "Project Gutenberg";
            year = cleanText.match(/(?:Release Date|EBook #\d+)[^\d]*(\d{4})/i)?.[1] || cleanText.match(/\b(1[8-9]\d{2}|20\d{2})\b/)?.[1] || year;
        } else {
            detectedCategory = "TYPE_2_VICTORIAN_19TH";
            year = cleanText.match(/\b(1[6-9]\d{2})\b/)?.[1] || year;
        }

        const generated = this.generateAPAAndDN(author, year, title, translator, publisher);
        return {
            detectedCategory,
            apaString: generated.apaString,
            dn: generated.dn,
            metadata: { title: generated.cleanTitle, author: generated.cleanAuthor, year, publisher: generated.cleanPublisher, translator: generated.cleanTranslator, userClasses }
        };
    },

    //Empedocles
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

    async extractCompressedCoverArt(pdfFile) {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page1 = await pdfDoc.getPage(1);

        // Target a fixed display width of 222px while maintaining true aspect ratio
        const unscaledViewport = page1.getViewport({ scale: 1.0 });
        const targetWidth = 222;
        const scale = targetWidth / unscaledViewport.width;
        
        const viewport = page1.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = targetWidth;
        canvas.height = viewport.height;

        await page1.render({ canvasContext: context, viewport: viewport }).promise;

        // Compress to JPEG at 0.75 quality to keep IndexedDB and PEX sync payload featherlight (~5KB - 15KB per cover)
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result); // Returns base64 string for direct storage in rayPayLoad.cover_art
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.75);
        });
    }
    ,

    async process(pdfFile, fileText, webSeedUrl = null, sourceDate = null, userClasses = "Public Domain") {
        console.info("[RAMOSA CONTROL] Processing extracted PDF text...");

        let rayPayload = {
            rayVersion: "1.0",
            categoryType: "TYPE_1_MODERN_SCAN",
            Sphere: {
                source: {
                    uuid: `src_${Math.random().toString(36).substring(2, 9)}`,
                    name: "Emerald Temple Archives",
                    genus: "Document / Archive",
                    date: new Date().toISOString().split('T')[0],
                    cover_img: ""
                },
                edition: {
                    uuid: `ed_${Math.random().toString(36).substring(2, 9)}`,
                    title: "",
                    date: new Date().toISOString().split('T')[0],
                    created_at: Date.now(),
                    webSeed: webSeedUrl
                }
            }
        };

        const parsed = this.parseMetadata(fileText, userClasses, pdfFile.name, sourceDate);

        rayPayload = this.parseSpheres(parsed.apaString, userClasses, sourceDate || parsed.metadata.year, parsed.metadata.title);
        
       const cover_img = await this.extractCompressedCoverArt(pdfFile);

        const resolvedWebSeed = webSeedUrl;
        rayPayload.Sphere.Doc.webSeed = resolvedWebSeed;
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

        //torrent is renamed to doc, for RamosaProtocol is neutral to the transport-layer of the client.
        //bridge to DB is torrent.RAy, set in WebTorrentControl.seed()
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

            // 2. Construct Universal Ramosa Protocol Payload Structure with torrentBuffer on Sphere.Doc
            rayPayload.Sphere.source = {
                uuid: `src_${torrent.infoHash.substring(0, 8)}`,
                name: doc.name || "Archival Document",
                genus: "Document",
                date: new Date().toISOString().split('T')[0],
                cover_img: cover_img
            };

            rayPayload.Sphere.edition = {
                uuid: `ed_${Math.random().toString(36).substring(2, 9)}`,
                title: doc.name || "Archival Edition",
                date: new Date().toISOString().split('T')[0],
                created_at: Date.now(),
                webSeed: seedOptions.urlList[0] || ""
            };       

            WebTorrentBase.PEX.wires.forEach(wire => {
                // Ensure the wire uses the extension
                wire.use(WebTorrentBase.RamosaWireExtension);
                
                // Now wire.ramosa is safely defined and accessible
                if (wire.ramosa && typeof wire.ramosa.send === 'function') {
                    wire.ramosa.send(rayPayload);
                }
            });

            MVC.Base.Ramosa.put(doc.RAy, rayPayload);
            //setTimeout(MVC.Control.Table.unfold("#table"), 222);
        });       

        return rayPayload;
    }
};

export default RamosaControl;