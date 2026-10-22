function headerAutocomplete(){
    $(document).keyup(function(e) {
        if (e.key === "Escape") {
            $(".autosuggestBox").hide();
        }
    });

    $(document).mouseup(function(e) {
        var container = $(".autosuggestBox");
        if (!container.is(e.target) && container.has(e.target).length === 0) {
            container.hide();
        }
    });

    $(".search_sources_input, .search_authors_input, .search_classes_input, .search_publishers_input").on("focus", function() {
        var val = $(this).val();
        if (val.length > 0) {
            $(this).autocomplete("search", val.split(",").pop().trim());
        }
    });

    // --- SOURCES (black) ---
    $(".search_sources_input").each(function() {
        var instance = $(this).autocomplete({
            scroll: true,
            source: function( request, response ) {
                $.ajax({
                    data: { term: request.term },
                    url: '/search?field=search_sources',
                    type: "get",
                    success: function(data) {
                        response($.map(data, function(item) {
                            return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                        }));
                    }
                });
            },
            select: function(event, ui){
                $(".search_sources_input").val("");
                $(".mobile_menu").hide();
                TEMPEST.route("#node?label=source&uuid=" + ui.item.value);
                return false;
            }
        }).autocomplete("instance");

        if (instance) {
            instance._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: #000 !important;">${item.label}</div>`).appendTo(ul);
        }
    });

    // --- AUTHORS (Gold) ---
    $(".search_authors_input").each(function() {
        var instance = $(this).autocomplete({
            scroll: true,
            source: function( request, response ) {
                $.ajax({
                    data: { term: request.term.split(",")[0] },
                    url: '/search?field=search_authors',
                    type: "get",
                    success: function(data) {
                        response($.map(data, function(item) {
                            return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                        }));
                    }
                });
            },
            select: function(event, ui){
                $(".search_authors_input").val("");
                TEMPEST.route("#node?label=author&uuid=" + ui.item.value);
                return false;
            }
        }).autocomplete("instance");

        if (instance) {
            instance._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: goldenrod !important;">${item.label}</div>`).appendTo(ul);
        }
    });

    // --- CLASSES (Cyan) ---
    $(".search_classes_input").each(function() {
        var instance = $(this).autocomplete({
            scroll: true,
            source: function( request, response ) {
                let terms = request.term.split(",");
                let term = terms[terms.length - 1].trim();
                $.ajax({
                    data: { term: term },
                    url: '/search?field=search_classes',
                    type: "get",
                    success: function(data) {
                        response($.map(data, function(item) {
                            return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                        }));
                    }
                });
            },
            select: function(event, ui){
                $(".mobile_menu").hide();
                $(".search_classes_input").val("");
                TEMPEST.route("#node?label=class&uuid=" + ui.item.value);
                return false;
            }
        }).autocomplete("instance");

        if (instance) {
            instance._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: cyan !important;">${item.label}</div>`).appendTo(ul);
        }
    });

    // --- PUBLISHERS (Dark Violet) ---
    $(".search_publishers_input").each(function() {
        var instance = $(this).autocomplete({
            scroll: true,
            source: function( request, response ) {
                $.ajax({
                    data: { term: request.term },
                    url: '/search?field=search_publishers',
                    type: "get",
                    success: function(data) {
                        response($.map(data, function(item) {
                            return { label: toTitleCase(decodeEntities(decodeEntities(item.label))), value: item.value };
                        }));
                    }
                });
            },
            select: function(event, ui){
                $(".search_publishers_input").val("");
                $(".mobile_menu").hide();
                TEMPEST.route("#node?label=publisher&uuid=" + encodeURIComponent(ui.item.value));
                return false;
            }
        }).autocomplete("instance");

        if (instance) {
            instance._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: darkviolet !important; font-weight: bold;">${item.label}</div>`).appendTo(ul);
        }
    });
}
function advAutocomplete(){
    $(document).keyup(function(e) {
        if (e.key === "Escape") {
            $(".autosuggestBox").hide();
        }
    });

    $(document).mouseup(function(e) {
        var container = $(".autosuggestBox");
        if (!container.is(e.target) && container.has(e.target).length === 0) {
            container.hide();
        }
    });

    $("#adv_title, #adv_author, #adv_classes, #adv_publisher").on("focus", function() {
        var val = $(this).val();
        if (val.length > 0) {
            $(this).autocomplete("search", val.split(",").pop().trim());
        }
    });

    // --- ADV TITLE (Sources - Black) ---
    $("#adv_title").css("color", "#000");
    let advTitleAuto = $("#adv_title").autocomplete({
        scroll: true,
        source: function(request, response){
            let terms = request.term.split(",");
            $.ajax({
                data: { term: terms[terms.length - 1].trim() },
                url: "/search?field=search_sources",
                type: "get",
                success: function(data){
                    response($.map(data, function(item){
                        return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                    }));
                }
            });
        },
        select: function(event, ui){
            $(".mobile_menu").hide();
            $("#adv_title").val($(this).val().substring(0,$(this).val().lastIndexOf(",")) + 
                ($(this).val().indexOf(",") > 1 ? ", " : "") + ui.item.label)
                .css("color", "#000");
            return false;
        }
    }).autocomplete("instance");
    if (advTitleAuto) {
        advTitleAuto._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: #000 !important;">${item.label}</div>`).appendTo(ul);
    }

    // --- ADV AUTHOR (Goldenrod) ---
    $("#adv_author").css("color", "goldenrod");
    let advAuthAuto = $("#adv_author").autocomplete({
        scroll: true,
        source: function(request, response){
            let terms = request.term.split(",");
            $.ajax({
                data: { term: terms[terms.length - 1].trim() },
                url: "/search?field=search_authors",
                type: "get",
                success: function(data){
                    response($.map(data, function(item){
                        return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                    }));
                }
            });
        },
        select: function(event, ui){
            $(".mobile_menu").hide();
            $("#adv_author").val($(this).val().substring(0,$(this).val().lastIndexOf(",")) + 
                ($(this).val().indexOf(",") > 1 ? ", " : "") + ui.item.label)
                .css("color", "goldenrod");
            return false;
        }
    }).autocomplete("instance");
    if (advAuthAuto) {
        advAuthAuto._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: goldenrod !important;">${item.label}</div>`).appendTo(ul);
    }

    // --- ADV CLASSES (Cyan) ---
    $("#adv_classes").css("color", "cyan");
    let advClassAuto = $("#adv_classes").autocomplete({
        scroll: true,
        source: function(request, response){
            $.ajax({
                data: { term: getCommaSplice("#adv_classes", request.term) },
                url: "/search?field=search_classes",
                type: "get",
                success: function(data){
                    response($.map(data, function(item){
                        return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                    }));
                }
            });
        },
        select: function(event, ui){
            $(".mobile_menu").hide();
            var arr = $("#adv_classes").val().split(",");
            arr[j] = j > 0 ? " " + ui.item.label : ui.item.label;
            var value = arr.toString();
            $("#adv_classes").val(value).css("color", "cyan");
            return false;       
        }
    }).autocomplete("instance");
    if (advClassAuto) {
        advClassAuto._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: cyan !important;">${item.label}</div>`).appendTo(ul);
    }

    // --- ADV PUBLISHER (Dark Violet) ---
    $("#adv_publisher").css("color", "darkviolet");
    let advPubAuto = $("#adv_publisher").autocomplete({
        scroll: true,
        source: function(request, response){
            let terms = request.term.split(",");
            $.ajax({
                data: { term: terms[terms.length - 1].trim() },
                url: "/search?field=search_publishers",
                type: "get",
                success: function(data){
                    response($.map(data, function(item){
                        return { label: toTitleCase(decodeEntities(decodeEntities(item.label))), value: item.value };
                    }));
                }
            });
        },
        select: function(event, ui){
            $(".mobile_menu").hide();
            $("#adv_publisher").val($(this).val().substring(0,$(this).val().lastIndexOf(",")) + 
                ($(this).val().indexOf(",") > 1 ? ", " : "") + ui.item.label)
                .css("color", "darkviolet");
            return false;
        }
    }).autocomplete("instance");
    if (advPubAuto) {
        advPubAuto._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: darkviolet !important; font-weight: bold;">${item.label}</div>`).appendTo(ul);
    }
}

