// تعريف عناصر واجهة المستخدم
const uiElements = {
  scoreDisplay: document.getElementById('score'),
  timerDisplay: document.getElementById('timer'),
  retryButton: document.getElementById('retryButton'),
  startButton: document.getElementById('startButton'),
  purchaseNotification: document.getElementById('purchaseNotification'),
};

let score = 0;
let timeLeft = 60;
let gameOver = false;
let isFrozen = false;
let fallingInterval;
let gameInterval;

// تعطيل التأثيرات الافتراضية للمس
window.addEventListener('touchstart', (event) => event.preventDefault());

// تحديث واجهة المستخدم
function updateUI() {
  uiElements.scoreDisplay.innerText = `${score}`;
  uiElements.timerDisplay.innerText = `00 : ${timeLeft}`;
}

// بدء اللعبة
function startGame() {
  score = 0;
  timeLeft = 60;
  gameOver = false;
  updateUI();

  uiElements.startButton.style.display = 'none';
  uiElements.retryButton.style.display = 'none';

  // عداد الوقت
  gameInterval = setInterval(() => {
    if (!gameOver) {
      timeLeft--;
      updateUI();
      if (timeLeft <= 0) endGame(true);
    }
  }, 1000);

  // إنشاء العناصر المتساقطة
  fallingInterval = setInterval(() => {
    if (!gameOver) createRandomItem();
  }, 400);
}

// إنهاء اللعبة
function endGame(isWin) {
  gameOver = true;
  clearInterval(gameInterval);
  clearInterval(fallingInterval);

  if (isWin) {
    showNotification('You won!');
  } else {
    activateBombEffect();
    showNotification('Game Over!');
  }

  uiElements.retryButton.style.display = 'block';
}

// إنشاء عنصر عشوائي
function createRandomItem() {
  const random = Math.random();
  if (random < 0.1) {
    createFreezeItem();
  } else if (random < 0.2) {
    createBombItem();
  } else {
    createFallingItem();
  }
}

// إنشاء عنصر بحجم عشوائي (العنصر الأساسي)
function createFallingItem() {
  const size = Math.random() * 30 + 20; // حجم بين 20 و 50 بكسل
  createItem('fallingItem', size, () => {
    score++;
    showHitEffect();
    updateUI();
  });
}

// إنشاء عنصر التجميد
function createFreezeItem() {
  createItem('FreezeItem', 60, () => {
    activateFreezeEffect();
  });
}

// إنشاء عنصر القنبلة
function createBombItem() {
  createItem('bombItem', 60, () => {
    endGame(false);
  });
}

// إنشاء عنصر عام
function createItem(className, size, onClick) {
  const item = document.createElement('div');
  item.className = className;
  item.style.width = `${size}px`;
  item.style.height = `${size}px`;
  item.style.left = `${Math.random() * (window.innerWidth - size)}px`;
  item.style.top = '-50px';
  document.body.appendChild(item);

  let falling = setInterval(() => {
    if (!gameOver) {
      item.style.top = `${item.offsetTop + 5}px`;
      if (item.offsetTop > window.innerHeight) {
        document.body.removeChild(item);
        clearInterval(falling);
      }
    }
  }, 30);

  // تأثير عند النقر أو التحريك
  item.addEventListener('mousedown', () => handleHit(item, onClick));
  item.addEventListener('mousemove', () => handleHit(item, onClick));
}

// معالجة القتل بالتأثير
function handleHit(item, onClick) {
  if (!gameOver && item.style.opacity !== '0') {
    item.style.transform = 'scale(1.5)';
    item.style.opacity = '0';
    setTimeout(() => item.remove(), 200);
    onClick();
  }
}

// تأثير القتل
function showHitEffect() {
  const effect = document.createElement('div');
  effect.className = 'hit-effect';
  document.body.appendChild(effect);
  setTimeout(() => effect.remove(), 300);
}

// تأثير التجميد
function activateFreezeEffect() {
  if (isFrozen) return;
  isFrozen = true;
  const freezeOverlay = document.createElement('div');
  freezeOverlay.className = 'frozen-effect';
  document.body.appendChild(freezeOverlay);

  setTimeout(() => {
    isFrozen = false;
    freezeOverlay.remove();
  }, 5000);
}

// تأثير القنبلة
function activateBombEffect() {
  document.body.style.backgroundColor = 'red';
  setTimeout(() => (document.body.style.backgroundColor = ''), 200);
}

// عرض إشعار
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerText = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}

// زر بدء اللعبة
uiElements.startButton.addEventListener('click', startGame);

// زر إعادة المحاولة
uiElements.retryButton.addEventListener('click', startGame);

// عند تحميل الصفحة
window.onload = () => {
  uiElements.startButton.style.display = 'block';
  uiElements.retryButton.style.display = 'none';
}; 
