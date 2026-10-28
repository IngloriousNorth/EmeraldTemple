(function() {
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

    // --- SOURCES (Black) ---
    $(".search_sources_input").each(function() {
        var instance = $(this).autocomplete({
            scroll: true,
            source: function(request, response) {
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
            select: function(event, ui) {
                $(".search_sources_input").val("");
                $(".mobile_menu").hide();
                TEMPEST.route("#node?label=source&uuid=" + ui.item.value);
                return false;
            }
        }).autocomplete("instance");

        if (instance) {
            instance._renderItem = function(ul, item) {
                return $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: #000 !important;">${item.label}</div>`).appendTo(ul);
            };
        }
    });

    // --- AUTHORS (Gold) ---
    $(".search_authors_input").each(function() {
        var instance = $(this).autocomplete({
            scroll: true,
            source: function(request, response) {
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
            select: function(event, ui) {
                $(".search_authors_input").val("");
                TEMPEST.route("#node?label=author&uuid=" + ui.item.value);
                return false;
            }
        }).autocomplete("instance");

        if (instance) {
            instance._renderItem = function(ul, item) {
                return $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: goldenrod !important;">${item.label}</div>`).appendTo(ul);
            };
        }
    });

    // --- CLASSES (Cyan) ---
    $(".search_classes_input").each(function() {
        var instance = $(this).autocomplete({
            scroll: true,
            source: function(request, response) {
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
            select: function(event, ui) {
                $(".mobile_menu").hide();
                $(".search_classes_input").val("");
                TEMPEST.route("#node?label=class&uuid=" + ui.item.value);
                return false;
            }
        }).autocomplete("instance");

        if (instance) {
            instance._renderItem = function(ul, item) {
                return $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: cyan !important;">${item.label}</div>`).appendTo(ul);
            };
        }
    });

    // --- PUBLISHERS (Dark Violet) ---
    $(".search_publishers_input").each(function() {
        var instance = $(this).autocomplete({
            scroll: true,
            source: function(request, response) {
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
            select: function(event, ui) {
                $(".search_publishers_input").val("");
                $(".mobile_menu").hide();
                TEMPEST.route("#node?label=publisher&uuid=" + encodeURIComponent(ui.item.value));
                return false;
            }
        }).autocomplete("instance");

        if (instance) {
            instance._renderItem = function(ul, item) {
                return $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: darkviolet !important; font-weight: bold;">${item.label}</div>`).appendTo(ul);
            };
        }
    });
})();

(function() {
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
        source: function(request, response) {
            let terms = request.term.split(",");
            $.ajax({
                data: { term: terms[terms.length - 1].trim() },
                url: "/search?field=search_sources",
                type: "get",
                success: function(data) {
                    response($.map(data, function(item) {
                        return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                    }));
                }
            });
        },
        select: function(event, ui) {
            $(".mobile_menu").hide();
            let val = $(this).val();
            let lastComma = val.lastIndexOf(",");
            let base = lastComma > -1 ? val.substring(0, lastComma) + ", " : "";
            $("#adv_title").val(base + ui.item.label).css("color", "#000");
            return false;
        }
    }).autocomplete("instance");

    if (advTitleAuto) {
        advTitleAuto._renderItem = function(ul, item) {
            return $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: #000 !important;">${item.label}</div>`).appendTo(ul);
        };
    }

    // --- ADV AUTHOR (Goldenrod) ---
    $("#adv_author").css("color", "goldenrod");
    let advAuthAuto = $("#adv_author").autocomplete({
        scroll: true,
        source: function(request, response) {
            let terms = request.term.split(",");
            $.ajax({
                data: { term: terms[terms.length - 1].trim() },
                url: "/search?field=search_authors",
                type: "get",
                success: function(data) {
                    response($.map(data, function(item) {
                        return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                    }));
                }
            });
        },
        select: function(event, ui) {
            $(".mobile_menu").hide();
            let val = $(this).val();
            let lastComma = val.lastIndexOf(",");
            let base = lastComma > -1 ? val.substring(0, lastComma) + ", " : "";
            $("#adv_author").val(base + ui.item.label).css("color", "goldenrod");
            return false;
        }
    }).autocomplete("instance");

    if (advAuthAuto) {
        advAuthAuto._renderItem = function(ul, item) {
            return $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: goldenrod !important;">${item.label}</div>`).appendTo(ul);
        };
    }

    // --- ADV CLASSES (Cyan) ---
    $("#adv_classes").css("color", "cyan");
    let advClassAuto = $("#adv_classes").autocomplete({
        scroll: true,
        source: function(request, response) {
            let terms = request.term.split(",");
            let term = terms[terms.length - 1].trim();
            $.ajax({
                data: { term: term },
                url: "/search?field=search_classes",
                type: "get",
                success: function(data) {
                    response($.map(data, function(item) {
                        return { label: decodeEntities(decodeEntities(item.label)), value: item.value };
                    }));
                }
            });
        },
        select: function(event, ui) {
            $(".mobile_menu").hide();
            var arr = $("#adv_classes").val().split(",");
            var j = arr.length - 1;
            arr[j] = j > 0 ? " " + ui.item.label : ui.item.label;
            $("#adv_classes").val(arr.toString()).css("color", "cyan");
            return false;
        }
    }).autocomplete("instance");

    if (advClassAuto) {
        advClassAuto._renderItem = function(ul, item) {
            return $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: cyan !important;">${item.label}</div>`).appendTo(ul);
        };
    }

    // --- ADV PUBLISHER (Dark Violet) ---
    $("#adv_publisher").css("color", "darkviolet");
    let advPubAuto = $("#adv_publisher").autocomplete({
        scroll: true,
        source: function(request, response) {
            let terms = request.term.split(",");
            $.ajax({
                data: { term: terms[terms.length - 1].trim() },
                url: "/search?field=search_publishers",
                type: "get",
                success: function(data) {
                    response($.map(data, function(item) {
                        return { label: toTitleCase(decodeEntities(decodeEntities(item.label))), value: item.value };
                    }));
                }
            });
        },
        select: function(event, ui) {
            $(".mobile_menu").hide();
            let val = $(this).val();
            let lastComma = val.lastIndexOf(",");
            let base = lastComma > -1 ? val.substring(0, lastComma) + ", " : "";
            $("#adv_publisher").val(base + ui.item.label).css("color", "darkviolet");
            return false;
        }
    }).autocomplete("instance");

    if (advPubAuto) {
        advPubAuto._renderItem = function(ul, item) {
            return $("<li>").append(`<div class="ui-menu-item-wrapper" style="color: darkviolet !important; font-weight: bold;">${item.label}</div>`).appendTo(ul);
        };
    }
});