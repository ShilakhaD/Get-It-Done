const STORAGE_KEY = "weekflow-roadmap-v1";
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const grid = document.querySelector("#roadmap-grid");
const dialog = document.querySelector("#task-dialog");
const form = document.querySelector("#task-form");
const nameInput = document.querySelector("#task-name");
const dayInput = document.querySelector("#task-day");
const priorityInput = document.querySelector("#task-priority");
const noteInput = document.querySelector("#task-note");
const deleteButton = document.querySelector("#delete-task");
let activeTaskId = null;

const starterTasks = [
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

let tasks = loadTasks();

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return starterTasks;

  try {
    return JSON.parse(saved);
  } catch {
    return starterTasks;
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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
  const dates = getWeekDates();
  const dayTemplate = document.querySelector("#day-card-template");
  const taskTemplate = document.querySelector("#task-template");
  grid.replaceChildren();
  document.querySelector("#week-range").textContent = formatWeekRange(dates);

  days.forEach((day, dayIndex) => {
    const fragment = dayTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".day-card");
    const dayTasks = tasks.filter((task) => task.day === dayIndex);
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
      checkbox.addEventListener("click", () => toggleTask(task.id));
      content.addEventListener("click", () => openDialog(dayIndex, task));
      card.querySelector(".task-list").append(taskFragment);
    });

    grid.append(fragment);
  });

  const weeklyCompletion = getCompletion(tasks);
  document.querySelector("#weekly-count").textContent =
    `${weeklyCompletion.completed} of ${weeklyCompletion.total}`;
  document.querySelector("#weekly-progress").style.width = `${weeklyCompletion.percentage}%`;
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

function toggleTask(taskId) {
  tasks = tasks.map((task) =>
    task.id === taskId ? { ...task, complete: !task.complete } : task,
  );
  saveTasks();
  render();
}

function deleteTask() {
  tasks = tasks.filter((task) => task.id !== activeTaskId);
  saveTasks();
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
      ? tasks.find((item) => item.id === activeTaskId)?.complete ?? false
      : false,
  };
  tasks = activeTaskId
    ? tasks.map((item) => (item.id === activeTaskId ? task : item))
    : [...tasks, task];
  saveTasks();
  closeDialog();
  render();
});

document.querySelector("#add-task").addEventListener("click", () => openDialog());
document.querySelector("#close-dialog").addEventListener("click", closeDialog);
document.querySelector("#cancel-task").addEventListener("click", closeDialog);
deleteButton.addEventListener("click", deleteTask);
document.querySelector("#reset-week").addEventListener("click", () => {
  if (!window.confirm("Reset your roadmap to the starter tasks?")) return;
  tasks = starterTasks.map((task) => ({ ...task, id: crypto.randomUUID() }));
  saveTasks();
  render();
});

render();
