// src/Control/Ramosa.js
import MVC from '../MAINFRAME/MAINFRAME.js';
import RamosaModel from '../Base/Ramosa.js';

const Ramosa = {
    pipelineInstance: null,

    async initPipeline() {
        if (!this.pipelineInstance) {
            if (!window.transformers || typeof window.transformers.pipeline !== 'function') {
                throw new Error("window.transformers is not loaded.");
            }
            console.info("[RAMOSA CONTROL] Initializing local HuggingFace pipeline via window.transformers...");
            this.pipelineInstance = await window.transformers.pipeline('text-generation', 'Xenova/distilgpt2', {
                device: 'webgpu'
            });
        }
        return this.pipelineInstance;
    },

    async generateAPA(rawText) {
        try {
            const pipe = await this.initPipeline();
            const prompt = `Format this historical header into an APA 7 citation (Author, A. A. (Year). Title. Publisher.):\n\n${rawText.substring(0, 350)}\n\nAPA:`;
            const output = await pipe(prompt, { max_new_tokens: 50, temperature: 0.1 });
            const generated = output[0]?.generated_text || "";
            return generated.split("APA:").pop().trim() || "Unknown Author (n.d.). *Historical Work*. Public Domain Archive.";
        } catch (err) {
            console.warn("[RAMOSA CONTROL] Pipeline generation failed, falling back to heuristic extraction:", err);
            return "Unknown Author (n.d.). *Historical Work*. Public Domain Archive.";
        }
    },

    parseSpheres(apaString, commaSeparatedClasses) {
        const regex = /^(?<authors>(?:[A-Z][a-zA-ZÀ-ÿ\-\']+(?:,\s[A-Z]\.\s?(?:[A-Z].)?)?,?\s*(?:&|and)?\s*)+)\s*\((?<year>\d{4}[a-z]?)\)\.\s+(?<italic_title>[^.(]+?)(?:\.\s*\((?<edition>[^)]+)\))?\.\s+(?:Trans\.\s+(?<translator>[^)]+)\.)?\s*(?<publisher>[^.]+?)\.$/;
        
        const match = apaString.match(regex);

        let author = "Unknown Author";
        let year = "n.d.";
        let title = "Historical Work";
        let translator = null;
        let publisher = "Public Domain Archive";

        if (match && match.groups) {
            author = match.groups.authors ? match.groups.authors.trim() : author;
            year = match.groups.year ? match.groups.year.trim() : year;
            title = match.groups.italic_title ? match.groups.italic_title.trim() : title;
            translator = match.groups.translator ? match.groups.translator.trim() : null;
            publisher = match.groups.publisher ? match.groups.publisher.replace(/\.$/, "").trim() : publisher;
        }

        const classList = commaSeparatedClasses ? commaSeparatedClasses.split(',').map(c => c.trim()).filter(Boolean) : ["Public Domain"];

        return {
            rayVersion: "1.0",
            entity: {
                source: { name: title, genus: "Historical Book", date: year, translator: translator },
                persons: [
                    { name: author, links: [{ rel: "wrote_source", targetName: title }] },
                    ...(translator ? [{ name: translator, links: [{ rel: "translated_source", targetName: title }] }] : [])
                ],
                classes: classList.map(cName => ({ name: cName, links: [{ rel: "contains_source", targetName: title }] })),
                institution: { name: publisher, genus: "Archive" },
                edition: { title: `${title} (Digital Edition)`, date: year, APA: apaString, translator: translator, torrents: [] }
            }
        };
    },

    async process(pdfFile, fileText, userClasses) {
        console.info("[RAMOSA CONTROL] Processing extracted PDF text...");
        
        // Use Ramosa explicitly to prevent losing 'this' context
        const apaCitation = await Ramosa.generateAPA(fileText);
        console.info(`[RAMOSA CONTROL] Generated APA: ${apaCitation}`);

        const rayPayload = Ramosa.parseSpheres(apaCitation, userClasses);

        if (!rayPayload.entity.edition.torrents) {
            rayPayload.entity.edition.torrents = [];
        }

        const client = window.client;
        if (!client) {
            console.error("[RAMOSA CONTROL ERROR] window.client WebTorrent instance not found.");
            return;
        }

        client.seed(pdfFile, { dht: false, tracker: false, pex: true }, (torrent) => {
            console.info(`[RAMOSA CONTROL] Seeded successfully! InfoHash: ${torrent.infoHash}`);

            rayPayload.entity.edition.torrents.push({
                format: "PDF",
                res: "Pre-1931 Archive Scan",
                infoHash: torrent.infoHash,
                size: pdfFile.size,
                release: `${rayPayload.entity.institution.name}-${rayPayload.entity.source.date}-${rayPayload.entity.source.name.replace(/\s+/g, '-')}`
            });

            if (MVC.Base && MVC.Base.Ramosa && typeof MVC.Base.Ramosa.put === "function") {
                MVC.Base.Ramosa.put(torrent.infoHash, rayPayload);
            } else {
                RamosaModel.put(torrent.infoHash, rayPayload);
                if (MVC.Control?.Torrents?.table) {
                    MVC.Control.Torrents.table("torrents");
                }
            }

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
    }
};

export default Ramosa;