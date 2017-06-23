window.postoolat = {
	hello : function (){
		return "world";
	},
	printEvent : function (html) {
	    document.dispatchEvent(new CustomEvent('postoolat_print', {"detail":html}));
	},
	print : function(html,callback){
        chrome.runtime.sendMessage(
            "imfahnfhkkalejebddmkglmhfimbilgc", 
            {"id":"22","operation":"printHTML", "print_data": html},
            function(message) { 
            	console.info("Print success");
            	console.debug(JSON.stringify(message));
            }
        );
    }
}