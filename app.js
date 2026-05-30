const STORAGE_KEY = "weekflow-roadmap-v2";
const LEGACY_STORAGE_KEY = "weekflow-roadmap-v1";
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const grid = document.querySelector("#roadmap-grid");
const dialog = document.querySelector("#task-dialog");
const form = document.querySelector("#task-form");
const nameInput = document.querySelector("#task-name");
const dayInput = document.querySelector("#task-day");
const priorityInput = document.querySelector("#task-priority");
const noteInput = document.querySelector("#task-note");
const deleteButton = document.querySelector("#delete-task");
const modeDialog = document.querySelector("#mode-dialog");
const modeForm = document.querySelector("#mode-form");
const modeNameInput = document.querySelector("#mode-name");
let activeTaskId = null;

const workStarterTasks = [
  {
    id: crypto.randomUUID(),
    day: 0,
    name: "Choose three outcomes for the week",
    note: "A short list keeps the week honest.",
    priority: "high",
    complete: false,
  },
  {
    id: crypto.randomUUID(),
    day: 0,
    name: "Create your weekly roadmap",
    note: "",
    priority: "medium",
    complete: true,
  },
  {
    id: crypto.randomUUID(),
    day: 2,
    name: "Midweek reset",
    note: "Review what matters and adjust.",
    priority: "low",
    complete: false,
  },
];

const familyStarterTasks = [
  {
    id: crypto.randomUUID(),
    day: 1,
    name: "Plan one unrushed family dinner",
    note: "A small anchor for the week.",
    priority: "medium",
    complete: false,
  },
  {
    id: crypto.randomUUID(),
    day: 5,
    name: "Make space for something fun",
    note: "",
    priority: "low",
    complete: false,
  },
];

let roadmap = loadRoadmap();

function createDefaultRoadmap(legacyTasks = null) {
  return {
    activeModeId: "work",
    modes: [
      { id: "work", name: "Work", tasks: legacyTasks ?? workStarterTasks },
      { id: "family", name: "Family", tasks: familyStarterTasks },
    ],
  };
}

function loadRoadmap() {
  const saved = localStorage.getItem(STORAGE_KEY);
  try {
    if (saved) return JSON.parse(saved);
    const legacyTasks = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    return createDefaultRoadmap(Array.isArray(legacyTasks) ? legacyTasks : null);
  } catch {
    return createDefaultRoadmap();
  }
}

function saveRoadmap() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmap));
}

function getActiveMode() {
  return roadmap.modes.find((mode) => mode.id === roadmap.activeModeId) ?? roadmap.modes[0];
}

function getTasks() {
  return getActiveMode().tasks;
}

function updateActiveTasks(updater) {
  roadmap.modes = roadmap.modes.map((mode) =>
    mode.id === roadmap.activeModeId ? { ...mode, tasks: updater(mode.tasks) } : mode,
  );
  saveRoadmap();
}

