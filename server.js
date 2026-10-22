//TODO: he.encode
//TODO: DATETIME() instead of TIMESTAMP() for created_at

import express from 'express';
import util from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import https from 'https';
import neo4j from 'neo4j-driver';
import bodyParser from 'body-parser';
import he from 'he';
import multer from 'multer';
//import PDFParse from 'pdf-parse';
import dotenv from 'dotenv';
import { check, validationResult } from 'express-validator';

// Load environment variables from .env file for local development
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Neo4j Driver using environment variables
const driver = neo4j.driver(
    process.env.NEO4J_URI || 'neo4j+s://your-instance.databases.neo4j.io',
    neo4j.auth.basic(
        process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j', 
        process.env.NEO4J_PASSWORD || 'your_password'
    )
);

app.use(bodyParser.json());       
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, 'public')));

import Pyramid from "./engine/mermaid.js";

app.post('/add_source/:infoHash', upload.array('files'), async (req, res) => {
    try {
        const infoHash = req.params.infoHash;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }

        //const fileBuffer = req.files[0].buffer;
        //const pdfData = await PDFParse(fileBuffer);
        //const textSnippet = pdfData.text.slice(0, 4000);
        //maybe rag the whole book

        const metadata = {
            title: 'Unknown Title',
            apa_citation: 'Unknown APA',
            author_name: 'Unknown Author',
            publisher_name: 'Unknown Publisher'
        };

        const cypherQuery = `
            MERGE (s:Source {name: $title, date: $date, genus : NULL, revs: TOFLOAT(0), uploaded : TOFLOAT(TIMESTAMP()), top10 : DATETIME()})
            MERGE (e:Edition {APA: $apa})
            MERGE (t:Torrent {infoHash: $infoHash, species: $species, revs : TOFLOAT(0), uploaded : TOFLOAT(TIMESTAMP()), top10 : DATETIME()})
            MERGE (a:Author {name: $author})
            MERGE (p:Publisher {name: $publisher})
            
            MERGE (s)-[:PUB_AS]->(e)
            MERGE (e)-[:DIST_AS]->(t)
            MERGE (a)-[:AUTHOR]->(s)
            MERGE (e)-[:PUBLISHED_BY]->(p)
            
            SET s.uuid = randomUUID(), a.uuid = randomUUID(),
            p.uuid = randomUUID(), e.uuid = randomUUID(), t.uuid = randomUUID(), 
            RETURN s.name AS Source, t.infoHash AS Torrent
        `;

        const session = driver.session();
        try {
            await session.run(cypherQuery, {
                title: metadata.title || 'Unknown Title',
                apa: metadata.apa_citation || 'Unknown APA',
                infoHash: infoHash,
                author: metadata.author_name || 'Unknown Author',
                publisher: metadata.publisher_name || 'Unknown Publisher'
            });
        } finally {
            await session.close();
        }

        res.json({
            status: 'success',
            infoHash: infoHash,
            metadata: metadata
        });

    } catch (error) {
        console.error('Error processing /add_source:', error);
        res.status(500).json({ error: error.message });
    }
});

var stopwords = ['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now'];

function remove_stopwords(str) {
    var res = [];
    var str = str.toLowerCase();
    var words = str.split(' ');
    for(var i=0;i<words.length;i++) {
       var word_clean = words[i].split(".").join("");
       if(!stopwords.includes(word_clean)) {
           res.push(word_clean);
       }
    }
    return(res.join(' '));
}

function remove_publisher_stopwords(str) {
    if (!str) return "";

    let decoded = str;
    if (typeof he !== 'undefined' && he.decode) {
        decoded = he.decode(str);
    } else {
        decoded = str.replace(/&amp;/g, '&')
                     .replace(/&lt;/g, '<')
                     .replace(/&gt;/g, '>')
                     .replace(/&quot;/g, '"')
                     .replace(/&#39;/g, "'");
    }

    const stopWords = new Set([
        "and", "the", "of", "for", "in", "by", "with", "a", "an", "amp",
        "ltd", "limited", "inc", "incorporated", "corp", "corporation",
        "publishers", "publisher", "publishing", "publications", "press",
        "books", "company", "co", "llc", "group", "house", "intl", "international"
    ]);

    let cleanStr = decoded.replace(/[\+\-\!\(\)\{\}\[\]\^\~\\\"\*\?\:\/&|.,;:]/g, ' ');
    let words = cleanStr.split(/\s+/);
    let filteredWords = words.filter(word => {
        let lowerWord = word.toLowerCase().trim();
        return lowerWord.length > 0 && !stopWords.has(lowerWord);
    });

    return filteredWords.join(' ').trim();
}

app.get("/aten/:uuid", check("uuid").not().isEmpty().trim().escape(), function(req,res){
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.json({ errors: errors.array() });
  }
  const session = driver.session();
  var query = `OPTIONAL MATCH (n {uuid : $uuid})-[:CB_SCRIBE]-(h:Hieroglyph) RETURN h`;
  const params = {uuid : req.params.uuid};
  session.run(query, params).then(data=>{
    session.close();
    res.json({aten : data.records[0]});
  });
});

app.post("/sentinel/:uuid", check("obelisk").trim().escape(), check("uuid").trim().escape().not().isEmpty(), function(req, res){
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.json({ errors: errors.array() });
  }

  var propositional_content = []
  const aten = JSON.parse(he.decode(req.body.obelisk));
  aten.forEach(function(sol){
    propositional_content.push(sol.name);
  })

  const uuid = req.params.uuid;

  Pyramid.warp(driver, uuid, propositional_content, function(data){
              console.log(data.records[0])
    
      quantumMermaid(data.records.length, function(index, isQuantum){
          if(data.records.length > 0 && data.records[index]){
              // Safely extract property depending on node label returned
              const nodeProps = data.records[index]._fields[0].properties;
              // Fallback to id if uuid isn't present on authors/classes/publishers
              const uuid = nodeProps.uuid
              const node = data.records[index].get(0)
              const label = node.labels[0];
              return res.json({ uuid: uuid, label : label.toLowerCase(), mermaid: isQuantum });
          } else {
              return res.json({ errors: [{ msg: "No records found" }] });
          }
      });
  });
});

function quantumMermaid(len, cb) {
    if (len === 0) {
        return cb(0, false);
    }
    
    const options = {
        host: 'lfdr.de',
        path: '/qrng_api/qrng?length=1&format=HEX'
    };

    let finished = false;

    const fallbackRandom = (errorType) => {
        if (finished) return;
        const min = Math.ceil(0);
        const max = Math.floor(Math.min(len - 1, 172));
        const qrn = Math.floor(Math.random() * (max - min + 1)) + min;
        finished = true;
        cb(mermaidHex(qrn, len), false);
    };

    const req = https.get(options, (res) => {
        if (res.statusCode !== 200) {
            res.resume();
            return fallbackRandom(`Bad Status Code: ${res.statusCode}`);
        }

        let bodyChunks = [];
        res.on('data', (chunk) => { bodyChunks.push(chunk); });
        res.on('end', () => {
            if (finished) return;
            finished = true;
            const body = Buffer.concat(bodyChunks).toString();
            try {
                const json = JSON.parse(body);
                if (json.qrn) {
                    cb(mermaidHex(json.qrn, len), true);
                } else {
                    fallbackRandom('JSON incomplete');
                }
            } catch (error) {
                fallbackRandom('JSON Parsing Error');
            }
        });
        res.on("error", () => { fallbackRandom("Stream Error"); });
    });

    req.on('error', (err) => { fallbackRandom(`Request Error: ${err.code}`); });
    req.setTimeout(5555, () => { req.abort(); fallbackRandom("Timeout Error"); });
}

function mermaidHex(qrn, ln){
  const decimal = parseInt(qrn, 16);
  if(ln > 373){
    return decimal % 373;
  } else {
    return decimal % ln;
  }
}

app.post("/abacus/:uuid", check("uuid").trim().escape().not().isEmpty(), check('aten').trim().escape().not().isEmpty(), function(req,res){
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ errors: errors.array() });
    }
    const session = driver.session();
    const query = `
        MATCH (n {uuid: $uuid})
        MATCH (h:Hieroglyph {name: $obelisk})
        OPTIONAL MATCH (n)-[r0:CB_SCRIBE]-()
        DELETE r0
        WITH n, h
        CREATE (n)-[:CB_SCRIBE]->(h)
    `;
    const params = {uuid: req.params.uuid, obelisk : req.body.aten};
    session.run(query,params).then(data=>{
        session.close();
        res.json({});
    });
});

