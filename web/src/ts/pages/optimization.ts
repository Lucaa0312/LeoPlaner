// @ts-ignore
import * as echarts from "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js";

import { initAppShell, setRunningDot } from "../components/appShell.js";
import { createActionButton, createPageHeader } from "../components/pageHeader.js";
import { createTemperatureGauge } from "../components/temperatureGauge.js";
import type { TemperatureGauge } from "../components/temperatureGauge.js";
import {
    fetchIsAlgorithmRunning,
    fetchIsAlgorithmRunningAtLeastOnce,
    startAlgorithm,
    stopAlgorithm,
    toggleAutomaticMode,
} from "../api/algorithmApi.js";
import { getJson } from "../utils/apiHelpers.js";
import { WS_BASE_URL } from "../utils/apiBase.js";
import { aquireElement } from "../utils/elementHelpers.js";
import { readSetting, removeSetting } from "../utils/storage.js";

// How the backend behaves (it must not change):
// - The first run is started with GET run/algorithmAllClasses.
// - Pause and Stopp both end the loop. Every later start is the socket message "resume".
// - In automatic mode the backend stops by itself and sends "finished". This page never uses it:
//   a run always goes on until Stopp. The mode can only be toggled, not read, so an older build
//   of this page remembered in localStorage when it had switched it on.

type Status = "idle" | "running" | "paused" | "done";

type ProgressMessage = {
    iteration: number;
    temperature: number;
    currentCost: number;
    finished: boolean;
};

type HistoryEntry = {
    iteration: number;
    temperature: number;
    cost: number;
};

// keys written by older builds of this page, only read once to clean up
const OLD_MODE_KEY = "leoplaner-optimization-mode";
const OLD_AUTO_MODE_KEY = "leoplaner-automatic-mode";
const CHART_UPDATE_INTERVAL_MS = 100;
// no progress for this long (pause, stop, end of a run): the minimum gets marked
const MIN_MARK_DELAY_MS = 500;
// the backend starts every run at this temperature (INITIAL_TEMPERATURE in SimulatedAnnealingAlgorithm)
const START_TEMPERATURE = 100;
// root font size the chart sizes below were designed for (see essentials.css)
const BASE_ROOT_FONT_SIZE = 14;

let status: Status = "idle";
let ranBefore = false;

let socket: WebSocket | null = null;

let chart: echarts.ECharts | null = null;
let chartData: [number, number][] = [];
let totalIterations = 0;
let lastIterationFromServer = 0;
let lastChartUpdate = 0;
let chartRootFontSize = BASE_ROOT_FONT_SIZE;
let minMarkTimer: number | null = null;
let minMarkShown = false;

let startButton: HTMLButtonElement | null = null;
let pauseButton: HTMLButtonElement | null = null;
let stopButton: HTMLButtonElement | null = null;
let statusBadge: HTMLElement | null = null;
let chartElement: HTMLElement | null = null;
let chartEmptyText: HTMLElement | null = null;
let temperatureGauge: TemperatureGauge | null = null;

// Switches the backend's automatic mode off if an older build of this page left it on.
async function switchOffRememberedAutomaticMode(): Promise<void> {
    if (readSetting(OLD_AUTO_MODE_KEY) === "true") {
        try {
            await toggleAutomaticMode();
        } catch (error) {
            console.error("Fehler beim Ausschalten des automatischen Modus:", error);
            return;
        }
    }

    removeSetting(OLD_AUTO_MODE_KEY);
    removeSetting(OLD_MODE_KEY);
}

function formatStatus(): string {
    if (status === "running") {
        return "Läuft";
    } else if (status === "paused") {
        return "Pausiert";
    } else if (status === "done") {
        return "Beendet";
    }
    return "Bereit";
}

// ------------------PAGE------------------

function buildPage(): void {
    const page = aquireElement<HTMLElement>("page");

    const header = createPageHeader({
        kicker: "Simulated Annealing",
        title: "Optimierung",
        actions: [],
    });

    page.replaceChildren(header, buildControlArea());
}

