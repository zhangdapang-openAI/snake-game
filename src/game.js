/**
 * 深海贪吃蛇 - 纯Canvas版本
 * 制作人：张大胖 & AI助手
 * 版本：v4.0.0
 * 
 * 特性：
 * - 纯Canvas + JavaScript，无外部依赖
 * - 彩虹色特效（吃到金色道具）
 * - 触摸+鼠标+键盘全兼容
 * - 屏幕自适应
 * - 虚拟摇杆（移动端）
 * - localStorage存储最高分
 */

// 游戏配置
const CONFIG = {
    GRID_SIZE: 20,
    GRID_WIDTH: 30,
    GRID_HEIGHT: 30,
    BASE_SPEED: 150,
    SPEED_DECREASE: 2,
    MIN_SPEED: 60,
    POWERUP_CHANCE: 0.2,
    POWERUP_DURATION: 8000,
    RAINBOW_DURATION: 10000
};

// 彩虹色
const RAINBOW_COLORS = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];

// 霓虹色
const NEON_COLORS = ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff0080', '#80ff00', '#ff8000', '#8000ff'];

// 游戏状态
const gameState = {
    snake: [],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: null,
    powerup: null,
    score: 0,
    highScore: 0,
    speed: CONFIG.BASE_SPEED,
    isPaused: false,
    isGameOver: false,
    rainbowMode: false,
    rainbowEndTime: 0,
    colorIndex: 0,
    growCount: 0,
    particles: [],
    lastTime: 0
};

// 获取画布
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 检测触摸设备
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

// 显示移动端控制
if (isTouchDevice) {
    document.getElementById('mobileControls').style.display = 'flex';
}

// ==================== 初始化 ====================

// 初始化气泡背景
function initBubbles() {
    const container = document.getElementById('bubbles');
    for (let i = 0; i < 20; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.style.left = Math.random() * 100 + '%';
        bubble.style.width = Math.random() * 30 + 10 + 'px';
        bubble.style.height = bubble.style.width;
        bubble.style.animationDelay = Math.random() * 8 + 's';
        bubble.style.animationDuration = Math.random() * 4 + 6 + 's';
        container.appendChild(bubble);
    }
}

// 初始化画布大小
function initCanvas() {
    const maxWidth = Math.min(window.innerWidth - 40, 600);
    const maxHeight = Math.min(window.innerHeight - 280, 600);
    const size = Math.min(maxWidth, maxHeight);
    const gridPixels = Math.floor(size / CONFIG.GRID_WIDTH) * CONFIG.GRID_WIDTH;
    
    canvas.width = gridPixels;
    canvas.height = gridPixels;
    CONFIG.GRID_PIXELS = gridPixels / CONFIG.GRID_WIDTH;
}

// 加载最高分
function loadHighScore() {
    const saved = localStorage.getItem('snakeHighScore_v4');
    gameState.highScore = saved ? parseInt(saved) : 0;
    document.getElementById('highScore').textContent = gameState.highScore;
}

// 保存最高分
function saveHighScore() {
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('snakeHighScore_v4', gameState.highScore);
        document.getElementById('highScore').textContent = gameState.highScore;
    }
}

// ==================== 游戏逻辑 ====================

function initGame() {
    // 重置状态
    gameState.snake = [];
    gameState.direction = { x: 1, y: 0 };
    gameState.nextDirection = { x: 1, y: 0 };
    gameState.score = 0;
    gameState.speed = CONFIG.BASE_SPEED;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    gameState.rainbowMode = false;
    gameState.colorIndex = 0;
    gameState.growCount = 0;
    gameState.particles = [];
    
    // 初始化蛇
    const startX = 5;
    const startY = 15;
    for (let i = 0; i < 3; i++) {
        gameState.snake.push({
            x: startX - i,
            y: startY,
            color: NEON_COLORS[0]
        });
    }
    
    // 生成食物和道具
    gameState.food = null;
    gameState.powerup = null;
    spawnFood();
    spawnPowerup();
    
    // 隐藏游戏结束界面
    document.getElementById('gameOverScreen').classList.remove('active');
    
    updateUI();
}

