"use strict";
let DEVNUM = 2 ;
let SSNUM = 6 ;
const TAGPORT = 1502;
const DEVPORT = 1503;

let GWIP = process.env.GWIP || "192.168.0.233" ;
let port = process.env.RESTPORT || 9977 ;
let PLACE = process.env.PLACE || 0 ;  // 0.공장  1.수리장
console.info( "GateWay :" , GWIP  );

const moment = require('moment') ;
const express    = require('express');

const app        = express();
const bodyParser = require('body-parser') ;
app.use(bodyParser.urlencoded({ extended: true }))
// app.use(express.urlencoded({extended: false})) ;
app.use(bodyParser.json())
app.use(bodyParser.text({ type: 'text/html' }));

const net = require('net');

// app.use(express.json()) ;

const mysql_dbc = require('./db/db_con')();
let con = mysql_dbc.init();
mysql_dbc.test_open(con);
con.isconn = true ;

require('date-utils');

let MEAS = 10;
let svtime = moment().subtract(34,"s");

//let GWIP = process.argv[2] || "192.168.8.98" ;

const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let sAct = [];

app.use(express.static('chart'));

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.get('/', (req, res) => {
  res.send('<h2>(주)다윈아이씨티 : Posco 1선재 RM Roll Chock Monitoring </h2>\n');
//  console.info(req.query) ;
  if (req.query.meas != null)  MEAS = req.query.meas ;
  console.info('time interval :'+ MEAS);
 });


app.get('/reload', (req, res) => {
   res.send('<h2>Data Reload</h2>\n');
  console.info('getMeasure() call ');
  getMeasure() ;
});

app.get('/reset_ob', (req, res) => {
   res.send('<h2>Sensor OB reset</h2>\n');
   if (req.query.seq != null) {
      console.info('Sensor OB reset :' + req.query.seq);
      moteOBReset(req.query.seq) ;
   } else {
     console.error('Sensor OB reset sensor No not input !!');
   }

});

app.post('/chart_sq', (req, res) => {
  let fdt = moment(req.body.ftm,["YYYYMMDDHHmmss","YYYYMMDD"]).format('YYYY-MM-DD HH:mm:ss') ;
  let tdt = moment(req.body.ttm,["YYYYMMDDHHmmss","YYYYMMDD"]).format('YYYY-MM-DD HH:mm:ss') ;

  // console.log(req.body) ;
  // bodym = JSON.parse(JSON.stringify(req.body));
  // console.log(bodym) ;
  con.query(
      "SELECT ?? as seq, temp,  date_format(tm,'%Y-%m-%d %T') tm  FROM motehist  \
      where  ?? in (?) and tm between ? and ?  and temp between ? and ? order by seq, tm " ,
       [req.body.gb, req.body.gb,req.body.sq, fdt, tdt, req.body.ftemp, req.body.ttemp] ,
    (err, dt) => {
      if (!err) {
        // motesmac = JSON.parse(JSON.stringify(dt)) ;
        let rdata = [];
        let tdata = [];
        let cat = [];
        let sv_seq = dt[0].seq ;
        let sw=0 ;

        dt.forEach((e,i) => {
          if  (sv_seq != e.seq  ) {
            rdata.push( {name : sv_seq, lineWidth: 2, data: tdata} ) ;
            sv_seq = e.seq ;
            tdata = [] ;
            sw = 1;
          }
          tdata.push(e.temp);
          if (sw == 0) cat.push(e.tm);
        }) ;
        if (dt.length > 0 )
          rdata.push( {name : sv_seq, lineWidth: 2, data: tdata} ) ;

        let sdata =  JSON.stringify( {
          series : rdata,
          categorie: cat} );
          // console.log(sdata) ;
        res.json(sdata);
      } else {
        console.error(err) ;
        res.send(err);
      }
  });

});

