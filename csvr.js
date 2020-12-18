"use strict";

let GWIP = process.env.GWIP || "192.168.0.233" ;
let port = process.env.RESTPORT || 9977 ;
let PLACE = process.env.PLACE || 0 ;  // 0.공장  1.수리장
console.info( "GateWay :" , GWIP  );

const moment = require('moment') ;
const express    = require('express');

const app        = express();
const net = require('net');

app.use(express.json()) ;

const mysql_dbc = require('./db/db_con')();
let con = mysql_dbc.init();
mysql_dbc.test_open(con);
con.isconn = true ;

require('date-utils');

let MEAS = 10;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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


app.get('/reset_ob', (req, res) => {
   res.send('<h2>Sensor OB reset</h2>\n');
   if (req.query.seq != null) {
      console.info('Sensor OB reset :' + req.query.seq);
      moteOBReset(req.query.seq) ;
   } else {
     console.error('Sensor OB reset sensor No not input !!');
   }
});

app.get('/chart_sq/:sq/:ftm/:ttm', (req, res) => {

  let fdt = moment(req.params.ftm,["YYYYMMDDHHmmss","YYYYMMDD"]).format('YYYY-MM-DD HH:mm:ss') ;
  let tdt = moment(req.params.ttm,["YYYYMMDDHHmmss","YYYYMMDD"]).format('YYYY-MM-DD HH:mm:ss') ;
  let whereStr = "a.seq = " + req.params.sq ;

  if (req.params.ftm ) whereStr += " and a.tm between '" + fdt + "' and '" + tdt + "'" ;
  console.log(whereStr);
  con.query(
      "SELECT a.temp atemp,  date_format(a.tm,'%m-%d %T') tm  FROM motehist a \
      where  " + whereStr ,
    (err, dt) => {
      if (!err) {
        // motesmac = JSON.parse(JSON.stringify(dt)) ;
        let rdata = [];
        let tdata = [];
        let cat = [];
        dt.forEach((e,i) => {
          tdata.push(e.atemp);
          cat.push(e.tm);
        }) ;
        rdata.push( { name : req.params.sq , data: tdata });

        let sdata =  JSON.stringify( {
          series : rdata,
          categorie: cat} );
        res.send(sdata);
      } else res.send(err);
  });

});

app.get('/chart_stand/:stand/:ftm', (req, res) => {

  let fdt = moment(req.params.ftm,["YYYYMMDDHHmmss","YYYYMMDD"]).format('YYYY-MM-DD HH:mm:ss') ;

  let whereStr = "a.standno = " + req.params.stand ;
  if (req.params.ftm ) whereStr += " and a.tm = '" +fdt +  "'" ;
   console.log("1",whereStr);
  con.query(
      "SELECT substr(a.stand,-1) tb, a.temp temp,date_format(a.tm,'%m-%d %T') tm  FROM moteinfo a  where standno = ? and tm = ? "  ,[req.params.stand,fdt],
    (err, dt) => {
      if (!err) {
        // motesmac = JSON.parse(JSON.stringify(dt)) ;
        let rdata = {} ;

        dt.forEach((e,i) => {
          if (e.tb == 'T' )
            { rdata.top = [e.tm, e.temp] ; }
          else
            { rdata.bottom = [e.tm, e.temp] ; }
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
console.log(req.params, fdt,tdt);
  // if ( req.params.ftm > req.params.ttm ) tdt = moment(fdt).format('YYYY-MM-DD HH:mm:ss') ;
  let whereStr = "a.standno = " + req.params.stand ;
  if (req.params.ftm ) whereStr += " and a.tm between '" +fdt + "' and '" + tdt + "'" ;
  console.log("2" ,whereStr);
  con.query(
      "SELECT a.temp atemp, b.temp btemp, date_format(a.tm,'%m-%d %T') tm  FROM moteinfo a , moteinfo b \
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
        rdata[0].name = "TOP" ;
        rdata[0].data = tdata ;

        rdata.push( { name : "BOTTOM", data: bdata });

        let sdata =  JSON.stringify( {
          series : rdata,
          categorie: cat} );
        res.json(sdata);
      } else res.send(err);
  });


});


let BATTL = 3500 ;

app.listen(port, function(){
    console.log('listening on port:' + port);
});

process.on('uncaughtException', function (err) {
	// 예상치 못한 예외 처리
	console.error('uncaughtException 발생 ' , err.stack);
  // con.end() ;
  // mysql_dbc.test_open(con);
  // con.isconn = false ;
});
