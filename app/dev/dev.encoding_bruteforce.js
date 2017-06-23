//  BRUTE FORCE Printer Encoding Pages
// ESC t n 
//                              Hex  Dec
// EPSON n for WindowsCp1251 is \x2e 46





function bruteForce(data){

  for (i=0x00; i < 0x30; i++) { 
  	console.log("x" + pad(i.toString(16),2) +" = " + i);
  	data += `${ESC}t${eval("'\\x"+pad(i.toString(16),2)+"'")}          Чухан ${i}\n`;
  }
  data += `\n\n`;
  for (i=0x00; i < 0x05; i++) { 
  	console.log("x" + pad(i.toString(16),2) +" = " + i);
  	data += `${ESC}${GS}t${eval("'\\x"+pad(i.toString(16),2)+"'")}          Чухан GS${i}\n`;
  }
  
  return data;
 
}

//----------------
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