app.get('/chart_stand/:stand', (req, res) => {

   // console.log(req.params);
  con.query(
      // "SELECT temp_w, temp_d  FROM tb_stand  where standno = ?  "  ,[req.params.stand],
      // 2020 11 23 변경
      "SELECT a.temp_d t_d, b.temp_d b_d FROM tb_stand2 a,tb_stand2 b  where a.stand = ? and b.stand = ?  "
      ,[req.params.stand+'T', req.params.stand+'B']
      ,(err, dat) => {
      if (!err) {
        // motesmac = JSON.parse(JSON.stringify(dt)) ;
        let rdata = {t_d : dat[0].t_d, b_d : dat[0].b_d } ;
        let sdata =  JSON.stringify( rdata ) ;
        // console.log(sdata) ;
        res.json(sdata);
      } else {
        console.error(req,"err->",err) ;
        res.json(err);
      }
  });

});

app.get('/chart_stand/:stand/:ftm', (req, res) => {

  let fdt = moment(req.params.ftm,["YYYYMMDDHHmmss","YYYYMMDD"]).format('YYYY-MM-DD HH:mm:ss') ;

  let whereStr = "a.standno = " + req.params.stand ;
  if (req.params.ftm ) whereStr += " and a.tm = '" +fdt +  "'" ;
   // console.log("1",whereStr);
  con.query(
   "SELECT substr(a.stand,-1) tb, a.temp temp, date_format(a.tm,'%m/%d %T') tm  FROM moteinfo a  where standno = ? and tm = ? "
      ,[req.params.stand,fdt],
    (err, dt) => {
      if (!err) {
        // motesmac = JSON.parse(JSON.stringify(dt)) ;
        let rdata = {} ;

        dt.forEach((e,i) => {
          if (e.tb == 'T' )
            { rdata.top = [ e.tm, e.temp ] ; }
          else
            { rdata.bottom = [e.tm, e.temp ] ; }
        }) ;

        let sdata =  JSON.stringify( rdata ) ;
        res.json(sdata);
      } else {
        console.log("err->",err) ;
        res.json(err);
      }
  });


});

app.get('/chart_stand/:stand/:ftm/:ttm', (req, res) => {

  let fdt ="";
  let tdt = moment(req.params.ttm,["YYYYMMDDHHmmss","YYYYMMDD"]).format('YYYY-MM-DD HH:mm:ss');
  if ( req.params.ftm <= 24)
    fdt = moment(tdt,'YYYY-MM-DD HH:mm:ss').subtract(req.params.ftm,"h").format('YYYY-MM-DD HH:mm:ss');
  else
    fdt = moment(req.params.ftm,["YYYYMMDDHHmmss","YYYYMMDD"]).format('YYYY-MM-DD HH:mm:ss');
// console.log(req.params, fdt,tdt);
  // if ( req.params.ftm > req.params.ttm ) tdt = moment(fdt).format('YYYY-MM-DD HH:mm:ss') ;
  let whereStr = "a.standno = " + req.params.stand ;
  if (req.params.ftm ) whereStr += " and a.tm between '" +fdt + "' and '" + tdt + "'" ;
  // console.log("2" ,whereStr);
  con.query(
      "SELECT a.temp atemp, b.temp btemp,  date_format(a.tm,'%m/%d %T') tm  FROM moteinfo a , moteinfo b \
      where a.tm = b.tm and a.stand like '%T' and b.stand like '%B' and a.standno = b.standno and " + whereStr ,
    (err, dt) => {
      if (!err) {
        // motesmac = JSON.parse(JSON.stringify(dt)) ;
        let rdata = [{name:"" , data:[] }] ;
        let tdata = [];
        let bdata = [];
        let cat = [];
        dt.forEach((e,i) => {
          tdata.push(e.atemp);
          bdata.push(e.btemp);
          cat.push(e.tm);
        }) ;
        // rdata[0].name = "TOP" ;
        rdata[0].data = tdata ;

        rdata.push( { data: bdata });

        let sdata =  JSON.stringify( {
          series : rdata ,
          categorie: cat  } );
        res.json(sdata);
        // console.info(sdata) ;
      } else res.send(err);
  });
});


function moteOBReset(sno) {
      con.query('UPDATE motestatus SET obcnt = 0  where seq = ? ' ,[sno ],
        (err, dt) => {
          if (err) console.error(err);
        });
}

let BATTL = 3500 ;

