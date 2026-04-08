// pixel-dodge - Retro Arcade Dodge Game
// Canvas size
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 480;

// Game state
let canvas, ctx;
let gameState = 'start'; // start, playing, gameover
let score = 0;
let highScore = 0;
let lastTime = 0;
let gameLoopId;

// Player
const player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 60,
    size: 12,
    speed: 8,
    color: '#00f5d4'
};

// Bullets array
let bullets = [];
let bulletSpawnTimer = 0;
let bulletSpawnInterval = 30; // Frames between spawns
let patternType = 0;

// Pixel art player (8x8)
const playerPixels = [
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [0,1,0,1,1,0,1,0],
    [0,1,1,1,1,1,1,0],
    [0,0,1,0,0,1,0,0],
    [0,0,1,0,0,1,0,0],
    [0,1,1,0,0,1,1,0],
    [0,1,1,0,0,1,1,0]
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false;
    
    // Load high score
    highScore = parseInt(localStorage.getItem('pixel-dodge-high') || '0');
    document.getElementById('highScore').textContent = highScore;
    
    // Load GP and skins (V3)
    loadGP();
    
    // Apply current skin
    player.color = skins[currentSkin].color;
    
    // Input handlers
    setupInputs();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
});

// Setup input handlers
function setupInputs() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            handleAction();
        }
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            movePlayer(-1);
        }
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            movePlayer(1);
        }
    });
    
    // Touch/Mouse
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('mousedown', handleTouch);
    
    // Prevent zoom on double tap
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
}

// Handle action (space/tap)
function handleAction() {
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'gameover') {
        restartGame();
    } else if (gameState === 'playing') {
        // Toggle player position (center to edges)
        if (player.x < CANVAS_WIDTH / 2) {
            player.x = CANVAS_WIDTH * 0.75;
        } else {
            player.x = CANVAS_WIDTH * 0.25;
        }
    }
}

// Handle touch input
function handleTouch(e) {
    e.preventDefault();
    
    if (gameState === 'start') {
        startGame();
        return;
    }
    if (gameState === 'gameover') {
        restartGame();
        return;
    }
    
    // Get touch position
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const x = (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    
    // Move player based on touch side
    if (x < CANVAS_WIDTH / 2) {
        movePlayer(-1);
    } else {
        movePlayer(1);
    }
}

// Move player left/right
function movePlayer(direction) {
    if (gameState !== 'playing') return;
    
    player.x += player.speed * direction;
    
    // Clamp position
    player.x = Math.max(player.size, Math.min(CANVAS_WIDTH - player.size, player.x));
}

// Start new game
function startGame() {
    gameState = 'playing';
    score = 0;
    bullets = [];
    bulletSpawnTimer = 0;
    bulletSpawnInterval = 30;
    player.x = CANVAS_WIDTH / 2;
    
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('score').textContent = '0';
}

// Restart game
function restartGame() {
    startGame();
}

// Game over
function gameOver() {
    gameState = 'gameover';
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pixel-dodge-high', highScore);
        document.getElementById('highScore').textContent = highScore;
    }
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
    
    // V3: Earn GP
    earnGP(score);
    
    // Show rank info
    document.getElementById('rankInfo').style.display = 'block';
    document.getElementById('weeklyRankDisplay').textContent = Math.floor(Math.random() * 100) + 1;
}

// Spawn bullet pattern
function spawnBullet() {
    patternType = Math.floor(Math.random() * 3);
    
    switch(patternType) {
        case 0: // Straight line
            for (let i = 0; i < 3; i++) {
                bullets.push({
                    x: CANVAS_WIDTH / 2 + (i - 1) * 40,
                    y: -20,
                    size: 6,
                    speedY: 4 + score / 500,
                    speedX: 0,
                    color: '#ff006e'
                });
            }
            break;
            
        case 1: // Arc pattern
            for (let i = 0; i < 5; i++) {
                bullets.push({
                    x: 40 + i * 60,
                    y: -20 - i * 10,
                    size: 5,
                    speedY: 3 + score / 600,
                    speedX: (i - 2) * 0.5,
                    color: '#fee440'
                });
            }
            break;
            
        case 2: // Wall
            for (let i = 0; i < 6; i++) {
                bullets.push({
                    x: 30 + i * 50,
                    y: -20,
                    size: 8,
                    speedY: 3.5 + score / 550,
                    speedX: 0,
                    color: '#00f5d4'
                });
            }
            break;
    }
}