function buildControlArea(): HTMLElement {
    const area = document.createElement("div");
    area.className = "optimization-area";

    const controls = document.createElement("section");
    controls.className = "card controls-card";

    startButton = createActionButton({ id: "start", icon: "ti-player-play", label: "Start", primary: true });
    startButton.addEventListener("click", handleStartClick);

    pauseButton = createActionButton({ id: "pause", icon: "ti-player-pause", label: "Pause", primary: false });
    pauseButton.addEventListener("click", handlePauseClick);

    stopButton = createActionButton({ id: "stop", icon: "ti-player-stop", label: "Stopp", primary: false });
    stopButton.addEventListener("click", handleStopClick);

    statusBadge = document.createElement("span");
    statusBadge.className = "badge";

    const buttons = document.createElement("div");
    buttons.className = "page-actions";
    buttons.append(startButton, pauseButton, stopButton);

    controls.append(buttons, statusBadge);

    const chartCard = document.createElement("section");
    chartCard.className = "card chart-card";

    const chartHeader = document.createElement("div");
    chartHeader.className = "card-header";

    const chartTitle = document.createElement("span");
    chartTitle.className = "card-title";
    chartTitle.textContent = "Verlauf der Kosten";

    const resetZoomButton = document.createElement("button");
    resetZoomButton.type = "button";
    resetZoomButton.className = "link-btn";
    resetZoomButton.innerHTML = `<i class="ti ti-zoom-reset"></i>`;
    resetZoomButton.append("Zoom zurücksetzen");
    resetZoomButton.addEventListener("click", handleResetZoomClick);

    chartHeader.append(chartTitle, resetZoomButton);

    const chartWrapper = document.createElement("div");
    chartWrapper.className = "chart-wrapper";

    chartElement = document.createElement("div");
    chartElement.className = "cost-chart";

    chartEmptyText = document.createElement("div");
    chartEmptyText.className = "chart-empty muted";
    chartEmptyText.textContent = "Starte die Optimierung, um den Verlauf zu sehen.";

    chartWrapper.append(chartElement, chartEmptyText);
    chartCard.append(chartHeader, chartWrapper);

    area.append(controls, chartCard, buildTemperatureCard());
    return area;
}

function buildTemperatureCard(): HTMLElement {
    const card = document.createElement("section");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = "Temperatur";

    header.appendChild(title);

    temperatureGauge = createTemperatureGauge(START_TEMPERATURE, handleTemperatureChange);

    const hint = document.createElement("span");
    hint.className = "muted";
    hint.textContent = "Höher = mehr Ausprobieren. Ziehen, auf das Thermometer klicken oder Pfeiltasten benutzen. Änderungen wirken sofort, auch während eines laufenden Durchgangs.";

    card.className = "card temperature-card";
    card.append(header, temperatureGauge.element, hint);
    return card;
}

// ------------------RENDER------------------

function render(): void {
    renderControls();
    setRunningDot(status === "running");
}

function renderControls(): void {
    if (!startButton || !pauseButton || !stopButton || !statusBadge) {
        return;
    }

    const startLabel = startButton.querySelector("span");
    if (startLabel) {
        if (status === "paused") {
            startLabel.textContent = "Fortsetzen";
        } else if (status === "done") {
            startLabel.textContent = "Neu starten";
        } else {
            startLabel.textContent = "Start";
        }
    }

    if (status === "running") {
        startButton.disabled = true;
    } else {
        startButton.disabled = false;
    }

    if (status === "running") {
        pauseButton.disabled = false;
    } else {
        pauseButton.disabled = true;
    }

    if (status === "running" || status === "paused") {
        stopButton.disabled = false;
    } else {
        stopButton.disabled = true;
    }

    statusBadge.replaceChildren();
    if (status === "running") {
        const dot = document.createElement("span");
        dot.className = "status-dot";
        statusBadge.appendChild(dot);
    }
    statusBadge.append(formatStatus());
}

// ------------------ACTIONS------------------

