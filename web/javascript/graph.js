import * as echarts from 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js';

// Create the echarts instance
//var temperatureChart = echarts.init(document.getElementById('temperatureChart'));
var costChart = echarts.init(document.getElementById('costChart'));

const slider = document.getElementById('temperatureSlider');
let isUserTouchingSlider = false;

slider.onmousedown = () => { isUserTouchingSlider = true; };
slider.onmouseup = () => { isUserTouchingSlider = false; };

const socket = new WebSocket("http://localhost:8080/api/algorithm/progress");

// Draw the charts
/*temperatureChart.setOption({
  title: {
    text: 'Temperatur/Iteration Diagramm'
  },
  tooltip: {},
  grid: {
    containLabel: true,
    left: '1%',
    bottom: '10%',
    top: '25%',
    right: '15%'
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: 10000,
    name: 'Iterationen',
    nameLocation: 'middle',
    nameGap: 30,
    nameTextStyle: {fontWeight: 'bold'}
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 1000,
    name: 'Temperatur',
    nameGap: 30,
    nameTextStyle: {fontWeight: 'bold'}
  },
  visualMap: {
    show: false,
    type: 'continuous',
    dimension: 1,
    min: 0,
    max: 1000,
    inRange: {
      color: ['#4F46E5', '#F59E0B']
    }
  },
  series: [
    {
      type: 'line',
      smooth: true,
      sampling: 'lttb',
      symbol: 'none',
      data: [],
      markPoint: {
          symbol: 'circle',
          symbolSize: 10,
          label: {
            show: true,
            fontWeight: 'bold',
            position: 'top'
          }
      },
      lineStyle: { //Strich dicker und leuchter leicht (optional)
        width: 4,
        shadowBlur: 15,
        shadowColor: 'rgb(255, 192, 192)',
        shadowOffsetY: 0,
        opacity: 1
      }
    }
  ]
});*/

// Draw the charts
costChart.setOption({
  title: {
    text: 'Kosten/Iteration Diagramm'
  },
  tooltip: {},
  grid: {
    containLabel: true,
    left: '7%',
    bottom: '10%',
    top: '25%',
    right: '15%'
  },
  xAxis: {
    type: 'value',
    name: 'Iterationen',
    nameLocation: 'middle',
    nameGap: 20,
    nameTextStyle: {fontWeight: 'bold'}
  },
  yAxis: {
    type: 'log',
    name: 'Kosten',
    nameGap: 20,
    nameTextStyle: {fontWeight: 'bold'}
  },
  visualMap: {
    show: false,
    dimension: 1,
    min: 5000,
    max: 5000000,
    inRange: {
      color: ['#4F46E5', '#F59E0B']
    }
  },
  series: [
    {
      type: 'line',
      smooth: true,
      sampling: 'lttb',
      symbol: 'none',
      data: [],
      markPoint: {
          symbol: 'circle',
          symbolSize: 10,
          label: {
            show: true,
            fontWeight: 'bold',
            position: 'top',
            distance: 15
          }
      },
      lineStyle: { //Strich dicker und leuchter leicht (optional)
        width: 4,
        shadowBlur: 15,
        shadowColor: 'rgb(255, 192, 192)',
        shadowOffsetY: 0,
        opacity: 1
      }
    }
  ]
});

// Get data
//var temperatureChartData = [];
var costChartData = [];

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log(data)

  //temperatureChartData.push([data.iteration, data.temperature]);
  costChartData.push([data.iteration, data.currentCost]);

  /*temperatureChart.setOption({
  series: [
    {
      data: temperatureChartData,
      markPoint: {
        data: []
      }
    }
  ]
  });*/

  costChart.setOption({
  series: [
    {
      data: costChartData,
      markPoint: {
        data: []
      }
    }
  ]
  });

  if (!isUserTouchingSlider) {
    slider.value = data.temperature;
  }
  
  if(data.status == 'finished' || data.iteration >= 10000) {
      /*temperatureChart.setOption({
        series: [
          {
            markPoint: {
              data: [
                {name: 'Anfang', coord: temperatureChartData[0], value: temperatureChartData[0][1], itemStyle: {color: '#F59E0B'}, label: {formatter: 'Start: {c}', distance: 40}},
                {name: 'Ende', coord: [data.iteration, data.temperature], value: data.temperature, itemStyle: {color: '#4F46E5'}, label: {formatter: 'Ende: {c}'}}
              ]
            }
          }
        ]
      });*/

      costChart.setOption({
        series: [
          {
            markPoint: {
              data: [
                {name: 'Anfang', coord: costChartData[0], value: costChartData[0][1], itemStyle: {color: '#F59E0B'}, label: {formatter: 'Start: {c}'}},
                {name: 'Ende', coord: [data.iteration, data.currentCost], value: data.currentCost, itemStyle: {color: '#4F46E5'}, label: {formatter: 'Ende: {c}'}},
                {type: 'min', name: 'Min', itemStyle: {color: '#0728a2'}, label: {formatter: 'Min: {c}', position: 'bottom'}}
              ]
            }
          }
        ]
      });
  }
};

// Clear charts
export function clearCharts() {
  //temperatureChartData = [];
  costChartData = [];
}

// Slider
window.addEventListener('load', () => {
    slider.value = 1000;
    slider.style.setProperty('--thumb-color', '#F59E0B');
});

function interpolateColor(color1, color2, factor) {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  const rNew = Math.round(r1 + factor * (r2 - r1));
  const gNew = Math.round(g1 + factor * (g2 -g1));
  const bNew = Math.round(b1 + factor * (b2 - b1));

  return `rgb(${rNew}, ${gNew}, ${bNew})`
}

slider.addEventListener('input', () => {
  const percent = slider.value / 1000;

  const newColor = interpolateColor('#4F46E5', '#F59E0B', percent);
  console.log(newColor);
  slider.style.setProperty('--thumb-color', newColor);
})

// Send data
slider.addEventListener('input', (event) => {
    const val = event.target.value;
    socket.send(val);  
});