// Update game
function update(deltaTime) {
    if (gameState !== 'playing') return;
    
    // Update score (1 point per frame)
    score++;
    document.getElementById('score').textContent = Math.floor(score / 10);
    
    // Spawn bullets
    bulletSpawnTimer++;
    if (bulletSpawnTimer >= bulletSpawnInterval) {
        spawnBullet();
        bulletSpawnTimer = 0;
        // Gradually make it harder
        bulletSpawnInterval = Math.max(10, 30 - Math.floor(score / 500));
    }
    
    // Update bullets
    bullets.forEach((bullet, index) => {
        bullet.y += bullet.speedY;
        bullet.x += bullet.speedX;
        
        // Remove off-screen bullets
        if (bullet.y > CANVAS_HEIGHT + 20) {
            bullets.splice(index, 1);
        }
        
        // Check collision
        if (checkCollision(player, bullet)) {
            gameOver();
        }
    });
}

// Check collision
function checkCollision(player, bullet) {
    const dx = player.x - bullet.x;
    const dy = player.y - bullet.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (player.size + bullet.size);
}

// Draw functions
function draw() {
    // Clear screen
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw grid (retro effect)
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_WIDTH, i);
        ctx.stroke();
    }
    
    if (gameState === 'playing') {
        // Draw player
        drawPixelPlayer();
        
        // Draw bullets
        bullets.forEach(bullet => {
            ctx.fillStyle = bullet.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = bullet.color;
            
            // Pixel bullet
            ctx.fillRect(
                bullet.x - bullet.size / 2,
                bullet.y - bullet.size / 2,
                bullet.size,
                bullet.size            );
            
            ctx.shadowBlur = 0;
        });
    }
}

// Draw pixel player
function drawPixelPlayer() {
    const pixelSize = 1.5;
    const offsetX = player.x - (8 * pixelSize) / 2;
    const offsetY = player.y - (8 * pixelSize) / 2;
    
    playerPixels.forEach((row, y) => {
        row.forEach((pixel, x) => {
            if (pixel) {
                ctx.fillStyle = player.color;
                ctx.fillRect(
                    offsetX + x * pixelSize,
                    offsetY + y * pixelSize,
                    pixelSize,
                    pixelSize
                );
            }
        });
    });
    
    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX - 2, offsetY - 2, 8 * pixelSize + 4, 8 * pixelSize + 4);
    ctx.shadowBlur = 0;
}

// Game loop
function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    update(deltaTime);
    draw();
    
    requestAnimationFrame(gameLoop);
}

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(console.error);
    });
}

// ========== V3 機能 ==========

// GPシステム
let gp = 0;
let ownedSkins = ['default'];
let currentSkin = 'default';

const skins = {
    'default': { name: 'デフォルト', price: 0, color: '#00f5d4' },
    'retro': { name: 'レトロ', price: 800, color: '#ff006e' },
    'neon': { name: 'ネオン', price: 500, color: '#fee440' },
    'champion': { name: 'チャンピオン', price: 1200, color: '#9b5de5' }
};

// イベントデータ
const events = [
    {
        id: 'spring',
        name: '桜ステージ',
        description: '春限定！桜の花びらが舞う特別ステージ',
        active: true,
        rewards: '桜skin (500GP)'
    },
    {
        id: 'halloween',
        name: 'ハロウィン',
        description: '骸骨と骸骨の敵が出現！',
        active: false,
        rewards: 'Pumpkin skin (300GP)'
    }
];

// 初期化時にGP読み込み
function loadGP() {
    gp = parseInt(localStorage.getItem('pixel-dodge-gp') || '0');
    ownedSkins = JSON.parse(localStorage.getItem('pixel-dodge-skins') || '["default"]');
    currentSkin = localStorage.getItem('pixel-dodge-current-skin') || 'default';
    document.getElementById('gpDisplay').textContent = gp;
    document.getElementById('shopGpDisplay').textContent = gp;
    updateSkinButtons();
    checkEventStatus();
}

