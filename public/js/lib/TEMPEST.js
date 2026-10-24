/**
 * THE TEMPEST LOG: A fusion of maritime discipline and existential clarity.
 * We resolve to make the code sail by ensuring its properties are 'Ready-to-hand'.
 */

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
            
            if (that.currentPage !== target) {
                document.dispatchEvent(new CustomEvent("TEMPEST")); 
            } else {
                that.helm(target); 
            }
        });

        var currentHash = window.location.hash.split('?')[0].substring(1);
        var startingPage = currentHash || that._default;

        document.dispatchEvent(new CustomEvent("TEMPEST"));
        that.DOM();
        if (cb) cb();
    },

    route: function(origin = window.location.hash) {
        history.pushState({ path: origin }, '', origin);
        const page = this._link_rec(origin).path;
        document.dispatchEvent(new CustomEvent("TEMPEST"));
    },

    routeParams: function(newAnchor) {
        const currentHash = window.location.hash;
        const paramIndex = currentHash.indexOf('?');
        const params = paramIndex !== -1 ? currentHash.substring(paramIndex) : '';
        const base = newAnchor.startsWith('#') ? newAnchor : `#${newAnchor}`;
        const destination = base + params;
        this.route(destination);
    },

    render: function(page) {
        var that = this;
        if (!page) page = this._default;

        // 1. Hide all pages first to clear the horizon
        this._pages.forEach(p => {
            document.querySelectorAll("div." + p).forEach(el => el.style.display = 'none');
        });

        // 2. CHECK: Has this page been rendered before?
        var targetDivs = document.querySelectorAll("div." + page);
        if (targetDivs.length === 0) return;

        var targetDiv = targetDivs[0];

        if (targetDiv.children.length > 0) {
            requestAnimationFrame(() => {
                that._visible_page(page);
                setTimeout(() => {
                    that.helm(page);
                }, 0);
            });
        } else {
            var fileTarget = page + ".html";
            fetch(this._dir + "/" + fileTarget)
                .then(response => response.text())
                .then(data => {
                    targetDiv.innerHTML = data;
                    
                    requestAnimationFrame(() => {
                        that._visible_page(page);
                        setTimeout(() => {
                            that.helm(page);
                        }, 0);
                    });
                })
                .catch(err => console.error("TEMPEST render error:", err));
        }
    },

    helm: function(targetPage) {
        this.currentPage = targetPage; 

        this._helm.forEach((item) => {
            if (item.page === targetPage) {
                item.fn(targetPage);                
            }
        });
    },

    DOM: function() {
        var that = this;
        
        if (this._isBound) return; 

        document.addEventListener("click", function(e) {
            const target = e.target.closest("a.TEMPEST");
            if (!target) return;

            const href = target.getAttribute("href");
            
            if (!href || href === "#" || href.includes("undefined")) return;

            e.preventDefault();
            e.stopImmediatePropagation(); 

            var path = that._path(target);
            var params = that._params(target);
            
            if (path) {
                that.route("#" + path + params);
            }
        });

        this._isBound = true; 
    },

    pageSet: function(page) {
        this._page = page;
    },

    paramREM: function(param) {
        if (!this.paramREC() || !(param in this.paramREC())) {
            return;
        }
        const parts = window.location.hash.split("?");
        const pathPart = parts[0];       
        const searchPart = parts[1] || ""; 

        const params = new URLSearchParams(searchPart);
        params.delete(param);

        const newQuery = params.toString();
        const newHash = pathPart + (newQuery ? "?" + newQuery : "");

        window.history.replaceState(
            null, 
            '', 
            window.location.protocol + "//" + 
            window.location.host + 
            window.location.pathname + 
            newHash
        );
    },

    paramSET: function(kvPairs, createNewEntry = false) {
        const parts = window.location.hash.split("?");
        const pathPart = parts[0] || "#";
        const searchPart = parts[1] || "";
        const params = new URLSearchParams(searchPart);

        for (const [key, value] of Object.entries(kvPairs)) {
            params.set(key, value);
        }
        const queryString = params.toString().replace(/\+/g, "%20");
        const newHash = pathPart + "?" + queryString;
        const newUrl = window.location.origin + window.location.pathname + newHash;

        if (createNewEntry) {
            window.history.pushState({ path: newUrl }, '', newUrl);
        } else {
            window.history.replaceState({ path: newUrl }, '', newUrl);
        }
    },

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

    pageREC: function() {
        return this._link_rec(window.location.hash).path;
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
        document.querySelectorAll("div." + path).forEach(target => {
            if (this._fade) {
                target.style.opacity = 0;
                target.style.display = 'block';
                let opacity = 0;
                let timer = setInterval(function() {
                    if (opacity >= 1) {
                        clearInterval(timer);
                    }
                    target.style.opacity = opacity;
                    opacity += 0.1;
                }, 20);
            } else {
                target.style.display = 'block';
            }
        });
    },

    _invisible_page: function(page) {
        document.querySelectorAll("div." + page).forEach(el => el.style.display = 'none');
    },

    _show_div: function(path) {
        this._visible_page(path);
    },

    _path: function(el) {
        const href = el.getAttribute("href") || "";
        const content = href.startsWith('#') ? href.substring(1) : href;
        return content.split('?')[0];
    },

    _params: function(el) {
        const href = el.getAttribute("href") || "";
        const parts = href.split('?');
        return parts.length > 1 ? "?" + parts[1] : "";
    }
};

document.addEventListener("TEMPEST", function() {
    let page = TEMPEST.pageREC();
    TEMPEST.render(page);
});

export default TEMPEST;