function spawnFood() {
    let valid = false;
    let x, y;
    let attempts = 0;
    
    while (!valid && attempts < 100) {
        x = Math.floor(Math.random() * CONFIG.GRID_WIDTH);
        y = Math.floor(Math.random() * CONFIG.GRID_HEIGHT);
        valid = !isPositionOccupied(x, y);
        attempts++;
    }
    
    if (!valid) return;
    
    gameState.food = {
        x: x,
        y: y,
        pulsePhase: 0
    };
}

function spawnPowerup() {
    if (gameState.powerup) return;
    
    if (Math.random() > CONFIG.POWERUP_CHANCE) return;
    
    let valid = false;
    let x, y;
    let attempts = 0;
    
    while (!valid && attempts < 50) {
        x = Math.floor(Math.random() * CONFIG.GRID_WIDTH);
        y = Math.floor(Math.random() * CONFIG.GRID_HEIGHT);
        valid = !isPositionOccupied(x, y);
        attempts++;
    }
    
    if (!valid) return;
    
    gameState.powerup = {
        x: x,
        y: y,
        spawnTime: Date.now(),
        rotation: 0
    };
}

function isPositionOccupied(x, y) {
    if (gameState.snake.some(s => s.x === x && s.y === y)) return true;
    if (gameState.food && gameState.food.x === x && gameState.food.y === y) return true;
    if (gameState.powerup && gameState.powerup.x === x && gameState.powerup.y === y) return true;
    return false;
}

// ==================== 粒子系统 ====================

function createParticles(x, y, count, color) {
    const centerX = x * CONFIG.GRID_PIXELS + CONFIG.GRID_PIXELS / 2;
    const centerY = y * CONFIG.GRID_PIXELS + CONFIG.GRID_PIXELS / 2;
    
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 2 + Math.random() * 4;
        gameState.particles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            color: color || '#ffffff'
        });
    }
}