app.post("/set/:ward", check("ward").trim().escape(), function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ errors: errors.array() });
    }

    if(req.params.ward === "null"){
       return res.json({
            draw: parseInt(req.body.draw),
            recordsTotal: 0,
            recordsFiltered: 0,
            data: []
        }); 
   }

    const session = driver.session();
    const ward = req.params.ward;
    const { start, length, order } = req.body;
    
    const params = {
        skip: start || 0,
        limit: length || 25
    };

    let relationshipLabel = '';
    let connectedNodeLabel = '';
    let countAlias = '';
    let actualNodeLabel;

    const liveFilter = "-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t:Torrent {deleted: false})";

    switch (ward) {
        case "authors":
            relationshipLabel = '-[:AUTHOR]->'; 
            connectedNodeLabel = 's:Source';
            countAlias = 'numSources';
            break;
        case "classes":
            relationshipLabel = '-[:TAGS]->';
            connectedNodeLabel = 's:Source';
            countAlias = 'numSources';
            actualNodeLabel = 'Class';
            break;
        case "publishers":
            relationshipLabel = '<-[:PUBLISHED_BY]-';
            connectedNodeLabel = 'e:Edition';
            countAlias = 'numEditions';
            break;
        default:
            session.close();
            return res.status(400).json({ error: "Invalid ward" });
    }

    const nodeVar = ward.charAt(0);
    const nodeLabel = actualNodeLabel || ward.charAt(0).toUpperCase() + ward.slice(1, -1);
    const fullPathSuffix = (ward === "publishers") 
        ? `${relationshipLabel}(e:Edition)-[:DIST_AS]->(t:Torrent {deleted: false})`
        : `${relationshipLabel}(s:Source)-[:PUB_AS]->(e:Edition)-[:DIST_AS]->(t:Torrent {deleted: false})`;

    let orderByClause = `${nodeVar}.name ASC`;
    if (order && order.length > 0) {
        const colIndex = order[0].column;
        const dir = order[0].dir.toUpperCase();
        switch (colIndex) {
            case '0': orderByClause = `${nodeVar}.name ${dir}`; break;
            case '1': orderByClause = `${countAlias} ${dir}`; break;
            case '2': orderByClause = `revs ${dir}`; break;
        }
    }

    const countQuery = 
        `MATCH (n:${nodeLabel})${fullPathSuffix} ` +
        `WHERE n.name <> '' ` +
        `RETURN count(DISTINCT n) AS count`;

    const dataQuery = 
        `MATCH (${nodeVar}:${nodeLabel})${fullPathSuffix} ` +
        `WHERE ${nodeVar}.name <> '' ` +
        `WITH ${nodeVar}, ` +
        `count(DISTINCT ${connectedNodeLabel.split(':')[0]}) AS ${countAlias}, ` +
        `coalesce(${nodeVar}.revs, 0) AS revs ` +
        `ORDER BY ${orderByClause} ` + 
        `SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ` +
        `RETURN ${nodeVar}, ${countAlias}, revs`;

    let totalCount = 0;

    session.run(countQuery)
        .then(countData => {
            totalCount = countData.records[0].get('count').toNumber();
            return session.run(dataQuery, params);
        })
        .then(data => {
            session.close();
            res.json({
                draw: parseInt(req.body.draw),
                recordsTotal: totalCount,
                recordsFiltered: totalCount,
                data: data.records
            });
        })
        .catch(error => {
            session.close();
            console.error(`Cypher Error:`, error);
            res.status(500).send("Internal Error");
        });
});

