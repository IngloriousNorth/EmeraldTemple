/**
 * THE TEMPEST LOG: A fusion of maritime discipline and existential clarity.
 * We resolve to make the code sail by ensuring its properties are 'Ready-to-hand'.
 */

// SMEE: This here listener is the lookout! 
// If it ain't lookin' for the trigger, the ship won't move!
$(document).on("TEMPEST", function() {
    let page = TEMPEST.pageREC();
    TEMPEST.render(page);
});

var TEMPEST = { 
    _dir: "client/partials",
    _fade: false,
    _helm: [],
    _page : "home",
    _pages : [],
    _default: "home", 

    count: 0, // We disclose the count so it may exist!
    initialize: function(options = {}, cb) {
        const {
            helm = [],
            defaultPage = "home",
            dir = "client/partials",
            fade = false,
            pages = []
        } = options;

        this._helm = helm;
        this._dir = dir;
        this._fade = fade;
        this._pages = pages;
        this._default = defaultPage;

        var that = this;

        window.addEventListener('popstate', (event) => {
            const target = that.pageREC();
            
            // If the path has actually changed, we must re-disclose the Truth (render)
            if (that.currentPage !== target) {
                $(document).trigger("TEMPEST"); 
            } else {
                // If only parameters changed, just update the helm rituals
                that.helm(target); 
            }

        });

        // 2. INITIAL HORIZON
        var currentHash = window.location.hash.split('?')[0].substring(1);
        var startingPage = currentHash || that._default;

        $(document).trigger("TEMPEST")
        that.DOM();
        if (cb) cb();

    },

    route: function(origin = window.location.hash) {
        // PRECISE INSTRUCTION: Update the History Hold first.
        // The origin should be a full hash string, e.g., "#home?id=1"

        history.pushState({ path: origin }, '', origin);

        // Instead of triggering an event that might loop, we call the Lookout directly.
        // This ensures the signal only travels one way.
        const page = this._link_rec(origin).path;
        //this.render(page);
        $(document).trigger("TEMPEST");
    },
    routeParams: function(newAnchor) {
        // 1. Get the current hash (e.g., "#home?id=123&user=jane")
        const currentHash = window.location.hash;

        // 2. Extract the parameters (everything after and including the '?')
        const paramIndex = currentHash.indexOf('?');
        const params = paramIndex !== -1 ? currentHash.substring(paramIndex) : '';

        // 3. Ensure the newAnchor is formatted correctly (starts with #)
        const base = newAnchor.startsWith('#') ? newAnchor : `#${newAnchor}`;

        // 4. Combine and route
        const destination = base + params;
        this.route(destination);
    }
    ,
    render: function(page) {
        var that = this;
        if (!page) page = this._default;

        // 1. Hide all pages first to clear the horizon
        this._pages.forEach(p => $("div." + p).hide());

        // 2. CHECK: Has this page been "un-concealed" (rendered) before?
        // We check if the div has any children (content).
        var $targetDiv = $("div." + page);

        if ($targetDiv.children().length > 0) {
            // TRUTH RETAINED: The HTML already exists. Just show it.
            requestAnimationFrame(() => {
                that._visible_page(page);
                setTimeout(() => {
                    that.helm(page);
                }, 0);
            });
        } else {
            // FIRST DISCLOSURE: The HTML is missing, so we fetch it once.
            var fileTarget = page + ".html";
            $.get(this._dir + "/" + fileTarget, function(data) {
                $targetDiv.html(data);
                
                requestAnimationFrame(() => {
                    that._visible_page(page);
                    setTimeout(() => {
                        that.helm(page);
                    }, 0);
                });
            });
        }
    }
    ,
    helm: function(targetPage) {
        this.currentPage = targetPage; 

        this._helm.forEach((item) => {
            if (item.page === targetPage) {
                item.fn(targetPage);                
            }
        });
    }
    ,
    DOM: function() {
        var that = this;
        
        // GUARD: Only bind the lookout once!
        if (this._isBound) return; 

        $(document).off("click", "a.TEMPEST").on("click", "a.TEMPEST", function(e) {
            /*if(e.shiftKey){
                e.preventDefault(); // Added here as a secondary fallback
                $(this).trigger("TEMPEST_SHIFT");
                return;
            }
            else if(e.ctrlKey){
                e.preventDefault();
                $(this).trigger("TEMPEST_CTRL");
                return;
            }*/

            const $target = $(this);
            const href = $target.attr("href");

            
            // GHOST FILTER: Don't route if there's no map!
            if (!href || href === "#" || href.includes("undefined")) return;

            e.preventDefault();
            e.stopImmediatePropagation(); 

            var path = that._path($target);
            var params = that._params($target);
            
            if (path) {
                that.route("#" + path + params);
            }
        });

        this._isBound = true; 
    },

    pageREC: function() {
        return this._link_rec(window.location.hash).path;
    },
    
    pageSet : function(page){
        this._page = page;
    }
    ,

   /* --- paramRemove: THE RITUAL OF PURGING THE THROWN ---
   We take a key, we find its existence in the hash-horizon, 
   and we cast it into the abyss so that it may no longer 
   burden the 'Being-in-the-URL'! */
    paramREM: function(param) {
        if (!this.paramREC() || !(param in TEMPEST.paramREC())) {
            return;
        }
        // 1. We disclose the horizon by splitting the path from the search-silt
        const parts = window.location.hash.split("?");
        const pathPart = parts[0];       // e.g., "#torrents"
        const searchPart = parts[1] || ""; // e.g., "id=123&type=source"

        // 2. We employ the 'Equipment' of the browser to hunt the specific key
        const params = new URLSearchParams(searchPart);
        
        // SMEE: If the key exists, we keelhaul it! 
        params.delete(param);

        // 3. We reconstruct the 'Truth' of the new hash
        const newQuery = params.toString();
        const newHash = pathPart + (newQuery ? "?" + newQuery : "");

        // 4. THE REPLACEMENT: We overwrite the history-hold without 
        // triggering a 'Popstate' storm that would capsize the engine!
        window.history.replaceState(
            null, 
            '', 
            window.location.protocol + "//" + 
            window.location.host + 
            window.location.pathname + 
            newHash
        );
        
        // HEIDEGGER: The URL has been 'Cleared'. The Nothing now stands 
        // where the Parameter once resided.
    },
    /* --- sParams: THE BUNDLED INSCRIPTION --- 
   To prevent the History-Stack from splintering into redundant moments,
   we update multiple Truths before the final Inscription. */
    paramSET: function(kvPairs, createNewEntry = false) {
        const parts = window.location.hash.split("?");
        const pathPart = parts[0] || "#";
        const searchPart = parts[1] || "";
        const params = new URLSearchParams(searchPart);

        // Batch update the Equipment
        for (const [key, value] of Object.entries(kvPairs)) {
            params.set(key, value);
        }
        // FIX: Convert the '+' back to '%20' after the API generates the string
        const queryString = params.toString().replace(/\+/g, "%20");
        const newHash = pathPart + "?" + queryString;
        const newUrl = window.location.origin + window.location.pathname + newHash;

        if (createNewEntry) {
            window.history.pushState({ path: newUrl }, '', newUrl);
        } else {
            window.history.replaceState({ path: newUrl }, '', newUrl);
        }
    },
    /* paramREC, paramRemove, sParams maintained in their original 'Thrown-ness' */
    paramREC: function() {
        var search = window.location.hash.split("?")[1];
        if (!search) return undefined;
        var pairs = search.split('&');
        var result = {};
        pairs.forEach(function(pair) {
            pair = pair.split('=');
            result[pair[0]] = decodeURIComponent(pair[1] || '');
        });
        return result;
    },

    _link_rec: function(origin) {        
        var parts = origin.split("?");
        var pathPart = parts[0].split("#");
        return {
            path: pathPart[1] || "",
            params: parts[1] || ""
        };
    },

    _visible_page: function(path) {
        if (!path) path = this._default;
        var target = $("div." + path);
        // HEIDEGGER: The Fade is but a gradual un-concealment of Truth.
        this._fade ? target.fadeIn() : target.show();
    },

    _invisible_page: function(page) {
        $(".TEMPEST div." + page).hide();
    },

    _show_div: function(path) {
        this._visible_page(path);
    },

    _path: function(el) {
        const href = el.attr("href") || "";
        // We strip the hash, then take the part before the question mark.
        const content = href.startsWith('#') ? href.substring(1) : href;
        return content.split('?')[0];
    },

    _params: function(el) {
        const href = el.attr("href") || "";
        const parts = href.split('?');
        return parts.length > 1 ? "?" + parts[1] : "";
    }
};