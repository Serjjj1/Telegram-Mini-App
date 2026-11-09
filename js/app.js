/* =========================================================
   CPU Clicker — основная логика (Магазин и Улучшения)
   ========================================================= */

// ---- Константы экономики ----
const STORAGE_KEY = "cpu_clicker_state";
const MAX_ENERGY_BASE = 500;
const BASE_REGEN_TIME_MS = 2000; // 1 энергия каждые 2 секунды

// ---- База улучшений ----
const UPGRADES = {
  "click": [
    {"value": 0.00000001, "base_price": 0.000002, "price_mult": 1.6},
    {"value": 0.00000005, "base_price": 0.00001, "price_mult": 1.6},
    {"value": 0.0000001, "base_price": 0.00002, "price_mult": 1.6},
    {"value": 0.0000005, "base_price": 0.0001, "price_mult": 1.6},
    {"value": 0.000001, "base_price": 0.0002, "price_mult": 1.6},
    {"value": 0.000005, "base_price": 0.001, "price_mult": 1.6},
    {"value": 0.00001, "base_price": 0.002, "price_mult": 1.7},
    {"value": 0.0005, "base_price": 0.1, "price_mult": 1.7},
    {"value": 0.004, "base_price": 0.8, "price_mult": 1.7},
    {"value": 0.02, "base_price": 4, "price_mult": 1.8},
  ],
  "mining": [
    {"value": 0.00000001, "base_price": 0.00001, "price_mult": 1.7},
    {"value": 0.00000005, "base_price": 0.00005, "price_mult": 1.7},
    {"value": 0.0000001, "base_price": 0.0001, "price_mult": 1.7},
    {"value": 0.000001, "base_price": 0.001, "price_mult": 1.7},
    {"value": 0.00001, "base_price": 0.01, "price_mult": 1.7},
    {"value": 0.0001, "base_price": 0.1, "price_mult": 1.8},
    {"value": 0.001, "base_price": 1, "price_mult": 1.8},
    {"value": 0.01, "base_price": 10, "price_mult": 1.8},
    {"value": 0.1, "base_price": 100, "price_mult": 1.9},
    {"value": 1, "base_price": 1000, "price_mult": 1.9},
  ],
  "energy_bar": [
    { "type": "volume", "value": 500, "base_price": 1, "price_mult": 2 },
    { "type": "fulfill_speed", "value": 1, "base_price": 10, "price_mult": 2 }
  ]
};

// Красивые названия для интерфейса
const UPGRADE_NAMES = {
  "click": "Улучшение клика",
  "mining": "Улучшение майнинга",
  "energy_bar_volume": "Расширение бака",
  "energy_bar_fulfill_speed": "Скорость зарядки"
};

// ---- Состояние игры ----
let state = {
  balance: 0,
  energy: 500,
  clickLevel: 0,
  miningLevel: 0,
  energyVolumeLevel: 0,
  energySpeedLevel: 0,
};

let regenAccumulator = 0;
let regenInterval = null;

// ---- DOM-элементы ----
const balanceEl = document.getElementById("balance-value");
const cpuButton = document.getElementById("cpu-button");
const energyValueEl = document.getElementById("energy-value");
const energyBarEl = document.getElementById("energy-bar-fill");

const tabClickBtn = document.getElementById("tab-click");
const tabShopBtn = document.getElementById("tab-shop");
const shopScreen = document.getElementById("shop-screen");
const mainSections = document.querySelectorAll(".balance-block, .energy-block, .cpu-zone");

// =========================================================
// Утилиты и математика
// =========================================================

function formatBalance(value) {
  return value.toFixed(8);
}

// Текущая сила клика
function getClickReward() {
  return UPGRADES.click[state.clickLevel].value;
}

// Текущий пассивный доход (в секунду)
function getMiningReward() {
  return UPGRADES.mining[state.miningLevel].value;
}

// Текущий максимум энергии
function getMaxEnergy() {
  return UPGRADES.energy_bar[0].value * Math.pow(2, state.energyVolumeLevel); 
  // Прим: в твоем коде volume = [{"value": 500...}], я упростил структуру для удобства. 
  // На 0 уровне дает 500, на 1 уровне 500*2 = 1000 и т.д.
}

