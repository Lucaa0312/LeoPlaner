// @ts-ignore
import * as echarts from "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js";

import { loadTimetable, clearLayout, setWorkbenchState } from "./timetable.js";
import { getElement, aquireElement } from "../utils/elementHelpers.js";
import { THEME_CHANGE_EVENT } from "../components/theme.js";
import { toast } from "../components/toast.js";

// -----------------------------------------------------------------------------
// Optimizer rail: status chip, live cost chart, temperature slider (advanced
// mode) and the optimize / randomize buttons.
//
// Simple mode  = the backend's "automatic mode" (annealing schedule managed by
//                the server).
// Advanced mode = automatic mode off, the user drives the temperature slider.
// -----------------------------------------------------------------------------

const API = "http://localhost:8080/api";

type OptimizerState = "idle" | "running" | "paused" | "done";

let toggledAdvanced = false;
let costChart: echarts.ECharts | null = null;

const slider = aquireElement<HTMLInputElement>("temperatureSlider");
const tooltip = aquireElement<HTMLElement>("tooltip");
const statusChip = aquireElement<HTMLElement>("optimizer-status");
const costDisplay = aquireElement<HTMLElement>("cost-container");
const randomizeButton = aquireElement<HTMLButtonElement>("randomizeButton");
const optimizeButton = aquireElement<HTMLButtonElement>("optimizeButton");
const advanced = aquireElement<HTMLDetailsElement>("advanced");
const hintBox = getElement<HTMLElement>("hintBox");

let isUserTouchingSlider = false;

const socket = new WebSocket("http://localhost:8080/api/algorithm/progress");

// ------------------------------------------------------------ theme colours

function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function chartTheme() {
  return {
    text: token("--color-text-muted", "#64748b"),
    heading: token("--color-heading", "#0f172a"),
    grid: token("--color-divider", "#f1f5f9"),
    axis: token("--color-border-strong", "#cbd5e1"),
    primary: token("--color-primary", "#4f46e5"),
    accent: token("--color-accent", "#f59e0b"),
    surface: token("--color-surface-raised", "#ffffff"),
    sunken: token("--color-surface-sunken", "#f8fafc"),
  };
}

// 4327559 → "4,3M", 5997 → "6k", 850 → "850"
function compact(value: number): string {
  const trim = (n: number) => n.toLocaleString("de-AT", { maximumFractionDigits: 1 });
  if (value >= 1_000_000) return trim(value / 1_000_000) + "M";
  if (value >= 1_000) return trim(value / 1_000) + "k";
  return String(Math.round(value));
}

// Draw / re-draw the chart with the current theme colours. Data is passed
// every time so a re-theme never wipes the series.
function drawChart() {
  const t = chartTheme();
  costChart?.setOption(
    {
      animation: false,
      backgroundColor: "transparent",
      textStyle: { fontFamily: token("--font-sans", "Inter, sans-serif") },
      tooltip: {
        trigger: "axis",
        backgroundColor: t.surface,
        borderColor: t.axis,
        textStyle: { color: t.heading, fontSize: 12 },
        formatter: (params: Array<{ value: [number, number] }>) => {
          const val = params[0]!.value;
          return `Iteration <b>${Math.round(val[0]).toLocaleString("de-AT")}</b><br/>Kosten <b>${val[1].toLocaleString("de-AT")}</b>`;
        },
      },
      grid: {
        containLabel: true,
        left: 8,
        right: 12,
        top: 12,
        bottom: 44,
      },
      xAxis: {
        type: "log",
        name: "Iterationen",
        nameLocation: "middle",
        nameGap: 22,
        nameTextStyle: { color: t.text, fontSize: 11 },
        min: 1,
        max: "dataMax",
        axisLine: { lineStyle: { color: t.axis } },
        axisLabel: {
          hideOverlap: true,
          color: t.text,
          fontSize: 10,
          formatter: (value: number) => compact(value),
        },
        splitLine: { lineStyle: { color: t.grid } },
      },
      yAxis: {
        type: "log",
        name: "Kosten",
        nameTextStyle: { color: t.text, fontSize: 11, align: "left" },
        nameGap: 12,
        min: "dataMin",
        max: "dataMax",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          hideOverlap: true,
          color: t.text,
          fontSize: 10,
          formatter: (value: number) => compact(value),
        },
        splitLine: { lineStyle: { color: t.grid } },
      },
      visualMap: {
        show: false,
        dimension: 1,
        min: 5000,
        max: 5000000,
        inRange: {
          color: [t.primary, t.accent],
        },
      },
      series: [
        {
          name: "Kosten",
          type: "line",
          smooth: false,
          sampling: "lttb",
          symbol: "none",
          data: costChartData,
          markPoint: {
            symbol: "circle",
            symbolSize: 10,
            label: {
              show: true,
              fontWeight: "bold",
              position: "top",
              distance: 15,
              color: t.heading,
            },
          },
          lineStyle: {
            width: 2.5,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: t.primary + "33" },
              { offset: 1, color: t.primary + "00" },
            ]),
          },
        },
      ],
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          show: true,
          bottom: 4,
          height: 14,
          borderColor: "transparent",
          backgroundColor: t.sunken,
          fillerColor: t.primary + "22",
          showDataShadow: false,
          showDetail: false,
          handleIcon: "roundRect",
          handleSize: "160%",
          handleStyle: {
            color: t.primary,
            borderColor: t.primary,
            borderWidth: 1,
            borderRadius: 2,
          },
          moveHandleStyle: {
            color: t.axis,
            opacity: 0.4,
          },
          textStyle: { color: t.text },
        },
      ],
    },
    { notMerge: false },
  );
}

