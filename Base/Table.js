const TableBase = {
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

export default TableBase;