function uploadAutocomplete(){
    // --- EDITION PUBLISHER (Dark Violet) ---
    $("#edition_publisher").css("color", "darkviolet");
    let edPubAuto = $("#edition_publisher").autocomplete({
        scroll: true,
        source: function( request, response ) {
            $.ajax({
                data: { term: request.term },
                url: '/search?field=search_publishers',
                type: "get",
                success: function(data) {
                    response($.map(data, function(item) {
                        return { label: toTitleCase(decodeEntities(decodeEntities(item.label))), value: item.value };
                    }));
                }
            });
        },
        select : function(event, ui){
            $(".mobile_menu").hide();
            $("#edition_publisher").val(ui.item.label).css("color", "darkviolet");
            return false;
        }
    }).autocomplete("instance");
    if (edPubAuto) {
        edPubAuto._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: darkviolet !important; font-weight: bold;">${item.label}</div>`).appendTo(ul);
    }

    // --- UPLOAD SOURCES (Black) ---
    $(".search_upload_sources_input").css("color", "#000");
    let upSrcAuto = $(".search_upload_sources_input").autocomplete({
        scroll: true,
        source: function( request, response ) {
            $.ajax({
                data: { term: request.term },
                url: '/search?field=search_sources',
                type: "get",
                success: function(data) {
                    response($.map(data, function(item) {
                        return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                    }));
                }
            });
        },
        select : function(event, ui){
            $(".mobile_menu").hide();
            $(".search_upload_sources_input").css("color", "#000");
            TEMPEST.route("#upload?uuid=" + ui.item.value);             
        }
    }).autocomplete("instance");
    if (upSrcAuto) {
        upSrcAuto._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: #000 !important;">${item.label}</div>`).appendTo(ul);
    }

    // --- UPLOAD AUTHORS (Goldenrod) ---
    $(".search_upload_authors_input").css("color", "goldenrod");
    let upAuthAuto = $(".search_upload_authors_input").autocomplete({
        scroll: true,
        source: function( request, response ) {
            $.ajax({
                data: { term: request.term.split(",")[0] },
                url: '/search?field=search_authors&upload=true',
                type: "get",
                success: function(data) {
                    response($.map(data, function(item) {
                        return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                    }));
                }
            });
        },
        select : function(event, ui){
            $(".mobile_menu").hide();
            $(".search_upload_authors_input").val("").css("color", "goldenrod");
            addAuthor({uuid : ui.item.value, name : ui.item.label});
            return false;             
        }
    }).autocomplete("instance");
    if (upAuthAuto) {
        upAuthAuto._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: goldenrod !important;">${item.label}</div>`).appendTo(ul);
    }

    // --- UPLOAD CLASSES (Cyan) ---
    $(".search_upload_classes_input").css("color", "cyan");
    let upClassAuto = $(".search_upload_classes_input").autocomplete({
        scroll: true,
        source: function( request, response ) {
            $.ajax({
                data: { term: getCommaSplice(".search_upload_classes_input", request.term) },
                url: '/search?field=search_classes',
                type: "get",
                success: function(data) {
                    response($.map(data, function(item) {
                        return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                    }));
                }
            });
        },
        select : function(event, ui){
            $(".mobile_menu").hide();
            var arr = $(".search_upload_classes_input").val().split(",");
            arr[j] = ui.item.label;
            var value = arr.toString();
            $(".search_upload_classes_input").val(value).css("color", "cyan");
            return false;          
        }
    }).autocomplete("instance");
    if (upClassAuto) {
        upClassAuto._renderItem = (ul, item) => $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: cyan !important;">${item.label}</div>`).appendTo(ul);
    }
}