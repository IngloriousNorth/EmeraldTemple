export default {
  // 1. Source-based recommendation (Original)
   warp: function(driver, uuid, propositional_content, cb){
    var query = ""
    
    const sentinel = `
      UNWIND $notion AS hName
      MATCH (h:Hieroglyph {name : hName})<-[:CB_SCRIBE]-(c:Class)
      MATCH (c)-[:TAGS]->(s:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]-(t:Torrent) WHERE t.deleted = false
      
      WITH c, collect(DISTINCT s) AS allSources

      with c, size(allSources) AS localFrequency
      ORDER BY localFrequency DESC
      LIMIT 1

      MATCH (c)-[:TAGS]->(s:Source)
    `

    const weltgeist = `
          // 1. Unwind obelisk hieroglyphs and match valid sources and their classes
          UNWIND $notion AS hName
          MATCH (h:Hieroglyph {name: hName})<-[:CB_SCRIBE]-(s:Source)
          MATCH (s)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(t:Torrent) WHERE t.deleted = false
          MATCH (s)<-[:TAGS]-(c:Class)
          
          // 2. Group by class and collect unique sources, then cap at 5 sources per class
          WITH s, collect(DISTINCT c) AS allClasses
          
          // 3. Count the capped frequency, order descending, and take the top 1
          WITH s, size(allClasses) AS localFrequency
          ORDER BY localFrequency DESC
          LIMIT 1
          
          // 4. Traverse from winning class to connected nodes and verify active torrents safely
          MATCH (s)<-[:TAGS]-(c:Class)`
      

      
      if(propositional_content.length >= 7){
        query += weltgeist;
      }
      else{
        query += sentinel;
      }

      query += `-[:CB_SCRIBE]->(h:Hieroglyph)<-[:CB_SCRIBE]-(c2:Class)-[:CB_SCRIBE]->(h2:Hieroglyph)<-[:CB_SCRIBE]-(n2)
      WHERE (n2:Source OR n2:Author OR n2:Class OR n2:Publisher) 
            AND c <> n2
            
          // Bounded schema-aware check: ensures n connects to a valid, non-deleted torrent 
          // without triggering a global graph explosion.
          
        AND (
            (n2:Source AND (n2)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(:Torrent {deleted: false}))
            OR 
            (n2:Class AND (n2)-[:TAGS]->(:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(:Torrent {deleted: false}))
            OR 
            (n2:Author AND (n2)-[:AUTHOR]->(:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(:Torrent {deleted: false}))
            OR 
            (n2:Publisher AND (n2)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(:Torrent{deleted : false}))
        )
          
          WITH n2, count(DISTINCT h2) AS glyphCount
          ORDER BY glyphCount DESC 
          LIMIT 256 
          
          RETURN n2
      `;
    

    const session = driver.session();
    session.run(query, { notion : propositional_content })
        .then(data => {
          console.log(data.records[0])
            session.close();
            if(!data.records[0])
              this.mahoo(driver, cb);
            else
              cb(data);
        })
        .catch(err => {
            session.close();
            console.error("Neo4j Recommend Source Error:", err);
        });
  },
  mahoo : function(driver, cb){
    const session = driver.session();
    const query = `MATCH (n:Source|Author|Class|Publisher) WHERE (n:Source AND (n)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(:Torrent {deleted: false}))
            OR 
            (n:Class AND (n)-[:TAGS]->(:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(:Torrent {deleted: false}))
            OR 
            (n:Author AND (n)-[:AUTHOR]->(:Source)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(:Torrent {deleted: false}))
            OR 
            (n:Publisher AND (n)-[:PUB_AS]->(:Edition)-[:DIST_AS]->(:Torrent{deleted : false}))
        RETURN n ORDER BY rand() LIMIT 1 `
    session.run(query, {}).then(data=>{
      cb(data);
    })
  }
}
