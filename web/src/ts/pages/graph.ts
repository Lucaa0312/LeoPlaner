// @ts-ignore
import * as echarts from "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js";
import { loadTimetable, getRandomizedTimeTable, clearLayout, getTimetableByTeacher, getTimetableByRoom, getTimetableByClass } from "./timetable.js";
import { getElement, aquireElement } from "../utils/elementHelpers.js";

let toggledAdvanced = false;

// Create the echarts instance
let costChart: echarts.ECharts | null = null;

let slider: HTMLInputElement | null = null;
let tooltip: HTMLElement | null = null;
const hintBox = getElement<HTMLElement>("hintBox");

let isUserTouchingSlider = false;

const socket = new WebSocket("http://localhost:8080/api/algorithm/progress");

// Draw the chart
function drawChart() {
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
        formatter: (params: Array<{ value: [number, number] }>) => {
            const val = params[0]!.value;
            return `Iteration: <b>${Math.round(val[0])}</b><br/>Kosten: <b>${val[1].toLocaleString()}</b>`;
        }
    },
    grid: {
        containLabel: true,
        left: "8%",
        bottom: "23%",
        top: "20%",
        right: "10%"
    },
    xAxis: {
        type: "log",
        name: "Iterationen",
        nameLocation: "middle",
        min: 1,
        max: "dataMax",
        nameGap: 10,
        axisLabel: {
            hideOverlap: true,
            formatter: (value: number) => {
                if (value >= 1000) return value / 1000 + "k";
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
            formatter: (value: number) => {
                if (value >= 1000000) return value / 1000000 + "M";
                if (value >= 1000) return value / 1000 + "k";
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
            bottom: "30px",
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
}

// Get data
const INACTIVITY_MS = 500;
const UPDATE_INTERVAL = 100;
let finishTimer: number | null = null;

let costChartData: [number, number][] = [];
let totalIterations = 0;
let lastIterationFromServer = 0;
let lastCost = 0;
let lastUpdateTime = 0;
let chartRun = false;

type SocketMessageData = {
    iteration: number;
    temperature: number;
    currentCost: number;
};

socket.onmessage = function (event: MessageEvent<string>) {
    const data = JSON.parse(event.data) as SocketMessageData;
    //console.log(data);
    chartRun = true;

    const currentIteration = data.iteration <= 0 ? 1 : data.iteration;

    if (currentIteration < lastIterationFromServer * 0.1 && lastIterationFromServer > 0) {
        totalIterations += lastIterationFromServer;
    }
    lastIterationFromServer = currentIteration;

    const newIteration = currentIteration + totalIterations;

    const lastPoint = costChartData[costChartData.length - 1];
    if(costChartData.length === 0 || (lastPoint && newIteration > lastPoint[0])) {
        costChartData.push([newIteration, data.currentCost]);
        lastCost = data.currentCost;
    }

    const now = Date.now();
    if(now - lastUpdateTime > UPDATE_INTERVAL) {
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
function finalizeChart(): void {
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
            return response.json()
        }).then(didRun => {
            console.log("data:");
            console.log(didRun);
            optimizedBefore = didRun;
            if(didRun) {
                fetch("http://localhost:8080/api/get/algorithmHistory")
                    .then(response => {
                        return response.json()
                    }).then((data: { iteration: number, cost: number}[]) => {
                        console.log(data);
                        if(data && data.length > 0) {
                            let lastIterationFromServerHolder = 0;
                            let totalIterationsHolder = 0;
                            let processedHistory: [number, number][] = [];

                            for(const item of data) {
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
                        console.error('Error Fetching Algorithm History:', error)
                    })
            }
        }).catch(error => {
            console.error('Error Fetching Algorithm Running:', error)
        })
}

// Clear chart
const costDisplay = aquireElement<HTMLElement>("cost-container");
export function clearCharts(): void {
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

function interpolateColor(color1: string, color2: string, factor: number): string {
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

function updateSlider(temperature?: number): void {
    if (!slider || !tooltip) return;

    let value = parseFloat(slider.value);
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 1000;

    if (temperature !== undefined) {
        value = temperature;
        slider.value = String(value);
    }

    const percent = (value - min) / (max - min);
    const thumbColor = interpolateColor("#4F46E5", "#F59E0B", percent);
    slider.style.setProperty("--thumb-color", thumbColor);

    tooltip.innerHTML = String(value);

    const thumbWidth = 23;
    const sliderPercent = 1 - percent;
    const offset = (0.5 - sliderPercent) * thumbWidth;
    tooltip.style.left = `calc(${sliderPercent * 100}% + (${offset}px))`;
}

// Pause algorithm
let paused = false;
let isStarting = false;
let reloadedPage = true;
const randomizeButton = aquireElement<HTMLElement>("randomizeButton");
const optimizeButton = aquireElement<HTMLElement>("optimizeButton");
optimizeButton.addEventListener("click", handleOptimizeButton);
async function handleOptimizeButton() {
    if (isStarting) return;

    if (!toggledAdvanced) {
    if (hintBox) {
        hintBox.style.display = "flex";
    }
    try {
    if (!optimizedBefore) {
        await fetch("http://localhost:8080/api/toggleAutomaticMode");
        await fetch("http://localhost:8080/api/run/algorithmAllClasses");
        optimizedBefore = true;
        paused = false;
        reloadedPage = false;
        optimizeButton.innerHTML = "Optimierungsfortschritt anzeigen";
        randomizeButton.style.opacity = "0.5";
        setAdvancedButtonDisabled(true);
        clearLayout();
    } else if (paused || reloadedPage) {
        await fetch("http://localhost:8080/api/toggleAutomaticMode");
        await fetch("http://localhost:8080/api/run/algorithmAllClasses");
        paused = false;
        reloadedPage = false;
        optimizeButton.innerHTML = "Optimierungsfortschritt anzeigen";
        randomizeButton.style.opacity = "0.5";
        setAdvancedButtonDisabled(true);
        clearLayout();
    } else {
        await fetch("http://localhost:8080/api/toggleAutomaticMode");
        paused = true;
        optimizeButton.innerHTML = "Optimierung fortsetzen";
        randomizeButton.style.opacity = "1";
        setAdvancedButtonDisabled(false);
        loadTimetable();
        if (hintBox) {
            hintBox.style.display = "none";
        }
    }
    } catch (error) {
        console.log("Error while toggling algorithm: ", error);
    } finally {
        isStarting = false;
    }
    return;
    }

    if (!optimizedBefore) {
        isStarting = true;
        try {
            fetch("http://localhost:8080/api/run/algorithmAllClasses");
            optimizedBefore = true;
            paused = false;
            reloadedPage = false;
            optimizeButton.innerHTML = "Pausiere die Optimierung";
            randomizeButton.style.opacity = "0.5";
            setAdvancedButtonDisabled(true);
            clearLayout();
        } catch (error) {
            console.log("Error while starting algorithm: ", error);
        } finally {
            isStarting = false;
        }

        return;
    }

    if (paused || reloadedPage) {
        clearLayout();
        console.log("ALGORITHM RESUMED");
        paused = false;
        reloadedPage = false;
        optimizeButton.innerHTML = "Pausiere die Optimierung";
        randomizeButton.style.opacity = "0.5";
        setAdvancedButtonDisabled(true);
        randomizeButton.removeEventListener("click", getRandomizedTimeTable);
        costDisplay.style.display = "none";
        socket.send("resume");
    } else {
        console.log("ALGORITHM PAUSED");
        paused = true;
        optimizeButton.innerHTML = "Setze die Optimierung fort";
        randomizeButton.style.opacity = "1";
        setAdvancedButtonDisabled(false);
        randomizeButton.addEventListener("click", getRandomizedTimeTable);
        loadTimetable();
        costDisplay.style.display = "block";
        costDisplay.innerHTML = "Kosten: " + lastCost;
        socket.send("pause");
    }
}

const advancedButton = getElement<HTMLElement>("advancedButton");
const advancedButtonText = getElement<HTMLElement>("advancedButtonText");
const graphContainer = getElement<HTMLElement>("graph-container");
const graphButtonContainer = document.createElement("div");
const graphButton = document.createElement("button");

advancedButton?.addEventListener("click", () => {
    if (!toggledAdvanced) {
        optimizeButton.textContent = "Optimierung starten";
        graphButtonContainer.classList.add("button");
        graphButton.setAttribute("id", "graphButton");
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
        clearGraphBox();
        optimizeButton.textContent = "Stundenplan optimieren";
        graphButtonContainer.querySelector("button")?.remove();
        graphButtonContainer.remove();
        if (advancedButtonText) {
            advancedButtonText.textContent = "Stundenplan für Fortgeschrittene";
        }
        toggledAdvanced = false;
    }
});

let optionsToggled = false;
let singleOptionToggled = false;
let returningFromSingleOption = false;
const optionButton = getElement<HTMLElement>("optionButton");
const optionContainer = document.createElement("div");

optionButton?.addEventListener("click", (event: MouseEvent) => {
    if (singleOptionToggled) return;

    const rect = optionButton.getBoundingClientRect();
    const topZoneHeight = window.innerHeight * 0.05;
    const clickY = event.clientY - rect.top;
    if (clickY > topZoneHeight) return;

    if (!optionsToggled) {
        optionsToggled = true;
        hideAdvancedButton();
        optionButton.style.height = "29vh";
        const addButtons = () => {
            const searchBar = document.createElement("div");
            searchBar.setAttribute("id", "search-bar");
            searchBar.style.width = "15vw";
            searchBar.style.borderRadius = "0.4vw";

            const inputField = document.createElement("input");
            inputField.setAttribute("id", "input-field");
            inputField.type = "text";
            inputField.placeholder = "Stundenplan suchen";
            inputField.style.fontSize = "1rem";
            inputField.style.textAlign = "right";

            const searchIcon = document.createElement("img");
            searchIcon.setAttribute("id", "search-icon");
            searchIcon.src = "../assets/img/magnifyingGlass.png";
            searchIcon.alt = "Suchsymbol";        

            searchBar.appendChild(inputField);
            searchBar.appendChild(searchIcon);
            optionContainer.appendChild(searchBar);

            let array = ["Klassen", "Lehrkräfte", "Räume"];
            for(let i = 0; i < array.length; i++) {
                const classButton = document.createElement("button");
                classButton.classList.add("button");
                classButton.classList.add("optionSubButton");
                classButton.style.display = "flex";
                classButton.style.justifyContent = "space-between";
                classButton.style.alignItems = "center";
                classButton.style.padding = "0 1rem";

                if(i == 0) {
                    classButton.style.marginTop = "3vh";
                }

                classButton.addEventListener("click", () => {
                    showSingleOption(array[i] + "");
                });
                const classText = document.createElement("span");
                classText.textContent = array[i] + "";
            
                const svgContainer = document.createElement("div");
                svgContainer.innerHTML = '<svg width="12" height="23" viewBox="0 0 12 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.70786 0.306362L11.7067 10.7604C11.7997 10.8575 11.8735 10.9728 11.9238 11.0997C11.9741 11.2266 12 11.3626 12 11.5C12 11.6374 11.9741 11.7734 11.9238 11.9003C11.8735 12.0272 11.7997 12.1425 11.7067 12.2396L1.70787 22.6936C1.52025 22.8898 1.26578 23 1.00044 23C0.73511 23 0.480642 22.8898 0.293023 22.6936C0.105403 22.4975 -3.35953e-08 22.2314 -4.57214e-08 21.954C-5.78474e-08 21.6766 0.105403 21.4106 0.293023 21.2144L9.58573 11.5L0.293022 1.78561C0.200122 1.68848 0.12643 1.57317 0.0761529 1.44627C0.0258759 1.31936 -9.53636e-07 1.18334 -9.59641e-07 1.04598C-9.65645e-07 0.908625 0.0258758 0.77261 0.0761529 0.645704C0.12643 0.518799 0.200122 0.40349 0.293022 0.306362C0.385922 0.209234 0.49621 0.132187 0.61759 0.0796222C0.738969 0.0270576 0.869063 -3.7988e-08 1.00044 -4.37308e-08C1.13182 -4.94736e-08 1.26192 0.0270576 1.3833 0.0796222C1.50468 0.132187 1.61496 0.209234 1.70786 0.306362Z" fill="white"/></svg>';
            
                classButton.appendChild(classText);
                classButton.appendChild(svgContainer);
                optionContainer.appendChild(classButton);
            }

            optionButton.appendChild(optionContainer);
        };
        if (returningFromSingleOption) {
            returningFromSingleOption = false;
            addButtons();
        } else {
            setTimeout(addButtons, 200);
        }
    }
    else {
        optionsToggled = false;
        showAdvancedButton();
        optionButton.style.height = "5vh";
        optionContainer.innerHTML = "";
    }
});

function showSingleOption(option: string): void {
    if (!optionButton) return;
    singleOptionToggled = true;

    optionButton.innerHTML = `
        <div style="display: flex; justify-content: flex-start; align-items: center; width: 100%;">
        <svg id="optionBackButton" width="19" height="27" viewBox="0 0 19 27" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.2959 26.6404L0.464319 14.3683C0.317121 14.2543 0.200349 14.1189 0.120677 13.9699C0.0410055 13.821 1.3102e-06 13.6613 1.31724e-06 13.5C1.32429e-06 13.3387 0.0410055 13.179 0.120677 13.03C0.200349 12.8811 0.317121 12.7457 0.464319 12.6317L16.2959 0.359641C16.5929 0.129367 16.9959 -8.76041e-08 17.416 -6.92404e-08C17.8361 -5.08767e-08 18.239 0.129367 18.536 0.359641C18.8331 0.589916 19 0.902235 19 1.22789C19 1.55355 18.8331 1.86587 18.536 2.09614L3.82259 13.5L18.536 24.9039C18.6831 25.0179 18.7998 25.1532 18.8794 25.3022C18.959 25.4512 19 25.6109 19 25.7721C19 25.9334 18.959 26.093 18.8794 26.242C18.7998 26.391 18.6831 26.5263 18.536 26.6404C18.389 26.7544 18.2143 26.8448 18.0221 26.9065C17.83 26.9682 17.624 27 17.416 27C17.2079 27 17.002 26.9682 16.8098 26.9065C16.6176 26.8448 16.443 26.7544 16.2959 26.6404Z" fill="black"/>
        </svg>
        <p style="width: 100%; display: flex; justify-content: center; align-items: center; margin-right: 0.5vw">${option}</p>
        </div>
    `;

    optionContainer.innerHTML = "";

    const searchBar = document.createElement("div");
    searchBar.setAttribute("id", "search-bar");
    searchBar.style.width = "15vw";
    searchBar.style.borderRadius = "0.4vw";

    const inputField = document.createElement("input");
    inputField.setAttribute("id", "input-field");
    inputField.type = "text";
    inputField.placeholder = `${option} suchen`;
    inputField.style.fontSize = "1rem";
    inputField.style.textAlign = "right";

    const searchIcon = document.createElement("img");
    searchIcon.setAttribute("id", "search-icon");
    searchIcon.src = "../assets/img/magnifyingGlass.png";
    searchIcon.alt = "Suchsymbol";

    const itemDiv = document.createElement("div");
    itemDiv.style.display = "flex";
    itemDiv.style.flexDirection = "column";
    itemDiv.style.gap = "0.5rem";
    itemDiv.style.padding = "0 1rem";
    itemDiv.style.maxHeight = "18rem";
    itemDiv.style.overflowY = "auto";
    itemDiv.style.width = "100%";

    if (option === "Lehrkräfte") {
        loadTeachers(itemDiv);
    } else if (option === "Klassen") {
        loadClasses(itemDiv);
    } else if (option === "Räume") {
        loadRooms(itemDiv);
    }

    searchBar.appendChild(inputField);
    searchBar.appendChild(searchIcon);
    optionContainer.appendChild(searchBar);
    optionButton.appendChild(optionContainer);
    optionButton.appendChild(itemDiv);

    const optionBackButton = getElement<HTMLElement>("optionBackButton");

    optionBackButton?.addEventListener("click", (event: MouseEvent) => {
        if (!optionButton) return;
        optionContainer.innerHTML = "";
        singleOptionToggled = false;
        optionsToggled = false;
        optionButton.innerHTML = "Auswahl";
        returningFromSingleOption = true;
    });
}

let diagramToggled = false;
const graphBox = document.createElement("div");

graphButton?.addEventListener("click", (event: MouseEvent) => {
    const rect = graphButton.getBoundingClientRect();
    const topZoneHeight = window.innerHeight * 0.05;
    const clickY = event.clientY - rect.top;
    if (clickY > topZoneHeight) return;

    if (!diagramToggled) {
        diagramToggled = true;
        hideAdvancedButton();
        graphButton.style.height = "52vh";
        setTimeout(() => {
            graphBox.classList.add("graph-box");

            const costChart2 = document.createElement("div");
            costChart2.setAttribute("id", "costChart");

            const sliderContainer = document.createElement("div");
            sliderContainer.setAttribute("id", "slider-container");

            const tooltipElement = document.createElement("div");
            tooltipElement.setAttribute("id", "tooltip");
            tooltipElement.classList.add("slider-tooltip");
            tooltipElement.textContent = "1000";

            const input = document.createElement("input");
            input.type = "range";
            input.setAttribute("id", "temperatureSlider");
            input.min = "0";
            input.max = "1000";
            input.value = "1000";
            input.autocomplete = "off";

            slider = input;
            tooltip = tooltipElement;
            slider.style.setProperty("--thumb-color", interpolateColor("#4F46E5", "#F59E0B", Number(slider.value) / 1000));
            updateSlider();

            slider.onmousedown = () => {
                isUserTouchingSlider = true;
            };
            slider.onmouseup = () => {
                isUserTouchingSlider = false;
            };

            slider.addEventListener("input", (event: Event) => {
                updateSlider();

                const target = event.target as HTMLInputElement | null;
                const val = target?.value;
                if (!val) return;
                socket.send("temperature:" + val);
            });

            const sliderValues = document.createElement("div");
            sliderValues.setAttribute("id", "slider-values");
            const values = [1000, 500, 0];
            for (const val of values) {
                const sliderValue = document.createElement("div");
                sliderValue.classList.add("slider-value");

                const line = document.createElement("p");
                line.classList.add("slider-line");
                line.textContent = "|";

                const valueText = document.createElement("p");
                valueText.textContent = String(val);

                sliderValue.appendChild(line);
                sliderValue.appendChild(valueText);
                sliderValues.appendChild(sliderValue);
            }

            graphBox.appendChild(costChart2);
            sliderContainer.appendChild(tooltipElement);
            sliderContainer.appendChild(input);
            sliderContainer.appendChild(sliderValues);
            graphBox.appendChild(sliderContainer);
            graphButton.appendChild(graphBox);
            graphBox.style.display = "block";
            if (costChart) {
                echarts.dispose(costChart);
                costChart = null;
            }
            costChart = echarts.init(costChart2);
            drawChart();
            initializeChart();
        }, 300);
    }
    else {
        clearGraphBox();   
    }
});

function clearGraphBox() {
    diagramToggled = false;
    showAdvancedButton();
    graphButton.style.height = "5vh";
    graphBox.style.display = "none";
    graphBox.innerHTML = "";
    slider = null;
    tooltip = null;
}

function hideAdvancedButton() {
    if (optionsToggled && diagramToggled && advancedButton) {
        advancedButton.style.display = "none";
    }
}

function showAdvancedButton() {
    if (advancedButton?.style.display === "none") {
        setTimeout(() => {
            advancedButton.style.display = "flex";
        }, 100);
    }
}

function setAdvancedButtonDisabled(disabled: boolean): void {
    if (!advancedButton) return;
    advancedButton.style.pointerEvents = disabled ? "none" : "auto";
    advancedButton.style.opacity = disabled ? "0.5" : "1";
}

type TeacherItem = {
    id: number;
    teacherName: string;
};
type ClassItem = {
    id: number;
    className: string;
};

type RoomItem = {
    id: number;
    roomName: string;
};

function loadTeachers(itemDiv: HTMLElement): void {
    itemDiv.innerHTML = "";
    const list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";
    list.style.margin = "0";
    list.style.width = "100%";

    itemDiv.appendChild(list);

    fetch(`http://localhost:8080/api/teachers`)
        .then((response) => {
            return response.json() as Promise<TeacherItem[]>;
        })
        .then((data) => {
            console.log(data);
            data.forEach((teach) => {
                const listItem = document.createElement("li");
                listItem.textContent = teach.teacherName;
                listItem.style.padding = "0.5rem 0";
                listItem.style.borderBottom = "1px solid rgba(0,0,0,0.08)";
                listItem.addEventListener("click", () => {
                    getTimetableByTeacher(teach.id + "");
                });
                list.appendChild(listItem);
            });
        })
        .catch((error) => {
            console.error("Error loading all teachers into dropdown: ", error);
            itemDiv.textContent = "Lehrer konnten nicht geladen werden.";
        });
}

function loadClasses(itemDiv: HTMLElement): void {
    itemDiv.innerHTML = "";
    const list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";
    list.style.margin = "0";
    list.style.width = "100%";

    itemDiv.appendChild(list);
    fetch(`http://localhost:8080/api/getAllClasses`)
        .then((response) => {
            return response.json() as Promise<ClassItem[]>;
        })
        .then((data) => {
            data.forEach((clazz) => {
                const listItem = document.createElement("li");
                listItem.textContent = clazz.className;
                listItem.style.padding = "0.5rem 0";
                listItem.style.borderBottom = "1px solid rgba(0,0,0,0.08)";
                listItem.addEventListener("click", () => {
                    getTimetableByClass(clazz.id + "");
                });
                list.appendChild(listItem);
            });
        })
        .catch((error) => {
            console.error("Error loading all classes into dropdown: ", error);
        });
}

function loadRooms(itemDiv: HTMLElement): void {
    itemDiv.innerHTML = "";
    const list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";
    list.style.margin = "0";
    list.style.width = "100%";

    itemDiv.appendChild(list);
    fetch(`http://localhost:8080/api/rooms`)
        .then((response) => {
            return response.json() as Promise<RoomItem[]>;
        })
        .then((data) => {
            data.forEach((room) => {
                const listItem = document.createElement("li");
                listItem.textContent = room.roomName;
                listItem.style.padding = "0.5rem 0";
                listItem.style.borderBottom = "1px solid rgba(0,0,0,0.08)";
                listItem.addEventListener("click", () => {
                    getTimetableByRoom(room.id + "");
                });
                list.appendChild(listItem);
            });
        })
        .catch((error) => {
            console.error("Error loading all rooms into dropdown: ", error);
        });
}