// Время восстановления 1 единицы энергии (в секундах)
function getRegenTime() {
  const base = UPGRADES.energy_bar[1].value; // 1
  const currentSpeed = base + (state.energySpeedLevel * 1); // Каждый уровень добавляет +1
  // Если скорость 2, то время зарядки уменьшается вдвое (1 секунда)
  return BASE_REGEN_TIME_MS / currentSpeed;
}

// Получение цены улучшения
function getUpgradePrice(type, level, basePrice, mult) {
  return basePrice * Math.pow(mult, level);
}

// =========================================================
// Отрисовка
// =========================================================

function renderBalance() {
  balanceEl.textContent = formatBalance(state.balance);
  // Обновляем доступность кнопок в магазине, если он открыт
  if (!shopScreen.classList.contains("hidden")) renderShop();
}

function renderEnergy() {
  const maxEnergy = getMaxEnergy();
  const currentEnergy = Math.floor(state.energy);
  energyValueEl.textContent = `${currentEnergy} / ${maxEnergy}`;
  
  const percentage = (currentEnergy / maxEnergy) * 100;
  energyBarEl.style.width = `${percentage}%`;

  if (percentage < 20) energyBarEl.classList.add("low");
  else energyBarEl.classList.remove("low");
}

function renderShop() {
  renderShopCategory("click", "list-click", state.clickLevel);
  renderShopCategory("mining", "list-mining", state.miningLevel);

  // Отдельно рендерим энергию, так как там два разных улучшения
  const energyList = document.getElementById("list-energy");
  energyList.innerHTML = "";
  
  // 1. Объем
  energyList.appendChild(createUpgradeNode("energy_bar_volume", 0, "volume", state.energyVolumeLevel));
  // 2. Скорость
  energyList.appendChild(createUpgradeNode("energy_bar_fulfill_speed", 1, "fulfill_speed", state.energySpeedLevel));
}

function renderShopCategory(type, listId, currentLevel) {
  const container = document.getElementById(listId);
  container.innerHTML = "";
  const itemData = UPGRADES[type][currentLevel];
  
  if (!itemData) {
    container.innerHTML = "<div class='upgrade-item disabled'><span class='upgrade-name'>МАКС. УРОВЕНЬ</span></div>";
    return;
  }
  
  container.appendChild(createUpgradeNode(type, currentLevel, null, currentLevel));
}

function createUpgradeNode(type, levelIndex, energyType, currentLvl) {
  let data, name, desc, price;

  if (energyType) {
    const idx = energyType === "volume" ? 0 : 1;
    data = UPGRADES.energy_bar[idx];
    price = getUpgradePrice(type, currentLvl, data.base_price, data.price_mult);
    name = UPGRADE_NAMES[type];
    desc = energyType === "volume" 
      ? `Макс. энергия: +${data.value} (умножается на 2)`
      : `Скорость: +1 к восстановлению`;
  } else {
    data = UPGRADES[type][levelIndex];
    if (!data) return document.createElement("div");
    price = getUpgradePrice(type, currentLvl, data.base_price, data.price_mult);
    name = UPGRADE_NAMES[type];
    desc = type === "click" ? `Урон клика: ${formatBalance(data.value)} BTC` : `Доход: ${formatBalance(data.value)} BTC/сек`;
  }

  const el = document.createElement("div");
  el.className = "upgrade-item";
  if (state.balance < price) el.classList.add("disabled");

  el.innerHTML = `
    <div class="upgrade-info">
      <span class="upgrade-name">${name} (Ур. ${currentLvl + 1})</span>
      <span class="upgrade-desc">${desc}</span>
    </div>
    <div class="upgrade-price ${state.balance < price ? 'cant-afford' : ''}">
      ${formatBalance(price)} BTC
    </div>
  `;

  if (state.balance >= price) {
    el.onclick = () => buyUpgrade(type, currentLvl, energyType, price);
  }

  return el;
}

