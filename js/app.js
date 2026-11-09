/* =========================================================
   CPU Clicker — Магазин с отдельными улучшениями
   ========================================================= */

const STORAGE_KEY = "cpu_clicker_state_v2";

// ---- Твои константы ----
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
    {"type": "volume", "value": 500, "base_price": 1, "price_mult": 2},
    {"type": "volume", "value": 1000, "base_price": 10, "price_mult": 2},
    {"type": "volume", "value": 2500, "base_price": 100, "price_mult": 2},
    
    {"type": "fulfill_speed", "value": 1, "base_price": 5, "price_mult": 2},
    {"type": "fulfill_speed", "value": 2, "base_price": 50, "price_mult": 2},
    {"type": "fulfill_speed", "value": 4, "base_price": 500, "price_mult": 2}
  ]
};

// ---- Красивые названия для каждого улучшения ----
const NAMES = {
  "click": [
    "Кибер-рука", "Третья рука", "Механический палец", "Силиконовый протез", 
    "Квантовый тачпад", "Нейро-интерфейс", "Плазменный кликер", "Нано-манипулятор", 
    "Ядро сингулярности", "Рука Бога"
  ],
  "mining": [
    "Старая затычка", "Полка видеокарт", "Серверная стойка", "Домашняя ферма",
    "Промышленный майнер", "Дата-центр", "Квантовый компьютер", "Суперкомпьютер",
    "Орбитальная станция", "Сфера Дайсона"
  ],
  "energy_bar": {
    "volume": ["Батарейка", "Аккумулятор", "Промышленный бак"],
    "fulfill_speed": ["Быстрая зарядка", "Турбо-зарядка", "Сверхпроводник"]
  }
};

// ---- Состояние игры ----
let state = {
  balance: 0,
  energy: 500,
  // Массивы купленных улучшений (true = куплено)
  boughtClick: Array(UPGRADES.click.length).fill(false),
  boughtMining: Array(UPGRADES.mining.length).fill(false),
  boughtEnergy: Array(UPGRADES.energy_bar.length).fill(false),
};

let currentShopTab = "click"; // 'click', 'mining' или 'energy'
let regenAccumulator = 0;

// ---- DOM-элементы ----
const balanceEl = document.getElementById("balance-value");
const cpuButton = document.getElementById("cpu-button");
const energyValueEl = document.getElementById("energy-value");
const energyBarEl = document.getElementById("energy-bar-fill");
const perClickEl = document.querySelector(".per-click");

const tabClickBtn = document.getElementById("tab-click");
const tabShopBtn = document.getElementById("tab-shop");
const shopScreen = document.getElementById("shop-screen");
const mainSections = document.querySelectorAll(".balance-block, .energy-block, .cpu-zone");

const shopTabClick = document.getElementById("shop-tab-click");
const shopTabMining = document.getElementById("shop-tab-mining");
const shopTabEnergy = document.getElementById("shop-tab-energy");
const shopListContainer = document.getElementById("shop-list-container");

// =========================================================
// Математика
// =========================================================

function formatBalance(value) {
  return value.toFixed(8);
}

// Сила клика: базовая (1 сатоши) + сумма всех купленных кликов
function getClickReward() {
  let reward = 0.00000001;
  state.boughtClick.forEach((isBought, index) => {
    if (isBought) reward += UPGRADES.click[index].value;
  });
  return reward;
}

// Доход от майнинга (сумма всех купленных ферм)
function getMiningReward() {
  let reward = 0;
  state.boughtMining.forEach((isBought, index) => {
    if (isBought) reward += UPGRADES.mining[index].value;
  });
  return reward;
}

// Текущий максимум энергии (базовый 500 + купленные баки)
function getMaxEnergy() {
  let maxE = 500;
  state.boughtEnergy.forEach((isBought, index) => {
    if (isBought && UPGRADES.energy_bar[index].type === "volume") {
      maxE = UPGRADES.energy_bar[index].value; // Берем максимальный купленный
    }
  });
  return maxE;
}

