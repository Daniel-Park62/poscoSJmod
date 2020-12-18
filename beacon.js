"use strict";

const hid = require('./api/dwBeacon') ;
const mysql_dbc = require('./db/db_con')();
let con = mysql_dbc.init();
mysql_dbc.test_open(con);
con.isconn = true ;

let BATTL = 3400 ;
let MEAS = 10 ;
let SOUND = process.argv[2] == 0 ? 0 : 1 ;

con.query("SELECT measure, batt FROM MOTECONFIG LIMIT 1",
  (err, dt) => {
    if (err) MEAS = 10 ;
    else   {
      MEAS = dt[0].measure < 5 ? 5 : dt[0].measure ;
      BATTL = dt[0].batt ;
    }
    console.info('time interval :'+ MEAS, " Battery Limit :" + BATTL);
});

if (SOUND == 0)
  console.info("Sound off !!") ;
else
  console.info("Sound on !! ( ./sj_bcon.exe 0  Sound off. )") ;

function  main_loop() {
  con.query("SELECT max(a.tm) tm, SUM( case when act = 2 and a.temp > b.temp_d then 1 ELSE 0 END) d_chk, \
		 SUM( case when act = 2 and b.temp_d >= a.temp and a.temp > b.temp_w then 1 ELSE 0 END) w_chk, \
		 SUM( case when act = 2 and a.batt > 0 AND a.batt < c.batt then 1 ELSE 0 END) low_chk \
  FROM moteinfo a LEFT JOIN tb_stand2 b ON a.stand = b.stand , (select batt from MOTECONFIG LIMIT 1) c \
   WHERE tm = (SELECT lastm FROM lastime LIMIT 1)" ,
    (err, dt) => {
      if (!err) {
        // console.debug( dt ) ;
        hid.setRed(dt[0].d_chk) ;
        hid.setSound(SOUND == 1 ? dt[0].d_chk : 0) ;
        hid.setYellow(dt[0].w_chk) ;
        hid.setGreen(dt[0].low_chk) ;
        hid.write() ;
      }
  });
}

setInterval(main_loop, MEAS * 1000 ) ;

function endprog() {
    console.log("DEVICE init");
    con.end();
    hid.init();
    hid.close();
    // process.exit();
}

process.on('SIGINT', process.exit );
process.on('SIGTERM', endprog );
process.on('uncaughtException', process.exit ) ;
process.on('exit', endprog);
// hid.close() ;
