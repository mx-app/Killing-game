import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './i/Scripts/config.js';

// إنشاء عميل Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// تعريف عناصر واجهة المستخدم
const uiElements = {
  purchaseNotification: document.getElementById('purchaseNotification'),
  scoreDisplay: document.getElementById('score'),
  timerDisplay: document.getElementById('timer'),
  retryButton: document.getElementById('retryButton'),
  userTelegramIdDisplay: document.getElementById('userTelegramId'),
  userTelegramNameDisplay: document.getElementById('userTelegramName'),
};

// متغيرات اللعبة
let score = 0;
let timeLeft = 60;
let gameOver = false;
let freezeUses = 2;
let isFrozen = false;
let fallingInterval;
let gameInterval;
let gameState = { balance: 0 };

// تعطيل التأثيرات الافتراضية للمس
window.addEventListener('touchstart', (event) => event.preventDefault());

// جلب بيانات المستخدم من Telegram
async function fetchUserDataFromTelegram() {
  const telegramApp = window.Telegram.WebApp;
  telegramApp.ready();

  const userTelegramId = telegramApp.initDataUnsafe.user?.id;
  const userTelegramName = telegramApp.initDataUnsafe.user?.username;

  if (!userTelegramId || !userTelegramName) {
    console.error("Failed to fetch Telegram user data.");
    return;
  }

  uiElements.userTelegramIdDisplay.innerText = `ID: ${userTelegramId}`;
  uiElements.userTelegramNameDisplay.innerText = `Username: ${userTelegramName}`;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userTelegramId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user data from Supabase:', error);
      return;
    }

    if (data) {
      gameState = { ...gameState, ...data };
      updateUI();
    } else {
      await registerNewUser(userTelegramId, userTelegramName);
    }
  } catch (error) {
    console.error("Error fetching user data from Supabase:", error);
  }
}

// دالة لتحديث واجهة المستخدم
function updateUI() {
  uiElements.scoreDisplay.innerText = `Score: ${gameState.balance}`;
  uiElements.timerDisplay.innerText = `Time Left: ${timeLeft}s`;
}

// دالة لإنشاء العنصر العائم (مثل العنصر الذي يتم تدميره)
function createFallingItem(type, x, y) {
  const item = document.createElement('div');
  item.classList.add('fallingItem', type);
  item.style.left = `${x}px`;
  item.style.top = `${y}px`;

  item.addEventListener('touchstart', () => {
    if (item.classList.contains('freeze')) {
      applyFreezeEffect();
    } else if (item.classList.contains('bomb')) {
      applyBombEffect();
    } else {
      item.classList.add('dead');
      score++;
      gameState.balance++;
      updateUI();
      item.remove();
    }
  });

  document.getElementById('gameArea').appendChild(item);
}

// تأثيرات التجميد
function applyFreezeEffect() {
  isFrozen = true;
  document.body.classList.add('frozen-effect');
  setTimeout(() => {
    isFrozen = false;
    document.body.classList.remove('frozen-effect');
  }, 5000);
}

// تأثيرات القنبلة
function applyBombEffect() {
  gameOver = true;
  alert('Game Over! You hit the bomb!');
  window.location.reload();
}

// دالة لبدء اللعبة
function startGame() {
  gameOver = false;
  score = 0;
  timeLeft = 60;
  gameState.balance = 0;
  updateUI();

  // إضافة العناصر العائمة
  fallingInterval = setInterval(() => {
    const x = Math.random() * window.innerWidth;
    const y = 0;
    const type = Math.random() < 0.1 ? 'bomb' : Math.random() < 0.2 ? 'freeze' : 'normal';
    createFallingItem(type, x, y);
  }, 1000);

  gameInterval = setInterval(() => {
    if (gameOver) {
      clearInterval(fallingInterval);
      clearInterval(gameInterval);
    } else {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(fallingInterval);
        clearInterval(gameInterval);
        alert('Game Over! Time is up!');
      }
      updateUI();
    }
  }, 1000);
}

// البدء في اللعبة عند تحميل الصفحة
window.onload = () => {
  fetchUserDataFromTelegram();
  startGame();
};