// Скорость регенерации (время на 1 единицу в мс)
function getRegenTime() {
  let speed = 1; // Базовая скорость: 1 энергия за 2 секунды
  state.boughtEnergy.forEach((isBought, index) => {
    if (isBought && UPGRADES.energy_bar[index].type === "fulfill_speed") {
      speed = UPGRADES.energy_bar[index].value; // Берем самую быструю купленную
    }
  });
  return 2000 / speed; // 2000мс базово делим на множитель
}

// =========================================================
// Отрисовка
// =========================================================

function renderBalance() {
  balanceEl.textContent = formatBalance(state.balance);
  perClickEl.textContent = formatBalance(getClickReward());
  
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
  shopListContainer.innerHTML = "";

  if (currentShopTab === "click") {
    renderCategory("click", state.boughtClick, NAMES.click);
  } else if (currentShopTab === "mining") {
    renderCategory("mining", state.boughtMining, NAMES.mining);
  } else if (currentShopTab === "energy") {
    renderEnergyCategory();
  }
}

function renderCategory(type, boughtArray, namesArray) {
  UPGRADES[type].forEach((item, index) => {
    const isBought = boughtArray[index];
    let price = item.base_price;
    
    // Цена зависит от уровня (но так как каждое улучшение уникально, 
    // множитель применяется к базовой цене в зависимости от индекса)
    if (index > 0) {
      price = UPGRADES[type][index].base_price;
      // Для уникальных предметов price_mult применять не нужно, 
      // так как цена уже задана в константе для каждого предмета отдельно.
      // Но если ты хочешь, чтобы price_mult умножал базовую цену предмета 
      // на его индекс — это можно сделать, но в твоей логике base_price — это уже финальная цена.
    }

    // ВАЖНО: Если каждое улучшение покупается один раз, то price_mult из твоих констант 
    // теряет смысл для покупки одного и того же предмета. 
    // Но мы сохраняем его в логике на будущее, если будем делать прокачку уровней.
    
    const el = document.createElement("div");
    el.className = "upgrade-item";
    
    if (isBought) {
      el.classList.add("disabled");
      el.innerHTML = `
        <div class="upgrade-info">
          <span class="upgrade-name">${namesArray[index]}</span>
          <span class="upgrade-desc">✅ Куплено</span>
        </div>
      `;
    } else {
      if (state.balance < price) el.classList.add("disabled");
      
      const desc = type === "click" 
        ? `+${formatBalance(item.value)} BTC к клику` 
        : `+${formatBalance(item.value)} BTC/сек`;

      el.innerHTML = `
        <div class="upgrade-info">
          <span class="upgrade-name">${namesArray[index]}</span>
          <span class="upgrade-desc">${desc}</span>
        </div>
        <div class="upgrade-price ${state.balance < price ? 'cant-afford' : ''}">
          ${formatBalance(price)} BTC
        </div>
      `;

      if (state.balance >= price) {
        el.onclick = () => buyUpgrade(type, index, price);
      }
    }
    shopListContainer.appendChild(el);
  });
}