app.post("/torrents/adv_search", check("res").trim().escape().isLength({max : 200}), check("all").not().isEmpty().trim().escape().isLength({max:200}), check("title").trim().escape().isLength({max: 400}),
 check("author").trim().escape().isLength({max: 200}), check("classes").trim().escape().isLength({max:1251}).toLowerCase(),
  check("publisher").trim().escape().isLength({max: 612}), check("genus").trim().escape().isLength({max:200}), 
  check("species").trim().escape().isLength({max:360}), function(req,res){
    const errors = validationResult(req);
    if (!errors.isEmpty()) { return res.json({ errors: errors.array() }); }

    function escapeLucene(val) {
        if (!val) return "";
        return val.replace(/([\+\-\!\(\)\{\}\[\]\^\~\\\"\*\?\:\/]|&&|\|\|)/g, "\\$1").trim();
    }

    let rawTitle = req.body.title || "";
    let rawAuthor = req.body.author || "";
    let rawPub = req.body.publisher || "";

    let title = remove_stopwords(rawTitle.toLowerCase()).replace(/[:!#;]/g, "");
    let author = remove_stopwords(rawAuthor.toLowerCase().replace(/[:!#;]/g, ""));
    let publisher = remove_publisher_stopwords(rawPub.toLowerCase().replace(/[:!]/g, ""));

    if (publisher === "propagate" || publisher === "propagateinfo") {
        publisher = "propagate.info";
    }

    let sTitle = escapeLucene(title);
    let sAuthor = escapeLucene(author);
    let sPublisher = escapeLucene(publisher);

    if (sTitle === "\\-") sTitle = "";
    if (sAuthor === "\\-") sAuthor = "";
    if (sPublisher === "\\-") sPublisher = "";

    const session = driver.session();
    if(req.body.classes){
      var classes = JSON.parse(he.decode(req.body.classes)).split(",");
      if(classes[0] === ['']){
        classes = [];
      } else {
        for (var i = 0; i < classes.length; i++) {
         classes[i] = he.decode(classes[i].trim()).replace(/['"]+/g, '');
        }  
      }
    }
    
    sTitle = remove_stopwords(sTitle.toLowerCase()).replace(":", ' ').replace("!", "").replace("#", "").replace(";", "");
    sAuthor = remove_stopwords(sAuthor.toLowerCase().replace(":", ' ').replace("!", "").replace("#", "").replace(";", ""));
    sPublisher = remove_publisher_stopwords(sPublisher.toLowerCase().replace(':', ' ').replace("!", ""));
    if(req.body.publisher.toLowerCase() === "propagate" || req.body.publisher.toLowerCase() === "propagateinfo"){
      req.body.publisher = "propagate.info";
    }

    var query = "";

    if (req.body.all === "true") {
        if (req.body.genus && req.body.genus !== "all") {
            query += "MATCH (s:Source)-[:PUB_AS]->(e:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false AND s.genus = $genus ";
        }
        if (sTitle) {
            query += "CALL db.index.fulltext.queryNodes('sourceNameIndex', $title) YIELD node AS nodeTitle " +
                     "MATCH (s:Source)-[:PUB_AS]->(e:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false AND s.uuid = nodeTitle.uuid ";
        } else {
            query += "MATCH (s:Source)-[:PUB_AS]->(e:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false ";
        }

        if (sAuthor) {
            query += "WITH s CALL db.index.fulltext.queryNodes('authorNameIndex', $author) YIELD node AS nodeAuthor " +
                     "MATCH (a1:Author)-[:AUTHOR]->(s) WHERE a1.uuid = nodeAuthor.uuid ";
        }

        if (req.body.classes) {
            query += "WITH s MATCH (c1:Class) WHERE c1.name IN $classes " +
                     "WITH s, collect(c1) as cList " +
                     "MATCH (s)<-[:TAGS]-(head) WHERE head IN cList " +
                     "AND ALL(c in cList WHERE (s)<-[:TAGS]-(c)) ";
        }

        if (sPublisher) {
            query += "WITH s CALL db.index.fulltext.queryNodes('publisherNameIndex', $publisher) YIELD node AS nodePub " +
                     "MATCH (p:Publisher)<-[:PUBLISHED_BY]-(e:Edition)<-[:PUB_AS]-(s) " +
                     "WHERE p.uuid = nodePub.uuid ";
        }
        query += "WITH DISTINCT s "; 
        query += "WITH collect(s) as allSources, count(s) as totalCount ";
        query += "UNWIND allSources as s WITH s, totalCount as count ";
    } else {
        if (req.body.genus && req.body.genus !== "all") {
            query += "MATCH (s:Source)-[:PUB_AS]->(e:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false AND s.genus = $genus ";
        } else {
            query += "MATCH (s:Source)-[:PUB_AS]->(e:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false ";
        }

        const hasSearchTerm = 
            (req.body.title && req.body.title.trim().length > 0) || 
            (req.body.author && req.body.author.trim().length > 0) || 
            (req.body.publisher && req.body.publisher.trim().length > 0) || 
            (req.body.classes && req.body.classes.length > 0);

        if (hasSearchTerm) {
            query += " WITH s CALL { WITH s "; 

            query += (sTitle && sTitle.trim().length > 0) ? `
                CALL db.index.fulltext.queryNodes('sourceNameIndex', $title) YIELD node AS titleNode
                WHERE titleNode = s
                RETURN s AS result
            ` : 'RETURN null AS result ';

            query += " UNION ";

            query += (sAuthor && sAuthor.trim().length > 0) ? `
                WITH s
                CALL db.index.fulltext.queryNodes('authorNameIndex', $author) YIELD node AS a
                MATCH (a)-[:AUTHOR]->(authorSource:Source)
                WHERE authorSource = s
                RETURN s AS result
            ` : 'RETURN null AS result ';

            query += " UNION ";

            query += (sPublisher && sPublisher.trim().length > 0) ? `
                WITH s
                CALL db.index.fulltext.queryNodes('publisherNameIndex', $publisher) YIELD node AS p
                MATCH (p)<-[:PUBLISHED_BY]-(:Edition)<-[:PUB_AS]-(pubSource:Source)
                WHERE pubSource = s
                RETURN s AS result
            ` : 'RETURN null AS result ';

            query += " UNION ";

            query += (req.body.classes && req.body.classes.length > 0) ? `
                WITH s
                MATCH (c:Class)-[:TAGS]->(classSource:Source) 
                WHERE c.name IN $classes AND classSource = s
                RETURN s AS result
            ` : 'RETURN null AS result ';

            query += " } ";
            query += " WITH s WHERE result IS NOT NULL ";
        }
    }

    query += "WITH DISTINCT s " +
        "WITH collect(s) as allSources, count(s) as totalCount " +
        "UNWIND allSources as s " +
        "WITH s, totalCount as count ";

    query += "MATCH (s)-[:PUB_AS]->(e:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false " +
        (req.body.res !== "all" && req.body.res ? "AND t.res = $res " : "") +
        (req.body.species !== "all" && req.body.species ? "AND t.species = $species " : "") +
        "WITH s, e, t, count " +
        "OPTIONAL MATCH (a:Author)-[:AUTHOR]->(s) " +
        "OPTIONAL MATCH (c:Class)-[:TAGS]->(s) " +    
        "OPTIONAL MATCH (e)-[:PUBLISHED_BY]->(p:Publisher) " +
        "WITH s, count, collect(DISTINCT a) AS authors, " +
        "collect(DISTINCT {edition: e, publisher: p, torrent: t}) AS edition_torrents, " +
        "collect(DISTINCT c) as classes ";

    var column = 0;
    if(req.body.order){
        column = req.body.order[0].column;
    }
    switch(column){
        case '0':
          query += "RETURN s, authors, edition_torrents, classes, count ORDER BY s.updated DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
          break;
        case '1':
          if(req.body.order[0].dir === 'asc'){
            query += "RETURN s, authors, edition_torrents, classes, count ORDER BY s.name ASC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
          } else {
            query += "RETURN s, authors, edition_torrents, classes, count ORDER BY s.name DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
          }
          break;
        case '2':
          if(req.body.order[0].dir === 'asc'){
            query += "RETURN s, authors, edition_torrents, classes, count ORDER BY TOINTEGER(s.revs) ASC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
          } else {
            query += "RETURN s, authors, edition_torrents, classes, count ORDER BY TOINTEGER(s.revs) DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
          }
          break;
        case '3':
          if(req.body.order[0].dir === 'asc'){
            query += "RETURN s, authors, edition_torrents, classes, count ORDER BY s.adjDate ASC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
          } else {
            query += "RETURN s, authors, edition_torrents, classes, count ORDER BY s.adjDate DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
          }
          break;    
        case '4':
          if(req.body.order[0].dir === 'asc'){
            query += "RETURN s, authors, edition_torrents, classes, count ORDER BY s.updated ASC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
          } else {
            query += "RETURN s, authors, edition_torrents, classes, count ORDER BY s.updated DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
          }
          break;
        default :
          query += "RETURN s, authors, edition_torrents, classes, count ORDER BY s.updated DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
          break;
    }

    var params = {
        skip: req.body.start,
        limit: req.body.length,
        title: sTitle, 
        author: sAuthor, 
        classes: classes,
        publisher: sPublisher, 
        genus: he.encode(he.decode(he.decode(req.body.genus))),
        species: req.body.species,
        res: req.body.res
    };

    session.run(query, params).then(data => {
        session.close();     
        var recordsTotal = 0;
        var recordsFiltered = 0;
        
        if (data.records.length > 0) {
            recordsTotal = parseInt(data.records[0]._fields[4]);
            recordsFiltered = recordsTotal;
        }
        
        return res.json({
            recordsTotal: recordsTotal, 
            recordsFiltered: recordsFiltered, 
            records: data.records
        });
    });
});

app.post("/node/:label", [
    check("label").trim().escape().isIn(['source', 'author', 'class', 'publisher']),
    check("uuid").notEmpty().trim().escape() 
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ errors: errors.array() });
    }

    const label = req.params.label; 
    const uuid = req.query.uuid; 
    const { start, length, order } = req.body;
    const session = driver.session();

    let countClause = "";
    switch(label) {
        case 'source':    countClause = "MATCH (s:Source {uuid: $uuid})"; break;
        case 'author':    countClause = "MATCH (a:Author {uuid: $uuid})-[]->(s:Source)"; break;
        case 'class':     countClause = "MATCH (c:Class {uuid: $uuid})-[:TAGS]->(s:Source)"; break;
        case 'publisher': countClause = "MATCH (p:Publisher {uuid: $uuid})<-[:PUBLISHED_BY]-(e:Edition)<-[:PUB_AS]-(s:Source)"; break;
    }

    let matchClause = "";
    switch(label) {
        case 'source':    matchClause = "MATCH (s1:Source {uuid: $uuid})"; break;
        case 'author':    matchClause = "MATCH (a:Author {uuid: $uuid})-[]->(s1:Source)"; break;
        case 'class':     matchClause = "MATCH (c:Class {uuid: $uuid})-[:TAGS]->(s1:Source)"; break;
        case 'publisher': matchClause = "MATCH (p:Publisher {uuid: $uuid})<-[:PUBLISHED_BY]-(e:Edition)<-[:PUB_AS]-(s1:Source)"; break;
    }

    let orderBy = "s1.updated DESC";
    if (order && order.length > 0) {
        const dir = order[0].dir === 'asc' ? 'ASC' : 'DESC';
        switch(order[0].column) {
            case '0': orderBy = `s1.updated ${dir}`; break;
            case '1': orderBy = `s1.title ${dir}`; break;
            case '2': orderBy = `s1.revs ${dir}`; break;
            case '3': orderBy = `s1.adjDate ${dir}`; break;
            case '4': orderBy = `s1.updated ${dir}`; break;
        }
    }

    const cypherQuery = `
        ${countClause}
        WITH s
        MATCH (s)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false
        WITH TOFLOAT(count(DISTINCT s)) AS full_count

        ${matchClause}
        OPTIONAL MATCH (authors:Author)-[]->(s1)
        OPTIONAL MATCH (classes:Class)-[:TAGS]->(s1)
        WITH s1, full_count, collect(DISTINCT authors) AS authorList, collect(DISTINCT classes) AS classList

        MATCH (s1)-[:PUB_AS]->(e:Edition)-[:DIST_AS]->(t:Torrent) 
        WHERE t.deleted = false
        OPTIONAL MATCH (e)-[:PUBLISHED_BY]->(p:Publisher)
        
        WITH s1, full_count, authorList, classList, 
             collect(DISTINCT {publisher: p, edition: e, torrent: t}) AS edition_torrents
        RETURN s1, authorList, edition_torrents, classList, full_count ORDER BY ` + orderBy + ` , s1.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit)`;

    try {
        const data = await session.run(cypherQuery, {
            uuid: uuid,
            skip: start || 0,
            limit: length || 10
        });
         
        session.close();     
        var recordsTotal = 0;
        var recordsFiltered = 0;

        if (data.records.length > 0) {
            recordsTotal = parseInt(data.records[0]._fields[4]);
            recordsFiltered = recordsTotal;
        }

        res.json({
            draw: parseInt(req.body.draw) || 0,
            recordsTotal: recordsTotal,
            recordsFiltered: recordsFiltered,
            records: data.records
        });
    } catch (err) {
        console.error("KRAKEN ATTACK:", err);
        res.status(500).send("Internal Server Error");
    } finally {
        await session.close();
    }
});

app.get("/mahoo", function(req,res){
    return Pyramid.mahoo(driver, function(data){
        if(data.records.length === 0)
            return res.json({uuid : undefined, label : null});
        return res.json({uuid : data.records[0]._fields[0].properties.uuid, label : data.records[0].get(0).labels[0]});
    });
});

const graphQuery = `WITH s 
    WHERE s IS NOT NULL 
    OPTIONAL MATCH (h:Hieroglyph)<-[:CB_SCRIBE]-(s)

    CALL {
        WITH s
        OPTIONAL MATCH (s)<-[:AUTHOR]-(a:Author)
        OPTIONAL MATCH (h_a:Hieroglyph)<-[:CB_SCRIBE]-(a)
        RETURN collect(DISTINCT {node: a, hieroglyph: h_a}) AS authorPairs
    }

    CALL {
        WITH s
        OPTIONAL MATCH (s)<-[:TAGS]-(c:Class)
        OPTIONAL MATCH (h_c:Hieroglyph)<-[:CB_SCRIBE]-(c)
        RETURN collect(DISTINCT {node: c, hieroglyph: h_c}) AS classPairs
    }

    CALL {
        WITH s
        OPTIONAL MATCH (s)-[:PUB_AS]->(:Edition)-[:PUBLISHED_BY]->(p:Publisher)
        WHERE p.name <> ''
        OPTIONAL MATCH (h_p:Hieroglyph)<-[:CB_SCRIBE]-(p)
        RETURN collect(DISTINCT {node: p, hieroglyph: h_p}) AS publisherPairs
    }

    WITH s, h, authorPairs, classPairs, publisherPairs,
         [ap IN authorPairs | ap.node] AS authors,
         [cp IN classPairs | cp.node] AS classes,
         [pp IN publisherPairs | pp.node] AS publishers

    UNWIND (CASE WHEN size(classes) = 0 THEN [null] ELSE classes END) AS c_elem
    CALL {
        WITH c_elem, s
        OPTIONAL MATCH (c_elem)-[:TAGS]->(s2:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t2:Torrent)
         WHERE c_elem IS NOT NULL AND t2.deleted = false AND s2 <> s
        RETURN s2
        ORDER BY s2.revs DESC LIMIT 9
    }
    WITH s, h, authorPairs, classPairs, publisherPairs, authors, classes, publishers, collect(DISTINCT s2) AS s2_classes

    UNWIND (CASE WHEN size(authors) = 0 THEN [null] ELSE authors END) AS a_elem
    CALL {
        WITH a_elem, s
        OPTIONAL MATCH (a_elem)-[:AUTHOR]->(s2:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t2:Torrent)
         WHERE a_elem IS NOT NULL AND t2.deleted = false AND s2 <> s
        RETURN s2 ORDER by s2.revs DESC 
        LIMIT 6
    }
    WITH s, h, authorPairs, classPairs, publisherPairs, authors, classes, publishers, s2_classes, collect(DISTINCT s2) AS s2_authors

    UNWIND (CASE WHEN size(publishers) = 0 THEN [null] ELSE publishers END) AS p_elem
    CALL {
        WITH p_elem, s
        OPTIONAL MATCH (p_elem)<-[:PUBLISHED_BY]-(:Edition)<-[:PUB_AS]-(s2:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t2:Torrent)
         WHERE p_elem IS NOT NULL AND t2.deleted = false AND s2 <> s AND p_elem.name <> '' 
        RETURN s2 ORDER BY s2.revs DESC 
        LIMIT 3
    }
    WITH s, h, authorPairs, classPairs, publisherPairs, authors, classes, publishers, s2_classes, s2_authors, collect(DISTINCT s2) AS s2_publishers

    UNWIND (s2_classes + s2_authors + s2_publishers) AS s2_item
    WITH s, h, authorPairs, classPairs, publisherPairs, authors, classes, publishers, [x IN collect(DISTINCT s2_item) WHERE x IS NOT NULL] AS s2_list

    UNWIND (CASE WHEN size(s2_list) = 0 THEN [null] ELSE s2_list END) AS s2
    OPTIONAL MATCH (h_s2:Hieroglyph)<-[:CB_SCRIBE]-(s2)

    CALL {
        WITH s2
        OPTIONAL MATCH (s2)<-[:AUTHOR]-(a_s2:Author)
        OPTIONAL MATCH (h_a_s2:Hieroglyph)<-[:CB_SCRIBE]-(a_s2)
        RETURN collect(DISTINCT {node: a_s2, hieroglyph: h_a_s2}) AS authorPairs_s2
    }

    CALL {
        WITH s2
        OPTIONAL MATCH (s2)<-[:TAGS]-(c_s2:Class)
        OPTIONAL MATCH (h_c_s2:Hieroglyph)<-[:CB_SCRIBE]-(c_s2)
        RETURN collect(DISTINCT {node: c_s2, hieroglyph: h_c_s2}) AS classPairs_s2
    }

    CALL {
        WITH s2
        OPTIONAL MATCH (s2)-[:PUB_AS]->(:Edition)-[:PUBLISHED_BY]->(p_s2:Publisher) 
        WHERE p_s2.name <> '' 
        OPTIONAL MATCH (h_p_s2:Hieroglyph)<-[:CB_SCRIBE]-(p_s2)
        RETURN collect(DISTINCT {node: p_s2, hieroglyph: h_p_s2}) AS publisherPairs_s2
    }

    WITH s, h, authorPairs, classPairs, publisherPairs, s2, h_s2, authorPairs_s2, classPairs_s2, publisherPairs_s2

    WITH s, h, authorPairs, classPairs, publisherPairs,
         [item IN collect(DISTINCT {
             source: s2,
             hieroglyph: h_s2,
             authorPairs: authorPairs_s2,
             classPairs: classPairs_s2,
             publisherPairs: publisherPairs_s2
         }) WHERE item.source IS NOT NULL] AS allConnectedSources

    RETURN s, h, authorPairs, classPairs, publisherPairs, allConnectedSources;`;

app.post("/node_graph/:label", [
    check("label").trim().escape().isIn(['source', 'author', 'class', 'publisher']),
    check("uuid").notEmpty().trim().escape()
], async(req,res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ errors: errors.array() });
    }
    const session = driver.session();

    var query = "";
    switch(req.params.label){
        case "source":
            query = "MATCH (s:Source {uuid : $uuid})-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false ";
            break;
        case "author" :
            query = "MATCH (a:Author {uuid : $uuid})-[:AUTHOR]->(s:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false ";
            break;
        case "class":
            query = "MATCH (c:Class {uuid : $uuid})-[:TAGS]->(s:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false ";
            break;
        case "publisher":
            query = "MATCH (p:Publisher {uuid : $uuid})<-[:PUBLISHED_BY]-(e:Edition)<-[:PUB_AS]-(s:Source) ";
            query += "MATCH (s)-[:PUB_AS]->(e)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false ";
            break;
    }
    query += graphQuery;

    const params = {uuid : req.body.uuid};
    session.run(query, params).then(data => {
        session.close();
        return res.json({ gData: data.records });
    }).catch(err => {
        session.close();
        console.error("Neo4j Error:", err);
        res.status(500).json({ error: err.message });
    });
});

app.post("/graph_search", 
    check("all").trim().escape().isLength({max:100}), 
    check("title").trim().escape().isLength({max: 400}),
    check("author").trim().escape().isLength({max: 200}), 
    check("classes").trim().escape().isLength({max:1251}).toLowerCase(),
    check("publisher").trim().escape().isLength({max: 612}), 
    check("genus").trim().escape().isLength({max:200}), 
    check("species").trim().escape().isLength({max:360}), 
    check("res").trim().escape().isLength({max : 256}),
    function(req, res) {    
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.json({ errors: errors.array() });

        let classes = []; 
        if (req.body.classes) {
            try {
                let parsed = JSON.parse(he.decode(req.body.classes));
                if (typeof parsed === 'string') parsed = parsed.split(",");
                classes = parsed.map(c => he.decode(c.trim()).replace(/['"]+/g, '')).filter(c => c.length > 0);
            } catch (e) { 
                classes = []; 
            }
        }

        function escapeLucene(val) {
            if (!val) return "";
            return val.replace(/([\+\-\!\(\)\{\}\[\]\^\~\\\"\*\?\:\/]|&&|\|\|)/g, "\\$1").trim();
        }

        let title = remove_stopwords(req.body.title || "").replace(/[:!#;]/g, " ");
        let author = remove_stopwords(req.body.author || "").replace(/[:!#;]/g, " ");
        let publisher = remove_publisher_stopwords(req.body.publisher || "").replace(/[:!]/g, " ");

        let sTitle = escapeLucene(title);
        let sAuthor = escapeLucene(author);
        let sPublisher = escapeLucene(publisher);

        const hasActiveSearch = (sTitle && sTitle !== "\\-") || 
                                (sAuthor && sAuthor !== "\\-") || 
                                (sPublisher && sPublisher !== "\\-") || 
                                (classes.length > 0) ||
                                (req.body.type && req.body.type !== "all") ||
                                (req.body.species && req.body.species !== "all") ||
                                (req.body.res && req.body.res !== "all");

        const session = driver.session();
        let query = "";

        if (hasActiveSearch) {
            let branches = [];

            if (sTitle && sTitle !== "\\-") {
                branches.push(`
                    CALL db.index.fulltext.queryNodes('source_name', $title) YIELD node AS titleSource
                    WHERE titleSource:Source
                    RETURN titleSource AS s
                `);
            }

            if (sAuthor && sAuthor !== "\\-") {
                branches.push(`
                    CALL db.index.fulltext.queryNodes('authorSearch', $author) YIELD node AS aNode
                    MATCH (aNode)-[:AUTHOR]->(authorSource:Source)
                    RETURN authorSource AS s
                `);
            }

            if (sPublisher && sPublisher !== "\\-") {
                branches.push(`
                    CALL db.index.fulltext.queryNodes('publisherName', $publisher) YIELD node AS pNode
                    MATCH (pNode)<-[:PUBLISHED_BY]-(:Edition)<-[:PUB_AS]-(pubSource:Source)
                    RETURN pubSource AS s
                `);
            }

            if (classes.length > 0) {
                branches.push(`
                    MATCH (cNode:Class)-[:TAGS]->(classSource:Source)
                    WHERE cNode.name IN $classes
                    RETURN classSource AS s
                `);
            }

            if (branches.length === 0) {
                branches.push(`
                    MATCH (s:Source)
                    RETURN s
                `);
            }

            query += "CALL { " + branches.join(" UNION ") + " } ";
            query += "MATCH (s)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false ";

            if (req.body.species !== "all" && req.body.species) query += "AND t.species = $species ";
            if (req.body.genus && req.body.genus !== "all") query += "AND s.genus = $genus ";

            query += "WITH DISTINCT s ";
        } else {
            query += "MATCH (s:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false " +
                     "WITH DISTINCT s ";
        }

        query += graphQuery;

        var params = {
            title: sTitle, 
            author: sAuthor, 
            classes: classes, 
            publisher: sPublisher, 
            genus: req.body.genus, 
            species: req.body.species,
            res: req.body.res
        };

        session.run(query, params).then(data => {
            session.close();
            return res.json({ gData: data.records });
        }).catch(err => {
            session.close();
            console.error("Neo4j Error:", err);
            res.status(500).json({ error: err.message });
        });
    }
);

app.get("/search", check("term").trim().escape(), check("field").not().isEmpty().trim().escape(), check("upload").trim().escape(), function(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ errors: errors.array() });
    }

    let term = req.query.term || "";
    
    if (req.query.field === "search_publishers") {
        term = remove_publisher_stopwords(term);
    } else {
        term = remove_stopwords(term);
    }

    if (term.toLowerCase() === "propagate" || term.toLowerCase() === "propagateinfo") {
        term = "propagate.info";
    }

    term = term.replace(/[:!;]/g, "");

    function escapeLucene(val) {
        return val.replace(/([\+\-\!\(\)\{\}\[\]\^\~\\\"\*\?\:\/]|&&|\|\|)/g, "\\$1");
    }

    let sanitizedTerm = escapeLucene(term).trim();

    if (!sanitizedTerm || sanitizedTerm === "\\-") {
        return res.json([]);
    }

    const session = driver.session();
    var query = "";

    switch (req.query.field) {
        case "search_sources":
            query = "CALL db.index.fulltext.queryNodes('source_name', $sourceName) YIELD node " +
                    "MATCH (s:Source)-[]->(e:Edition)-[]->(t:Torrent {deleted : false}) WHERE s.uuid = node.uuid " +
                    "RETURN DISTINCT s";
            break;
        case "search_authors":
            query = "CALL db.index.fulltext.queryNodes('authorSearch', $authorName) YIELD node " +
                    "MATCH (a:Author)-[:AUTHOR]->(:Source) ";
            if (req.query.upload !== "true") {
                query += "-[]->(e:Edition)-[]->(t:Torrent {deleted : false}) ";
            }
            query += "WHERE a.uuid = node.uuid RETURN DISTINCT a";
            break;
        case "search_classes":
            query = "CALL db.index.fulltext.queryNodes('classes', $className) YIELD node " +
                    "MATCH (c:Class)-[]->(s:Source)-[]->(e:Edition)-[]->(t:Torrent {deleted : false}) WHERE c.uuid = node.uuid " +
                    "RETURN DISTINCT c";
            break;
        case "search_publishers":
            query = "CALL db.index.fulltext.queryNodes('publisherName', $publisherName) YIELD node " +
                    "MATCH (p:Publisher)<-[]-(e:Edition)-[]->(t:Torrent {deleted : false}) WHERE p.uuid = node.uuid " +
                    "RETURN DISTINCT p";
            break;
        default:
            session.close();
            return res.status(400).send("Invalid field");
    }

    var params = {
        sourceName: sanitizedTerm, 
        authorName: sanitizedTerm, 
        publisherName: sanitizedTerm,
        className: sanitizedTerm,
    };

    session.run(query, params).then(data => {
        session.close();
        var recordData = [];
        if (data.records) {
            data.records.forEach(function(record) {
                const node = record._fields[0];
                recordData.push({
                    label: node.properties.name,
                    value: node.properties.uuid
                });
            });
        }
        return res.json(recordData);
    }).catch(err => {
        session.close();
        console.error("Search Error:", err);
        res.status(500).json([]);
    });
});

var torrentQuery = "OPTIONAL MATCH (a:Author)-[]->(s) " + 
  "OPTIONAL MATCH (e:Edition)<-[:PUB_AS]-(s) " +
  "MATCH (e)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false " +
  "OPTIONAL MATCH (e)-[:PUBLISHED_BY]->(p:Publisher) WHERE t.deleted = false " +
  "OPTIONAL MATCH (c:Class)-[:TAGS]->(s) " +
  "WITH s, a, collect(DISTINCT{publisher :p, edition : e, torrent: t} ) AS edition_torrents, c, count ";

app.post("/torrents", [check("start").trim().escape(), check("length").trim().escape()], async function(req,res){
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array() });
  }
  const session = driver.session();

  var query = '';
  var params = {};
  query += "MATCH (s:Source)-[:PUB_AS]->(e:Edition)-[:DIST_AS]->(t:Torrent) " +
         "WHERE t.deleted = false " +
         "WITH count(DISTINCT s) as totalCount " + 
         "MATCH (s:Source) " + 
         "WHERE (s)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(:Torrent {deleted: false}) " +
         "WITH s, totalCount as count ";

  query += torrentQuery;
  var column = '0';
  if(req.body.order){
      column = req.body.order[0].column;
  }
  switch(column){
    case '0':
      query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), count ORDER BY s.updated DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
      break;
    case '1':
      if(req.body.order[0].dir === 'asc'){
        query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), count ORDER BY s.title ASC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
      } else {
        query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), count ORDER BY s.title DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
      }
      break;
    case '3':
      if(req.body.order[0].dir === 'asc'){
        query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), count ORDER BY s.adjDate ASC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
      } else {
        query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), count ORDER BY s.adjDate DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
      }
      break;    
    case '2':
      if(req.body.order[0].dir === 'asc'){
        query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), count ORDER BY s.revs ASC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
      } else {
        query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), count ORDER BY s.revs DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
      }
      break;
    case '4':
      if(req.body.order[0].dir === 'asc'){
        query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), count ORDER BY s.updated ASC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
      } else {
        query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), count ORDER BY s.updated DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
      }
      break;
    default :
      query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), count ORDER BY s.updated DESC, s.uuid DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";
      break;
  }

  params = {skip : req.body.start, limit : req.body.length};

  session.run(query, params).then(data => {
      session.close();     
      var recordsTotal = 0;
      var recordsFiltered = 0;
      
      if (data.records.length > 0) {
          recordsTotal = parseInt(data.records[0]._fields[4]);
          recordsFiltered = recordsTotal;
      }
      
      return res.json({
          recordsTotal: recordsTotal, 
          recordsFiltered: recordsFiltered, 
          records: data.records
      });
  });
});

function decodeEntities(encodedString) {
    var translate_re = /&(nbsp|amp|quot|lt|gt);/g;
    var translate = {
        "nbsp":" ",
        "amp" : "&",
        "quot": "\"",
        "lt"  : "<",
        "gt"  : ">"
    };
    return encodedString.replace(translate_re, function(match, entity) {
        return translate[entity];
    }).replace(/&#(\d+);/gi, function(match, numStr) {
        var num = parseInt(numStr, 10);
        return String.fromCharCode(num);
    });
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? decodeEntities(decodeEntities(word.toLowerCase())) : decodeEntities(decodeEntities(word.toUpperCase()));
  }).replace(/\s+/g, '');
}

