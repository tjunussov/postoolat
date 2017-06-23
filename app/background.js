chrome.runtime.onMessage.addListener(handleRequest); // from content script and options.js
chrome.runtime.onMessageExternal.addListener(handleRequest); // from apps, and another extensions 

// require("escpos.js"); File

var dd = debounceOnFirst(send,1000); // Function debouncer for 1 second
var COMMENT_PSEUDO_COMMENT_OR_LT_BANG = new RegExp(
    '<!--[\\s\\S]*?(?:-->)?'
    + '<!---+>?'  // A comment with no body
    + '|<!(?![dD][oO][cC][tT][yY][pP][eE]|\\[CDATA\\[)[^>]*>?'
    + '|<[?][^>]*>?',  // A pseudo-comment
    'g');

var SIMPLE_REG = new RegExp(
    '<!---->',  // A pseudo-comment
    'g');

function handleRequest(request, sender, sendResponse) {
  console.debug("message received from page",request);
  chrome.storage.local.get({
    "comport": 1,
    "mock": false,
    "printer_name" : "r58",
    "print_width" : 32,
    "print_encoding" : "windows1251",
  }, function(items) {
    

    if(request.operation == "printHTML"){
      request.operation = "print";
      request.mock = true;
      request.printer_name = items.printer_name;
      console.debug("request","printHTML",request.print_data);
      
      //console.log("1",request.print_data);
      
      //request.print_data = request.print_data.replace(COMMENT_PSEUDO_COMMENT_OR_LT_BANG,""); // CleanUp all comments
      request.print_data = request.print_data.replace(SIMPLE_REG,""); // CleanUp all comments
      //console.log("2",request.print_data);
      request.print_data = escpos.process(request.print_data,items.print_encoding,items.print_width);
      
      dd(request,sendResponse); // debouncing request
      
    } else {
      console.debug("request");
      request.comport = +items.comport;
      
      send(request,sendResponse);
    }
    
  });
  return true;
}

function send(request,sendResponse){
	console.debug("sendNativeMessage");
	chrome.runtime.sendNativeMessage("io.smartpos.postoolat", request, 
      function(message) {
        if (chrome.runtime.lastError) {
            console.error("ERROR: " + chrome.runtime.lastError.message + " Host is io.smartpos.postoolat, please run chrome in verbose mode '--enable-logging --v=1'");
        } else {
            sendResponse(message);
        }
      }
    );
}

function debounceOnFirst(func, wait) {
  var timeout;
   console.debug('debounce inited');
  return function() {
	console.debug('debounceOnFirst added to queue');
    var context = this, args = arguments;
    clearTimeout(timeout);
    if (!timeout) func.apply(context, args);
    timeout = setTimeout(function() {
      timeout = null;
    }, wait);
    
  };
}