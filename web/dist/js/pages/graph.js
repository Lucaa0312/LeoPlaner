// @ts-ignore
import * as echarts from "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js";
import { load, getRandomizedTimeTable, clearLayout } from "./timetable.js";
import { getElement, requireElement } from "../utils/elementHelpers.js";
// Create the echarts instance
const costChartElement = getElement("costChart");
if (!costChartElement) {
    throw new Error("Element with id 'costChart' not found.");
}
const costChart = echarts.init(costChartElement);
const slider = getElement("temperatureSlider");
const tooltip = getElement("tooltip");
if (!slider || !tooltip) {
    throw new Error("Slider or tooltip element not found.");
}
let isUserTouchingSlider = false;
slider.onmousedown = () => {
    isUserTouchingSlider = true;
};
slider.onmouseup = () => {
    isUserTouchingSlider = false;
};
const socket = new WebSocket("http://localhost:8080/api/algorithm/progress");
// Draw the chart
costChart.setOption({
    animation: false,
    title: {
        text: "Kosten/Iteration Diagramm",
        left: "center",
        textStyle: { fontSize: 16, color: "#374151" }
    },
    tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        formatter: (params) => {
            const val = params[0].value;
            return `Iteration: <b>${Math.round(val[0])}</b><br/>Kosten: <b>${val[1].toLocaleString()}</b>`;
        }
    },
    grid: {
        containLabel: true,
        left: "8%",
        bottom: "20%",
        top: "20%",
        right: "10%"
    },
    xAxis: {
        type: "log",
        name: "Iterationen",
        nameLocation: "middle",
        min: 1,
        max: "dataMax",
        nameGap: 30,
        axisLabel: {
            hideOverlap: true,
            formatter: (value) => {
                if (value >= 1000)
                    return value / 1000 + "k";
                return value;
            }
        },
        splitLine: { lineStyle: { color: "#f3f4f6" } }
    },
    yAxis: {
        type: "log",
        name: "Kosten",
        nameGap: 20,
        min: "dataMin",
        max: "dataMax",
        axisLabel: {
            hideOverlap: true,
            formatter: (value) => {
                if (value >= 1000000)
                    return value / 1000000 + "M";
                if (value >= 1000)
                    return value / 1000 + "k";
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
            color: ["#4F46E5", "#F59E0B"]
        }
    },
    series: [
        {
            name: "Kosten",
            type: "line",
            smooth: false,
            sampling: "lttb",
            symbol: "none",
            data: [],
            markPoint: {
                symbol: "circle",
                symbolSize: 10,
                label: {
                    show: true,
                    fontWeight: "bold",
                    position: "top",
                    distance: 15
                }
            },
            lineStyle: {
                width: 3
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "rgba(79, 70, 229, 0.2)" },
                    { offset: 1, color: "rgba(79, 70, 229, 0)" }
                ])
            }
        }
    ],
    dataZoom: [
        {
            type: "inside",
            start: 0,
            end: 100
        },
        {
            type: "slider",
            show: true,
            bottom: "15px",
            height: 18,
            borderColor: "transparent",
            backgroundColor: "#f9fafb",
            fillerColor: "rgba(79, 70, 229, 0.1)",
            showDataShadow: false,
            showDetail: false,
            handleIcon: "roundRect",
            handleSize: "160%",
            handleStyle: {
                color: "#4F46E5",
                borderColor: "#4F46E5",
                borderWidth: 1,
                shadowBlur: 3,
                shadowColor: "rgba(0, 0, 0, 0.1)",
                borderRadius: 2
            },
            moveHandleStyle: {
                color: "#d1d5db",
                opacity: 0.3
            }
        }
    ]
});
// Get data
const INACTIVITY_MS = 500;
const UPDATE_INTERVAL = 100;
let finishTimer = null;
let costChartData = [];
let totalIterations = 0;
let lastIterationFromServer = 0;
let lastCost = 0;
let lastUpdateTime = 0;
let chartRun = false;
socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    console.log(data);
    chartRun = true;
    const currentIteration = data.iteration <= 0 ? 1 : data.iteration;
    if (currentIteration < lastIterationFromServer * 0.1 && lastIterationFromServer > 0) {
        totalIterations += lastIterationFromServer;
    }
    lastIterationFromServer = currentIteration;
    const newIteration = currentIteration + totalIterations;
    const lastPoint = costChartData[costChartData.length - 1];
    if (costChartData.length === 0 || (lastPoint && newIteration > lastPoint[0])) {
        costChartData.push([newIteration, data.currentCost]);
        lastCost = data.currentCost;
    }
    const now = Date.now();
    if (now - lastUpdateTime > UPDATE_INTERVAL) {
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
        lastUpdateTime = now;
    }
    if (!isUserTouchingSlider) {
        slider.value = String(data.temperature);
        updateSlider(data.temperature);
    }
    if (finishTimer !== null) {
        clearTimeout(finishTimer);
    }
    finishTimer = window.setTimeout(() => {
        finalizeChart();
    }, INACTIVITY_MS);
};
// Pinpoint minimum
function finalizeChart() {
    costChart.setOption({
        series: [
            {
                markPoint: {
                    data: [
                        {
                            type: "min",
                            name: "Min",
                            itemStyle: { color: "#0728a2" },
                            label: { formatter: "Min: {c}", position: "bottom" }
                        }
                    ]
                }
            }
        ]
    });
}
// Initialize Chart
function initializeChart() {
    console.log("Fetching data:");
    fetch("http://localhost:8080/api/isAlgorithmRunning")
        .then(response => {
        return response.json();
    }).then(data => {
        console.log("data:");
        console.log(data);
    }).catch(error => {
        console.error('Error Fetching Algorithm History:', error);
    });
    /*fetch("http://localhost:8080/api/algorithmHistory")
          .then(response => {
              return response.json()
          }).then(data => {
              console.log("data:");
              console.log(data);
          }).catch(error => {
              console.error('Error Fetching Algorithm History:', error)
          })*/
}
initializeChart();
// Clear chart
const costDisplay = requireElement("cost-container");
export function clearCharts() {
    costChartData = [];
    totalIterations = 0;
    lastIterationFromServer = 0;
    lastCost = 0;
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
    costDisplay.style.display = "none";
}
// Slider
window.addEventListener("load", () => {
    slider.value = "1000";
    slider.style.setProperty("--thumb-color", "#F59E0B");
});
function interpolateColor(color1, color2, factor) {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    const rNew = Math.round(r1 + factor * (r2 - r1));
    const gNew = Math.round(g1 + factor * (g2 - g1));
    const bNew = Math.round(b1 + factor * (b2 - b1));
    return `rgb(${rNew}, ${gNew}, ${bNew})`;
}
slider.addEventListener("input", () => {
    updateSlider();
    const percent = Number(slider.value) / 1000;
    const newColor = interpolateColor("#4F46E5", "#F59E0B", percent);
    console.log(newColor);
    slider.style.setProperty("--thumb-color", newColor);
});
function updateSlider(temperature) {
    let value = parseFloat(slider.value);
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 1000;
    if (temperature !== undefined) {
        value = temperature;
    }
    tooltip.innerHTML = String(value);
    const thumbWidth = 23;
    const percent = 1 - (value - min) / (max - min);
    const offset = (0.5 - percent) * thumbWidth;
    tooltip.style.left = `calc(${percent * 100}% + (${offset}px))`;
}
// Send data
slider.addEventListener("input", (event) => {
    const target = event.target;
    const val = target?.value;
    if (!val)
        return;
    socket.send("temperature:" + val);
});
let paused = false;
const optimizeButton = getElement("optimizeButton");
// Pause algorithm
const randomizeButton = requireElement("randomizeButton");
optimizeButton?.addEventListener("click", () => {
    if (chartRun) {
        if (paused) {
            paused = false;
            optimizeButton.innerHTML = "Pausiere die Optimierung";
            randomizeButton.style.opacity = "0.5";
            randomizeButton.removeEventListener("click", getRandomizedTimeTable);
            clearLayout();
            if (costDisplay) {
                costDisplay.style.display = "none";
            }
        }
        else {
            load();
            paused = true;
            optimizeButton.innerHTML = "Setze die Optimierung fort";
            randomizeButton.style.opacity = "1";
            randomizeButton.addEventListener("click", getRandomizedTimeTable);
            if (costDisplay) {
                costDisplay.style.display = "block";
                costDisplay.innerHTML = "Kosten: " + lastCost;
            }
        }
        socket.send("toggle");
    }
});
