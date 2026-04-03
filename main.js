/**
 * 贪吃蛇游戏 - 主入口文件
 * 负责UI交互、事件绑定、触摸手势处理
 */

import { SnakeGame, DIR } from './game.js';
import { AudioManager } from './audio.js';

// ===== DOM 元素引用 =====
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverModal = document.getElementById('gameover-modal');
const pauseOverlay = document.getElementById('pause-overlay');

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const backBtn = document.getElementById('back-btn');
const retryBtn = document.getElementById('retry-btn');
const homeBtn = document.getElementById('home-btn');

const scoreDisplay = document.getElementById('score-display');
const lengthDisplay = document.getElementById('length-display');
const difficultyLabel = document.getElementById('difficulty-label');
const finalScore = document.getElementById('final-score');
const finalLength = document.getElementById('final-length');
const bestScore = document.getElementById('best-score');

const soundToggle = document.getElementById('sound-toggle');
const soundLabel = document.getElementById('sound-label');
const canvas = document.getElementById('game-canvas');

const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const dpadBtns = document.querySelectorAll('.dpad-btn[data-dir]');

// ===== 游戏状态 =====
let selectedSpeed = 150;
let selectedDiffLabel = '🌱 简单';
let game = null;
const audio = new AudioManager();

// ===== 最高分存储 =====
function getHighScore() {
  try {
    return parseInt(localStorage.getItem('snake_high_score') || '0', 10);
  } catch {
    return 0;
  }
}

function setHighScore(score) {
  try {
    localStorage.setItem('snake_high_score', String(score));
  } catch {
    // 忽略存储错误
  }
}

// ===== 界面切换 =====
function showScreen(screen) {
  startScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  gameoverModal.classList.add('hidden');
  pauseOverlay.classList.add('hidden');

  if (screen === 'start') {
    startScreen.classList.remove('hidden');
    startScreen.classList.add('fade-in');
  } else if (screen === 'game') {
    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('fade-in');
  }
}

function showGameOver() {
  gameoverModal.classList.remove('hidden');
  gameoverModal.querySelector('.gameover-panel').classList.add('fade-in');
}

// ===== 初始化游戏 =====
function initGame() {
  if (game) {
    game.stop();
  }

  game = new SnakeGame(canvas, {
    gridSize: 20,
    speed: selectedSpeed,
    onScoreChange: (score, length) => {
      scoreDisplay.textContent = score;
      lengthDisplay.textContent = length;
      scoreDisplay.classList.remove('score-pop');
      void scoreDisplay.offsetWidth; // 触发重排
      scoreDisplay.classList.add('score-pop');
    },
    onGameOver: (score, length) => {
      audio.stopBgm();
      audio.playGameOverSound();

      const high = getHighScore();
      const isNewRecord = score > high;
      if (isNewRecord) {
        setHighScore(score);
      }

      finalScore.textContent = score;
      finalLength.textContent = length;
      bestScore.textContent = isNewRecord ? score : high;

      // 新纪录标识
      const existingBadge = document.querySelector('.new-record');
      if (existingBadge) existingBadge.remove();
      if (isNewRecord && score > 0) {
        const badge = document.createElement('span');
        badge.className = 'new-record';
        badge.textContent = '🎉 新纪录!';
        bestScore.parentElement.appendChild(badge);
      }

      setTimeout(() => showGameOver(), 600);
    },
    onEatFood: (food) => {
      audio.playEatSound();
    }
  });

  difficultyLabel.textContent = selectedDiffLabel;
  scoreDisplay.textContent = '0';
  lengthDisplay.textContent = '3';
}

function startGame() {
  audio.ensureContext();
  initGame();
  showScreen('game');
  setTimeout(() => {
    game.resizeCanvas();
    game.reset();
    game.start();
    audio.startBgm();
  }, 100);
}

// ===== 难度选择 =====
difficultyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    audio.playClickSound();
    difficultyBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSpeed = parseInt(btn.dataset.speed, 10);
    const label = btn.dataset.label;
    const emoji = btn.querySelector('.diff-emoji').textContent;
    selectedDiffLabel = `${emoji} ${label}`;
  });
});

// ===== 音效开关 =====
soundToggle.addEventListener('change', () => {
  const enabled = soundToggle.checked;
  audio.setEnabled(enabled);
  soundLabel.textContent = enabled ? '🔊 音效开启' : '🔇 音效关闭';
});

// ===== 按钮事件 =====
startBtn.addEventListener('click', () => {
  audio.playClickSound();
  startGame();
});

pauseBtn.addEventListener('click', () => {
  if (!game) return;
  audio.playClickSound();
  const paused = game.pause();
  pauseOverlay.classList.toggle('hidden', !paused);
  pauseBtn.textContent = paused ? '▶️ 继续' : '⏸️ 暂停';
  if (paused) {
    audio.stopBgm();
  } else {
    audio.startBgm();
  }
});

restartBtn.addEventListener('click', () => {
  audio.playClickSound();
  audio.stopBgm();
  initGame();
  game.start();
  audio.startBgm();
  pauseOverlay.classList.add('hidden');
  pauseBtn.textContent = '⏸️ 暂停';
});

backBtn.addEventListener('click', () => {
  audio.playClickSound();
  if (game) game.stop();
  audio.stopBgm();
  showScreen('start');
});

retryBtn.addEventListener('click', () => {
  audio.playClickSound();
  gameoverModal.classList.add('hidden');
  initGame();
  game.start();
  audio.startBgm();
  pauseBtn.textContent = '⏸️ 暂停';
});

homeBtn.addEventListener('click', () => {
  audio.playClickSound();
  gameoverModal.classList.add('hidden');
  if (game) game.stop();
  audio.stopBgm();
  showScreen('start');
});