// ----------------------------------------------------------------- data

const INACTIVITY_MS = 500;
const UPDATE_INTERVAL = 100;
let finishTimer: number | null = null;

let costChartData: [number, number][] = [];
let totalIterations = 0;
let lastIterationFromServer = 0;
let lastCost = 0;
let lastUpdateTime = 0;

type SocketMessageData = {
  iteration: number;
  temperature: number;
  currentCost: number;
};

function showCost(cost: number): void {
  if (!cost) {
    costDisplay.hidden = true;
    return;
  }
  costDisplay.hidden = false;
  costDisplay.innerHTML = `<span class="rail__cost-label">Kosten</span><span class="rail__cost-value">${Math.round(cost).toLocaleString("de-AT")}</span>`;
}

socket.onmessage = function (event: MessageEvent<string>) {
  const data = JSON.parse(event.data) as SocketMessageData;

  // messages arriving means the algorithm is running – also after a reload
  if (state !== "running") setState("running");

  const currentIteration = data.iteration <= 0 ? 1 : data.iteration;

  if (
    currentIteration < lastIterationFromServer * 0.1 &&
    lastIterationFromServer > 0
  ) {
    totalIterations += lastIterationFromServer;
  }
  lastIterationFromServer = currentIteration;

  const newIteration = currentIteration + totalIterations;

  const lastPoint = costChartData[costChartData.length - 1];
  if (
    costChartData.length === 0 ||
    (lastPoint && newIteration > lastPoint[0])
  ) {
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
            data: [],
          },
        },
      ],
    });
    showCost(lastCost);
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

socket.onerror = () => {
  console.error("WebSocket connection to the optimizer failed.");
};

// Pinpoint minimum – called once messages stop arriving. If we did not pause
// ourselves the algorithm has finished on its own.
function finalizeChart(): void {
  const t = chartTheme();
  costChart?.setOption({
    series: [
      {
        markPoint: {
          data: [
            {
              type: "min",
              name: "Min",
              itemStyle: { color: t.primary },
              label: {
                formatter: (p: { value: number }) => `Min: ${compact(p.value)}`,
                position: "bottom",
                color: t.heading,
              },
            },
          ],
        },
      },
    ],
  });
  showCost(lastCost);

  if (state === "running") {
    setState("done");
    loadTimetable();
    toast.success("Optimierung abgeschlossen.");
  }
}

// Initialize Chart
let optimizedBefore = false;
function initializeChart() {
  fetch(`${API}/isAlgorithmRunningAtLeastOnce`)
    .then((response) => {
      return response.json();
    })
    .then((didRun) => {
      optimizedBefore = didRun;
      if (didRun) {
        setState("paused");
        fetch(`${API}/get/algorithmHistory`)
          .then((response) => {
            return response.json();
          })
          .then((data: { iteration: number; cost: number }[]) => {
            if (data && data.length > 0) {
              let lastIterationFromServerHolder = 0;
              let totalIterationsHolder = 0;
              let processedHistory: [number, number][] = [];

              for (const item of data) {
                const currentIteration =
                  item.iteration <= 0 ? 1 : item.iteration;

                if (
                  currentIteration < lastIterationFromServerHolder * 0.1 &&
                  lastIterationFromServerHolder > 0
                ) {
                  totalIterationsHolder += lastIterationFromServerHolder;
                }
                lastIterationFromServerHolder = currentIteration;

                processedHistory.push([
                  currentIteration + totalIterationsHolder,
                  item.cost,
                ]);
              }
              costChartData = processedHistory;
              totalIterations = totalIterationsHolder;
              lastIterationFromServer = lastIterationFromServerHolder;
              lastCost = processedHistory[processedHistory.length - 1]?.[1] ?? 0;

              costChart?.setOption({
                series: [
                  {
                    data: costChartData,
                    markPoint: {
                      data: [],
                    },
                  },
                ],
              });
              showCost(lastCost);
            }
          })
          .catch((error) => {
            console.error("Error Fetching Algorithm History:", error);
          });
      }
    })
    .catch((error) => {
      console.error("Error Fetching Algorithm Running:", error);
    });
}

// Clear chart
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
          data: [],
        },
      },
    ],
  });
  showCost(0);
}

