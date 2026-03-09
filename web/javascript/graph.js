import * as echarts from 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js';

// Create the echarts instance
//var temperatureChart = echarts.init(document.getElementById('temperatureChart'));
var costChart = echarts.init(document.getElementById('costChart'));

const slider = document.getElementById('temperatureSlider');
const tooltip = document.getElementById('tooltip');
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
  animation: false,
  title: {
    text: 'Kosten/Iteration Diagramm',
    left: 'center',
    textStyle: { fontSize: 16, color: '#374151' }
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    formatter: params => {
      let val = params[0].value;
      return `Iteration: <b>${Math.round(val[0])}</b><br/>Kosten: <b>${val[1].toLocaleString()}</b>`;
    }
  },
  grid: {
    containLabel: true,
    left: '8%',
    bottom: '20%',
    top: '20%',
    right: '10%'
  },
  xAxis: {
    type: 'log',
    name: 'Iterationen',
    nameLocation: 'middle',
    nameGap: 30,
    axisLabel: {
      hideOverlap: true,
      formatter: (value) => {
        if (value >= 1000) return (value / 1000) + 'k';
        return value;
      }
    },
    splitLine: { lineStyle: { color: '#f3f4f6' } }
  },
  yAxis: {
    type: 'log',
    name: 'Kosten',
    nameGap: 20,
    axisLabel: {
      hideOverlap: true,
      formatter: (value) => {
        if (value >= 1000000) return (value / 1000000) + 'M';
        if (value >= 1000) return (value / 1000) + 'k';
        return value;
      }
    }
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
      name: 'Kosten',
      type: 'line',
      smooth: false,
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
      lineStyle: {
        width: 3
      },
      areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(79, 70, 229, 0.2)' },
        { offset: 1, color: 'rgba(79, 70, 229, 0)' }
      ])
      }
    }
  ],
  dataZoom: [
    {
      type: 'inside',
      start: 0,
      end: 100
    },
    {
      type: 'slider',
      show: true,
      bottom: '15px',
      height: 18,
      borderColor: 'transparent',
      backgroundColor: '#f9fafb',
      fillerColor: 'rgba(79, 70, 229, 0.1)',
      showDataShadow: false,
      showDetail: false,
      handleIcon: 'roundRect',
      handleSize: '160%',
      handleStyle: {
        color: '#4F46E5',
        borderColor: '#4F46E5',
        borderWidth: 1,
        shadowBlur: 3,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 2
      },
      moveHandleStyle: {
        color: '#d1d5db',
        opacity: 0.3
      }
    }
  ]
});

// Get data
//var temperatureChartData = [];
var costChartData = [];
let finishTimer = null;
const INACTIVITY_MS = 500;
let lastMaxIteration = 0;
let totalIterations = 0;

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log(data)

  //temperatureChartData.push([data.iteration, data.temperature]);
  const currentIteration = data.iteration <= 0 ? 1 : data.iteration;
  const newIteration = currentIteration + totalIterations;
  costChartData.push([newIteration, data.currentCost]);

  lastMaxIteration = newIteration;

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
    updateSlider(data.temperature);
  }

  clearTimeout(finishTimer);

  finishTimer = setTimeout(() => {
    finalizeChart();
  }, INACTIVITY_MS);
};

function finalizeChart() {
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

      totalIterations += lastMaxIteration; 

      costChart.setOption({
        series: [
          {
            markPoint: {
              data: [
                {type: 'min', name: 'Min', itemStyle: {color: '#0728a2'}, label: {formatter: 'Min: {c}', position: 'bottom'}}
              ]
            }
          }
        ]
      });
}

// Clear charts
export function clearCharts() {
  //temperatureChartData = [];
  //costChartData = [];
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
  updateSlider();
  const percent = slider.value / 1000;

  const newColor = interpolateColor('#4F46E5', '#F59E0B', percent);
  console.log(newColor);
  slider.style.setProperty('--thumb-color', newColor);
})

function updateSlider(temperature) {
  let value = parseFloat(slider.value);
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 1000;

  if(temperature) {
      value = temperature;
  }    

  tooltip.innerHTML = value;

  const thumbWidth = 23;

  const percent = 1 - (value - min) / (max - min);
  const offset = (0.5 - percent) * thumbWidth;
  tooltip.style.left = `calc(${percent * 100}% + (${offset}px))`
}

// Send data
slider.addEventListener('input', (event) => {
    const val = event.target.value;
    socket.send(val);  
});