app.post("/rev/:infoHash", check("infoHash").trim().escape().not().isEmpty(), function(req,res){
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ errors: errors.array() });
    }
    const session = driver.session();

    var query = "MATCH (t:Torrent{infoHash:$infoHash}) " + 
                "SET t.revs = toFloat(t.revs + 1) " +
                "WITH t " + 
                "OPTIONAL MATCH (p:Publisher)<-[:PUBLISHED_BY]-(e:Edition)-[:DIST_AS]->(t) " +
                "SET e.revs = toFloat(e.revs + 1), p.revs = toFloat(p.revs + 1) " +
                "WITH t, e " +
                "MATCH (s:Source)-[:PUB_AS]->(e) " +
                "SET s.revs = toFloat(s.revs + 1) " +
                "SET s.lastSnatched = DATETIME() " +
                "WITH s, t, e " +
                "OPTIONAL MATCH (c:Class)-[:TAGS]-(s) " +
                "SET c.revs = toFloat(c.revs + 1), c.updated = DATETIME() " +
                "WITH s,t " +
                "OPTIONAL MATCH (a:Author)-[:AUTHOR]->(s) " +
                "SET a.revs = toFloat(a.revs +1) " +
                "WITH t, s " +
                "SET s.count = s.count + 1";

    var params = {infoHash: req.params.infoHash};

    session.run(query,params).then(async data => {
      session.close();
      return res.end();
    });
});