function getMeasure() {
  con.query("SELECT seq,act,bno,stand, batt , standno, batt, spare FROM motestatus    ",
    (err, dt) => {
      if (!err) {
        // motesmac = JSON.parse(JSON.stringify(dt)) ;
        dt.forEach((e,i) => { sAct[e.seq] = [] ; sAct[e.seq] = [e.act, e.bno, e.stand, e.batt, e.standno, e.spare ]  }) ;

      } else console.error(err);
  });

  con.query("SELECT measure, batt FROM MOTECONFIG LIMIT 1",
    (err, dt) => {
      if (err) MEAS = 10 ;
      else   {
        MEAS = dt[0].measure ;
        BATTL = dt[0].batt ;
      }
      console.info('time interval :'+ MEAS, " Battery Limit :" + BATTL);
  });
  con.query("SELECT max(seq)  as ssnum FROM motestatus where spare = 'N' and GUBUN = 'S' ",
    (err, dt) => {
      if (err) SSNUM = 10 ;
      else   SSNUM = dt[0].ssnum ;
      console.info('Sensor num :'+ SSNUM);
  });
  con.query("SELECT count(1) as devnum FROM motestatus  ",
    (err, dt) => {
      if (err) DEVNUM = 10 ;
      else   DEVNUM = dt[0].devnum ;
      console.info('Mote num :'+ DEVNUM);
  });

  con.query("SELECT lastm FROM lastime LIMIT 1 ",
    (err, dt) => {
      if (!err) svtime = moment(dt[0].lastm) ;
      console.info('last time :'+ svtime.format('YYYY-MM-DD HH:mm:ss')) ;
  });
}


con.query( ' delete from motehist where tm < DATE_ADD( now() , interval -12 month)',
        (err,res) => { if(err) console.log(err);  } ) ;

app.listen(port, function(){
    console.log('listening on port:' + port);
});

function getDevs() {
  if (! con.isconn ) {
    con = mysql_dbc.init();
    mysql_dbc.test_open(con);
    con.isconn = true ;
  }
  const cli_dev = new ModbusRTU();
  cli_dev.connectTCP(GWIP, { port: DEVPORT })
  .then( async () => {
      let vincr = (DEVNUM*6 > 100) ? 100 : DEVNUM*6 ;
      let rapdev = [] ;
      await cli_dev.setID(1);
      for (let ii = 1; ii < DEVNUM*6 ; ii += vincr) {
        await cli_dev.readInputRegisters(ii, vincr)
        .then ( (d) => { rapdev = rapdev.concat(d.data) ;})
        .catch( (e) => {
          console.error( "apdev register read error");
          console.info(e);
        });
      }
      cli_dev.close();
//      let rapdev = new Uint16Array(rdev);
      for (let i=0; i < DEVNUM*6  ; i += 6) {
//        if ( rapdev[i] == 0) continue ;
        let d = (Math.floor( i / 6) + 1);
        let vmac = (rapdev[i] & 255).toString(16).padStart(2,'0') +':' + (rapdev[i] >>>8).toString(16).padStart(2,'0') + ':'
                 + (rapdev[i+1] & 255).toString(16).padStart(2,'0') +':' + (rapdev[i+1] >>>8).toString(16).padStart(2,'0') + ':'
                 + (rapdev[i+2] & 255).toString(16).padStart(2,'0') +':' + (rapdev[i+2] >>>8).toString(16).padStart(2,'0') + ':'
                 + (rapdev[i+3] & 255).toString(16).padStart(2,'0') +':' + (rapdev[i+3] >>>8).toString(16).padStart(2,'0') ;
        let vbatt = rapdev[i+5]  ;
        let motestatus = {"seq": d, "mac":vmac, "act" : rapdev[i+4], "batt" : vbatt  };
        try {
          sAct[d][0] = rapdev[i+4] ;
        } catch (e) {
            console.error(d, " seq value") ;
        }
        if (rapdev[i+4] > 0) {
          con.query('UPDATE motestatus SET MAC = ?, ACT = ? , BATT = ?  where seq = ? ',[motestatus.mac, motestatus.act, motestatus.batt, d],
           (err, res) => { if (err) console.error("Update motestatus :", err); }
          );
        } else {
          con.query('UPDATE motestatus  SET MAC = ?,ACT = 0  where seq = ?  ',[ motestatus.mac,  d],
           (err, res) => { if (err) console.error("Update motestatus :"); }
          );
        }
      }
  })
  .catch((e) => {
    console.error("getDevs() connect error");
    console.info(e);
  });

}

