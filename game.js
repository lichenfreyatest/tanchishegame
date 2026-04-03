/**
 * 贪吃蛇游戏核心逻辑模块 - 超级玛丽经典画风
 */

// 方向常量
const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

// 食物类型 - 玛丽风格道具
const FOOD_TYPES = [
  { emoji: '🍄', points: 10, color: '#E40028', pixelColor: '#E40028' },   // 红蘑菇
  { emoji: '⭐', points: 25, color: '#FAC000', pixelColor: '#FAC000' },   // 无敌星
  { emoji: '🌸', points: 15, color: '#E40028', pixelColor: '#FF6060' },   // 火焰花
  { emoji: '🪙', points: 12, color: '#FAC000', pixelColor: '#E8A028' },   // 金币
  { emoji: '💚', points: 20, color: '#00A800', pixelColor: '#00A800' },   // 1UP蘑菇
  { emoji: '🍎', points: 14, color: '#E40028', pixelColor: '#E40028' },   // 苹果
  { emoji: '🌟', points: 30, color: '#FAC000', pixelColor: '#FAC000' },   // 大星星
  { emoji: '🔔', points: 18, color: '#FAC000', pixelColor: '#E8A028' }    // 铃铛
];

// 玛丽风格蛇配色 - 管道绿色系
const SNAKE_COLORS = {
  head: '#00A800',
  headDark: '#005800',
  headHighlight: '#30D830',
  bodyStart: '#00A800',
  bodyEnd: '#003800',
  eyeWhite: '#FCFCFC',
  eyePupil: '#000000',
  outline: '#003800'
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
    
    // 关闭抗锯齿，增强像素感
    this.ctx.imageSmoothingEnabled = false;
    
    this.resizeCanvas();
    this.reset();
  }

  resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 32, 560);
    const maxHeight = Math.min(window.innerHeight - 300, 560);
    const size = Math.min(maxWidth, maxHeight);
    const adjustedSize = Math.floor(size / this.gridSize) * this.gridSize;
    
    this.canvas.width = adjustedSize;
    this.canvas.height = adjustedSize;
    this.cols = adjustedSize / this.gridSize;
    this.rows = adjustedSize / this.gridSize;
    
    this.ctx.imageSmoothingEnabled = false;
  }

  reset() {
    const centerX = Math.floor(this.cols / 2);
    const centerY = Math.floor(this.rows / 2);
    
    this.snake = [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY }
    ];
    
    this.direction = DIR.RIGHT;
    this.nextDirection = DIR.RIGHT;
    this.directionQueue = [];
    this.score = 0;
    this.food = null;
    this.isRunning = false;
    this.isPaused = false;
    this.gameOverFlag = false;
    this.animFrame = 0;
    this.lastMoveTime = 0;
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
    const lastDir = this.directionQueue.length > 0 
      ? this.directionQueue[this.directionQueue.length - 1] 
      : this.direction;
    
    if (lastDir.x + dir.x === 0 && lastDir.y + dir.y === 0) return;
    if (lastDir.x === dir.x && lastDir.y === dir.y) return;
    if (this.directionQueue.length < 2) {
      this.directionQueue.push(dir);
    }
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
    
    if (this.directionQueue.length > 0) {
      this.direction = this.directionQueue.shift();
    } else {
      this.direction = this.nextDirection;
    }
    
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
    
    if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += this.food.points;
      this.createEatParticles(this.food.x, this.food.y, this.food.pixelColor);
      this.onEatFood(this.food);
      this.onScoreChange(this.score, this.snake.length);
      this.spawnFood();
    } else {
      this.snake.pop();
    }
  }

  createEatParticles(x, y, color) {
    const centerX = x * this.gridSize + this.gridSize / 2;
    const centerY = y * this.gridSize + this.gridSize / 2;
    
    // 金币飞溅粒子
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2) - 2,
        life: 1,
        color: i % 2 === 0 ? '#FAC000' : color,
        size: 3 + Math.floor(Math.random() * 3)
      });
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // 重力效果，更像玛丽的金币弹跳
      p.life -= 0.05;
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
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawBackground();
    this.drawGrid();
    this.drawWallBorder();
    
    if (this.food) {
      this.drawFood();
    }
    
    this.drawSnake();
    
    this.updateParticles();
    this.drawParticles();
    
    if (this.gameOverFlag) {
      this.drawGameOverEffect();
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    const gs = this.gridSize;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // 天空蓝色背景（上半部分）
    ctx.fillStyle = '#5C94FC';
    ctx.fillRect(0, 0, w, h);
    
    // 底部两行 - 地面砖块
    const groundRows = 2;
    const groundY = (this.rows - groundRows) * gs;
    
    for (let x = 0; x < this.cols; x++) {
      for (let gy = 0; gy < groundRows; gy++) {
        const bx = x * gs;
        const by = groundY + gy * gs;
        
        // 砖块主体
        ctx.fillStyle = '#C84C0C';
        ctx.fillRect(bx, by, gs, gs);
        
        // 砖块高光（左上）
        ctx.fillStyle = '#E8A060';
        ctx.fillRect(bx, by, gs, 2);
        ctx.fillRect(bx, by, 2, gs);
        
        // 砖块阴影（右下）
        ctx.fillStyle = '#8C3800';
        ctx.fillRect(bx + gs - 2, by, 2, gs);
        ctx.fillRect(bx, by + gs - 2, gs, 2);
        
        // 砖缝
        ctx.fillStyle = '#5C3400';
        ctx.fillRect(bx + gs - 1, by, 1, gs);
        ctx.fillRect(bx, by + gs - 1, gs, 1);
      }
    }
    
    // 中间区域 - 浅蓝色棋盘格（游戏区域）
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows - groundRows; y++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = '#6CA4FC';
        } else {
          ctx.fillStyle = '#5C94FC';
        }
        ctx.fillRect(x * gs, y * gs, gs, gs);
      }
    }
    
    // 绘制几朵小云朵在画布内
    this.drawCloud(ctx, gs * 2, gs * 1.5, 1.2);
    this.drawCloud(ctx, gs * (this.cols - 5), gs * 2, 0.9);
    this.drawCloud(ctx, gs * (this.cols / 2), gs * 0.8, 1.0);
  }

  drawCloud(ctx, cx, cy, scale) {
    ctx.fillStyle = 'rgba(252, 248, 252, 0.5)';
    const s = this.gridSize * scale * 0.4;
    // 简单的像素云朵
    ctx.fillRect(cx - s, cy, s * 2, s * 0.6);
    ctx.fillRect(cx - s * 0.6, cy - s * 0.4, s * 1.2, s * 0.4);
    ctx.fillRect(cx + s * 0.2, cy - s * 0.6, s * 0.6, s * 0.3);
  }

  drawGrid() {
    const ctx = this.ctx;
    const gs = this.gridSize;
    
    // 非常微弱的网格线
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    
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

  drawWallBorder() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const gs = this.gridSize;
    
    // 管道绿色边框
    ctx.strokeStyle = '#005800';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    
    // 四角装饰 - 问号砖块风格小方块
    const cs = 6;
    ctx.fillStyle = '#FAC000';
    ctx.fillRect(1, 1, cs, cs);
    ctx.fillRect(w - cs - 1, 1, cs, cs);
    ctx.fillRect(1, h - cs - 1, cs, cs);
    ctx.fillRect(w - cs - 1, h - cs - 1, cs, cs);
    
    // 问号砖块内部小点
    ctx.fillStyle = '#C88000';
    ctx.fillRect(3, 3, 2, 2);
    ctx.fillRect(w - cs + 1, 3, 2, 2);
    ctx.fillRect(3, h - cs + 1, 2, 2);
    ctx.fillRect(w - cs + 1, h - cs + 1, 2, 2);
  }

  drawFood() {
    const ctx = this.ctx;
    const gs = this.gridSize;
    const food = this.food;
    const x = food.x * gs;
    const y = food.y * gs;
    
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    const cx = x + gs / 2;
    const cy = y + gs / 2;
    
    // 问号砖块背景
    ctx.fillStyle = '#E8A028';
    ctx.fillRect(x + 1, y + 1, gs - 2, gs - 2);
    
    // 砖块高光
    ctx.fillStyle = '#FAC000';
    ctx.fillRect(x + 1, y + 1, gs - 2, 2);
    ctx.fillRect(x + 1, y + 1, 2, gs - 2);
    
    // 砖块阴影
    ctx.fillStyle = '#C88000';
    ctx.fillRect(x + gs - 3, y + 1, 2, gs - 2);
    ctx.fillRect(x + 1, y + gs - 3, gs - 2, 2);
    
    // 食物emoji
    const bobY = Math.sin(Date.now() / 400) * 2;
    ctx.globalAlpha = 0.8 + pulse * 0.2;
    ctx.font = `${gs * 0.65}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(food.emoji, cx, cy + bobY);
    ctx.globalAlpha = 1;
  }

  drawSnake() {
    const ctx = this.ctx;
    const gs = this.gridSize;
    const snake = this.snake;
    
    // 从尾到头绘制
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const x = seg.x * gs;
      const y = seg.y * gs;
      
      if (i === 0) {
        this.drawSnakeHead(x, y);
      } else {
        this.drawSnakeBody(x, y, i, snake.length);
      }
    }
  }

  drawSnakeBody(x, y, index, total) {
    const ctx = this.ctx;
    const gs = this.gridSize;
    const progress = index / Math.max(total - 1, 1);
    
    // 管道绿色渐变 - 从亮绿到暗绿
    const r = Math.round(0 + progress * 0);
    const g = Math.round(168 * (1 - progress * 0.5));
    const b = Math.round(0 + progress * 0);
    
    const padding = 1;
    
    // 外框（深绿）
    ctx.fillStyle = '#003800';
    ctx.fillRect(x + padding, y + padding, gs - padding * 2, gs - padding * 2);
    
    // 内部填充 - 管道绿
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x + padding + 1, y + padding + 1, gs - padding * 2 - 2, gs - padding * 2 - 2);
    
    // 管道高光（左侧竖条）
    ctx.fillStyle = '#30D830';
    ctx.globalAlpha = 0.4 * (1 - progress * 0.6);
    ctx.fillRect(x + padding + 2, y + padding + 2, 3, gs - padding * 2 - 4);
    ctx.globalAlpha = 1;
    
    // 管道阴影（右侧竖条）
    ctx.fillStyle = '#003800';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x + gs - padding - 4, y + padding + 2, 2, gs - padding * 2 - 4);
    ctx.globalAlpha = 1;
    
    // 管道环纹（每隔一节）
    if (index % 3 === 0) {
      ctx.fillStyle = '#30D830';
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x + padding + 1, y + gs / 2 - 1, gs - padding * 2 - 2, 2);
      ctx.globalAlpha = 1;
    }
  }

  drawSnakeHead(x, y) {
    const ctx = this.ctx;
    const gs = this.gridSize;
    const dir = this.direction;
    
    // 蛇头外框 - 深绿
    ctx.fillStyle = '#003800';
    ctx.fillRect(x, y, gs, gs);
    
    // 蛇头主体 - 亮绿
    ctx.fillStyle = '#00A800';
    ctx.fillRect(x + 1, y + 1, gs - 2, gs - 2);
    
    // 蛇头高光 - 管道亮绿
    ctx.fillStyle = '#30D830';
    ctx.fillRect(x + 2, y + 2, 5, 3);
    ctx.fillRect(x + 2, y + 2, 3, 5);
    
    // 蛇头阴影
    ctx.fillStyle = '#005800';
    ctx.fillRect(x + gs - 5, y + gs - 5, 4, 4);
    
    // 像素眼睛 - 玛丽风格大眼
    const eyeSize = 5;
    const pupilSize = 3;
    let eye1x, eye1y, eye2x, eye2y;
    
    const cx = x + gs / 2;
    const cy = y + gs / 2;
    
    if (dir === DIR.RIGHT) {
      eye1x = cx + 2; eye1y = cy - 5;
      eye2x = cx + 2; eye2y = cy + 1;
    } else if (dir === DIR.LEFT) {
      eye1x = cx - 6; eye1y = cy - 5;
      eye2x = cx - 6; eye2y = cy + 1;
    } else if (dir === DIR.UP) {
      eye1x = cx - 6; eye1y = cy - 4;
      eye2x = cx + 2; eye2y = cy - 4;
    } else {
      eye1x = cx - 6; eye1y = cy + 0;
      eye2x = cx + 2; eye2y = cy + 0;
    }
    
    // 眼白
    ctx.fillStyle = '#FCFCFC';
    ctx.fillRect(eye1x, eye1y, eyeSize, eyeSize);
    ctx.fillRect(eye2x, eye2y, eyeSize, eyeSize);
    
    // 瞳孔 - 大而圆
    ctx.fillStyle = '#000000';
    const pOffX = dir.x > 0 ? 2 : dir.x < 0 ? 0 : 1;
    const pOffY = dir.y > 0 ? 2 : dir.y < 0 ? 0 : 1;
    ctx.fillRect(eye1x + pOffX, eye1y + pOffY, pupilSize, pupilSize);
    ctx.fillRect(eye2x + pOffX, eye2y + pOffY, pupilSize, pupilSize);
    
    // 眼睛高光小点
    ctx.fillStyle = '#FCFCFC';
    ctx.fillRect(eye1x + pOffX, eye1y + pOffY, 1, 1);
    ctx.fillRect(eye2x + pOffX, eye2y + pOffY, 1, 1);
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      // 像素方块粒子
      ctx.fillRect(
        Math.round(p.x - p.size / 2),
        Math.round(p.y - p.size / 2),
        p.size,
        p.size
      );
    }
    ctx.globalAlpha = 1;
  }

  drawGameOverEffect() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // 半透明暗色覆盖
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, w, h);
    
    // 红色横幅背景
    ctx.fillStyle = '#C84C0C';
    ctx.fillRect(0, h / 2 - 30, w, 60);
    ctx.fillStyle = '#E8A060';
    ctx.fillRect(0, h / 2 - 30, w, 3);
    ctx.fillRect(0, h / 2 + 27, w, 3);
    
    // 像素风"GAME OVER"文字
    ctx.font = 'bold 14px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 文字阴影
    ctx.fillStyle = '#5C3400';
    ctx.fillText('GAME OVER', w / 2 + 2, h / 2 + 2);
    
    // 主文字 - 白色
    ctx.fillStyle = '#FCFCFC';
    ctx.fillText('GAME OVER', w / 2, h / 2);
    
    // 闪烁的小提示
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#FAC000';
      ctx.fillText('PRESS RETRY', w / 2, h / 2 + 24);
    }
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
