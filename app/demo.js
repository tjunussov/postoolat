/*******************************************/

var oldLog = console.debug;

console.debug = function(data1,data2){
	var args = Array.prototype.slice.call(arguments);
	cons.innerHTML = cons.innerHTML + data1 + " " + (data2?data2:"") + '\n';
	oldLog.apply(console, args);
}


/*******************************************/
Vue.config.ignoredElements = [
  'dh', 'dw', 'barcode','right','center'
];
var demoApp = new Vue({
  el: '#demo',
  data: {
  	print_data : `
********************************
<center>
<dh>ИМБИРЬ THAI SPA
КЛУБ БОДРОСТИ</dh>
08.12.2016 21:52:10
</center>
<barcode height="20" value="987987"/>
`,
  	check : 'check',
    output: 'Hello Vue.js!'
  },
  methods: {
  	test: function () {
  	  console.debug("test");
      escpos.test(this.print_data);
    },
    print: function () {
      escpos.print(this.print_data);
    },
    printHTML: function () {
      chrome.runtime.sendMessage(
	        "imfahnfhkkalejebddmkglmhfimbilgc", 
	        {"id":"11","operation":"printHTML", "print_data": this.print_data},
	        function(message) { console.debug(JSON.stringify(message)); }
	    );
    },
    postoolat: function () {
      postoolat.print(this.print_data,function(msg){
      	console.debug("postoolat recieved",msg);
      });
    }
  },
  created : function() {
  	console.debug("init");
  	this.test();
  }
});