function getWeekDates() {
  const today = new Date();
  const currentDay = today.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + distanceToMonday);

  return days.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function formatWeekRange(dates) {
  const start = dates[0];
  const end = dates[6];
  const startText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endText =
    start.getMonth() === end.getMonth()
      ? `${end.getDate()}, ${end.getFullYear()}`
      : end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startText} - ${endText}`;
}

function getCompletion(items) {
  const completed = items.filter((task) => task.complete).length;
  const total = items.length;
  return { completed, total, percentage: total ? (completed / total) * 100 : 0 };
}

function render() {
  renderModes();
  const dates = getWeekDates();
  const dayTemplate = document.querySelector("#day-card-template");
  const taskTemplate = document.querySelector("#task-template");
  grid.replaceChildren();
  document.querySelector("#week-range").textContent = formatWeekRange(dates);

  days.forEach((day, dayIndex) => {
    const fragment = dayTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".day-card");
    const dayTasks = getTasks().filter((task) => task.day === dayIndex);
    const completion = getCompletion(dayTasks);
    card.querySelector(".day-date").textContent = dates[dayIndex].toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    card.querySelector(".day-name").textContent = day;
    card.querySelector(".day-count").textContent =
      `${completion.completed}/${completion.total} complete`;
    card.querySelector(".day-progress span").style.width = `${completion.percentage}%`;
    card.querySelector(".day-add").addEventListener("click", () => openDialog(dayIndex));

    dayTasks.forEach((task) => {
      const taskFragment = taskTemplate.content.cloneNode(true);
      const tile = taskFragment.querySelector(".task-tile");
      const checkbox = taskFragment.querySelector(".task-check");
      const content = taskFragment.querySelector(".task-content");
      tile.classList.toggle("is-complete", task.complete);
      checkbox.setAttribute("aria-label", task.complete ? "Mark task incomplete" : "Mark task complete");
      content.setAttribute("aria-label", `Edit ${task.name}`);
      taskFragment.querySelector(".task-name").textContent = task.name;
      taskFragment.querySelector(".task-note").textContent = task.note;
      const priority = taskFragment.querySelector(".priority-pill");
      priority.textContent = task.priority;
      priority.dataset.priority = task.priority;
      checkbox.addEventListener("click", () => toggleTask(task.id, checkbox));
      content.addEventListener("click", () => openDialog(dayIndex, task));
      card.querySelector(".task-list").append(taskFragment);
    });

    grid.append(fragment);
  });

  const weeklyCompletion = getCompletion(getTasks());
  document.querySelector("#overview-title").textContent = `${getActiveMode().name} roadmap`;
  document.querySelector("#weekly-count").textContent =
    `${weeklyCompletion.completed} of ${weeklyCompletion.total}`;
  document.querySelector("#weekly-progress").style.width = `${weeklyCompletion.percentage}%`;
}

function renderModes() {
  const modeList = document.querySelector("#mode-list");
  const modeTemplate = document.querySelector("#mode-template");
  modeList.replaceChildren();
  roadmap.modes.forEach((mode) => {
    const fragment = modeTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".mode-card");
    const completion = getCompletion(mode.tasks);
    card.classList.toggle("is-active", mode.id === roadmap.activeModeId);
    card.setAttribute("aria-pressed", String(mode.id === roadmap.activeModeId));
    card.querySelector(".mode-icon").textContent = mode.name.charAt(0).toUpperCase();
    card.querySelector(".mode-name").textContent = mode.name;
    card.querySelector(".mode-count").textContent = `${completion.completed}/${completion.total} complete`;
    card.querySelector(".mode-progress span").style.width = `${completion.percentage}%`;
    card.addEventListener("click", () => {
      roadmap.activeModeId = mode.id;
      saveRoadmap();
      render();
    });
    modeList.append(fragment);
  });
}

function openDialog(dayIndex = 0, task = null) {
  activeTaskId = task?.id ?? null;
  document.querySelector("#dialog-title").textContent = task ? "Edit task" : "Add a task";
  deleteButton.classList.toggle("is-hidden", !task);
  nameInput.value = task?.name ?? "";
  dayInput.value = String(task?.day ?? dayIndex);
  priorityInput.value = task?.priority ?? "medium";
  noteInput.value = task?.note ?? "";
  dialog.showModal();
  nameInput.focus();
}

function closeDialog() {
  dialog.close();
  form.reset();
  activeTaskId = null;
}

function celebrateTask(origin) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const { left, top, width, height } = origin.getBoundingClientRect();
  const celebration = document.createElement("span");
  celebration.className = "spark-burst";
  celebration.style.left = `${left + width / 2}px`;
  celebration.style.top = `${top + height / 2}px`;
  celebration.setAttribute("aria-hidden", "true");

  const colors = ["#49735f", "#e7b95d", "#e98576", "#89a990"];
  for (let index = 0; index < 12; index += 1) {
    const spark = document.createElement("span");
    const angle = (Math.PI * 2 * index) / 12;
    const distance = 24 + (index % 3) * 9;
    spark.className = "spark";
    spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
    spark.style.setProperty("--spark-color", colors[index % colors.length]);
    spark.style.setProperty("--spark-delay", `${(index % 4) * 18}ms`);
    celebration.append(spark);
  }

  document.body.append(celebration);
  celebration.addEventListener("animationend", () => celebration.remove(), { once: true });
}

function toggleTask(taskId, origin) {
  const willComplete = !getTasks().find((task) => task.id === taskId)?.complete;
  if (willComplete) celebrateTask(origin);
  updateActiveTasks((tasks) => tasks.map((task) =>
    task.id === taskId ? { ...task, complete: !task.complete } : task,
  ));
  render();
}

function deleteTask() {
  updateActiveTasks((tasks) => tasks.filter((task) => task.id !== activeTaskId));
  closeDialog();
  render();
}

days.forEach((day, index) => {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = day;
  dayInput.append(option);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const task = {
    id: activeTaskId ?? crypto.randomUUID(),
    day: Number(dayInput.value),
    name: nameInput.value.trim(),
    priority: priorityInput.value,
    note: noteInput.value.trim(),
    complete: activeTaskId
      ? getTasks().find((item) => item.id === activeTaskId)?.complete ?? false
      : false,
  };
  updateActiveTasks((tasks) =>
    activeTaskId
      ? tasks.map((item) => (item.id === activeTaskId ? task : item))
      : [...tasks, task],
  );
  closeDialog();
  render();
});

document.querySelector("#add-task").addEventListener("click", () => openDialog());
document.querySelector("#close-dialog").addEventListener("click", closeDialog);
document.querySelector("#cancel-task").addEventListener("click", closeDialog);
deleteButton.addEventListener("click", deleteTask);
document.querySelector("#reset-week").addEventListener("click", () => {
  if (!window.confirm(`Reset your ${getActiveMode().name} roadmap to an empty week?`)) return;
  updateActiveTasks(() => []);
  render();
});

document.querySelector("#add-mode").addEventListener("click", () => {
  modeDialog.showModal();
  modeNameInput.focus();
});
document.querySelector("#close-mode-dialog").addEventListener("click", () => modeDialog.close());
document.querySelector("#cancel-mode").addEventListener("click", () => modeDialog.close());
modeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = modeNameInput.value.trim();
  const newMode = { id: crypto.randomUUID(), name, tasks: [] };
  roadmap.modes.push(newMode);
  roadmap.activeModeId = newMode.id;
  saveRoadmap();
  modeDialog.close();
  modeForm.reset();
  render();
});

saveRoadmap();
render();
