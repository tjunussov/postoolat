/* -------------- ICONV --------------*/

// iconv conversion
iconv= window.iconv || {};
iconv = function(){

    var encodings = {
        "windows1251": {
            "type": "_sbcs",
            "chars" : "ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ‘’“”•–—�™љ›њќћџ ЎўЈ¤Ґ¦§Ё©Є«¬­®Ї°±Ііґµ¶·ё№є»јЅѕїАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя"
        },
        "cp1251" : "windows1251"
    };

    String.prototype.toBase64 = function() { 
        return btoa(this);
    };
    
    String.prototype.toBase64Unicode = function() {
	    // first we use encodeURIComponent to get percent-encoded UTF-8,
	    // then we convert the percent encodings into raw bytes which
	    // can be fed into btoa.
	    return btoa(encodeURIComponent(this).replace(/%([0-9A-F]{2})/g,
	        function toSolidBytes(match, p1) {
	            return String.fromCharCode('0x' + p1);
	    }));
	}

    function getCodec(codepage){
        return encodings[codepage].chars;
    }

    return { 
        encode : function(text,codepage) {
        	if(!codepage) 
        		throw new Error("codepage not specified");
            var L = [],
                codec = getCodec(codepage),
                pos;

            for (let c of text) {
                if(c.charCodeAt(0) >= 128) {
                    pos = codec.indexOf(c);
                    if(pos < 0 ) {
                        console.error( "Character " + c + " isn't supported by win1251!", c );
                    }
                    L.push(String.fromCharCode( pos + 128 )); // shifting ASCI above 128
                } else {
                    L.push(c);
                }
            }
            return L.join('');
        }
    }
}();


/* -------------- ESCPOS --------------*/

escpos= window.escpos || {};
escpos = function(){

    // var test = "hello world".toBytes().concat([0x01B, 0x64, 10])
    const ESC = "\x1b";
    const GS="\x1d";
    const NUL="\x00";
    const CP1251 = "\x1bt\x22";
    const CP1251_EPSON = "\x1bt\x2e";
    
    

    const settings = {
        width : 32
    }

    const TAGS = {
        "b":["\x1bE\x01","\x1bE\x00"],
        "center":{open:"\x1b\x61\x01",close:"\x1b\x61\x00"},
        "right":{open:"\x1ba\x02",close:"\x1ba\x00"},
        "dh":{open:"\x1b!\x10",close:"\x1b!\x00"},
        "dw":{open:"\x1b\x0E",close:"\x1b\x14"},
        "br":{open:"\x1bd\x01"},
        "hr":()=>{ return "*".repeat(settings.width); },
        "barcode":function(match,isClosing){ //echo GS.h.160 // Height GS."k".chr(4)."987654321".NUL; // Print barcode
            if(isClosing) return "";
            var value = match.match(/value="(.*?)"/)[1];
            var height = "\x32"; // HEx of DECicmal 50
            // console.debug("barcode",match,value);
            // return `\x1dk\x04${value}\x00`;
            return `\x1dh${height}\x1dk\x04${value}\x00`;
        }
    };

    function processTag(match,tag,t){
    }

return {
    templateESCPOS : function(){
  /*            return `${ESC}@${ESC}E\x01FOO CORP Ltd${ESC}E\x00
${ESC}a\x01GINGERSPA
`;*/
return `\x1b\x61\x01GINGERSPA22\x1b\x61\x00
GINGEEER`;
  /*      return `Привет мир!
Салем мир!
`*/
   },
    templateHTML : function(){
        return `<barcode value="987654321"/><br>`;
    },
    transformRegExp : function(data){
   
        // reg = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 'gi'); 
        // TAGS MATCH <(\w)\b[^>]*>(.*?)(?:<\/\1)
        // reg = new RegExp(`(<${tag}>)|(<\/${tag}>)`, 'gi');

        var t;
        
        data = data.replace(/<(\/)?(\w+)\b[^>]*>(.*?)/gi, function(match,isClosing,tag,offset,string){
            // console.debug("replace-->",match,isClosing,tag);

            if(!(t = TAGS[tag])) return ""; // stripping out all tags
            
            switch(typeof t){
                case "string": // TODO Direct alias to other encoding.
                    return t;
                    break;
                case "function" : 
                    return t(match,isClosing,tag,offset,string);
                    break;
                case "object" : 
                    if(Array.isArray(t))
                        return isClosing ? t[1] : t[0];
                    else 
                        return isClosing ? t.close : t.open;
                    break;
                default : 
                    console.error("Tag handler Not implemeted for" + (typeof t));
            };
        });
        
        return data;
    },
    transform : function (data){
        var root = document.createElement("pre");

        root.innerHTML = data;

        console.debug(root.innerHTML);

        for(var tag in TAGS){
            var t = TAGS[tag];
            // [].map.call( root.querySelectorAll(tag), function(v){
            root.querySelectorAll(tag).forEach(function(v){
                console.debug("Чухус --- ",tag, "["+v.innerHTML+"]");
                switch(typeof t){
                    case "string": // Direct alias to other encoding.
                        enc = codecDef;
                        break;
                    case "function" : 
                        v.parentNode.replaceChild(document.createTextNode(t()),v);
                        break;
                    default : v.outerHTML = t.open + v.innerHTML + t.close;
                };
                
            });
        }

        // console.debug("PUHUS --- ", "["+root.innerHTML+"]");

        return root.innerHTML;

    },
    process : function (data,encoding,width){
      settings.width = width;
      data = this.transformRegExp(data);
   
      if(encoding.toLowerCase() == "windows1251,epson"){
      	console.log(encoding.toLowerCase(),"11");
      	data = `${ESC}@${CP1251_EPSON}${data}\n`;
		return iconv.encode(data,"windows1251").toBase64();
      } else {
      	console.log(encoding.toLowerCase(),"22");
      	data = `${ESC}@${data}\n`;
      	return iconv.encode(data,encoding).toBase64();
      }
    },
    print : function (data){
        // console.debug("printNative",data);

        // data = this.template();
        data = this.transformRegExp(this.templateHTML());
        // data = this.templateESCPOS();
        data = `${ESC}@${ESC}t\x06${data}\n`; // ESC t 6 cyrilic

        data =  iconv.encode(data,"windows1251").toBase64();
        // data =  data.toBase64();
        console.debug("printing native",data);

        chrome.runtime.sendMessage(
            "imfahnfhkkalejebddmkglmhfimbilgc", 
            {"id":"99","operation":"print", "print_data": data, "printer_name": "r58","mock": true},
            function(message) { console.debug(JSON.stringify(message)); }
        );
    },
    test : function (data){
        
    	// console.debug("printing data [--");
        // console.debug(data);
        // console.debug("----]");


        // data = this.transformRegExp(data);
        data = this.transformRegExp(this.templateHTML());

        console.debug(data);

        base64 = iconv.encode(data,"windows1251").toBase64(); console.debug("gek",base64);
        console.debug("ASSERT",(base64 == "HWsEOTg3NjU0MzIxABtkAQ==")); // assert

        //HWsEOTg3NjU0MzIxABtkAQ==
    }
}; // end of return
}(); // end of escpos

