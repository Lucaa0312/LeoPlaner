// @ts-ignore
import * as echarts from "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js";
import { load, getRandomizedTimeTable, clearLayout } from "./timetable.js";
import { getElement, aquireElement } from "../utils/elementHelpers.js";
let toggledAdvanced = false;
// Create the echarts instance
const costChartElement = getElement("costChart");
const costChart = costChartElement ? echarts.init(costChartElement) : null;
const slider = getElement("temperatureSlider");
const tooltip = getElement("tooltip");
const hintBox = getElement("hintBox");
let isUserTouchingSlider = false;
if (slider) {
    slider.onmousedown = () => {
        isUserTouchingSlider = true;
    };
    slider.onmouseup = () => {
        isUserTouchingSlider = false;
    };
}
const socket = new WebSocket("http://localhost:8080/api/algorithm/progress");
// Draw the chart
costChart?.setOption({
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
    //console.log(data);
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
        costChart?.setOption({
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
    if (!isUserTouchingSlider && slider) {
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
    costChart?.setOption({
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
let optimizedBefore = false;
function initializeChart() {
    console.log("Fetching data:");
    fetch("http://localhost:8080/api/isAlgorithmRunningAtLeastOnce")
        .then(response => {
        return response.json();
    }).then(didRun => {
        console.log("data:");
        console.log(didRun);
        optimizedBefore = didRun;
        if (didRun) {
            fetch("http://localhost:8080/api/get/algorithmHistory")
                .then(response => {
                return response.json();
            }).then((data) => {
                console.log(data);
                if (data && data.length > 0) {
                    let lastIterationFromServerHolder = 0;
                    let totalIterationsHolder = 0;
                    let processedHistory = [];
                    for (const item of data) {
                        const currentIteration = item.iteration <= 0 ? 1 : item.iteration;
                        if (currentIteration < lastIterationFromServerHolder * 0.1 && lastIterationFromServerHolder > 0) {
                            totalIterationsHolder += lastIterationFromServerHolder;
                        }
                        lastIterationFromServerHolder = currentIteration;
                        processedHistory.push([currentIteration + totalIterationsHolder, item.cost]);
                    }
                    costChartData = processedHistory;
                    totalIterations = totalIterationsHolder;
                    lastIterationFromServer = lastIterationFromServerHolder;
                    costChart?.setOption({
                        series: [
                            {
                                data: costChartData,
                                markPoint: {
                                    data: []
                                }
                            }
                        ]
                    });
                }
            }).catch(error => {
                console.error('Error Fetching Algorithm History:', error);
            });
        }
    }).catch(error => {
        console.error('Error Fetching Algorithm Running:', error);
    });
}
initializeChart();
// Clear chart
const costDisplay = aquireElement("cost-container");
export function clearCharts() {
    costChartData = [];
    totalIterations = 0;
    lastIterationFromServer = 0;
    lastCost = 0;
    costChart?.setOption({
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
    if (slider) {
        slider.value = "1000";
        slider.style.setProperty("--thumb-color", "#F59E0B");
    }
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
if (slider) {
    slider.addEventListener("input", () => {
        updateSlider();
        const percent = Number(slider.value) / 1000;
        const newColor = interpolateColor("#4F46E5", "#F59E0B", percent);
        console.log(newColor);
        slider.style.setProperty("--thumb-color", newColor);
    });
}
function updateSlider(temperature) {
    if (!slider || !tooltip)
        return;
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
if (slider) {
    slider.addEventListener("input", (event) => {
        const target = event.target;
        const val = target?.value;
        if (!val)
            return;
        socket.send("temperature:" + val);
    });
}
// Pause algorithm
let paused = false;
let isStarting = false;
let reloadedPage = true;
const randomizeButton = aquireElement("randomizeButton");
const optimizeButton = aquireElement("optimizeButton");
optimizeButton.addEventListener("click", handleOptimizeButton);
async function handleOptimizeButton() {
    if (isStarting)
        return;
    if (!toggledAdvanced) {
        if (hintBox) {
            hintBox.style.display = "flex";
        }
        try {
            fetch("http://localhost:8080/api/run/toggleAutomaticMode");
            optimizedBefore = true;
            paused = false;
            reloadedPage = false;
            optimizeButton.innerHTML = "Wird optimiert...";
            randomizeButton.style.opacity = "0.5";
            clearLayout();
        }
        catch (error) {
            console.log("Error while starting algorithm: ", error);
        }
        finally {
            isStarting = false;
        }
    }
    else {
        if (!optimizedBefore) {
            console.log("why here");
            isStarting = true;
            try {
                fetch("http://localhost:8080/api/run/algorithmAllClasses");
                optimizedBefore = true;
                paused = false;
                reloadedPage = false;
                optimizeButton.innerHTML = "Pausiere die Optimierung";
                randomizeButton.style.opacity = "0.5";
                clearLayout();
            }
            catch (error) {
                console.log("Error while starting algorithm: ", error);
            }
            finally {
                isStarting = false;
            }
            return;
        }
        if (paused || reloadedPage) {
            console.log("yes here");
            console.log("ALGORITHM RESUMED");
            paused = false;
            reloadedPage = false;
            optimizeButton.innerHTML = "Pausiere die Optimierung";
            randomizeButton.style.opacity = "0.5";
            randomizeButton.removeEventListener("click", getRandomizedTimeTable);
            costDisplay.style.display = "none";
            socket.send("resume");
        }
        else {
            console.log("ALGORITHM PAUSED");
            paused = true;
            optimizeButton.innerHTML = "Setze die Optimierung fort";
            randomizeButton.style.opacity = "1";
            randomizeButton.addEventListener("click", getRandomizedTimeTable);
            load();
            costDisplay.style.display = "block";
            costDisplay.innerHTML = "Kosten: " + lastCost;
            socket.send("pause");
        }
    }
}
const advancedButton = getElement("advancedButton");
const advancedButtonText = getElement("advancedButtonText");
const graphContainer = getElement("graph-container");
const graphButtonContainer = document.createElement("div");
advancedButton?.addEventListener("click", () => {
    if (!toggledAdvanced) {
        const graphButton = document.createElement("button");
        graphButtonContainer.classList.add("button");
        graphButton.classList.add("graphButton");
        graphButton.classList.add("buttonStyle");
        graphButton.textContent = "Diagramm";
        graphButtonContainer.appendChild(graphButton);
        graphContainer?.insertBefore(graphButtonContainer, advancedButton);
        if (advancedButtonText) {
            advancedButtonText.textContent = "Einfacher Stundenplan";
        }
        toggledAdvanced = true;
    }
    else {
        graphButtonContainer.querySelector("button")?.remove();
        graphButtonContainer.remove();
        if (advancedButtonText) {
            advancedButtonText.textContent = "Stundenplan für Fortgeschrittene";
        }
        toggledAdvanced = false;
    }
});
let optionsToggled = false;
const optionButton = getElement("optionButton");
const optionContainer = document.createElement("div");
optionButton?.addEventListener("click", (event) => {
    const rect = optionButton.getBoundingClientRect();
    const topZoneHeight = window.innerHeight * 0.05;
    const clickY = event.clientY - rect.top;
    if (clickY > topZoneHeight)
        return;
    if (!optionsToggled) {
        const searchBar = document.createElement("div");
        searchBar.setAttribute("id", "search-bar");
        searchBar.style.width = "10vw";
        searchBar.style.borderRadius = "0.4vw";
        const inputField = document.createElement("input");
        inputField.setAttribute("id", "input-field");
        inputField.type = "text";
        inputField.placeholder = "Nach Lehrern suchen";
        inputField.style.fontSize = "1rem";
        inputField.style.textAlign = "right";
        const searchIcon = document.createElement("img");
        searchIcon.setAttribute("id", "search-icon");
        searchIcon.src = "../assets/img/magnifyingGlass.png";
        searchIcon.alt = "Suchsymbol";
        const classButton = document.createElement("button");
        classButton.classList.add("button");
        classButton.classList.add("optionSubButton");
        classButton.style.display = "flex";
        classButton.style.justifyContent = "space-between";
        classButton.style.alignItems = "center";
        classButton.style.padding = "0 1rem";
        const classText = document.createElement("span");
        classText.textContent = "Klassen";
        const svgContainer = document.createElement("div");
        svgContainer.innerHTML = '<svg width="12" height="23" viewBox="0 0 12 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.70786 0.306362L11.7067 10.7604C11.7997 10.8575 11.8735 10.9728 11.9238 11.0997C11.9741 11.2266 12 11.3626 12 11.5C12 11.6374 11.9741 11.7734 11.9238 11.9003C11.8735 12.0272 11.7997 12.1425 11.7067 12.2396L1.70787 22.6936C1.52025 22.8898 1.26578 23 1.00044 23C0.73511 23 0.480642 22.8898 0.293023 22.6936C0.105403 22.4975 -3.35953e-08 22.2314 -4.57214e-08 21.954C-5.78474e-08 21.6766 0.105403 21.4106 0.293023 21.2144L9.58573 11.5L0.293022 1.78561C0.200122 1.68848 0.12643 1.57317 0.0761529 1.44627C0.0258759 1.31936 -9.53636e-07 1.18334 -9.59641e-07 1.04598C-9.65645e-07 0.908625 0.0258758 0.77261 0.0761529 0.645704C0.12643 0.518799 0.200122 0.40349 0.293022 0.306362C0.385922 0.209234 0.49621 0.132187 0.61759 0.0796222C0.738969 0.0270576 0.869063 -3.7988e-08 1.00044 -4.37308e-08C1.13182 -4.94736e-08 1.26192 0.0270576 1.3833 0.0796222C1.50468 0.132187 1.61496 0.209234 1.70786 0.306362Z" fill="white"/></svg>';
        classButton.appendChild(classText);
        classButton.appendChild(svgContainer);
        searchBar.appendChild(inputField);
        searchBar.appendChild(searchIcon);
        optionContainer.appendChild(searchBar);
        optionContainer.appendChild(classButton);
        optionButton.appendChild(optionContainer);
        optionButton.style.height = "32vh";
        optionsToggled = true;
    }
    else {
        optionButton.style.height = "5vh";
        optionsToggled = false;
        optionContainer.remove();
        optionContainer.innerHTML = "";
    }
});
