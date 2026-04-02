/**
 * 贪吃蛇游戏核心逻辑模块
 */

// 方向常量
const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

// 食物类型及其属性
const FOOD_TYPES = [
  { emoji: '🍎', points: 10, color: '#ff5252' },
  { emoji: '🍊', points: 15, color: '#ff9800' },
  { emoji: '🍇', points: 20, color: '#9c27b0' },
  { emoji: '🍓', points: 12, color: '#e91e63' },
  { emoji: '🍑', points: 18, color: '#ff7043' },
  { emoji: '🍒', points: 25, color: '#d32f2f' },
  { emoji: '🥝', points: 22, color: '#689f38' },
  { emoji: '🍋', points: 14, color: '#fdd835' }
];

// 蛇身颜色渐变
const SNAKE_COLORS = {
  head: '#4caf50',
  headStroke: '#2e7d32',
  bodyStart: '#66bb6a',
  bodyEnd: '#a5d6a7',
  eyeWhite: '#ffffff',
  eyePupil: '#1a1a1a'
};

export class SnakeGame {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridSize = options.gridSize || 20;
    this.speed = options.speed || 150;
    this.onScoreChange = options.onScoreChange || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
    this.onEatFood = options.onEatFood || (() => {});
    
    this.resizeCanvas();
    this.reset();
  }

  resizeCanvas() {
    // 根据屏幕大小计算画布尺寸
    const maxWidth = Math.min(window.innerWidth - 32, 560);
    const maxHeight = Math.min(window.innerHeight - 300, 560);
    const size = Math.min(maxWidth, maxHeight);
    
    // 确保是gridSize的整数倍
    const adjustedSize = Math.floor(size / this.gridSize) * this.gridSize;
    
    this.canvas.width = adjustedSize;
    this.canvas.height = adjustedSize;
    this.cols = adjustedSize / this.gridSize;
    this.rows = adjustedSize / this.gridSize;
  }

  reset() {
    // 蛇的初始位置（居中）
    const centerX = Math.floor(this.cols / 2);
    const centerY = Math.floor(this.rows / 2);
    
    this.snake = [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY }
    ];
    
    this.direction = DIR.RIGHT;
    this.nextDirection = DIR.RIGHT;
    this.score = 0;
    this.food = null;
    this.isRunning = false;
    this.isPaused = false;
    this.gameOverFlag = false;
    this.animFrame = 0;
    this.lastMoveTime = 0;
    this.eatAnimation = null;
    this.particles = [];
    
    this.spawnFood();
    this.draw();
  }

  spawnFood() {
    const occupied = new Set(this.snake.map(s => `${s.x},${s.y}`));
    const available = [];
    
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (!occupied.has(`${x},${y}`)) {
          available.push({ x, y });
        }
      }
    }
    
    if (available.length === 0) return;
    
    const pos = available[Math.floor(Math.random() * available.length)];
    const type = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
    
    this.food = { ...pos, ...type, spawnTime: Date.now() };
  }

  setDirection(dir) {
    // 防止180度转向
    if (this.direction.x + dir.x === 0 && this.direction.y + dir.y === 0) return;
    this.nextDirection = dir;
  }

  start() {
    if (this.gameOverFlag) {
      this.reset();
    }
    this.isRunning = true;
    this.isPaused = false;
    this.lastMoveTime = performance.now();
    this.gameLoop();
  }

  pause() {
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.lastMoveTime = performance.now();
      this.gameLoop();
    }
    return this.isPaused;
  }

  stop() {
    this.isRunning = false;
  }

  gameLoop() {
    if (!this.isRunning || this.isPaused) return;
    
    const now = performance.now();
    const delta = now - this.lastMoveTime;
    
    if (delta >= this.speed) {
      this.update();
      this.lastMoveTime = now - (delta % this.speed);
    }
    
    this.animFrame++;
    this.draw();
    
    if (this.isRunning && !this.isPaused) {
      requestAnimationFrame(() => this.gameLoop());
    }
  }

  update() {
    if (this.gameOverFlag) return;
    
    this.direction = this.nextDirection;
    
    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y
    };
    
    // 碰撞检测 - 墙壁
    if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows) {
      this.triggerGameOver();
      return;
    }
    
    // 碰撞检测 - 自身
    for (let i = 0; i < this.snake.length; i++) {
      if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
        this.triggerGameOver();
        return;
      }
    }
    
    this.snake.unshift(newHead);
    
    // 检查是否吃到食物
    if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += this.food.points;
      this.createEatParticles(this.food.x, this.food.y, this.food.emoji);
      this.onEatFood(this.food);
      this.onScoreChange(this.score, this.snake.length);
      this.spawnFood();
    } else {
      this.snake.pop();
    }
  }

  createEatParticles(x, y, emoji) {
    const centerX = x * this.gridSize + this.gridSize / 2;
    const centerY = y * this.gridSize + this.gridSize / 2;
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 1,
        emoji: emoji,
        size: 12
      });
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      p.size *= 0.96;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  triggerGameOver() {
    this.gameOverFlag = true;
    this.isRunning = false;
    this.onGameOver(this.score, this.snake.length);
  }

  draw() {
    const ctx = this.ctx;
    const gs = this.gridSize;
    
    // 清空画布
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制背景
    this.drawBackground();
    
    // 绘制网格
    this.drawGrid();
    
    // 绘制食物
    if (this.food) {
      this.drawFood();
    }
    
    // 绘制蛇
    this.drawSnake();
    
    // 绘制粒子
    this.updateParticles();
    this.drawParticles();
    
    // 游戏结束效果
    if (this.gameOverFlag) {
      this.drawGameOverEffect();
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid() {
    const ctx = this.ctx;
    const gs = this.gridSize;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * gs, 0);
      ctx.lineTo(x * gs, this.canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * gs);
      ctx.lineTo(this.canvas.width, y * gs);
      ctx.stroke();
    }
  }

  drawFood() {
    const ctx = this.ctx;
    const gs = this.gridSize;
    const food = this.food;
    
    // 食物发光效果
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    const cx = food.x * gs + gs / 2;
    const cy = food.y * gs + gs / 2;
    
    // 光晕
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, gs);
    glow.addColorStop(0, `${food.color}66`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(food.x * gs - gs / 2, food.y * gs - gs / 2, gs * 2, gs * 2);
    
    // 食物emoji
    const bobY = Math.sin(Date.now() / 400) * 2;
    ctx.font = `${gs * 0.8}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.8 + pulse * 0.2;
    ctx.fillText(food.emoji, cx, cy + bobY);
    ctx.globalAlpha = 1;
  }

  drawSnake() {
    const ctx = this.ctx;
    const gs = this.gridSize;
    const snake = this.snake;
    
    // 从尾到头绘制蛇身
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const x = seg.x * gs;
      const y = seg.y * gs;
      const progress = i / Math.max(snake.length - 1, 1);
      
      if (i === 0) {
        // 蛇头
        this.drawSnakeHead(x, y);
      } else {
        // 蛇身
        const r = this.lerpColor(0x66, 0xa5, progress);
        const g = this.lerpColor(0xbb, 0xd6, progress);
        const b = this.lerpColor(0x6a, 0xa7, progress);
        const color = `rgb(${r}, ${g}, ${b})`;
        
        const padding = 1;
        const radius = gs / 2 - padding;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x + padding, y + padding, gs - padding * 2, gs - padding * 2, radius * 0.6);
        ctx.fill();
        
        // 蛇身高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.roundRect(x + padding + 2, y + padding + 2, gs / 2 - 2, gs / 3, 4);
        ctx.fill();
      }
    }
  }

  drawSnakeHead(x, y) {
    const ctx = this.ctx;
    const gs = this.gridSize;
    const dir = this.direction;
    
    // 头部主体
    const padding = 0;
    ctx.fillStyle = SNAKE_COLORS.head;
    ctx.beginPath();
    ctx.roundRect(x + padding, y + padding, gs - padding * 2, gs - padding * 2, gs * 0.35);
    ctx.fill();
    
    // 头部描边
    ctx.strokeStyle = SNAKE_COLORS.headStroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 头部高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, gs / 2, gs / 3, 4);
    ctx.fill();
    
    // 眼睛位置根据方向调整
    const eyeSize = gs * 0.18;
    const pupilSize = gs * 0.1;
    let eye1x, eye1y, eye2x, eye2y;
    
    const cx = x + gs / 2;
    const cy = y + gs / 2;
    
    if (dir === DIR.RIGHT) {
      eye1x = cx + gs * 0.15; eye1y = cy - gs * 0.18;
      eye2x = cx + gs * 0.15; eye2y = cy + gs * 0.18;
    } else if (dir === DIR.LEFT) {
      eye1x = cx - gs * 0.15; eye1y = cy - gs * 0.18;
      eye2x = cx - gs * 0.15; eye2y = cy + gs * 0.18;
    } else if (dir === DIR.UP) {
      eye1x = cx - gs * 0.18; eye1y = cy - gs * 0.15;
      eye2x = cx + gs * 0.18; eye2y = cy - gs * 0.15;
    } else {
      eye1x = cx - gs * 0.18; eye1y = cy + gs * 0.15;
      eye2x = cx + gs * 0.18; eye2y = cy + gs * 0.15;
    }
    
    // 绘制眼白
    ctx.fillStyle = SNAKE_COLORS.eyeWhite;
    ctx.beginPath();
    ctx.arc(eye1x, eye1y, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eye2x, eye2y, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制瞳孔
    ctx.fillStyle = SNAKE_COLORS.eyePupil;
    ctx.beginPath();
    ctx.arc(eye1x + dir.x * 1.5, eye1y + dir.y * 1.5, pupilSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eye2x + dir.x * 1.5, eye2y + dir.y * 1.5, pupilSize, 0, Math.PI * 2);
    ctx.fill();
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  drawGameOverEffect() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    ctx.font = 'bold 36px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff5252';
    ctx.fillText('💀 游戏结束', this.canvas.width / 2, this.canvas.height / 2);
  }

  lerpColor(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  getScore() {
    return this.score;
  }

  getLength() {
    return this.snake.length;
  }
}

export { DIR };
