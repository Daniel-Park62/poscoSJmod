var HID = require('node-hid');
var dev = new HID.HID(6426,32771) ;
var RED = 0x00 ; // RED설정시 YELLOW 함께
var GREEN = 0x00 ;
var SND = 0x00 ;  // RED 일때만 설정

function devWrite() {
  // console.debug([0x00,0x00,0x00, SND, 0x31, RED, GREEN , 0x00 ]);
  dev.write([0x00,0x00,0x00, SND, 0x31, RED, GREEN , 0x00 ]);
}
module.exports = {
  setGreen : (c) => { GREEN = (c != 0 ? 0x20 : 0x00) ;},
  setYellow : (c) => {
    if(c != 0)
      RED |= 0x03 ;
    else
      RED &= 0xF0 ;
  },
  setRed : (c) => {
    if(c != 0)
      RED |= 0x40 ;
    else
      RED &= 0x0F ;
  },
  setSound : (c) => { SND = ( c != 0 ? 0x35 : 0x00 ) ; } ,  
  write : devWrite ,
  init : () => { RED = 0x00; GREEN = 0x00; SND=0x00;
                    devWrite() ;
                  },
  close : () => dev.close()
}
