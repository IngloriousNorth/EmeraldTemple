/**
 * THE TEMPEST LOG: A fusion of maritime discipline and existential clarity.
 * We resolve to make the code sail by ensuring its properties are 'Ready-to-hand'.
 */

var TEMPEST = { 
    _dir: "fragment",
    _fade: false,
    _helm: [],
    _page : "home",
    _pages : [],
    _default: "home", 
    _prefix: "",
    _windows: new Map(), // Active jQuery-UI $window registry ($window.let state binding)

    count: 0,
    initialize: function(options = {}, cb) {
        const {
            helm = [],
            defaultPage = "home",
            dir = "fragment",
            fade = false,
            pages = [],
            prefix = ""
        } = options;

        this._helm = helm;
        this._dir = dir;
        this._fade = fade;
        this._pages = pages;
        this._default = defaultPage;
        this._prefix = prefix;

        var that = this;

        window.addEventListener('popstate', (event) => {
            const target = that.pageREC();
            
            if (that.currentPage !== target) {
                document.dispatchEvent(new CustomEvent("TEMPEST")); 
            } else {
                that.helm(target); 
            }
        });

        var currentHash = window.location.hash.trim();
        var startingRoute = currentHash ? currentHash : ('#' + that._default);

        history.replaceState({ path: window.location.href }, '', startingRoute);

        document.dispatchEvent(new CustomEvent("TEMPEST"));
        that.DOM();
        if (cb) cb();
    },

    route: function(origin = window.location.hash, waltz = 'TEMPEST') {
        history.pushState({ path: origin }, '', origin);
        const page = this._link_rec(origin).path;
        document.dispatchEvent(new CustomEvent(waltz));
    },

    routeParams: function(newAnchor) {
        const currentHash = window.location.hash;
        const paramIndex = currentHash.indexOf('?');
        const params = paramIndex !== -1 ? currentHash.substring(paramIndex) : '';
        const base = newAnchor.startsWith('#') ? newAnchor : `#${newAnchor}`;
        const destination = base + params;
        this.route(destination);
    },

    // TEMPEST-Compliant jQuery-UI $window Viewport Manager
    spawnWindow: function(windowId, title, options = {}) {
        if (this._windows.has(windowId)) {
            const existing = this._windows.get(windowId);
            existing.dialog('moveToTop');
            return existing;
        }

        const $container = $(`<div id="win-${windowId}" title="${title}"></div>`).appendTo('body');
        
        const defaultOptions = {
            width: options.width || 700,
            height: options.height || 450,
            resize: (event, ui) => {
                if (window.activeDataTable) {
                    window.activeDataTable.columns.adjust().responsive.recalc();
                }
            },
            close: () => {
                this._windows.delete(windowId);
                this.waltzPublish(`window:closed:${windowId}`, null);
                $container.dialog('destroy').remove();
            }
        };

        const $win = $container.dialog(Object.assign(defaultOptions, options));
        this._windows.set(windowId, $win);
        this.waltzPublish(`window:spawned:${windowId}`, $win);
        return $win;
    },

    render: function(page) {
        var that = this;
        if (!page) page = this._default;

        this._pages.forEach(p => {
            document.querySelectorAll("div." + p).forEach(el => el.style.display = 'none');
        });

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
            fetch(this._prefix + this._dir + "/" + fileTarget)
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

    waltzPublish: function(event, data) {
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    },

    pageSet: function(page) {
        this._page = page;
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