var top10Query = "WITH s, count ORDER BY s.revs DESC LIMIT 250 " +
    "OPTIONAL MATCH (a:Author)-[]->(s)-[]-(e:Edition)-[]-(t:Torrent) WHERE t.deleted = false " + 
    "WITH s, a, count " +  
    "OPTIONAL MATCH (p:Publisher)<-[:PUBLISHED_BY]-(e:Edition)<-[:PUB_AS]-(s) " +
    "WITH s, a, count " +
    "OPTIONAL MATCH (s)-[:PUB_AS]->(e:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false " +
    "OPTIONAL MATCH (e)-[:PUBLISHED_BY]->(p:Publisher) " +
    "WITH s, a, e, t, p, count " +  
    "OPTIONAL MATCH (c:Class)-[:TAGS]->(s) " +
    "WITH s, a, collect(DISTINCT CASE WHEN e IS NOT NULL AND t IS NOT NULL THEN {publisher: p, edition: e, torrent: t} END) AS raw_editions, c, count " +
    "WITH s, a, [x IN raw_editions WHERE x IS NOT NULL] AS edition_torrents, c, count ";

app.post("/top10/:time", check("time").trim().escape(), async function(req,res){
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ errors: errors.array() });
    }
    const session = driver.session();

    var params = {limit : req.body.length, skip : req.body.start};

    switch(req.params.time){
      case "day": params.time = "P1D"; break;
      case "week": params.time = "P7D"; break;
      case "month": params.time = "P30D"; break;
      case "year": params.time = "P365D"; break;
      case "alltime": params.time = "P99Y"; break;
    }

    var query = "WITH DATETIME() - duration($time) AS threshold " +
                "MATCH (t:Torrent)<-[]-(e:Edition)<-[]-(s:Source) WHERE t.deleted = false AND t.revs > TOFLOAT(0) " + 
                "AND s.top10 > threshold " + 
                "WITH s LIMIT 250 " +
                "WITH count(DISTINCT s) AS count " +
                "WITH DATETIME() - duration($time) AS threshold, count " + 
                "MATCH (t:Torrent)<-[]-(e:Edition)<-[]-(s:Source) WHERE t.deleted = false AND t.revs > TOFLOAT(0) " + 
                "AND s.top10 > threshold ";

    query += top10Query;
    query += "WITH s, a, edition_torrents, c, count ";
    query += "RETURN s, collect(DISTINCT a), edition_torrents, collect(DISTINCT c), TOFLOAT(count) ORDER BY s.revs DESC SKIP TOINTEGER($skip) LIMIT TOINTEGER($limit) ";

    session.run(query,params).then(async data => {
      session.close();
      var total = 0;
      if(data.records.length > 0){
          total = data.records[0]._fields[4];
      }
      return res.json({recordsTotal : total, recordsFiltered : total, records: data.records});
    });
});

