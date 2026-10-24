function decodeEntities(encodedString) {
  var textArea = document.createElement('textarea');
  textArea.innerHTML = encodedString;
  return textArea.value;
}



function getCommaSplice(input, term){
       var pos = $(input).caret();
       var arr = term.split(",");
       var value = null;
       var index = 0;
       for(var i=0; i<term.length; i++){
        
        if(term.charAt(i) === ','){
            index++;
        }
        if(i === pos - 1){
            j = index;
            value = arr[index];
        }

       }
       return value;
    }

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function humanFileSize(bytes, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(dp) + " " + units[u];
}

function prettyBytes(bytes, si=false, dp=1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si 
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
}

function timeSince(date) {

  var seconds = Math.floor((new Date() - date) / 1000);

  var interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + " years";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}
var aDay = 24*60*60*1000;


function copyToClipboard(infoHash) {
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val(infoHash).select();
  document.execCommand("copy");
  $temp.remove();
}


var stopwords = ['i','me','my','we','our','ours','you','your','yours','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']

function remove_stopwords(str) {
    var res = []
    var str = str.toLowerCase();
    var words = str.split(' ')
    for(var i=0;i<words.length;i++) {
       var word_clean = words[i].split(".").join("")
       if(!stopwords.includes(word_clean)) {
           res.push(word_clean)
       }
    }
    return(res.join(' '))
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min); // Ensure min is a whole number
  max = Math.floor(max); // Ensure max is a whole number
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Converts a Unicode code point string (U+13000) into its corresponding character.
 * @param {string} codepointString - The code point in "U+XXXX" or "U+XXXXX" format.
 * @returns {string} The resulting Unicode character (e.g., '𓀀').
 */
function unicodeStringtoChar(codepointString) {
    // 1. Remove the "U+" prefix to get only the hexadecimal part
    const hexCode = codepointString.replace(/^U\+/, '');

    // 2. Convert the hexadecimal string into a decimal integer
    const decimalCode = parseInt(hexCode, 16);

    // 3. Use the decimal integer to generate the character string
    return String.fromCodePoint(decimalCode);
}

var stopwords = ['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']

function remove_stopwords(str) {
    var res = []
    var str = str.toLowerCase();
    var words = str.split(' ')
    for(var i=0;i<words.length;i++) {
       var word_clean = words[i].split(".").join("")
       if(!stopwords.includes(word_clean)) {
           res.push(word_clean)
       }
    }
    return(res.join(' '))
}

/**
 * Removes stop words and common business suffixes from publisher names.
 * Targeted for graph search optimization.
 */
function remove_publisher_stopwords(str) {
    if (!str) return "";

    // 1. Define Publisher-specific stop words (Case-Insensitive)
    const stopWords = [
        "and", "the", "of", "for", "in", "by", "with", "a", "an",
        "ltd", "limited", "inc", "incorporated", "corp", "corporation",
        "publishers", "publisher", "publishing", "publications", "press",
        "books", "company", "co", "llc", "group", "house", "intl", "international"
    ];

    // 2. Normalize and split into tokens
    // We remove common trailing punctuation like periods or commas first
    let cleanStr = str.replace(/[,.]/g, ' ');
    let words = cleanStr.split(/\s+/);

    // 3. Filter out the stop words
    let filteredWords = words.filter(word => {
        let lowerWord = word.toLowerCase();
        return !stopWords.includes(lowerWord);
    });

    // 4. Rejoin and clean up extra whitespace
    return filteredWords.join(' ').trim();
}

function toTitleCase(str) {
  return str.replace(
    /(?:^|[.\s\-_])\w/g, 
    function(txt) {
      return txt.toUpperCase();
    }
  ).replace(
    /[A-Z]\.[A-Z](?!\.)/g, 
    function(txt) {
      return txt.toUpperCase();
    }
  );
}