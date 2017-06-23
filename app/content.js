// inject a script from the extension's files
// into the execution environment of the main page
// check only if meta tag exists
var injected = false;

document.querySelectorAll("meta[name='POSTOOLAT'], *[postoolat]").forEach(function(v){
	if(v.hasAttribute("postoolat")){
		v.setAttribute("postoolat","yes");
		console.debug("yes",v.outerHTML);
	}

	if(!injected) {
		injected = true;
		inject();
	}
});

function inject(){
	var s = document.createElement('script');
		s.src = chrome.extension.getURL("page-postoolat.js");
	document.documentElement.appendChild(s);

	// listen for myStoreEvent fired from the page with key/value pair data
	document.addEventListener('postoolat_print', function(event) {
	    var param = event.detail;
	    chrome.runtime.sendMessage(
	        "imfahnfhkkalejebddmkglmhfimbilgc", 
	        {"id":Math.random().toString(),"operation":"printHTML", "print_data": param},
	        function(message) { 
	        	console.info("Print success");
	        	console.debug(JSON.stringify(message)); 
	        }
	    );
	});
}