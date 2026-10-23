function assertOutput(infoHash){
    //add #output_infoHash div, controlled by hero.js
    $(".output").hide();  

    const prim = $("#output_" + infoHash).length;

    if(prim){
        $("#output_" + infoHash).show();
    }
    else{
        const output = document.createElement("div");
        $(output).attr("id", "output_" + infoHash);
        $(output).addClass("output");
        $("div.webtorrent").append(output);
        $(output).show();
    }
    
}

// Add 'index' as a parameter to ensure uniqueness
function assertFile(file, infoHash, index) {
    // Unique ID combining infoHash and index
    const fileContainerId = `wrapper-${infoHash}-${index}`;
    const statusId = `status-${infoHash}-${index}`; 
    
    let $container = $("#" + fileContainerId);
    const heroInfoHash = $("#hero").find("option:selected").val();

    if ($container.length === 0) {
        $container = $("<div class='file-entry' style='margin-bottom: 25px;'></div>").attr("id", fileContainerId);
        $("#output_" + infoHash).append($container);
        
        if (heroInfoHash === infoHash) {
            const containerNode = document.getElementById(fileContainerId);
            (async () => {
                try {
                    const blob = await file.blob();
                    const url = URL.createObjectURL(blob);
                    let element;
                    const fileName = file.name.toLowerCase();

                    if (fileName.endsWith('.pdf')) {
                        element = document.createElement('embed');
                        element.type = 'application/pdf';
                    } else if (fileName.match(/\.(mp4|webm|ogg|mkv)$/)) {
                        element = document.createElement('video');
                        element.controls = true;
                    } else if (fileName.match(/\.(mp3|flac|wav)$/)) {
                        element = document.createElement('audio');
                        element.controls = true;
                    } else if (fileName.match(/\.(jpg|jpeg|png|gif)$/)) {
                        element = document.createElement('img');
                    }

                    if (element) {
                        element.src = url;
                        element.style.width = '100%';
                        containerNode.appendChild(element);
                    }
                } catch (err) {
                    console.error("Media render failed:", err);
                }
            })();
        }   
    }

    
    if (!document.getElementById(statusId)) {
        const statusLabel = document.createElement('div');
        statusLabel.id = statusId;
        statusLabel.innerText = "[ PROCESSING: " + file.name + " ]";
        statusLabel.style.cssText = "display:block; padding:10px; margin-bottom:10px; font-family:'Share Tech Mono', monospace; color:skyblue; border:1px dashed #ffff00; font-size:13px; background:rgba(0,0,0,0.5);";
        $(statusLabel).css({
          'position': 'relative',
          'z-index': 1000
        });
        if(heroInfoHash === infoHash){
            $container.prepend(statusLabel)
        }
    }
}

function assertButton(file, infoHash, index, apaName) {
    const statusId = `status-${infoHash}-${index}`;
    const $statusElement = $("#" + statusId);
    
    if ($statusElement.length > 0) {
        (async () => {
            try {
                const blob = await file.blob();
                const url = URL.createObjectURL(blob);

                // 1. Get original file extension (.pdf, .mp4, etc.)
                const ext = file.name.substring(file.name.lastIndexOf('.'));

                // 2. Format custom APA filename (Sanitize illegal file characters)
                let customFilename = file.name;
                if (file.ext === '.pdf' && apaName) {
                    // Remove characters invalid in Windows/Mac/Linux filenames: \ / : * ? " < > |
                    const cleanApa = apaName.replace(/[\\/:*?"<>|]/g, '').trim();
                    customFilename = `${cleanApa}${ext}`;
                }

                const btn = document.createElement('a');
                btn.href = url;
                
                // 3. Set the clean APA filename on download attribute
                btn.download = customFilename;
                btn.innerText = "DL: " + customFilename;
                btn.className = "download-button-main";
                btn.style.cssText = "display:inline-block; padding:10px; margin-bottom:10px; background:#50C777; color:white; border:1px solid #00ccff; text-decoration:none; font-family:monospace; font-size:14px; border-radius:3px; cursor:pointer;";

                btn.onclick = (e) => e.stopPropagation();

                $statusElement.replaceWith(btn);
                
            } catch (err) {
                console.error("Button swap failed:", err);
                $statusElement.text("[ ERR: EXTRACTION FAILED ]").css("color", "red");
            }
        })();
    }
}