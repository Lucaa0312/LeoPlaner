import * as echarts from 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js';

// Create the echarts instance
var temperatureChart = echarts.init(document.getElementById('temperatureChart'));
var costChart = echarts.init(document.getElementById('costChart'));

const socket = new WebSocket("http://localhost:8080/api/algorithm/progress");

// Draw the charts
temperatureChart.setOption({
  title: {
    text: 'Temperatur/Iteration Diagramm'
  },
  tooltip: {},
  grid: {
    containLabel: true
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: 10000
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 1000
  },
  series: [
    {
      type: 'line',
      smooth: true,
      data: []
    }
  ]
});

// Draw the charts
costChart.setOption({
  title: {
    text: 'Kosten/Iteration Diagramm'
  },
  tooltip: {},
  grid: {
    containLabel: true
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: 10000
  },
  yAxis: {
    type: 'log',
    min: 1,
    minorSplitLine: { show: true }
  },
  series: [
    {
      type: 'line',
      smooth: true,
      data: []
    }
  ]
});


var temperatureChartData = [];
var costChartData = [];
socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log(data)

  temperatureChartData.push([data.iteration, data.temperature]);
  costChartData.push([data.iteration, data.currentCost]);

  temperatureChart.setOption({
  series: [
    {
      data: temperatureChartData,
      type: 'line',
      smooth: true
    }
  ]
  });

  costChart.setOption({
  series: [
    {
      data: costChartData,
      type: 'line',
      smooth: true
    }
  ]
  });
};