app.post("/create_author", check("name").trim().escape().not().isEmpty().isLength({max : 256}), function(req,res){
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ errors: errors.array() });
    }
    const session = driver.session();
    var searchableDecoded = he.decode(req.body.name);
    var searchable = he.encode(searchableDecoded.split(",")[0]);
    session.run('MERGE (a:Author {name : $authorName, searchable : $searchable, revs : toFloat(0)}) ' +
    'ON CREATE SET a.uuid = randomUUID() ' +
    'RETURN a.uuid AS uuid, a.name AS name' ,{authorName : he.encode(req.body.name), searchable : searchable}).then(data => {
        session.close();
        return res.json({uuid : data.records[0].get('uuid'), name : data.records[0].get('name')});
    });    
});

app.post("/add_author", check("name").trim().escape().not().isEmpty().isLength({max : 256}), function(req,res){
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ errors: errors.array() });
    }
    const session = driver.session();
    session.run('MATCH (a:Author {name : $authorName}) ' +
      'RETURN a.uuid AS uuid, a.name AS name', {authorName : he.decode(req.body.name)}).then(data => {
        session.close();
        if(data.records[0]){
          return res.json({uuid : data.records[0].get('uuid'), name : data.records[0].get('name')});
        } else {
          return res.json({});
        }
      });  
});

