Date.prototype.hhmmss = function() {
    var hh = this.getHours().toString();
    var mm = this.getMinutes().toString();
    var ss = this.getSeconds().toString();
    return (hh[1] ? hh : "0" + hh[0]).concat( (mm[1] ? mm : "0" + mm[0]) , (ss[1] ? ss : "0" + ss[0]));
};
Date.prototype.yyyymmdd = function() {
     var yyyy = this.getFullYear().toString();
     var mm = (this.getMonth() + 1).toString();
     var dd = this.getDate().toString();
     return  yyyy.concat( (mm[1] ? mm : "0" + mm[0]) , (dd[1] ? dd : "0" + dd[0]));
 };
let chart ;
let standno=0 ;
let chartx = {
    chart: {
        height: 180 ,
        // borderColor: '#000000',
        // borderWidth : 1,
        zoomType: 'x',
        type: 'spline',
        plotBackgroundColor: '#FFFFFF',
        shadow: true,
        global: {
          useUTC: false
        },
        // events: {
        //   render: function() {
        //     let chart = this,
        //       maxT = chart.series[0].dataMax,
        //       maxB = chart.series[1].dataMax;
        //     if (chart.yAxis[0].plotLinesAndBands.length > 0) {
        //       chart.yAxis[0].plotLinesAndBands.forEach(function(plot) { plot.destroy()})
        //     }
        //     chart.yAxis[0].addPlotLine({
        //         value: maxT,
        //         color: 'green',
        //         width: 1,
        //         label: {
        //           text: null
        //         }
        //       }),
        //       chart.yAxis[0].addPlotLine({
        //         value: maxB,
        //         color: 'red',
        //         width: 1,
        //         label: {
        //           text: null
        //         }
        //       })
        //   }
        // }

    },
    exporting: {
      enabled:false
    },
    title: {
        text: null
    },
    credits: {
        enabled: false
    },
    legend: {
      enabled: false,
      verticalAlign: 'top',
      align: 'right'


    },
    // subtitle: {
    //     text: 'Source: DawinICT.com'
    // },
    xAxis: {
      tickInterval: 5,
      gridLineWidth: 1,
      type: 'datetime',
      // labels: {
      //   overflow: 'justify'
      // },
      // dateTimeLabelFormats: {
      //     hour: '%H.%M'
      // },
      //
      labels: {
        formatter: function () {
                       return (this.value.substr(6,5));
                    },
        style:{
          fontSize: "0.8em"
        }
      },

      // categories: []
    },
    yAxis: {
        title: {
            text: null
        },
        labels: {
            formatter: function () {
                return Highcharts.numberFormat(this.value, 0);
            }
        },
        max:90,
        plotLines: [{
          color: 'red', // Color value
//          dashStyle: 'longdashdot', // Style of the plot line. Default to solid
          value: 0, // Value of where the line will appear
          zIndex: 3,
          width: 1 // Width of the line
         },
         {
           color: '#F3AB01', // Color value
           value: 0, // Value of where the line will appear
           zIndex: 3,
           width: 1 // Width of the line
          },
        ]
    },

    tooltip: {
        crosshairs: true,
        shared: true,
        outside: true,
        positioner: function(labelWidth, labelHeight, point) {
           var tooltipX = point.plotX + 20;
           var tooltipY = point.plotY - 30;
           return {
               x: tooltipX,
               y: this.chart.plotHeight
           };
       }

    },
    plotOptions: {

      line:{
          enableMouseTracking: false,
      },

        // spline: {
        //     marker: {
        //         radius: 3,
        //         lineColor: '#666666',
        //         lineWidth: 1
        //     }
        // },
        // bar: { showInLegend: false },
        // series: {
        //   marker: {
        //       lineWidth: 1
        //   }
        // }
    },
    series: [{
      name: '',
        lineWidth: 2,
        marker: {
            symbol: 'square'
        },
        color: '#2a6ab8',
        data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6]

    }, {
      name: '',
        lineWidth: 2,
        marker: {
            symbol: 'diamond'
        },
        color: '#8532a8',
        data: [3.8, 4.2, 5.7, 8.5, 11.9, 15.2, 17.0, 16.6, 14.2, 10.3, 6.6, 4.8]
    }]
};
const today = new Date() ;
const bday = new Date() ;

bday.setDate(today.getDate() - 1) ;
const tm = today.yyyymmdd() + today.hhmmss();
const btm = bday.yyyymmdd() + bday.hhmmss();


chart = Highcharts.chart('container',chartx );
 // setTimeout( standWD(1), 200);
// setTimeout( changesize(300,1,12,"20200602125100"), 500);

function changesize(h,sq,intv,tm) {
  chartx.chart.height = h ;
  standWD(sq) ;
  initChart(sq,intv,tm) ;

  // setTimeout( chart.setSize(null,h) ,500);
}

function initChart(sq,intv , tm) {
   $.ajax({
      url: "http://" +  location.hostname + ":9977/chart_stand/"+ sq + "/" + intv +"/" + tm ,
      type: 'GET',
      async: true,
      dataType: "json",
      success: function (data) {
        let obj = JSON.parse(data);
        // console.log("len->",obj.series.length, data );
        chartx.series[0].data = obj.series[0].data ;
        chartx.series[1].data = obj.series[1].data ;

        // chartx.plotOptions.series.pointStart = obj.series[0].data[0][0] ;
        chartx.xAxis.categories = obj.categorie ;
        chartx.xAxis.tickInterval = obj.series[0].data.length / 10 ;

        chart = Highcharts.chart('container',chartx );


      }
    });
}

function updChart(sq,tm) {
  const urls = "http://" +  location.hostname + ":9977/chart_stand/"+ sq + "/" + tm ;
   $.ajax({
      url: urls,
      type: 'GET',
      async: true,
      dataType: "json",
      success: function (data) {
        let obj = JSON.parse(data);
        // console.log("data ->" ,data, obj);

        chart.series[0].addPoint(obj.top,true,true) ;
        chart.series[1].addPoint(obj.bottom,true,true) ;
        // chart.xAxis.categories.push(obj.top[0]);
        // chart.update(chartx.xAxis.categories);
      }
    });
}

function standWD(sq) {

  const urls = "http://" +  location.hostname + ":9977/chart_stand/"+ sq  ;
   $.ajax({
      url: urls,
      type: 'GET',
      async: true,
      dataType: "json",
      error : function(error) {
        console.error(error);
      },
      success: function (data) {
        let obj = JSON.parse(data);
        console.log("data ->" ,data, obj);

        chartx.yAxis.plotLines[0].value = obj.t_d ;
        chartx.yAxis.plotLines[1].value = obj.b_d ;
        chartx.yAxis.max = Math.max(obj.t_d, obj.b_d)  + 5 ;
      }
    });
}