// --------------------------------------------------------------- slider

function updateSlider(temperature?: number): void {
  let value = parseFloat(slider.value);
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 1000;

  if (temperature !== undefined) {
    value = temperature;
    slider.value = String(value);
  }

  const percent = Math.min(1, Math.max(0, (value - min) / (max - min)));

  // the thumb warms up from primary (cold) to accent (hot); CSS does the mixing
  slider.style.setProperty(
    "--range-fill",
    `color-mix(in srgb, var(--color-accent) ${Math.round(percent * 100)}%, var(--color-primary))`,
  );
  slider.style.setProperty("--range-percent", `${percent * 100}%`);

  tooltip.textContent = String(Math.round(value));
}

slider.addEventListener("pointerdown", () => {
  isUserTouchingSlider = true;
});
slider.addEventListener("pointerup", () => {
  isUserTouchingSlider = false;
});
slider.addEventListener("pointercancel", () => {
  isUserTouchingSlider = false;
});

slider.addEventListener("input", (event: Event) => {
  updateSlider();

  const target = event.target as HTMLInputElement | null;
  const val = target?.value;
  if (!val) return;
  if (socket.readyState === WebSocket.OPEN) socket.send("temperature:" + val);
});

updateSlider();

// ------------------------------------------------------------- state

let state: OptimizerState = "idle";
let isStarting = false;
let automaticModeOn = false;

const STATE_TEXT: Record<OptimizerState, string> = {
  idle: "Bereit",
  running: "Optimiert …",
  paused: "Pausiert",
  done: "Fertig",
};

function setState(next: OptimizerState): void {
  state = next;
  statusChip.dataset.state = next;
  statusChip.textContent = STATE_TEXT[next];
  setWorkbenchState(next);

  const running = next === "running";

  randomizeButton.disabled = running;
  advanced.classList.toggle("is-disabled", running);

  const optimizeLabel = optimizeButton.querySelector("span");
  const optimizeIcon = optimizeButton.querySelector("i");

  if (running) {
    if (optimizeLabel) optimizeLabel.textContent = "Optimierung pausieren";
    if (optimizeIcon) optimizeIcon.className = "ti ti-player-pause";
    optimizeButton.classList.remove("btn--primary");
    optimizeButton.classList.add("btn--secondary");
  } else {
    const resume = next === "paused" || next === "done";
    if (optimizeLabel)
      optimizeLabel.textContent = resume
        ? "Optimierung fortsetzen"
        : "Stundenplan optimieren";
    if (optimizeIcon)
      optimizeIcon.className = resume ? "ti ti-player-play" : "ti ti-sparkles";
    optimizeButton.classList.add("btn--primary");
    optimizeButton.classList.remove("btn--secondary");
  }

  if (hintBox) hintBox.classList.toggle("is-active", running);
}

// --------------------------------------------------------- optimize btn

optimizeButton.addEventListener("click", handleOptimizeButton);

async function handleOptimizeButton() {
  if (isStarting) return;

  // ---- pause -----------------------------------------------------------
  if (state === "running") {
    socket.send("pause");
    setState("paused");
    loadTimetable();
    showCost(lastCost);
    return;
  }

  // ---- start / resume --------------------------------------------------
  isStarting = true;
  try {
    if (!optimizedBefore) {
      // very first start
      if (!toggledAdvanced) {
        await fetch(`${API}/toggleAutomaticMode`);
        automaticModeOn = true;
      }
      fetch(`${API}/run/algorithmAllClasses`);
      optimizedBefore = true;
    } else {
      // resume after pause / reload / finished run
      socket.send("resume");
    }

    setState("running");
    clearLayout();
    costDisplay.hidden = true;
  } catch (error) {
    console.log("Error while toggling algorithm: ", error);
    toast.error("Optimierung konnte nicht gestartet werden.");
  } finally {
    isStarting = false;
  }
}

// ------------------------------------------------------------- advanced

advanced.addEventListener("toggle", () => {
  if (advanced.open) {
    // switch to advanced: the user controls the temperature
    if (automaticModeOn) {
      fetch(`${API}/toggleAutomaticMode`);
      automaticModeOn = false;
    }
    toggledAdvanced = true;
  } else {
    // back to simple: hand the schedule back to the server
    if (!automaticModeOn && optimizedBefore) {
      fetch(`${API}/toggleAutomaticMode`);
      automaticModeOn = true;
    }
    toggledAdvanced = false;
  }
});

// ----------------------------------------------------------------- chart

function initChart(): void {
  const host = getElement<HTMLElement>("costChart");
  if (!host) return;

  costChart = echarts.init(host, undefined, { renderer: "canvas" });
  drawChart();
  initializeChart();

  const resize = () => costChart?.resize();
  window.addEventListener("resize", resize);
  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(host);
  }

  document.addEventListener(THEME_CHANGE_EVENT, () => drawChart());
}

document.addEventListener("DOMContentLoaded", () => {
  setState("idle");
  initChart();
});