app.get("/upload/:uuid", check("uuid").trim().escape().isLength({max:256}), function(req,res){
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ errors: errors.array() });
  }
  const session = driver.session();

  var query = '';
  var params = {};

  query += "MATCH (s:Source {uuid : $uniqueID}) " +
  "WITH s " +
  "OPTIONAL MATCH (a:Author)-[]->(s) " +
  "WITH s, a " +
  "OPTIONAL MATCH (c:Class)-[]->(s) " +
  "WITH s, a, c " +
  "MATCH (e:Edition)<-[:PUB_AS]-(s) " +
  "OPTIONAL MATCH (p:Publisher)<-[:PUBLISHED_BY]-(e) " +
  "WITH s,p,a,e,c, {title : e.title, date: e.date, pages : e.pages, img: e.img, uuid: e.uuid, publisher: p.name} AS edition " +
  "OPTIONAL MATCH (t:Torrent)<-[:DIST_AS]-(e) " +
  "RETURN s.name AS title, COLLECT(DISTINCT {uuid: a.uuid, name : a.name}) AS author, COLLECT(DISTINCT c.name) AS classes, s.date AS date, " +
  "collect(DISTINCT edition) AS editions, COLLECT(DISTINCT t) AS torrents, s.genus AS genus";

  params["uniqueID"] = req.params.uuid;

  session.run(query , params).then(data => {
    session.close();
    return res.json({record : data.records[0], captcha: res.recaptcha, atlsd: req.user ? req.user.atlsd : ""});
  });
});

