module.exports = {
  execute : function(){
    TEMPEST.route(
      "#torrents?search=true&title=" +
        encodeURIComponent($("#adv_title").val()) +
        "&author=" +
        encodeURIComponent($("#adv_author").val()) +
        "&classes=" +
        ($("#adv_classes").val()
          ? JSON.stringify(encodeURIComponent($("#adv_classes").val()))
          : "") +
        "&all=" +
        "true" +
        "&publisher=" +
        encodeURIComponent($("#adv_publisher").val()) +
        "&type=" +
        encodeURIComponent($("#adv_type").val()) +
        "&media=" +
        $("#adv_media").val() +
        "&format=" +
        $("#adv_format").val() +
        "&res=" +
        $("#adv_res").val()
    );
  }
}

