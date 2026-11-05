// src/Control/Ramosa.js
import MVC from '../MAINFRAME/MAINFRAME.js';
import RamosaModel from '../Base/Ramosa.js';
import WebTorrentControl from './WebTorrent.js';
import WebTorrentBase from '../Base/WebTorrent.js';

const Ramosa = {
    pipelineInstance: null,

    fflags: {
        TYPE_0_GUTENBERG: true,            // Universal Project Gutenberg Parser
        TYPE_1_MODERN_SCAN: true,           // Modern digital re-typesets & standard OCR reprints
        TYPE_2_VICTORIAN_19TH: true,        // General 19th Century / Victorian & Internet Archive Archival Scans
        TYPE_3_GOOGLE_BOOKS: true,          // Google Books digitized institutional library scans
        TYPE_4_HOLY_SEE: true               // Vatican / Holy See pontifical documents and papal encyclicals
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
        if (/^unknown/i.test(cleanAuthor)) {
            cleanAuthor = "";
        }

        let baseTitle = title.replace(/\*/g, '').trim();
        baseTitle = baseTitle.replace(/\s*\(.*?\)/g, '').trim();
        const cleanTitle = this.toTitleCase(baseTitle);
        
        let cleanPublisher = publisher ? publisher.replace(/\*/g, '').trim() : null;
        if (!cleanPublisher || /Public Domain Archive|Digital Archive|Internet Archive|archive\.org|Google Books/i.test(cleanPublisher)) {
            cleanPublisher = null;
        }

        const cleanTranslator = translator ? translator.replace(/\*/g, '').trim() : null;

        let apaString = "";
        if (cleanAuthor) {
            apaString = `${cleanAuthor} (${year}). ${cleanTitle}`;
        } else {
            apaString = `(${year}). ${cleanTitle}`;
        }

        if (cleanTranslator) {
            apaString += ` (${cleanTranslator}, Trans.).`;
        } else {
            apaString += `.`;
        }
        
        if (cleanPublisher) {
            apaString += ` ${cleanPublisher}.`;
        }

        return {
            apaString,
            dn: apaString,
            cleanTitle,
            cleanAuthor,
            cleanPublisher,
            cleanTranslator
        };
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
                console.info("[RAMOSA CONTROL] Google Books / Institutional wrapper detected. Skipping boilerplate pages...");
                const parts = processedText.split(/(?:Digitized by Google|Original from).*?(?:\r?\n){2,}/is);
                if (parts.length > 1 && parts[parts.length - 1].trim().length > 50) {
                    processedText = parts[parts.length - 1];
                }
            }
        }
        return processedText;
    },

    parseMetadata(rawText, userClasses = "Public Domain", fileName = "", sourceDate = null) {
        console.info("[RAMOSA CONTROL] Inspecting title page layout for category classification...");

        const cleanedRawText = this.skipGoogleBoilerplate(rawText);
        const lines = cleanedRawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const cleanText = cleanedRawText.replace(/\s+/g, ' ').trim();

        let title = this.spacedTitleFromFilename(fileName);
        let author = "";
        let year = sourceDate || "Pre-1931";
        let publisher = null;
        let detectedCategory = "UNKNOWN";
        let translator = null;

        const isValidTitle = (t) => {
            if (!t) return false;
            return !/(?:Digitized by|Internet Archive|Google Books|Original from|University Library|Project Gutenberg|funding from|Microsoft Corporation|http|www\.|\b20\d{2}\b)/i.test(t) && t.length > 2;
        };

        if (!isValidTitle(title)) {
            title = "Historical Work";
        }

        // ==========================================
        // CATEGORY 4: Holy See / Pontifical / Cardinal / Archbishop / Religious Works (e.g. Faith of Our Fathers)
        // ==========================================
        if (this.fflags.TYPE_4_HOLY_SEE && (/Holy See|Vatican|Pontifical|Apostolic|Encyclical|Cardinal|Archbishop|Bishop|Faith of Our Fathers|Gibbons|P\.? J\.? Kenedy|Printers to the Holy See/i.test(cleanText) || /vatican\.va/i.test(cleanText))) {
            detectedCategory = "TYPE_4_HOLY_SEE";
            console.info("[RAMOSA FFLAG] Routing via Category 4: Holy See / Religious Works Parser Block");

            if (!sourceDate || sourceDate === "n.d.") {
                const yearMatch = cleanText.match(/\b(1[8-9]\d{2}|20\d{2})\b/);
                if (yearMatch) year = yearMatch[1];
            } else {
                year = sourceDate;
            }

            const pubMatch = cleanText.match(/(?:PUBLISHED BY|Published by|NEW YORK|LONDON|P\.\s*J\.\s*KENEDY\s*(?:&\s*SONS)?)[^.\n]*?(NEW YORK|LONDON|P\.\s*J\.\s*KENEDY\s*(?:&\s*SONS)?)/i);
            if (pubMatch || /P\.?\s*J\.?\s*Kenedy/i.test(cleanText)) {
                if (/New York/i.test(cleanText)) {
                    publisher = /London/i.test(cleanText) ? "London and New York: P. J. Kenedy & Sons" : "NEW YORK: P. J. Kenedy & Sons";
                } else {
                    publisher = "P. J. Kenedy & Sons";
                }
            }

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const byMatch = line.match(/^(?:by|AUTHOR[:\s]*)\s+([A-Z][a-zA-Z\s.,-]+)$/i);
                if (byMatch && byMatch[1]) {
                    author = byMatch[1].trim();
                }
            }

            if (!author) {
                const authorMatch = cleanText.match(/(?:by\s+)([A-Z][a-zA-Z\s.,-]+?)(?=\s+(?:D\.D\.|LL\.D\.|Cardinal|Archbishop|Bishop|Published|Copyright|$))/i);
                if (authorMatch && authorMatch[1].trim().length > 3) {
                    author = authorMatch[1].trim();
                } else if (/James Gibbons/i.test(cleanText)) {
                    author = "James Gibbons";
                } else if (/Leo XIII/i.test(cleanText)) {
                    author = "Leo XIII, Pope";
                }
            }

            for (let i = 0; i < Math.min(lines.length, 10); i++) {
                const l = lines[i];
                if (l.length > 3 && isValidTitle(l) && !/^(?:by|the|bishop|cardinal)/i.test(l)) {
                    title = l.split(/[:;–—]/)[0].trim();
                    break;
                }
            }
        }

        // ==========================================
        // CATEGORY 0: Universal Project Gutenberg Parser
        // ==========================================
        else if (this.fflags.TYPE_0_GUTENBERG && (/Project Gutenberg/i.test(cleanText) || /eBook of/i.test(cleanText) || /Release Date/i.test(cleanText))) {
            detectedCategory = "TYPE_0_GUTENBERG";
            console.info("[RAMOSA FFLAG] Routing via Category 0: Universal Gutenberg Parser Block");

            publisher = "Project Gutenberg";

            if (!sourceDate || sourceDate === "n.d.") {
                const yearMatch = cleanText.match(/(?:Release Date|EBook #\d+)[^\d]*(\d{4})/i) || cleanText.match(/\b(1[8-9]\d{2}|20\d{2})\b/);
                if (yearMatch) year = yearMatch[1];
            } else {
                year = sourceDate;
            }

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (/^Title\s*:/i.test(line)) {
                    let extractedTitle = line.replace(/^Title\s*:\s*/i, '').trim();
                    extractedTitle = extractedTitle.replace(/(?:Author|Release Date|EBook).*$/i, '').trim();
                    if (extractedTitle) title = extractedTitle;
                } else if (/^eBook\s+of\s+/i.test(line)) {
                    title = line.replace(/^eBook\s+of\s+/i, '').trim();
                }

                if (/^Author\s*:/i.test(line)) {
                    let extractedAuthor = line.replace(/^Author\s*:/i, '').trim();
                    extractedAuthor = extractedAuthor.replace(/(?:This eBook|Release Date|EBook|Language:|The Project|Credits|Copyright|Translator|Contributor).*$/i, '').trim();
                    if (extractedAuthor) author = extractedAuthor;
                } else if (/^by\s+[A-Z]/i.test(line) && !author) {
                    const candidate = line.replace(/^by\s+/i, '').trim();
                    if (candidate.length < 50) author = candidate;
                }

                if (/^Translator\s*:/i.test(line) || /^Translated\s+by\s*:/i.test(line)) {
                    const extractedTrans = line.replace(/^(?:Translator|Translated\s+by)\s*:\s*/i, '').trim();
                    if (extractedTrans) translator = extractedTrans;
                }
            }

            if (!author) {
                const authorMatch = cleanText.match(/(?:Author:\s*|by\s+)([A-Z][a-zA-Z\s\.,-]+?)(?=\s+(?:This eBook|Release Date|EBook|Language:|The Project|Credits|Copyright|Translator|Contributor|$))/i);
                if (authorMatch) {
                    author = authorMatch[1].replace(/(?:Author:|Contributor:|Translator:).*$/i, '').trim();
                }
            }

            if (title === "Historical Work" || !title) {
                const titleMatch = cleanText.match(/Title:\s*([A-Z0-9\s,:;-]{2,120})(?=\s+(?:Author:|Release|This eBook|[$#]))/i);
                if (titleMatch && isValidTitle(titleMatch[1])) {
                    title = titleMatch[1].trim();
                }
            }
        }
        // ==========================================
        // CATEGORY 2: Victorian & 19th Century Archival Scans
        // ==========================================
        else if (this.fflags.TYPE_2_VICTORIAN_19TH) {
            detectedCategory = "TYPE_2_VICTORIAN_19TH";
            console.info("[RAMOSA FFLAG] Routing via Category 2: Victorian/19th Century Archival Regex Block");

            if (!sourceDate || sourceDate === "n.d.") {
                const yearMatch = cleanText.match(/\b(1[6-9]\d{2})\b/);
                if (yearMatch) year = yearMatch[1];
            } else {
                year = sourceDate;
            }

            for (let i = 0; i < lines.length; i++) {
                if (/^OR$/i.test(lines[i]) && i > 0) {
                    title = lines[i - 1];
                    break;
                }
            }

            const byIdx = lines.findIndex(l => /^BY$/i.test(l));
            if (byIdx !== -1 && byIdx + 1 < lines.length) {
                let authCand = lines[byIdx + 1];
                if (byIdx + 2 < lines.length && /^[A-Z\s,.-]+$/.test(lines[byIdx + 2]) && !/LONDON|BURNS|OATES|PUBLISHER/i.test(lines[byIdx + 2])) {
                    authCand += " " + lines[byIdx + 2];
                }
                if (authCand && authCand.length > 2) {
                    author = authCand.replace(/\s+/g, ' ').trim();
                }
            } else {
                const titleByAuthorMatch = cleanText.match(/([A-Z][A-Za-z0-9\s,.:;-]{3,80})\s+\bby\s+([A-Z][a-zA-Z\s\.,-]+?)(?=\s+(?:D\.D\.|LL\.D\.|M\.A\.|VOL|PUBLISHED|LONDON|NEW\s+YORK|\d{4}|$))/i);
                if (titleByAuthorMatch) {
                    if (title === "Historical Work" || !title) {
                        title = titleByAuthorMatch[1].trim();
                    }
                    const candidateAuthor = titleByAuthorMatch[2].trim();
                    if (!/Internet Archive|Digitized|Microsoft|Google|http|www/i.test(candidateAuthor)) {
                        author = candidateAuthor;
                    }
                }
            }

            const londonNyPubMatch = cleanText.match(/(?:PUBLISHED\s+BY|Published\s+by|Printed\s+for|Imprint)[^.\n]*?\b(London|New\s+York|NY)\b/i) || cleanText.match(/\b(London|New\s+York|NY):\s*([A-Z][A-Za-z0-9\s,&.]+)/i);
            if (londonNyPubMatch) {
                if (/London/i.test(cleanText) && /New\s+York|NY/i.test(cleanText)) {
                    publisher = "London and New York";
                } else if (/London/i.test(cleanText)) {
                    publisher = "London";
                } else if (/New\s+York|NY/i.test(cleanText)) {
                    publisher = "New York";
                }
            }
        }

        title = title.replace(/^Project Gutenberg['s]*\s+/i, '').trim();
        title = title.replace(/\s+(?:by|Translated\s+by|A\s+New\s+Rendering).*$/i, '').trim();
        title = title.split(/[:–—]/)[0].trim();
        if (title.length > 85) {
            title = title.substring(0, 82) + "...";
        }

        const generated = this.generateAPAAndDN(author, year, title, translator, publisher);
        console.info(`[RAMOSA CONTROL] Generated APA: ${generated.apaString}`);

        return {
            detectedCategory,
            apaString: generated.apaString,
            dn: generated.dn,
            metadata: {
                title: generated.cleanTitle,
                author: generated.cleanAuthor,
                year,
                publisher: generated.cleanPublisher,
                translator: generated.cleanTranslator,
                userClasses
            }
        };
    },

    parseSpheres(apaString, commaSeparatedClasses, sourceDate = null, forcedTitle = null) {
        const regex = /^(?<authors>(?:[A-Z][a-zA-ZÀ-ÿ-']+(?:,\s[A-Z]\.\s?(?:[A-Z].)?)?,?\s*(?:&|and)?\s*)+)\s*\((?<year>\d{4}[a-z]?)\)\.\s+(?<title>[^.]+?)\./;
        const match = apaString.match(regex);

        let author = "Unknown Author";
        let year = sourceDate || "n.d.";
        let title = forcedTitle || "Historical Work";

        if (!forcedTitle && match && match.groups) {
            author = match.groups.authors ? match.groups.authors.trim() : author;
            year = match.groups.year ? match.groups.year.trim() : year;
            title = match.groups.title ? this.toTitleCase(match.groups.title.replace(/\*/g, '').trim()) : title;
        } else if (match && match.groups) {
            author = match.groups.authors ? match.groups.authors.trim() : author;
            year = match.groups.year ? match.groups.year.trim() : year;
        }

        // Ensure proper spacing between words and numbers (e.g. "SaintsOf1881" -> "Saints Of 1881")
        title = title.replace(/([a-zA-Z])([0-9])/g, '$1 $2').replace(/([a-z])([A-Z])/g, '$1 $2');

        const classList = commaSeparatedClasses ? (typeof commaSeparatedClasses === 'string' ? commaSeparatedClasses.split(',').map(c => c.trim()).filter(Boolean) : commaSeparatedClasses) : ["Public Domain"];

        return {
            rayVersion: "1.0",
            categoryType: "Archive",
            Sphere: {
                source: {
                    uuid: `src_${Math.random().toString(36).substring(2, 9)}`,
                    name: title, // Canonical title shared with APA citation
                    genus: "Historical Book",
                    date: year,
                    cover: "https://via.placeholder.com/222x300?text=Archive"
                },
                persons: [
                    { name: author, links: [{ rel: "wrote_source", targetName: title }] }
                ],
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
        const apaCitation = parsed.apaString;
        
        // Pass parsed.metadata.title directly to guarantee parity between group-header and APA column
        const rayPayload = this.parseSpheres(apaCitation, userClasses, sourceDate || parsed.metadata.year, parsed.metadata.title);
        
        // ... rest of your seeding and storage pipeline ...

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

            if (!rayPayload.Sphere.Doc) {
                rayPayload.Sphere.Doc = [];
            }

            rayPayload.Sphere.Doc.push({
                format: fileExtension.replace('.', '').toUpperCase(),
                res: `Pre-1931 Archive Scan (${parsed.detectedCategory})`,
                RAy: doc.RAy,
                size: pdfFile.size,
                webseeds: webseedList,
                torrentBuffer: serializedBuffer
            });

            MVC.Base.Ramosa.put(doc.RAy, rayPayload)
            setTimeout(TEMPEST.route("#table"), 0);


            // Helper to safely broadcast once extension and mapping are active
            const handleWireExtension = (wire, peerAddr) => {
                console.info(`[PEX IP GRAPH] Connected to peer at ${peerAddr}. Registering wire.ramosa protocol extension...`);

                if (typeof wire.use === 'function') {
                    wire.use(WebTorrentBase.RamosaWireExtension);
                }

                // Poll or wait for the peer's extended mapping to acknowledge 'ramosa'
                const sendPayloadWhenReady = () => {
                    if (wire.extendedMapping && wire.extendedMapping.ramosa !== undefined) {
                        if (wire.ramosa && typeof wire.ramosa.send === 'function') {
                            console.info("[RAMOSA CONTROL] Peer extended handshake confirmed. Broadcasting RAyPayload...");
                            wire.ramosa.send(rayPayload);
                        }
                    } else {
                        // Retry shortly if handshake/extended mapping is still settling
                        setTimeout(sendPayloadWhenReady, 200);
                    }
                };

                // Give the wire a brief moment to exchange handshakes, then check readiness
                setTimeout(sendPayloadWhenReady, 400);

                wire.on('close', () => {
                    console.info(`[PEX IP GRAPH] Peer disconnected: ${peerAddr}`);
                });
            };

            // Bind to future wires
            doc.on('wire', (wire, addr) => {
                const peerAddr = addr || wire.remoteAddress || (wire._socket && wire._socket.remoteAddress) || 'unknown';
                handleWireExtension(wire, peerAddr);
            });

            // Bind to any existing wires already attached to the torrent
            if (doc.wires && Array.isArray(doc.wires)) {
                doc.wires.forEach(wire => {
                    const peerAddr = wire.remoteAddress || (wire._socket && wire._socket.remoteAddress) || 'unknown';
                    handleWireExtension(wire, peerAddr);
                });
            }
        });     

        return rayPayload;
    }
};

export default Ramosa;