function spawnClickPopup(x, y, amountText) {
  const popup = document.createElement("div");
  popup.className = "click-popup";
  popup.textContent = "+" + amountText;
  popup.style.left = x + "px";
  popup.style.top = y + "px";
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

// =========================================================
// Логика
// =========================================================

function buyUpgrade(type, currentLvl, energyType, price) {
  if (state.balance < price) return;
  
  state.balance -= price;

  if (type === "click") state.clickLevel++;
  else if (type === "mining") state.miningLevel++;
  else if (type === "energy_bar_volume") {
    state.energyVolumeLevel++;
    state.energy = getMaxEnergy(); // При покупке бака сразу восстанавливаем энергию
  }
  else if (type === "energy_bar_fulfill_speed") state.energySpeedLevel++;

  renderBalance();
  renderEnergy();
  renderShop();
  saveGame();
  
  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
  }
}

function handleClick(event) {
  if (state.energy < 1) {
    if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.notificationOccurred("error");
    return;
  }

  state.energy -= 1;
  const reward = getClickReward();
  state.balance += reward;
  
  renderBalance();
  renderEnergy();
  saveGame();

  const rect = cpuButton.getBoundingClientRect();
  let x, y;
  if (event.touches && event.touches.length > 0) {
    x = event.touches[0].clientX;
    y = event.touches[0].clientY;
  } else {
    x = event.clientX ?? rect.left + rect.width / 2;
    y = event.clientY ?? rect.top + rect.height / 2;
  }
  spawnClickPopup(x, y, formatBalance(reward));

  if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
}

// =========================================================
// Игровой цикл (Тик)
// =========================================================

let lastTickTime = Date.now();

function gameTick() {
  const now = Date.now();
  const dt = now - lastTickTime;
  lastTickTime = now;

  let stateChanged = false;

  // 1. Майнинг (Пассивный доход)
  const miningPerSec = getMiningReward();
  if (miningPerSec > 0) {
    state.balance += miningPerSec * (dt / 1000);
    stateChanged = true;
  }

  // 2. Регенерация энергии
  const maxEnergy = getMaxEnergy();
  if (state.energy < maxEnergy) {
    const regenTime = getRegenTime();
    regenAccumulator += dt;
    
    while (regenAccumulator >= regenTime && state.energy < maxEnergy) {
      state.energy = Math.min(maxEnergy, state.energy + 1);
      regenAccumulator -= regenTime;
      stateChanged = true;
    }
  } else {
    regenAccumulator = 0; // Сбрасываем, если бак полон
  }

  // Обновляем интерфейс, если что-то изменилось
  if (stateChanged) {
    if (state.energy < maxEnergy) renderEnergy(); // Часто обновляем энергию
    else if (Math.random() < 0.1) renderEnergy(); // Если полная, обновляем реже (для оптимизации)
    
    renderBalance(); // Обновляем баланс от майнинга
  }
}

// =========================================================
// Сохранение / Загрузка
// =========================================================

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    } catch (e) { console.error("Ошибка загрузки", e); }
  }
}

// =========================================================
// Навигация (Вкладки)
// =========================================================

function switchTab(tab) {
  if (tab === "click") {
    shopScreen.classList.add("hidden");
    mainSections.forEach(el => el.classList.remove("hidden"));
    tabClickBtn.classList.add("active");
    tabShopBtn.classList.remove("active");
  } else if (tab === "shop") {
    mainSections.forEach(el => el.classList.add("hidden"));
    shopScreen.classList.remove("hidden");
    tabShopBtn.classList.add("active");
    tabClickBtn.classList.remove("active");
    renderShop(); // Отрисовываем магазин при открытии
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

  loadGame();
  renderBalance();
  renderEnergy();

  // Запускаем цикл игры (60 кадров в секунду)
  setInterval(gameTick, 100); // 100мс достаточно для плавности майнинга

  cpuButton.addEventListener("click", handleClick);
  
  tabClickBtn.addEventListener("click", () => switchTab("click"));
  tabShopBtn.addEventListener("click", () => switchTab("shop"));

  // Автосохранение каждые 5 секунд
  setInterval(saveGame, 5000);

  window.addEventListener("beforeunload", saveGame);
}

init();
