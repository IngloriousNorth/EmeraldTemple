//Ramosa Array yard
// models/RAy.js
import MVC from '../MAINFRAME/MAINFRAME.js';

const RAy = {
    data: {
        Sources: new Map(),
        Persons: new Map(),
        Classes: new Map(),
        Institutions: new Map()
    },

    // Helper to capitalize names for consistent indexing
    capitalizeName: function(str) {
        if (!str) return "";
        return str.trim().split(/\s+/)
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
    },

    put: function(infoHash, RAy) {
        if (!MVC.Ramosa) MVC.Ramosa = {};
        if (!MVC.Ramosa.RAA) MVC.Ramosa.RAA = [];

        const entity = rayPayload.entity;

        // 1. Index Source by capitalized name (Unique ID) and assign genus to type
        if (entity.source && entity.source.name) {
            const capitalizedSourceName = this.capitalizeName(entity.source.name);
            const sourceRecord = { 
                ...entity.source, 
                name: capitalizedSourceName,
                type: entity.source.genus
            };
            this.data.Sources.set(capitalizedSourceName, sourceRecord);
        }

        // 2. Index Persons by capitalized name
        if (entity.persons && Array.isArray(entity.persons)) {
            entity.persons.forEach(person => {
                if (person.name) {
                    const capName = this.capitalizeName(person.name);
                    this.data.Persons.set(capName, { ...person, name: capName });
                }
            });
        }

        // 3. Index Classes by capitalized name
        if (entity.classes && Array.isArray(entity.classes)) {
            entity.classes.forEach(cls => {
                if (cls.name) {
                    const capName = this.capitalizeName(cls.name);
                    this.data.Classes.set(capName, { ...cls, name: capName });
                }
            });
        }

        // 4. Index Institution by capitalized name
        if (entity.institution && entity.institution.name) {
            const capName = this.capitalizeName(entity.institution.name);
            this.data.Institutions.set(capName, { ...entity.institution, name: capName });
        }

        MVC.Ramosa.RAA.push(rayPayload);
        console.info(`[RAY YARD] Put "${entity.source?.name}" [Genus/Type: ${entity.source?.genus}] into RAY data store via PEX swarm.`);
    },

    findSourceByName: function(name) {
        return this.data.Sources.get(this.capitalizeName(name));
    }
};

export default RAY;