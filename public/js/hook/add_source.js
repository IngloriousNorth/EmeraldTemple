$(document).off("click", "#add_source_btn").on("click", "#add_source_btn", function(e) {
    e.preventDefault();

    const apa = $("#add_source_apa").val().trim();
    const url = $("#add_source").val().trim();

    if (!apa || !url) {
        alert("Please provide both an APA citation and a File URL.");
        return;
    }

    // Send both inputs to the server
    $.post("/add_source", { apa, url }, function(response) {
        console.log("Server response success:", response);
        
        // Clear fields on success
        $("#add_source_apa").val("");
        $("#add_source").val("");

        // Re-initialize the current table
        initializeTorrents(TEMPEST.pageREC(), function() {
            $("h2 span a").text("Torrents").css("color", "#000").hide().fadeIn(2000);
        });
    }).fail(function(err) {
        console.error("Failed to add source:", err);
        alert(err.responseJSON?.error || "Failed to add source. Check console.");
    });
});