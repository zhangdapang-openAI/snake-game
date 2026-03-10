/**
 * 深海贪吃蛇 - 未来科技版
 * 制作人：张大胖 & AI助手
 * 版本：1.0.0
 */

// 游戏配置
const CONFIG = {
    GRID_SIZE: 20,
    GRID_WIDTH: 30,
    GRID_HEIGHT: 30,
    BASE_SPEED: 150,
    SPEED_DECREASE: 2,
    MIN_SPEED: 80,
    POWERUP_CHANCE: 0.15,
    POWERUP_DURATION: 8000
};

// 游戏状态
let gameState = {
    snake: [],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: null,
    powerup: null,
    score: 0,
    highScore: localStorage.getItem('snakeHighScore') || 0,
    gameLoop: null,
    isPaused: false,
    isGameOver: false,
    speed: CONFIG.BASE_SPEED,
    snakeColorIndex: 0,
    powerupActive: false
};

// 未来科技风格配色（贪吃蛇变色用）
const NEON_COLORS = [
    '#00ffff', // 青色
    '#ff00ff', // 紫色
    '#00ff00', // 绿色
    '#ffff00', // 黄色
    '#ff0080', // 粉红
    '#80ff00', // 荧光绿
    '#ff8000', // 橙色
    '#8000ff', // 深紫
    '#00ff80', // 薄荷绿
    '#ff4040'  // 红色
];

// 获取画布
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 初始化气泡背景
function initBubbles() {
    const bubblesContainer = document.getElementById('bubbles');
    for (let i = 0; i < 20; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.style.left = Math.random() * 100 + '%';
        bubble.style.width = Math.random() * 30 + 10 + 'px';
        bubble.style.height = bubble.style.width;
        bubble.style.animationDelay = Math.random() * 8 + 's';
        bubble.style.animationDuration = Math.random() * 4 + 6 + 's';
        bubblesContainer.appendChild(bubble);
    }
}

// 初始化游戏
function initGame() {
    gameState.snake = [
        { x: 5, y: 15 },
        { x: 4, y: 15 },
        { x: 3, y: 15 }
    ];
    gameState.direction = { x: 1, y: 0 };
    gameState.nextDirection = { x: 1, y: 0 };
    gameState.score = 0;
    gameState.speed = CONFIG.BASE_SPEED;
    gameState.snakeColorIndex = 0;
    gameState.powerupActive = false;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    
    spawnFood();
    updateScore();
}

// 生成食物
function spawnFood() {
    let validPosition = false;
    while (!validPosition) {
        gameState.food = {
            x: Math.floor(Math.random() * CONFIG.GRID_WIDTH),
            y: Math.floor(Math.random() * CONFIG.GRID_HEIGHT)
        };
        
        validPosition = !gameState.snake.some(segment => 
            segment.x === gameState.food.x && segment.y === gameState.food.y
        );
    }
    
    // 随机生成道具
    if (Math.random() < CONFIG.POWERUP_CHANCE && !gameState.powerup) {
        spawnPowerup();
    }
}

// 生成特殊道具
function spawnPowerup() {
    let validPosition = false;
    while (!validPosition) {
        gameState.powerup = {
            x: Math.floor(Math.random() * CONFIG.GRID_WIDTH),
            y: Math.floor(Math.random() * CONFIG.GRID_HEIGHT),
            type: 'golden'
        };
        
        validPosition = !gameState.snake.some(segment => 
            segment.x === gameState.powerup.x && segment.y === gameState.powerup.y
        ) && !(gameState.food.x === gameState.powerup.x && gameState.food.y === gameState.powerup.y);
    }
    
    // 道具8秒后消失
    setTimeout(() => {
        if (gameState.powerup) {
            gameState.powerup = null;
        }
    }, CONFIG.POWERUP_DURATION);
}