function renderEnergyCategory() {
  UPGRADES.energy_bar.forEach((item, index) => {
    const isBought = state.boughtEnergy[index];
    const price = item.base_price;
    
    let name = "";
    let desc = "";

    if (item.type === "volume") {
      // Находим, какой это по счету бак (индекс среди volume)
      const volIndex = UPGRADES.energy_bar.slice(0, index).filter(i => i.type === "volume").length;
      name = NAMES.energy_bar.volume[volIndex];
      desc = `Макс. энергия: ${item.value}`;
    } else {
      const speedIndex = UPGRADES.energy_bar.slice(0, index).filter(i => i.type === "fulfill_speed").length;
      name = NAMES.energy_bar.fulfill_speed[speedIndex];
      desc = `Скорость: 1 ед. за ${2000 / item.value} сек`;
    }

    const el = document.createElement("div");
    el.className = "upgrade-item";
    
    if (isBought) {
      el.classList.add("disabled");
      el.innerHTML = `
        <div class="upgrade-info">
          <span class="upgrade-name">${name}</span>
          <span class="upgrade-desc">✅ Куплено</span>
        </div>
      `;
    } else {
      if (state.balance < price) el.classList.add("disabled");
      
      el.innerHTML = `
        <div class="upgrade-info">
          <span class="upgrade-name">${name}</span>
          <span class="upgrade-desc">${desc}</span>
        </div>
        <div class="upgrade-price ${state.balance < price ? 'cant-afford' : ''}">
          ${formatBalance(price)} BTC
        </div>
      `;

      if (state.balance >= price) {
        el.onclick = () => buyUpgrade("energy_bar", index, price);
      }
    }
    shopListContainer.appendChild(el);
  });
}

// =========================================================
// Логика
// =========================================================

function buyUpgrade(type, index, price) {
  if (state.balance < price) return;
  
  state.balance -= price;

  if (type === "click") {
    state.boughtClick[index] = true;
  } else if (type === "mining") {
    state.boughtMining[index] = true;
  } else if (type === "energy_bar") {
    state.boughtEnergy[index] = true;
    if (UPGRADES.energy_bar[index].type === "volume") {
      state.energy = getMaxEnergy(); // Мгновенно восстанавливаем бак при покупке
    }
  }

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
  
  // Показываем всплывающий текст
  const popup = document.createElement("div");
  popup.className = "click-popup";
  popup.textContent = "+" + formatBalance(reward);
  popup.style.left = x + "px";
  popup.style.top  = y + "px";
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 800);

  if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
}

// =========================================================
// Игровой цикл
// =========================================================

let lastTickTime = Date.now();

function gameTick() {
  const now = Date.now();
  const dt = now - lastTickTime;
  lastTickTime = now;

  let stateChanged = false;

  // 1. Майнинг
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
    
    if (regenAccumulator >= regenTime) {
      const gained = Math.floor(regenAccumulator / regenTime);
      state.energy = Math.min(maxEnergy, state.energy + gained);
      regenAccumulator -= gained * regenTime;
      stateChanged = true;
    }
  } else {
    regenAccumulator = 0;
  }

  if (stateChanged) {
    renderBalance();
    if (state.energy < maxEnergy) renderEnergy();
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
      
      // Восстанавливаем длину массивов на случай, если константы изменились
      if (!state.boughtClick) state.boughtClick = Array(UPGRADES.click.length).fill(false);
      if (!state.boughtMining) state.boughtMining = Array(UPGRADES.mining.length).fill(false);
      if (!state.boughtEnergy) state.boughtEnergy = Array(UPGRADES.energy_bar.length).fill(false);
      
    } catch (e) { console.error("Ошибка загрузки", e); }
  }
}

// =========================================================
// Навигация
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
    renderShop();
  }
}

function switchShopTab(tab) {
  currentShopTab = tab;
  shopTabClick.classList.remove("active");
  shopTabMining.classList.remove("active");
  shopTabEnergy.classList.remove("active");
  
  if (tab === "click") shopTabClick.classList.add("active");
  if (tab === "mining") shopTabMining.classList.add("active");
  if (tab === "energy") shopTabEnergy.classList.add("active");
  
  renderShop();
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

  setInterval(gameTick, 100);

  cpuButton.addEventListener("click", handleClick);
  
  tabClickBtn.addEventListener("click", () => switchTab("click"));
  tabShopBtn.addEventListener("click", () => switchTab("shop"));

  shopTabClick.addEventListener("click", () => switchShopTab("click"));
  shopTabMining.addEventListener("click", () => switchShopTab("mining"));
  shopTabEnergy.addEventListener("click", () => switchShopTab("energy"));

  setInterval(saveGame, 5000);
  window.addEventListener("beforeunload", saveGame);
}

init();
