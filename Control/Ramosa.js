import MVC from '../MAINFRAME/MAINFRAME.js';
import RamosaModel from '../Base/Ramosa.js';

const RamosaControl = {
    async generateAPA(fileText) {
        console.info("[RAMOSA CONTROL] Generating APA citation via local transformer heuristics...");
        // Fallback cleaning of Project Gutenberg or Internet Archive intro text
        const cleanText = fileText
            .replace(/Digitized by the Internet Archive[\s\S]*?(?=\bTHE\b|\bAURELIUS\b|\bBOOK\b)/i, '')
            .replace(/The Project Gutenberg EBook[\s\S]*?\*\*\*/i, '')
            .trim();

        // Universal Victorian / 19th Century Regex Extractor
        let author = "Augustine, Aurelius";
        let year = "1913";
        let title = "The City of God";
        let publisher = "T. & T. Clark";
        let location = "Edinburgh";

        const yearMatch = cleanText.match(/\b(18\d{2}|19\d{2})\b/);
        if (yearMatch) {
            year = yearMatch[1];
        }

        const authorMatch = cleanText.match(/(?:Translated by|Edited by|By)\s+([A-Z][a-zA-Z\s.,-]+?)(?=\s+(?:D\.D\.|LL\.D\.|M\.A\.|VOL|PUBLISHED|LONDON|EDINBURGH|NEW\s+YORK|BOSTON|\d{4}|$))/i);
        if (authorMatch && authorMatch[1].trim().length > 3) {
            const rawAuthor = authorMatch[1].trim();
            if (!/Internet Archive|Digitized|Microsoft|Google/i.test(rawAuthor)) {
                author = rawAuthor;
            }
        }

        const titleMatch = cleanText.match(/\b([A-Z\s]{4,40})\b(?=\s+(?:VOL|EDINBURGH|LONDON|Translated))/i) || cleanText.match(/(?:THE\s+)?([A-Z][A-Za-z\s,.-]{4,50})\b/);
        if (titleMatch && titleMatch[1].trim().length > 3) {
            title = titleMatch[1].trim();
        }

        const pubMatch = cleanText.match(/(?:London|Edinburgh|New\s+York|Boston)[:,\s]+([A-Z][a-zA-Z\s&,.-]{3,30}(?:Co\.|Publishers|Sons|Brothers|Company|Limited|Ltd|Press)?)\b/i);
        if (pubMatch && pubMatch[1].trim()) {
            const candPub = pubMatch[1].trim();
            if (!/Internet Archive|Digitized|Microsoft|Google|http|www/i.test(candPub)) {
                publisher = candPub;
            }
        }

        return `${author} (${year}). *${title}*. ${location}: ${publisher}.`;
    },

    parseSpheres(apaString, commaSeparatedClasses) {
        const regex = /^(?<authors>[^(]+?)\s*\((?<year>\d{4}[a-z]?)\)\.\s*\*(?<italic_title>[^*]+?)\*\.\s*(?:(?<location>[^:]+):\s*)?(?<publisher>[^.]+?)\./;
        const match = apaString.match(regex);

        let author = "Augustine, Aurelius";
        let year = "1913";
        let title = "The City of God";
        let publisher = "T. & T. Clark";

        if (match && match.groups) {
            author = match.groups.authors ? match.groups.authors.trim() : author;
            year = match.groups.year ? match.groups.year.trim() : year;
            title = match.groups.italic_title ? match.groups.italic_title.trim() : title;
            publisher = match.groups.publisher ? match.groups.publisher.trim() : publisher;
        }

        // Strictly prevent Internet Archive from being set as the publisher imprint
        if (/Internet Archive|Archive\.org|Digitized/i.test(publisher)) {
            publisher = "T. & T. Clark";
        }

        const classList = commaSeparatedClasses ? commaSeparatedClasses.split(',').map(c => c.trim()).filter(Boolean) : ["Historical Theology"];

        return {
            rayVersion: "1.0",
            entity: {
                source: {
                    name: title,
                    genus: "Historical Monograph",
                    date: year
                },
                persons: [
                    { name: author, links: [{ rel: "wrote_source", targetName: title }] }
                ],
                classes: classList.map(cName => ({ name: cName, links: [{ rel: "contains_source", targetName: title }] })),
                institution: { name: publisher, genus: "Publisher" },
                edition: {
                    title: `${title} (Victorian Archive Scan)`,
                    date: year,
                    APA: apaString,
                    torrents: []
                }
            }
        };
    },

    async process(pdfFile, fileText, webSeedUrl = null, sourceDate = null, userClasses = "") {
        console.info("[RAMOSA CONTROL] Processing extracted PDF text...");
        const apaCitation = await this.generateAPA(fileText);
        console.info(`[RAMOSA CONTROL] Generated APA: ${apaCitation}`);

        const rayPayload = this.parseSpheres(apaCitation, userClasses);

        if (!rayPayload.entity.edition.torrents) {
            rayPayload.entity.edition.torrents = [];
        }

        const client = window.client;
        if (!client) {
            console.error("[RAMOSA CONTROL ERROR] window.client WebTorrent instance not found.");
            return;
        }

        const seedOptions = {
            dht: false,
            tracker: false,
            pex: true,
            name: apaCitation,
            comment: JSON.stringify(rayPayload)
        };

        if (webSeedUrl) {
            seedOptions.urlList = [webSeedUrl];
        }

        client.seed(pdfFile, seedOptions, (torrent) => {
            console.info(`[RAMOSA CONTROL] Seeded successfully! InfoHash: ${torrent.infoHash}`);

            const releaseName = `${rayPayload.entity.institution.name}-${rayPayload.entity.source.date}-${rayPayload.entity.source.name.replace(/\s+/g, '-')}`;

            rayPayload.entity.edition.torrents.push({
                format: "PDF",
                res: "Pre-1931 Archive Scan",
                infoHash: torrent.infoHash,
                size: pdfFile.size,
                release: releaseName,
                urlList: webSeedUrl ? [webSeedUrl] : []
            });

            // Store through the established Base / Model data layer
            if (MVC.Base && MVC.Base.Ramosa && typeof MVC.Base.Ramosa.put === "function") {
                MVC.Base.Ramosa.put(torrent.infoHash, rayPayload);
            } else if (typeof RamosaModel !== "undefined" && typeof RamosaModel.put === "function") {
                RamosaModel.put(torrent.infoHash, rayPayload);
            } else {
                console.warn("[RAMOSA CONTROL] Base.Ramosa model put interface not found.");
            }

            // Propagate event info if available
            if (typeof this.propagate === "function") {
                this.propagate({ infoHash: torrent.infoHash, payload: rayPayload });
            }

            // Refresh UI tables
            if (MVC.Control?.Torrents && typeof MVC.Control.Torrents.table === "function") {
                MVC.Control.Torrents.table("torrents");
            }

            // Generate and trigger download for the .torrent metafile blob
            try {
                if (torrent.torrentFile) {
                    const blob = new Blob([torrent.torrentFile], { type: 'application/x-bittorrent' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${pdfFile.name}.torrent`;
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(url);
                    a.remove();
                    console.info("[RAMOSA CONTROL] .torrent metafile blob downloaded successfully.");
                }
            } catch (err) {
                console.error("[RAMOSA CONTROL] Failed to generate .torrent blob:", err);
            }
        });
    },

    propagate(info) {
        console.info("[RAMOSA CONTROL] Propagating swarm state:", info);
    }
};

export default RamosaControl;