// 更新游戏
function update() {
    if (gameState.isPaused || gameState.isGameOver) return;
    
    // 更新方向
    gameState.direction = { ...gameState.nextDirection };
    
    // 计算新头部位置
    const head = { ...gameState.snake[0] };
    head.x += gameState.direction.x;
    head.y += gameState.direction.y;
    
    // 碰撞检测 - 墙壁
    if (head.x < 0 || head.x >= CONFIG.GRID_WIDTH || 
        head.y < 0 || head.y >= CONFIG.GRID_HEIGHT) {
        gameOver();
        return;
    }
    
    // 碰撞检测 - 自身
    if (gameState.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }
    
    // 移动蛇
    gameState.snake.unshift(head);
    
    // 检查是否吃到食物
    let ateFood = false;
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        gameState.score += 10;
        ateFood = true;
        
        // 改变蛇的颜色
        gameState.snakeColorIndex = (gameState.snakeColorIndex + 1) % NEON_COLORS.length;
        
        // 加快游戏速度
        if (gameState.speed > CONFIG.MIN_SPEED) {
            gameState.speed -= CONFIG.SPEED_DECREASE;
        }
        
        spawnFood();
    }
    
    // 检查是否吃到道具
    if (gameState.powerup && head.x === gameState.powerup.x && head.y === gameState.powerup.y) {
        gameState.score += 30;
        
        // 额外增加3节长度
        for (let i = 0; i < 3; i++) {
            const tail = { ...gameState.snake[gameState.snake.length - 1] };
            gameState.snake.push(tail);
        }
        
        gameState.powerup = null;
        ateFood = true;
    }
    
    // 如果没吃到食物，移除尾部
    if (!ateFood) {
        gameState.snake.pop();
    }
    
    updateScore();
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.fillStyle = 'rgba(0, 10, 20, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const cellWidth = canvas.width / CONFIG.GRID_WIDTH;
    const cellHeight = canvas.height / CONFIG.GRID_HEIGHT;
    
    // 绘制网格（深海科技风格）
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CONFIG.GRID_WIDTH; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellWidth, 0);
        ctx.lineTo(i * cellWidth, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= CONFIG.GRID_HEIGHT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * cellHeight);
        ctx.lineTo(canvas.width, i * cellHeight);
        ctx.stroke();
    }
    
    // 绘制蛇
    gameState.snake.forEach((segment, index) => {
        const x = segment.x * cellWidth;
        const y = segment.y * cellHeight;
        
        // 蛇身发光效果
        const color = NEON_COLORS[gameState.snakeColorIndex];
        
        if (index === 0) {
            // 蛇头 - 更亮更大
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.fillRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);
            
            // 蛇眼
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            ctx.fillRect(x + cellWidth * 0.2, y + cellHeight * 0.2, cellWidth * 0.2, cellHeight * 0.2);
            ctx.fillRect(x + cellWidth * 0.6, y + cellHeight * 0.2, cellWidth * 0.2, cellHeight * 0.2);
        } else {
            // 蛇身 - 渐变效果
            const alpha = 1 - (index / gameState.snake.length) * 0.5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.fillRect(x + 3, y + 3, cellWidth - 6, cellHeight - 6);
            ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;
    });
    
    // 绘制食物
    if (gameState.food) {
        const x = gameState.food.x * cellWidth;
        const y = gameState.food.y * cellHeight;
        
        // 食物发光效果
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0000';
        ctx.fillStyle = '#ff0000';
        
        // 绘制圆形食物
        ctx.beginPath();
        ctx.arc(x + cellWidth / 2, y + cellHeight / 2, cellWidth / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // 绘制道具
    if (gameState.powerup) {
        const x = gameState.powerup.x * cellWidth;
        const y = gameState.powerup.y * cellHeight;
        
        // 金色道具发光效果
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ffd700';
        ctx.fillStyle = '#ffd700';
        
        // 绘制菱形道具
        ctx.beginPath();
        ctx.moveTo(x + cellWidth / 2, y + 4);
        ctx.lineTo(x + cellWidth - 4, y + cellHeight / 2);
        ctx.lineTo(x + cellWidth / 2, y + cellHeight - 4);
        ctx.lineTo(x + 4, y + cellHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        // 内部闪光
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + cellWidth / 2, y + cellHeight / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// 游戏循环
function gameLoop() {
    update();
    draw();
    
    if (!gameState.isGameOver) {
        setTimeout(() => {
            requestAnimationFrame(gameLoop);
        }, gameState.speed);
    }
}

// 更新分数显示
function updateScore() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('length').textContent = gameState.snake.length;
    document.getElementById('highScore').textContent = gameState.highScore;
}

// 游戏结束
function gameOver() {
    gameState.isGameOver = true;
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('snakeHighScore', gameState.highScore);
    }
    
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// 开始游戏
function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    initGame();
    gameLoop();
}

// 重新开始
function restartGame() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    initGame();
    gameLoop();
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    if (gameState.isGameOver) return;
    
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (gameState.direction.y === 0) {
                gameState.nextDirection = { x: 0, y: -1 };
            }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (gameState.direction.y === 0) {
                gameState.nextDirection = { x: 0, y: 1 };
            }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (gameState.direction.x === 0) {
                gameState.nextDirection = { x: -1, y: 0 };
            }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (gameState.direction.x === 0) {
                gameState.nextDirection = { x: 1, y: 0 };
            }
            break;
        case ' ':
            gameState.isPaused = !gameState.isPaused;
            break;
    }
});

// 初始化
initBubbles();
draw();