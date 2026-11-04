const TorrentsBase = {
    tableData: [],
    dtRecs: [],
    refresh: function() {
        this.dtRecs = [];
    },
    put: function(data) {
        this.tableData = data;
    },
    putRow: function(row) {
        this.dtRecs.unshift(row);
    }
};

window.MVC = window.MVC || {};
window.MVC.Base = window.MVC.Base || {};
window.MVC.Base.Torrents = TorrentsBase;

export default TorrentsBase;