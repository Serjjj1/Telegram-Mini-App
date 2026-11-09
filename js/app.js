/* =========================================================
   CPU Clicker — основная логика (с энергией)
   ========================================================= */

// ---- Константы экономики ----
const CLICK_REWARD = 0.00000001; // 1 "сатоши" = 0.00000001 BTC
const STORAGE_KEY  = "cpu_clicker_balance";
const STORAGE_ENERGY_KEY = "cpu_clicker_energy";

// ---- Настройки энергии ----
const MAX_ENERGY = 500;          // Максимальный запас
const ENERGY_REGEN_PER_SEC = 1;  // Восстановление в секунду

// ---- Состояние ----
let balance = 0;
let energy = MAX_ENERGY;
let regenInterval = null;

// ---- DOM-элементы ----
const balanceEl   = document.getElementById("balance-value");
const cpuButton   = document.getElementById("cpu-button");
const energyValueEl = document.getElementById("energy-value");
const energyBarEl   = document.getElementById("energy-bar-fill");

// =========================================================
// Утилиты
// =========================================================

function formatBalance(value) {
  return value.toFixed(8);
}

/**
 * Загружает баланс и энергию из localStorage.
 */
function loadData() {
  const savedBalance = localStorage.getItem(STORAGE_KEY);
  const parsedBalance = parseFloat(savedBalance);
  balance = Number.isFinite(parsedBalance) ? parsedBalance : 0;

  const savedEnergy = localStorage.getItem(STORAGE_ENERGY_KEY);
  const parsedEnergy = parseInt(savedEnergy, 10);
  energy = Number.isFinite(parsedEnergy) ? parsedEnergy : MAX_ENERGY;
}

/**
 * Сохраняет данные (с задержкой для кликов).
 */
let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, String(balance));
    localStorage.setItem(STORAGE_ENERGY_KEY, String(energy));
    saveTimeout = null;
  }, 500);
}

// =========================================================
// Отрисовка
// =========================================================

function renderBalance() {
  balanceEl.textContent = formatBalance(balance);
}

function renderEnergy() {
  // Округляем вниз, чтобы не показывать 499.9 / 500, только целые числа
  const currentEnergy = Math.floor(energy); 
  
  energyValueEl.textContent = `${currentEnergy} / ${MAX_ENERGY}`;
  
  // Считаем процент заполнения шкалы
  const percentage = (currentEnergy / MAX_ENERGY) * 100;
  energyBarEl.style.width = `${percentage}%`;

  // Если энергии мало, красим в красный
  if (percentage < 20) {
    energyBarEl.classList.add("low");
  } else {
    energyBarEl.classList.remove("low");
  }
}

function spawnClickPopup(x, y, amountText) {
  const popup = document.createElement("div");
  popup.className = "click-popup";
  popup.textContent = "+" + amountText;
  popup.style.left = x + "px";
  popup.style.top  = y + "px";
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

// =========================================================
// Игровая логика
// =========================================================

function handleClick(event) {
  // ПРОВЕРКА: Если энергии меньше 1, клик не работает
  if (energy < 1) {
    // Легкая вибрация "ошибки", если Telegram это поддерживает
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred("error");
    }
    return; 
  }

  // Тратим энергию и даем баланс
  energy -= 1; 
  balance += CLICK_REWARD;
  
  renderBalance();
  renderEnergy();
  scheduleSave();

  // Всплывающий текст в точке клика
  const rect = cpuButton.getBoundingClientRect();
  let x, y;
  if (event.touches && event.touches.length > 0) {
    x = event.touches[0].clientX;
    y = event.touches[0].clientY;
  } else {
    x = event.clientX ?? rect.left + rect.width / 2;
    y = event.clientY ?? rect.top + rect.height / 2;
  }
  spawnClickPopup(x, y, formatBalance(CLICK_REWARD));

  // Вибрация успеха
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
  }
}

// =========================================================
// Восстановление энергии (Idle-механика)
// =========================================================

function regenEnergy() {
  if (energy < MAX_ENERGY) {
    energy = Math.min(MAX_ENERGY, energy + ENERGY_REGEN_PER_SEC);
    renderEnergy();
    // Здесь используем scheduleSave, чтобы не спамить localStorage каждую секунду, 
    // а сохранять раз в 500мс пачкой
    scheduleSave(); 
  }
}

// =========================================================
// Инициализация
// =========================================================

function init() {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }

  loadData();
  renderBalance();
  renderEnergy(); // Отрисовываем энергию при старте

  // Запускаем таймер восстановления энергии (1 раз в секунду)
  regenInterval = setInterval(regenEnergy, 1000);

  cpuButton.addEventListener("click", handleClick);
  cpuButton.addEventListener("touchstart", (e) => {}, { passive: true });

  window.addEventListener("beforeunload", () => {
    localStorage.setItem(STORAGE_KEY, String(balance));
    localStorage.setItem(STORAGE_ENERGY_KEY, String(energy));
  });
}

init();