function handleStartClick(): void {
    if (status === "running") {
        return;
    }

    if (status !== "paused") {
        clearChart();
    }
    runAlgorithm();
}

function handlePauseClick(): void {
    if (status !== "running") {
        return;
    }

    sendToSocket("pause");
    status = "paused";
    render();
}

async function handleStopClick(): Promise<void> {
    if (status !== "running" && status !== "paused") {
        return;
    }

    try {
        await stopAlgorithm();
    } catch (error) {
        console.error("Fehler beim Stoppen:", error);
    }
    status = "done";
    render();
}

// The very first run uses REST, every later one resumes over the socket (see top of file).
function runAlgorithm(): void {
    status = "running";
    render();

    if (!ranBefore) {
        ranBefore = true;
        // not awaited on purpose: the request only returns when the run is over
        void startFirstRun();
    } else {
        sendToSocket("resume");
    }
}

async function startFirstRun(): Promise<void> {
    try {
        await startAlgorithm();
    } catch (error) {
        console.error("Fehler beim Starten der Optimierung:", error);
        status = "idle";
        render();
    }
}

// ------------------SOCKET------------------

function openSocket(): void {
    socket = new WebSocket(`${WS_BASE_URL}/algorithm/progress`);
    socket.addEventListener("message", handleSocketMessage);
}

function sendToSocket(message: string): void {
    if (!socket) {
        return;
    }

    const openSocketRef = socket;

    function handleOpen(): void {
        openSocketRef.send(message);
    }

    if (openSocketRef.readyState === WebSocket.OPEN) {
        openSocketRef.send(message);
    } else {
        openSocketRef.addEventListener("open", handleOpen, { once: true });
    }
}

function handleSocketMessage(event: MessageEvent<string>): void {
    const progress = JSON.parse(event.data) as ProgressMessage;

    if (progress.finished) {
        if (status === "running") {
            status = "done";
            render();
        }
        updateChart(true);
        return;
    }

    // A run that was already going when the page was opened. After Pause or Stopp
    // a few late messages can still arrive, they must not switch back to running.
    if (status === "idle") {
        status = "running";
        render();
    }

    addChartPoint(progress.iteration, progress.currentCost);
    updateChart(false);
    scheduleMinMark();

    if (temperatureGauge) {
        temperatureGauge.setTemperature(progress.temperature);
    }
}

// ------------------CHART------------------

// Every resumed loop starts counting at 0 again, so the iterations are added up.
function addChartPoint(iterationFromServer: number, cost: number): void {
    let iteration = iterationFromServer;
    if (iteration <= 0) {
        iteration = 1;
    }

    if (lastIterationFromServer > 0 && iteration < lastIterationFromServer * 0.1) {
        totalIterations = totalIterations + lastIterationFromServer;
    }
    lastIterationFromServer = iteration;

    const point: [number, number] = [iteration + totalIterations, cost];
    const lastPoint = chartData[chartData.length - 1];

    if (!lastPoint || point[0] > lastPoint[0]) {
        chartData.push(point);
    }
}

function clearChart(): void {
    chartData = [];
    totalIterations = 0;
    lastIterationFromServer = 0;
    hideMinMark();
    updateChart(true);
}

