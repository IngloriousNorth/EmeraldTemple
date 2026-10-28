// In your Model definition (e.g., inside MAINFRAME or Model base)
module.exports = {
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