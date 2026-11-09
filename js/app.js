/* =========================================================
   CPU Clicker — основная логика
   ========================================================= */

// ---- Константы экономики ----
const CLICK_REWARD = 0.00000001; // 1 "сатоши" = 0.00000001 BTC
const STORAGE_KEY  = "cpu_clicker_balance";

// ---- Состояние ----
let balance = 0;

// ---- DOM-элементы ----
const balanceEl   = document.getElementById("balance-value");
const cpuButton   = document.getElementById("cpu-button");

// =========================================================
// Утилиты
// =========================================================

/**
 * Форматирует число с фиксированными 8 знаками после запятой.
 * Именно столько знаков у биткоина (1 сатоши = 0.00000001 BTC).
 */
function formatBalance(value) {
  return value.toFixed(8);
}

/**
 * Загружает баланс из localStorage (если есть).
 */
function loadBalance() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const parsed = parseFloat(saved);
  balance = Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Сохраняет баланс в localStorage.
 * Вызываем не на каждый клик (для производительности), а раз в ~500 мс.
 */
let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, String(balance));
    saveTimeout = null;
  }, 500);
}

// =========================================================
// Отрисовка
// =========================================================

function renderBalance() {
  balanceEl.textContent = formatBalance(balance);
}

/**
 * Показывает всплывающий "+0.00000001" в точке клика.
 */
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
  balance += CLICK_REWARD;
  renderBalance();
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

  // Лёгкая вибрация (если поддерживается в Telegram)
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
  }
}

// =========================================================
// Инициализация
// =========================================================

function init() {
  // Сообщаем Telegram, что Mini App готов
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }

  loadBalance();
  renderBalance();

  // Клик и тап
  cpuButton.addEventListener("click", handleClick);
  cpuButton.addEventListener("touchstart", (e) => {
    // preventDefault не даём — пусть click тоже сработает; на мобиле
    // touchstart + click дают двойной клик, поэтому используем только click
  }, { passive: true });

  // Сохраняем при уходе из приложения
  window.addEventListener("beforeunload", () => {
    localStorage.setItem(STORAGE_KEY, String(balance));
  });
}

init();