function saveGP() {
    localStorage.setItem('pixel-dodge-gp', gp);
    localStorage.setItem('pixel-dodge-skins', JSON.stringify(ownedSkins));
    localStorage.setItem('pixel-dounce-current-skin', currentSkin);
}

// スキン選択
function selectSkin(skinId) {
    if (!ownedSkins.includes(skinId)) {
        const skin = skins[skinId];
        if (gp >= skin.price) {
            gp -= skin.price;
            ownedSkins.push(skinId);
            saveGP();
            document.getElementById('gpDisplay').textContent = gp;
            showToast(`${skin.name}を購入しました！`);
        } else {
            showToast('GPが足りません');
            return;
        }
    }
    currentSkin = skinId;
    localStorage.setItem('pixel-dodge-current-skin', currentSkin);
    updateSkinButtons();
    player.color = skins[skinId].color;
}

function updateSkinButtons() {
    document.querySelectorAll('.skin-btn').forEach(btn => {
        const skinId = btn.dataset.skin;
        btn.classList.remove('active', 'locked');
        if (skinId === currentSkin) {
            btn.classList.add('active');
        } else if (!ownedSkins.includes(skinId)) {
            btn.classList.add('locked');
        }
    });
}

// GP獲得（ゲームオーバー時）
function earnGP(score) {
    const earned = Math.floor(score / 100);
    gp += earned;
    saveGP();
    document.getElementById('gpDisplay').textContent = gp;
    document.getElementById('gpEarned').textContent = `+${earned} GP`;
    return earned;
}

// ランキング（モック）
function showRanking() {
    const rankingList = document.getElementById('rankingList');
    const mockData = [
        { rank: 1, name: 'まりるー', score: 15420 },
        { rank: 2, name: 'けん不起', score: 12850 },
        { rank: 3, name: 'あおい', score: 9870 },
        { rank: 4, name: 'ゆうと', score: 8340 },
        { rank: 5, name: 'あなた', score: Math.floor(score / 10) }
    ];
    
    rankingList.innerHTML = mockData.map(item => `
        <div class="ranking-item">
            <span class="rank">#${item.rank}</span>
            <span class="name">${item.name}</span>
            <span class="score">${item.score}</span>
        </div>
    `).join('');
    
    document.getElementById('rankingModal').classList.add('active');
    document.getElementById('myRank').textContent = '5位';
}

function switchRankingTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    // 実際の実装ではここでデータを切り替え
}

// ショップ
function showShop() {
    const grid = document.getElementById('shopSkinGrid');
    grid.innerHTML = Object.entries(skins).map(([id, skin]) => `
        <div class="shop-item ${ownedSkins.includes(id) ? 'owned' : ''}" onclick="selectSkin('${id}')">
            <div class="icon" style="color: ${skin.color}">⚡</div>
            <div class="name">${skin.name}</div>
            <div class="price">${skin.price === 0 ? '所持' : skin.price + 'GP'}</div>
        </div>
    `).join('');
    
    document.getElementById('shopModal').classList.add('active');
}

function purchaseGP(amount, price) {
    // 実際には決済APIを実装
    gp += amount;
    saveGP();
    document.getElementById('gpDisplay').textContent = gp;
    document.getElementById('shopGpDisplay').textContent = gp;
    showToast(`${amount}GPを獲得しました！`);
}

// イベント
function checkEventStatus() {
    const activeEvents = events.filter(e => e.active);
    if (activeEvents.length > 0) {
        document.getElementById('eventBadge').style.display = 'flex';
    }
}

function showEvents() {
    const list = document.getElementById('eventList');
    list.innerHTML = events.map(event => `
        <div class="event-item ${event.active ? 'active' : ''}">
            <h4>${event.name}</h4>
            <p>${event.description}</p>
            <p class="rewards">報酬: ${event.rewards}</p>
        </div>
    `).join('');
    
    document.getElementById('eventsModal').classList.add('active');
}

// モーダル閉じる
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// トースト通知
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