app.post("/upload/:uuid", check("APA").trim().escape(), check("genus").trim().escape(), 
  check("edition_no").trim().escape().isLength({max: 256}), check("edition_pages").trim().escape().isLength({max :256}), 
  check("edition_publisher").trim().escape().isLength({max:256}), 
  check("uuid").trim().escape().isLength({max:256}), check("edition_date").trim().escape().isLength({max:256}), 
  check("date").trim().escape().isLength({max:256}), check("classes").trim().escape().toLowerCase().isLength({max:3000}), 
  check("torrent").trim().escape(),
  check("edition_title").trim().escape().isLength({max:256}), check("authors").trim().escape().isLength({max : 9000}), 
  check("edition_uuid").trim().escape(),
  check("title").trim().escape().not().isEmpty().isLength({max : 256}), async function(req,res){
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ errors: errors.array() });
    }

    if(req.body.authors){
      var authors = JSON.parse(he.decode(req.body.authors));
    }

    var torrent = JSON.parse(he.decode(req.body.torrent));

    if(!torrent.infoHash){
        return res.json({errors : [{msg: "No infoHash found, please upload a legal file!"}]});
    }

    if(req.params.uuid === "undefined" && torrent && !torrent.infoHash){
      return res.json({errors : [{msg : "You must upload a torrent file."}]});
    }

    const session = driver.session();
    var query = '';
    var params = {};

    var edition = req.body.edition_title.length === 0 ? "" : req.body.edition_title;
    var classes = JSON.parse(he.decode(req.body.classes));
    if(classes[0] === ['']){
      classes = [];
    } else {
      for (var i = 0; i < classes.length; i++) {
       classes[i] = he.encode(classes[i].trim());
      }  
    }

    var date = req.body.date;
    var adjDate = 0;

    if(date){
       if(date.indexOf("B.C.") > -1 || date.indexOf("BC") > -1 || date.indexOf("BCE") > -1 || date.indexOf("B.C.E.") > -1 ){
        if(date.indexOf("Century") === -1 && date.indexOf("century") === -1){
          if(date.indexOf("-") > -1){
            adjDate = date.substring(0, date.indexOf("-"));
          }
          adjDate = date.replace(/\D/g, "");
          adjDate = (parseFloat(adjDate) * -1) * 100;
        } else {
          if(date.indexOf("-") > -1){
            adjDate = date.substring(0, date.indexOf("-"));
          }
          adjDate = date.replace(/\D/g, "");
          adjDate = parseFloat(adjDate) * -1;
        }
      } else if(date.indexOf("Century") === -1 || date.indexOf("century") === -1){
        if(date.indexOf("-") > -1){
            adjDate = date.substring(0, date.indexOf("-"));
        }
        adjDate = date.replace(/\D/g, "");
        adjDate = parseFloat(adjDate);
      } else {
        if(date.indexOf("-") > -1){
            adjDate = date.substring(0, date.indexOf("-"));
        }
        adjDate = date.replace(/\D/g, "");
        let parsed = parseFloat(adjDate);
        if (!isNaN(parsed)) {
            adjDate = parsed * 100;
        }
      }
    }

    if(req.params.uuid === "undefined"){
      async function newUpload(){
          query += 'MERGE (s:Source {name : $sourceTitle, revs: toFloat(0), top10: DATETIME(), count : 0, ' +
          'genus: $sourceGenus, date: $sourceDate, adjDate : $adjDate, uuid : randomUUID(), updated : toFloat(TIMESTAMP()), ' +
          'created_at: toFloat(TIMESTAMP())}) ' +
          'FOREACH( ' + 
            'class IN $classes | MERGE (c:Class {name : class}) ' +
            'ON CREATE SET c.uuid = randomUUID(), c.revs = toFloat(0) ' +
            'MERGE (s)<-[:TAGS]-(c) ' + 
          ') ' +
          'MERGE (e:Edition {title : $editionTitle, revs: toFloat(0), publisher: $editionPublisher, uuid : randomUUID()})<-[:PUB_AS]-(s) ' +
          'SET e.pages = $editionPages, e.no = $editionNo, e.date = $editionDate, e.img = $editionIMG, e.created_at = toFloat(TIMESTAMP()) ';     
          
          if(req.body.edition_publisher){
               query += 'MERGE (p:Publisher {name : $editionPublisher}) ' +
              'ON CREATE SET p.uuid = randomUUID(), p.revs = TOFLOAT(0) ' +
              'MERGE (p)<-[:PUBLISHED_BY]-(e) ';
          }
          
          query += 'CREATE (t:Torrent {size : $size, res: $res, infoHash: $infoHash, media : $media, species: $species})<-[:DIST_AS]-(e) ' +
          'SET t.revs = toFloat(0), t.uuid = randomUUID(), t.created_at = toFloat(TIMESTAMP()), t.deleted = false ';

          params["sourceTitle"] = he.encode(req.body.title);
          params["sourceDate"] = he.encode(req.body.date);
          params["adjDate"] = adjDate;
          params["editionTitle"] = he.encode(edition);
          params["editionIMG"] = req.body.edition_img ? he.encode(req.body.edition_img) : null;
          params["editionPublisher"] = he.encode(req.body.edition_publisher).toLowerCase();
          params["editionPages"] = he.encode(req.body.edition_pages);
          params["editionDate"] = he.encode(req.body.edition_date);
          params["editionNo"] = he.encode(req.body.edition_no);
          params["classes"] = classes;
          params["sourceGenus"] = he.encode(req.body.genus);
          params["size"] = torrent.size;
          params["infoHash"] = torrent.infoHash;
          params["media"] = torrent.media;
          params["species"] = torrent.species;
          params["res"] = torrent.res;

          if(authors && authors.length > 0){
            authors.forEach(function(author, i){  
               query += 'WITH s ' + 
              'OPTIONAL MATCH (a:Author {uuid : $authorUUID' + i + '}) ' +
              'WITH s, a ' + 
              'MERGE (s)<-[au:AUTHOR]-(a) ';
              params["authorUUID" + i] = author.uuid;
            });
          }
          query += 'RETURN s.uuid AS uuid ';

          session.run(query , params).then(async data => {
                session.close();
                return res.json({"uuid" : data.records[0]._fields[0]});
          }).catch(function(err){
            if(err.code === "Neo.ClientError.Schema.ConstraintValidationFailed"){
              err = "Torrent infoHash already exists on the site.";
            }
            return res.json({errors: [{msg : err}]});
          });
      }
      newUpload();
    } else {
      var edition_uuid = req.body.edition_uuid && req.body.edition_uuid !== "null" && req.body.edition_uuid !== "undefined" ? req.body.edition_uuid : null;
      params["edition_uuid"] = edition_uuid;

      if(torrent.infoHash){
            query += 'MATCH (s:Source {uuid : $uniqueID}) ' +
            "SET s.updated = toFloat(TIMESTAMP()), s.top10 = DATETIME() " +
            'WITH s ' +
            "MERGE (e:Edition {uuid: coalesce($edition_uuid, randomUUID())}) ";

            query += 'ON CREATE SET ' +
                     'e.uuid = randomUUID(), e.revs = 0.0, e.no = $editionNo, ' +
                     'e.date = $editionDate, e.created_at = TOFLOAT(TIMESTAMP()), ' +
                     'e.pages = $editionPages, e.title = $editionTitle, e.publisher = $editionPublisher ';              

            query += 'WITH s, e ';
            query += 'MERGE (s)-[pu:PUB_AS]->(e) ';
            if(req.body.edition_publisher){
                query += 'MERGE (p:Publisher {name : $editionPublisher}) ' +
                'ON CREATE SET p.uuid = randomUUID(), p.revs = TOFLOAT(0) ' +
                'MERGE (p)<-[:PUBLISHED_BY]-(e) ';
            }
            query += "WITH s, e MERGE (t:Torrent {revs: toFloat(0), created_at: toFloat(TIMESTAMP()), "+
            "deleted : false, uuid: randomUUID(), media : $torrentMedia, species: $torrentspecies, "+
            "res : $torrentRes, size: $torrentSize, infoHash: $torrentInfoHash" +
            "})<-[di:DIST_AS]-(e) "; 
      }

      params["uniqueID"] = req.params.uuid;
      params["classes"] = classes;
      params["sourceTitle"] = he.encode(req.body.title);
      params["sourceDate"] = he.encode(req.body.date);
      params["editionPublisher"] = he.encode(req.body.edition_publisher).toLowerCase();
      params["editionPages"] = he.encode(req.body.edition_pages);
      params["editionDate"] = he.encode(req.body.edition_date);
      params["editionTitle"] = he.encode(req.body.edition_title);
      params["editionNo"] = he.encode(req.body.edition_no);
      params["torrentInfoHash"] = torrent.infoHash;
      params["torrentMedia"] = torrent.media; 
      params['torrentspecies'] = torrent.species; 
      params["torrentRes"] = torrent.res;
      params["torrentSize"] = torrent.size;
      params["sourceGenus"] = he.encode(req.body.genus);

      query += 'RETURN s.uuid AS uuid, t.infoHash AS infoHash ';
      session.run(query , params).then(async data => {
            session.close();
            return res.json({"uuid" : data.records[0].get("uuid")});
      }).catch(function(err){
        if(err.code === "Neo.ClientError.Schema.ConstraintValidationFailed"){
          err = "Torrent infoHash already exists on the site.";
        }
        return res.json({errors: [{msg : err}]});
      });
    }
});

app.get('/procWeltgeist', async (req, res) => {
    try {
        const response = await fetch('https://lfdr.de/qrng_api/qrng?length=4&format=HEX');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data.qrn) return res.status(500).json({ error: 'Invalid response from QRNG service' });
        const intVal = parseInt(data.qrn, 16);
        const randomFloat = intVal / 4294967296;
        res.json({ value: randomFloat });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate quantum entropy' });
    }
});

app.get('*', function(req, res, next) {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

// Conditionally start listener for local development, or export app for Vercel
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server started at http://localhost:${PORT}`);
    });
}

export default app;