function update_status(message, timeout) {
    timeout = +timeout || 750;
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = message;

    window.statusTimer && clearTimeout(window.statusTimer);

    window.statusTimer = setTimeout(function() {
      status.textContent = '';
    }, timeout);
}

// Saves options to chrome.storage
function save_options() {
  var comport = document.getElementById('comport').value;
  var mock = document.getElementById('mock').checked;
  var printer_name = document.getElementById('printer_name').value;
  var print_width = document.getElementById('print_width').value;
  var print_encoding = document.getElementById('print_encoding').value;
  
  chrome.storage.local.set({
    "comport": comport,
    "printer_name": printer_name,
    "print_width" : print_width,
    "print_encoding" : print_encoding,
    "mock": mock
  }, function() {
    // Update status to let user know options were saved.
    update_status('Options saved.');
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value comport = 1 and mock = false.
  chrome.storage.local.get({
    "printer_name": "R58",
    "print_data":"G0AbRQFGT08gQ09SUCBMdGQKG0UARk9PIENPUlAgTHRkLgo=",
    "print_width" : 32,
    "print_encoding" : "windows1251",
    "comport": 1,
    "mock": false
  }, function(items) {
  	document.getElementById('print_data').value = items.print_data;
    document.getElementById('printer_name').value = items.printer_name;
    document.getElementById('print_width').value = items.print_width;
    document.getElementById('print_encoding').value = items.print_encoding;
    
    document.getElementById('comport').value = items.comport;
    document.getElementById('mock').checked = items.mock;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('test').addEventListener('click', function(){
  var comport = document.getElementById('comport').value;
  var mock = document.getElementById('mock').checked;
  chrome.runtime.sendNativeMessage(
    "kz.metaphor.chrome.payment", 
    {"id":"1","operation":"test", "mock": mock, "comport": +comport}, 
    function(message) {
      update_status(JSON.stringify(message), 5000);
    }
  );
});

document.getElementById('print_test').addEventListener('click', function(){
  var printer_name = document.getElementById('printer_name').value;
  var print_data = document.getElementById('print_data').value;
  chrome.runtime.sendNativeMessage(
    "io.smartpos.postoolat", 
    {"id":"1","operation":"print", "print_data": print_data, "printer_name": printer_name,"mock": true}, 
    function(message) {
      update_status(JSON.stringify(message), 5000);
    }
  );
});

document.getElementById('print_test_html').addEventListener('click', function(){
  var printer_name = document.getElementById('printer_name').value;
  var print_html = document.getElementById('print_html').value;
  var print_width = document.getElementById('print_width').value;
  var print_encoding = document.getElementById('print_encoding').value;
  

  console.debug("Print HTML ", printer_name,print_html);

  chrome.runtime.sendMessage(
      "imfahnfhkkalejebddmkglmhfimbilgc",
      {"id":"11","operation":"printHTML", "print_data": print_html, "print_width":print_width, "print_encoding":print_encoding},
      function(message) { 
        update_status(JSON.stringify(message), 5000);
      }
  );

  /*chrome.runtime.sendNativeMessage(
    "kz.metaphor.chrome.payment", 
    {"id":"1","operation":"print", "print_data": print_html, "printer_name": printer_name,"mock": true}, 
    function(message) {
      update_status(JSON.stringify(message), 5000);
    }
  );*/

});


document.getElementById('manual_button').addEventListener('click', function(){
  document.getElementById('manual').showModal();
});

document.getElementById('manual').addEventListener('click', function(){
  this.close();
});