function readToken(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// The tokens are oklch colors; the canvas turns them into rgb so a transparency can be added.
function withAlpha(color: string, alpha: number): string {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) {
        return color;
    }

    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const pixel = context.getImageData(0, 0, 1, 1).data;
    return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${alpha})`;
}

function formatShortNumber(value: number): string {
    return value.toLocaleString("de-AT", { maximumFractionDigits: 1 });
}

function formatAxisValue(value: number): string {
    if (value >= 1000000) {
        return `${formatShortNumber(value / 1000000)}M`;
    } else if (value >= 1000) {
        return `${formatShortNumber(value / 1000)}k`;
    }
    return formatShortNumber(value);
}

type TooltipParam = {
    value: [number, number];
};

function formatTooltip(params: TooltipParam[]): string {
    const first = params[0];
    if (!first) {
        return "";
    }

    const iteration = Math.round(first.value[0]).toLocaleString("de-AT");
    const cost = first.value[1].toLocaleString("de-AT");
    return `Iteration: <b>${iteration}</b><br/>Kosten: <b>${cost}</b>`;
}

type MarkLabelParam = {
    value: number;
};

function formatMinLabel(param: MarkLabelParam): string {
    return `Min: ${param.value.toLocaleString("de-AT")}`;
}

function readRootFontSize(): number {
    const size = parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (Number.isNaN(size)) {
        return BASE_ROOT_FONT_SIZE;
    }
    return size;
}

// echarts works in pixels, so its sizes follow the root font size like the rest of the page.
function scaleToRoot(size: number): number {
    return (size * chartRootFontSize) / BASE_ROOT_FONT_SIZE;
}

function initChart(): void {
    if (!chartElement) {
        return;
    }

    if (chart) {
        chart.dispose();
    }

    chart = echarts.init(chartElement);
    chartRootFontSize = readRootFontSize();

    const muted = readToken("--mu");
    const ink = readToken("--ink");
    const line = readToken("--ln");
    const surface = readToken("--sf");
    const surface2 = readToken("--sf2");
    // echarts cannot mix oklch colors in a gradient, so these two are passed as rgb
    const accent = withAlpha(readToken("--ac"), 1);
    const high = withAlpha(readToken("--chart-high"), 1);

    chart.setOption({
        animation: false,
        textStyle: { fontSize: scaleToRoot(12) },
        grid: {
            containLabel: true,
            left: scaleToRoot(16),
            right: scaleToRoot(32),
            top: scaleToRoot(36),
            bottom: scaleToRoot(64),
        },
        tooltip: {
            trigger: "axis",
            formatter: formatTooltip,
            backgroundColor: surface,
            borderColor: line,
            textStyle: { color: ink, fontSize: scaleToRoot(13) },
        },
        xAxis: {
            type: "log",
            name: "Iterationen",
            nameLocation: "middle",
            nameGap: scaleToRoot(28),
            min: 1,
            max: "dataMax",
            nameTextStyle: { color: muted, fontSize: scaleToRoot(12) },
            axisLabel: { color: muted, fontSize: scaleToRoot(12), hideOverlap: true, formatter: formatAxisValue },
            axisLine: { lineStyle: { color: line } },
            splitLine: { lineStyle: { color: line } },
        },
        yAxis: {
            type: "log",
            name: "Kosten",
            nameGap: scaleToRoot(16),
            min: "dataMin",
            max: "dataMax",
            nameTextStyle: { color: muted, fontSize: scaleToRoot(12) },
            axisLabel: { color: muted, fontSize: scaleToRoot(12), hideOverlap: true, formatter: formatAxisValue },
            axisLine: { lineStyle: { color: line } },
            splitLine: { lineStyle: { color: line } },
        },
        dataZoom: [
            { type: "inside", start: 0, end: 100 },
            {
                type: "slider",
                show: true,
                bottom: scaleToRoot(8),
                height: scaleToRoot(18),
                borderColor: "transparent",
                backgroundColor: surface2,
                fillerColor: withAlpha(accent, 0.15),
                showDataShadow: false,
                showDetail: false,
                handleStyle: { color: surface, borderColor: accent },
                moveHandleStyle: { color: line },
            },
        ],
        series: [
            {
                name: "Kosten",
                type: "line",
                symbol: "none",
                sampling: "lttb",
                data: chartData,
                // The y axis is logarithmic, so top to bottom is high to low order of magnitude:
                // high costs orange, low costs in the accent color.
                lineStyle: {
                    width: scaleToRoot(3),
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: high },
                        { offset: 1, color: accent },
                    ]),
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: withAlpha(accent, 0.2) },
                        { offset: 1, color: withAlpha(accent, 0) },
                    ]),
                },
                markPoint: {
                    symbol: "circle",
                    symbolSize: scaleToRoot(10),
                    itemStyle: { color: accent },
                    label: {
                        show: true,
                        position: "top",
                        align: "right",
                        distance: scaleToRoot(8),
                        color: ink,
                        fontSize: scaleToRoot(12),
                        fontWeight: "bold",
                        formatter: formatMinLabel,
                    },
                    data: [],
                },
            },
        ],
    });

    if (minMarkShown) {
        showMinMark();
    }
}

function updateChart(force: boolean): void {
    const now = Date.now();
    if (!force && now - lastChartUpdate < CHART_UPDATE_INTERVAL_MS) {
        return;
    }
    lastChartUpdate = now;

    if (chart) {
        chart.setOption({ series: [{ data: chartData }] });
    }

    if (chartEmptyText) {
        if (chartData.length < 2) {
            chartEmptyText.classList.remove("hidden");
        } else {
            chartEmptyText.classList.add("hidden");
        }
    }
}

async function loadHistory(): Promise<void> {
    let history: HistoryEntry[] = [];
    try {
        history = await getJson<HistoryEntry[]>("/get/algorithmHistory");
    } catch (error) {
        console.error("Fehler beim Laden des Verlaufs:", error);
        return;
    }

    for (const entry of history) {
        addChartPoint(entry.iteration, entry.cost);
    }
    updateChart(true);
    scheduleMinMark();
}

// The minimum is marked once no progress arrived for a moment, like in the former graph.
function scheduleMinMark(): void {
    if (minMarkTimer !== null) {
        window.clearTimeout(minMarkTimer);
    }
    minMarkTimer = window.setTimeout(handleMinMarkTimeout, MIN_MARK_DELAY_MS);
}

function handleMinMarkTimeout(): void {
    minMarkTimer = null;
    updateChart(true);
    showMinMark();
}

function showMinMark(): void {
    if (!chart || chartData.length < 2) {
        return;
    }

    minMarkShown = true;
    chart.setOption({
        series: [{ markPoint: { data: [{ type: "min", name: "Min" }] } }],
    });
}

function hideMinMark(): void {
    if (minMarkTimer !== null) {
        window.clearTimeout(minMarkTimer);
        minMarkTimer = null;
    }

    minMarkShown = false;
    if (chart) {
        chart.setOption({ series: [{ markPoint: { data: [] } }] });
    }
}

function handleResetZoomClick(): void {
    if (chart) {
        chart.dispatchAction({ type: "dataZoom", start: 0, end: 100 });
    }
}

function handleThemeChange(): void {
    initChart();
}

// The card height is only final after fonts and the thermometer are laid out, and the sidebar
// can be collapsed, so the chart follows the size of its own element.
function handleChartElementResize(): void {
    if (chart) {
        chart.resize();
    }
}

function handleWindowResize(): void {
    if (!chart) {
        return;
    }

    // A new root font size changes every chart size, so the chart is built again.
    if (readRootFontSize() !== chartRootFontSize) {
        initChart();
    } else {
        chart.resize();
    }
}

// ------------------TEMPERATURE------------------

function handleTemperatureChange(temperature: number): void {
    sendToSocket(`temperature:${temperature}`);
}

// ------------------START------------------

async function loadState(): Promise<void> {
    try {
        ranBefore = await fetchIsAlgorithmRunningAtLeastOnce();
    } catch {
        ranBefore = false;
    }

    let running = false;
    try {
        running = await fetchIsAlgorithmRunning();
    } catch {
        running = false;
    }

    if (running) {
        status = "running";
    }

    if (ranBefore) {
        await loadHistory();
    }
}

async function initializeApp(): Promise<void> {
    initAppShell("optimization");
    buildPage();
    initChart();
    render();
    openSocket();

    document.addEventListener("themechange", handleThemeChange);
    window.addEventListener("resize", handleWindowResize);
    if (chartElement) {
        const resizeObserver = new ResizeObserver(handleChartElementResize);
        resizeObserver.observe(chartElement);
    }

    await switchOffRememberedAutomaticMode();
    await loadState();
    render();
}

document.addEventListener("DOMContentLoaded", initializeApp);