function updateParticles() {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // 重力
        p.life -= 0.02;
        
        if (p.life <= 0) {
            gameState.particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    gameState.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

// ==================== 游戏循环 ====================

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    
    const deltaTime = currentTime - gameState.lastTime;
    if (deltaTime < gameState.speed) return;
    gameState.lastTime = currentTime;
    
    if (!gameState.isPaused && !gameState.isGameOver) {
        update();
    }
    
    draw();
}

function update() {
    // 更新方向
    gameState.direction = { ...gameState.nextDirection };
    
    // 计算新头部位置
    const head = gameState.snake[0];
    const newX = head.x + gameState.direction.x;
    const newY = head.y + gameState.direction.y;
    
    // 边界检测
    if (newX < 0 || newX >= CONFIG.GRID_WIDTH || 
        newY < 0 || newY >= CONFIG.GRID_HEIGHT) {
        gameOver();
        return;
    }
    
    // 自身碰撞检测
    if (gameState.snake.some(s => s.x === newX && s.y === newY)) {
        gameOver();
        return;
    }
    
    // 移动蛇
    moveSnake(newX, newY);
    
    // 检查吃食物
    checkEat();
    
    // 更新粒子
    updateParticles();
    
    // 检查彩虹模式结束
    if (gameState.rainbowMode && Date.now() > gameState.rainbowEndTime) {
        gameState.rainbowMode = false;
        gameState.snake.forEach(s => {
            s.color = NEON_COLORS[gameState.colorIndex];
        });
    }
    
    // 道具过期检查
    if (gameState.powerup && Date.now() - gameState.powerup.spawnTime > CONFIG.POWERUP_DURATION) {
        gameState.powerup = null;
    }
    
    // 随机生成新道具（频率提高）
    if (!gameState.powerup && Math.random() < 0.02) {
        spawnPowerup();
    }
    
    // 更新动画状态
    if (gameState.food) {
        gameState.food.pulsePhase += 0.1;
    }
    if (gameState.powerup) {
        gameState.powerup.rotation += 0.05;
    }
}

function moveSnake(newX, newY) {
    // 确定新头部颜色
    let newColor;
    if (gameState.rainbowMode) {
        newColor = RAINBOW_COLORS[0];
    } else {
        newColor = NEON_COLORS[gameState.colorIndex];
    }
    
    // 添加新头部
    gameState.snake.unshift({
        x: newX,
        y: newY,
        color: newColor
    });
    
    // 处理增长
    if (gameState.growCount > 0) {
        gameState.growCount--;
    } else {
        gameState.snake.pop();
    }
    
    // 彩虹模式更新颜色
    if (gameState.rainbowMode) {
        gameState.snake.forEach((segment, index) => {
            segment.color = RAINBOW_COLORS[index % RAINBOW_COLORS.length];
        });
    }
}

function checkEat() {
    const head = gameState.snake[0];
    
    // 检查普通食物
    if (gameState.food && head.x === gameState.food.x && head.y === gameState.food.y) {
        gameState.score += 10;
        gameState.growCount++;
        gameState.speed = Math.max(CONFIG.MIN_SPEED, gameState.speed - CONFIG.SPEED_DECREASE);
        
        // 粒子效果
        createParticles(head.x, head.y, 15, '#ff0000');
        
        // 变色
        if (!gameState.rainbowMode) {
            gameState.colorIndex = (gameState.colorIndex + 1) % NEON_COLORS.length;
            gameState.snake.forEach(s => s.color = NEON_COLORS[gameState.colorIndex]);
        }
        
        gameState.food = null;
        spawnFood();
        updateUI();
    }
    
    // 检查道具
    if (gameState.powerup && head.x === gameState.powerup.x && head.y === gameState.powerup.y) {
        gameState.score += 30;
        gameState.growCount += 4; // +1 normal + 3 bonus
        
        // 粒子效果
        createParticles(head.x, head.y, 30, '#ffd700');
        
        // 激活彩虹模式
        activateRainbowMode();
        
        gameState.powerup = null;
        updateUI();
    }
}

function activateRainbowMode() {
    gameState.rainbowMode = true;
    gameState.rainbowEndTime = Date.now() + CONFIG.RAINBOW_DURATION;
}

// ==================== 渲染 ====================

function draw() {
    // 清空画布
    ctx.fillStyle = 'rgba(0, 10, 20, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格
    drawGrid();
    
    // 绘制食物
    if (gameState.food) {
        drawFood(gameState.food);
    }
    
    // 绘制道具
    if (gameState.powerup) {
        drawPowerup(gameState.powerup);
    }
    
    // 绘制蛇
    drawSnake();
    
    // 绘制粒子
    drawParticles();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= CONFIG.GRID_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CONFIG.GRID_PIXELS, 0);
        ctx.lineTo(x * CONFIG.GRID_PIXELS, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y <= CONFIG.GRID_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CONFIG.GRID_PIXELS);
        ctx.lineTo(canvas.width, y * CONFIG.GRID_PIXELS);
        ctx.stroke();
    }
}