async function insTemp() {

  let rtags = new Uint16Array(5) ;
  client.close();
  let motearr = new Array() ;
  const today = nextt ;  //moment();
  const tm = today.format('YYYY-MM-DD HH:mm:ss');

  client.connectTCP(GWIP, { port: TAGPORT })
  .then( async () => {
     await client.setID(1);

    //  async () => {

      await  client.readInputRegisters(1, SSNUM)
      .then ( (d) => {
        rtags = new Uint16Array(d.data);

        rtags.forEach ( (e,i) => {
          if (sAct[i+1][0] != 2 || e > 5000 || e == 9 ) e = 0 ;
          if (sAct[i+1][5] != 'Y' ) motearr.push( [i+1, sAct[i+1][0], sAct[i+1][1], sAct[i+1][2], sAct[i+1][3], e / 10, tm ]) ;
        })
      })
      .catch( (e) => {
        console.error( " ** register read error **");
        console.info(e);
      });

  })
  .then(() => {
    if ( motearr.length > 0 ) {
        con.query('INSERT INTO moteinfo (seq, act, bno, stand, batt, temp, tm  ) values ?', [motearr],
         (err, res) => { if(err) {console.error(err); console.log(motearr); }}
        );
     }
       con.query('UPDATE lastime SET lastm = ? ', [ tm ],
       (err, res) => {
                        if(err) {
                          console.log("update lastime :"+ err);
                        }
                    }
       );
       con.query('UPDATE motestatus A, moteinfo B, tb_stand2 c  SET  a.status = ( case when b.temp > c.temp_d then 2 when b.temp > c.temp_w then 1 ELSE 0 END ) \
                    WHERE A.seq = b.seq AND a.stand = c.stand AND b.tm = (SELECT lastm FROM lastime ) ',
                    (err, res) => {
                                     if(err) {
                                       console.log("update motestatus :"+ err);
                                     }
                                 }
        );
  })
  .catch((e) => {
    console.error("insTemp()  error 발생");
    console.info(e);
  });
}

let csec =  moment().get('second') ;

getMeasure() ;
client.connectTCP(GWIP, { port: TAGPORT }) ;

async () => { while (sAct[1][0] == "undefined")  await sleep(1000) ; }

let nextt = moment( moment().set({'second': Math.ceil( csec / MEAS ) * MEAS, 'millisecond':0 }) );

setTimeout( main2_loop,  2000) ;

// setTimeout( main_loop,  nextt - moment() ) ;
setTimeout( main_loop,  2500 ) ;
setInterval(() => {
  con.query('INSERT INTO motehist (pkey, bno, seq, batt, act, stand, temp, tm) \
             select pkey, bno, seq, batt, act, stand, temp, tm \
             from moteinfo x where not exists (select 1 from motehist where pkey = x.pkey) ',
   (err, res) => { if(err) console.log(err); }
 );
}, 30000) ;
setInterval(() => {
  con.query( ' delete from moteinfo where tm < DATE_ADD( now() , interval -24 HOUR)',
          (err,res) => { if(err) console.log(err); } ) ;
}, 600000) ;

async function main_loop() {
  // console.info(nextt) ;
  // let tm1 = moment();
  insTemp() ;
  await sleep(2000) ;
  csec =  moment().get('second') ;
  nextt = moment( moment().set({'second': Math.ceil( csec / MEAS ) * MEAS, 'millisecond':0 }) );

  // let tm2 = moment();
  // let delay = MEAS * 1000 - (nextt - tm1) - 10 ;
  setTimeout( main_loop,  nextt - moment() ) ;

}

async function main2_loop() {
  let tm1 = new Date() ;
  await getDevs();
  let tm2 = new Date() ;
  let delay = 1000 - (tm2 - tm1) - 10 ;
  setTimeout( main2_loop,  delay) ;
}

process.on('uncaughtException', function (err) {
	//예상치 못한 예외 처리
	// console.error('uncaughtException 발생 : ' + err.stack);
  con.end() ;
  con.isconn = false ;
});