// ===== 键盘控制 =====
const keyMap = {
  'ArrowUp': DIR.UP, 'KeyW': DIR.UP,
  'ArrowDown': DIR.DOWN, 'KeyS': DIR.DOWN,
  'ArrowLeft': DIR.LEFT, 'KeyA': DIR.LEFT,
  'ArrowRight': DIR.RIGHT, 'KeyD': DIR.RIGHT
};

document.addEventListener('keydown', (e) => {
  // 空格键暂停/继续（修复运算符优先级）
  if (e.code === 'Space' && game && (game.isRunning || game.isPaused)) {
    e.preventDefault();
    pauseBtn.click();
    return;
  }

  const dir = keyMap[e.code];
  if (dir && game && game.isRunning && !game.isPaused) {
    e.preventDefault();
    game.setDirection(dir);
    audio.playTurnSound();
  }
});

// ===== 触摸手势控制（优化版） =====
// 触摸状态管理
let touchStartX = 0;
let touchStartY = 0;
let touchId = null;           // 追踪触摸ID，防止多指干扰
let hasSwiped = false;        // 本次触摸是否已触发过滑动
let lastSwipeTime = 0;        // 上次滑动时间，用于防抖

// 将触摸监听扩展到整个游戏界面（而非仅canvas）
const touchTarget = gameScreen;

touchTarget.addEventListener('touchstart', (e) => {
  // 如果触摸在按钮上则不拦截
  if (e.target.closest('.control-btn') || e.target.closest('.dpad-btn')) return;
  
  e.preventDefault();
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchId = touch.identifier;
  hasSwiped = false;
}, { passive: false });

// 核心优化：在touchmove中实时检测方向，无需等手指抬起
touchTarget.addEventListener('touchmove', (e) => {
  if (e.target.closest('.control-btn') || e.target.closest('.dpad-btn')) return;
  e.preventDefault();
  if (!game || !game.isRunning || game.isPaused) return;

  // 找到对应的触摸点
  let touch = null;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === touchId) {
      touch = e.changedTouches[i];
      break;
    }
  }
  if (!touch) return;

  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const now = Date.now();

  // 降低最小滑动距离阈值，提升灵敏度
  const minDist = 10;
  // 防抖：两次方向变化间隔至少50ms
  const swipeCooldown = 50;

  if (now - lastSwipeTime < swipeCooldown) return;
  if (Math.abs(dx) < minDist && Math.abs(dy) < minDist) return;

  let dir;
  if (Math.abs(dx) > Math.abs(dy)) {
    dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
  } else {
    dir = dy > 0 ? DIR.DOWN : DIR.UP;
  }

  game.setDirection(dir);
  audio.playTurnSound();
  
  // 重置起点，支持连续滑动转向（如L形、U形手势）
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  lastSwipeTime = now;
  hasSwiped = true;
}, { passive: false });

// touchend 作为补充：处理快速轻扫（tap-swipe）
touchTarget.addEventListener('touchend', (e) => {
  if (e.target.closest('.control-btn') || e.target.closest('.dpad-btn')) return;
  e.preventDefault();
  if (hasSwiped) return; // 已在touchmove中处理过
  if (!game || !game.isRunning || game.isPaused) return;

  let touch = null;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === touchId) {
      touch = e.changedTouches[i];
      break;
    }
  }
  if (!touch) return;

  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  // 快速轻扫的最小距离更小
  const minDist = 8;
  if (Math.abs(dx) < minDist && Math.abs(dy) < minDist) return;

  let dir;
  if (Math.abs(dx) > Math.abs(dy)) {
    dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
  } else {
    dir = dy > 0 ? DIR.DOWN : DIR.UP;
  }

  game.setDirection(dir);
  audio.playTurnSound();
}, { passive: false });

// ===== 移动端虚拟方向键（优化版） =====
const dirMap = {
  'up': DIR.UP,
  'down': DIR.DOWN,
  'left': DIR.LEFT,
  'right': DIR.RIGHT
};

dpadBtns.forEach(btn => {
  let repeatTimer = null;

  const triggerDir = () => {
    if (!game || !game.isRunning || game.isPaused) return;
    const dir = dirMap[btn.dataset.dir];
    if (dir) {
      game.setDirection(dir);
      audio.playTurnSound();
    }
  };

  const startHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    triggerDir();
    // 长按连续触发（200ms后开始，每100ms一次）
    clearInterval(repeatTimer);
    repeatTimer = setTimeout(() => {
      repeatTimer = setInterval(triggerDir, 100);
    }, 200);
    // 添加按下视觉反馈
    btn.classList.add('dpad-active');
  };

  const endHandler = (e) => {
    e.preventDefault();
    clearInterval(repeatTimer);
    clearTimeout(repeatTimer);
    repeatTimer = null;
    btn.classList.remove('dpad-active');
  };

  btn.addEventListener('touchstart', startHandler, { passive: false });
  btn.addEventListener('mousedown', startHandler);
  btn.addEventListener('touchend', endHandler, { passive: false });
  btn.addEventListener('touchcancel', endHandler, { passive: false });
  btn.addEventListener('mouseup', endHandler);
  btn.addEventListener('mouseleave', endHandler);
});

// ===== 窗口大小变化 =====
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (game && !game.gameOverFlag) {
      game.resizeCanvas();
      game.draw();
    }
  }, 200);
});

// ===== 防止页面滚动 =====
document.addEventListener('touchmove', (e) => {
  if (gameScreen.classList.contains('hidden') === false) {
    e.preventDefault();
  }
}, { passive: false });

// ===== 初始化 =====
showScreen('start');
audio.init();