function drawSnake() {
    const size = CONFIG.GRID_PIXELS - 2;
    
    gameState.snake.forEach((segment, index) => {
        const x = segment.x * CONFIG.GRID_PIXELS + 1;
        const y = segment.y * CONFIG.GRID_PIXELS + 1;
        
        // 发光效果
        ctx.shadowColor = segment.color;
        ctx.shadowBlur = index === 0 ? 20 : 10;
        
        // 绘制蛇节
        ctx.fillStyle = segment.color;
        ctx.fillRect(x, y, size, size);
        
        // 蛇头绘制眼睛
        if (index === 0) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            const eyeSize = size / 5;
            const eyeOffset = size / 3;
            
            if (gameState.direction.x === 1) {
                ctx.fillRect(x + size - eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(x + size - eyeOffset, y + size - eyeOffset * 1.5, eyeSize, eyeSize);
            } else if (gameState.direction.x === -1) {
                ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(x + eyeOffset, y + size - eyeOffset * 1.5, eyeSize, eyeSize);
            } else if (gameState.direction.y === -1) {
                ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(x + size - eyeOffset * 1.5, y + eyeOffset, eyeSize, eyeSize);
            } else {
                ctx.fillRect(x + eyeOffset, y + size - eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(x + size - eyeOffset * 1.5, y + size - eyeOffset, eyeSize, eyeSize);
            }
        }
        
        ctx.shadowBlur = 0;
    });
}

function drawFood(food) {
    const centerX = food.x * CONFIG.GRID_PIXELS + CONFIG.GRID_PIXELS / 2;
    const centerY = food.y * CONFIG.GRID_PIXELS + CONFIG.GRID_PIXELS / 2;
    const radius = CONFIG.GRID_PIXELS / 2 - 4;
    
    // 脉冲效果
    const pulse = 1 + Math.sin(food.pulsePhase) * 0.2;
    
    // 发光效果
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    
    // 食物主体
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    
    // 高光
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(centerX - 3, centerY - 3, radius / 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawPowerup(powerup) {
    const centerX = powerup.x * CONFIG.GRID_PIXELS + CONFIG.GRID_PIXELS / 2;
    const centerY = powerup.y * CONFIG.GRID_PIXELS + CONFIG.GRID_PIXELS / 2;
    const size = CONFIG.GRID_PIXELS - 6;
    
    // 发光效果
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 30;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(powerup.rotation);
    
    // 金色方块
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-size / 2, -size / 2, size, size);
    
    // 内部装饰
    ctx.fillStyle = '#ffed4e';
    ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);
    
    ctx.restore();
    ctx.shadowBlur = 0;
}

// ==================== 控制 ====================

function setDirection(x, y) {
    if (gameState.direction.x === -x && gameState.direction.y === -y) return;
    if (gameState.direction.x === x && gameState.direction.y === y) return;
    gameState.nextDirection = { x, y };
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    document.getElementById('pauseBtn').textContent = gameState.isPaused ? '▶️ 继续' : '⏸️ 暂停';
}

function gameOver() {
    gameState.isGameOver = true;
    saveHighScore();
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOverScreen').classList.add('active');
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('length').textContent = gameState.snake.length;
}

// ==================== 事件绑定 ====================

// 键盘控制
document.addEventListener('keydown', (e) => {
    if (gameState.isGameOver) return;
    
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            e.preventDefault();
            setDirection(0, -1);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            e.preventDefault();
            setDirection(0, 1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            e.preventDefault();
            setDirection(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            e.preventDefault();
            setDirection(1, 0);
            break;
        case ' ':
            e.preventDefault();
            togglePause();
            break;
    }
});

// 鼠标/触摸控制 - 点击画布
canvas.addEventListener('pointerdown', (e) => {
    if (gameState.isGameOver || gameState.isPaused) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const dx = clickX - centerX;
    const dy = clickY - centerY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? 1 : -1, 0);
    } else {
        setDirection(0, dy > 0 ? 1 : -1);
    }
});

// 虚拟摇杆控制
document.querySelectorAll('.d-btn').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        switch(dir) {
            case 'up': setDirection(0, -1); break;
            case 'down': setDirection(0, 1); break;
            case 'left': setDirection(-1, 0); break;
            case 'right': setDirection(1, 0); break;
        }
    }, { passive: false });
    
    btn.addEventListener('mousedown', (e) => {
        const dir = btn.dataset.dir;
        switch(dir) {
            case 'up': setDirection(0, -1); break;
            case 'down': setDirection(0, 1); break;
            case 'left': setDirection(-1, 0); break;
            case 'right': setDirection(1, 0); break;
        }
    });
});

// 暂停按钮
document.getElementById('pauseBtn').addEventListener('click', togglePause);

// 重新开始按钮
document.getElementById('restartBtn').addEventListener('click', () => {
    initGame();
});

// 点击游戏结束界面重新开始
document.getElementById('gameOverScreen').addEventListener('click', (e) => {
    if (e.target.id === 'gameOverScreen' || e.target.id === 'restartBtn') {
        initGame();
    }
});

// 窗口大小改变
window.addEventListener('resize', () => {
    initCanvas();
});

// 防止移动端滚动
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.game-container') || e.target.closest('.mobile-controls')) {
        e.preventDefault();
    }
}, { passive: false });

// ==================== 启动 ====================

window.addEventListener('load', () => {
    initBubbles();
    initCanvas();
    loadHighScore();
    initGame();
    requestAnimationFrame(gameLoop);
});
