// ==========================================
// 1. CONFIGURACIÓN INICIAL Y CANVAS
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

// Elementos del DOM / HUD
const startMenu = document.getElementById('start-menu');
const gameoverMenu = document.getElementById('gameover-menu');
const gameUI = document.getElementById('game-ui');
const nicknameInput = document.getElementById('nickname-input');
const graphicsSelect = document.getElementById('graphics-select');
const deviceSelect = document.getElementById('device-select');
const musicSelect = document.getElementById('music-select'); // Selector de música
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

const playerNameDisplay = document.getElementById('player-name-display');
const scoreDisplay = document.getElementById('score-display');
const speedDisplay = document.getElementById('speed-display');
const playersCountDisplay = document.getElementById('players-count');

const resRank = document.getElementById('res-rank');
const resScore = document.getElementById('res-score');
const resKills = document.getElementById('res-kills');

// Dimensiones del mapa
const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

let nickname = "Leonardo";
let score = 0;
let kills = 0;
let isGameRunning = false;
let graphicsMode = "high";
let speedBoostLevel = 1;
let controlMode = "pc";
let audioInitialized = false;
let selectedMusicMode = "random";

// ==========================================
// 2. SISTEMA DE ARCHIVOS DE AUDIO (MP3)
// ==========================================
const sounds = {
    themes: [
        new Audio('sounds/level1/dash_theme1_level1.mp3'),
        new Audio('sounds/level1/dash_theme2_level1.mp3'),
        new Audio('sounds/level1/dash_theme3_level1.mp3')
    ],
    boostX2: new Audio('sounds/level1/boost_x2.mp3'),
    boostX3: new Audio('sounds/level1/boost_x3.mp3'),
    eat: new Audio('sounds/level1/eat.mp3'),
    redBlink: new Audio('sounds/level1/red_blink.mp3'),
    loseLife: new Audio('sounds/level1/lose_life.mp3')
};

Object.values(sounds).forEach(sound => {
    if (Array.isArray(sound)) {
        sound.forEach(track => { track.volume = 0.35; });
    } else if (sound instanceof Audio) {
        sound.volume = 0.45;
    }
});

function playSound(soundKey) {
    if (!sounds[soundKey]) return;
    try {
        const sound = sounds[soundKey];
        sound.currentTime = 0;
        sound.play().catch(() => {});
    } catch (e) {}
}

let currentThemeIndex = 0;

function playSelectedTheme() {
    // Pausar todos los temas actuales antes de cambiar
    sounds.themes.forEach(t => {
        t.pause();
        t.currentTime = 0;
    });

    if (musicSelect) {
        selectedMusicMode = musicSelect.value;
    }

    // Determinar qué canción reproducir según la selección
    if (selectedMusicMode === "random") {
        currentThemeIndex = Math.floor(Math.random() * sounds.themes.length);
    } else {
        currentThemeIndex = parseInt(selectedMusicMode);
    }

    const track = sounds.themes[currentThemeIndex];
    if (!track) return;
    
    const playPromise = track.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            audioInitialized = true;
        }).catch(() => {});
    }

    // Al terminar la pista
    track.onended = () => {
        if (selectedMusicMode === "random") {
            playSelectedTheme(); // Si está en aleatorio, pasa a otra al azar
        } else {
            track.currentTime = 0;
            track.play().catch(() => {}); // Si eligió una fija, se repite en bucle
        }
    };
}

// Escuchar cambios en el selector de música en tiempo real desde el menú
if (musicSelect) {
    musicSelect.addEventListener('change', () => {
        selectedMusicMode = musicSelect.value;
        playSelectedTheme();
    });
}

function enableAudioOnUserAction() {
    if (audioInitialized) return;
    audioInitialized = true;
    playSelectedTheme();
}
window.addEventListener('click', enableAudioOnUserAction, { once: true });
window.addEventListener('touchstart', enableAudioOnUserAction, { once: true });
window.addEventListener('keydown', enableAudioOnUserAction, { once: true });

// ==========================================
// 3. CARGA DE TEXTURAS / SKINS
// ==========================================
function loadImg(src) {
    const img = new Image();
    img.src = src;
    return img;
}

const playerTextures = {
    head: loadImg('textures/skin1_head.png'),
    body: loadImg('textures/skin1_body.png'),
    tail: loadImg('textures/skin1_line.png')
};

const botSkins = [];
for (let i = 1; i <= 2; i++) {
    botSkins.push({
        head: loadImg(`textures/bots${i}_level1_head.png`),
        body: loadImg(`textures/bots${i}_level1_body.png`),
        tail: loadImg(`textures/bots${i}_level1_line.png`)
    });
}

// Controles y ajuste de pantalla
const mouseScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => {
    resizeCanvas();
    if (!isGameRunning) {
        mouseScreen.x = window.innerWidth / 2;
        mouseScreen.y = window.innerHeight / 2;
    }
});
resizeCanvas();

window.addEventListener('mousemove', (e) => {
    if (controlMode === "pc" && isGameRunning) {
        mouseScreen.x = e.clientX;
        mouseScreen.y = e.clientY;
    }
});

window.addEventListener('touchstart', (e) => {
    if ((controlMode === "phone" || controlMode === "tablet") && isGameRunning && e.touches.length > 0) {
        mouseScreen.x = e.touches[0].clientX;
        mouseScreen.y = e.touches[0].clientY;
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if ((controlMode === "phone" || controlMode === "tablet") && isGameRunning && e.touches.length > 0) {
        mouseScreen.x = e.touches[0].clientX;
        mouseScreen.y = e.touches[0].clientY;
    }
}, { passive: true });

window.addEventListener('keydown', (e) => {
    if (!isGameRunning) return;

    if (e.key === 'w' || e.key === 'W') {
        if (speedBoostLevel === 1) {
            speedBoostLevel = 2;
            playSound('boostX2');
        } else if (speedBoostLevel === 2) {
            speedBoostLevel = 3;
            playSound('boostX3');
        } else {
            speedBoostLevel = 1;
        }
        if (speedDisplay) speedDisplay.textContent = `x${speedBoostLevel}`;
    }
});

// ==========================================
// 4. CLASE SERPIENTE (IA INTELIGENTE Y FLUIDA)
// ==========================================
class Snake {
    constructor(x, y, isBot = false, customSkin = null, targetScore = 0) {
        this.isBot = isBot;
        this.customSkin = customSkin || playerTextures;
        this.targetScore = targetScore;
        this.reset(x, y);
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.angle = Math.random() * Math.PI * 2;
        this.baseSpeed = 4.2;
        this.speed = this.baseSpeed;
        this.baseSize = 36;
        this.segments = [];
        this.score = this.isBot ? this.targetScore : 0;

        this.lives = this.isBot ? 1 : 5;
        this.isParalyzed = false;
        this.paralysisTimer = 0;
        this.cooldownHit = 0;
        this.boostLevel = 1;

        let initialLen = 12 + Math.floor(this.score / 8);
        for (let i = 0; i < initialLen; i++) {
            this.segments.push({ 
                x: x - Math.cos(this.angle) * (i * 12), 
                y: y - Math.sin(this.angle) * (i * 12), 
                angle: this.angle 
            });
        }

        this.aiTimer = 0;
        this.targetAngle = this.angle;
        this.costTimer = 0;
    }

    get currentSize() {
        const scaleFactor = Math.log(this.score + 1) * 2.2; 
        return this.baseSize + scaleFactor;
    }

    takeImpact() {
        if (this.cooldownHit > 0) return;

        if (!this.isBot) {
            this.lives -= 1;
            this.cooldownHit = 1.5;

            playSound('loseLife');

            if (this.lives <= 0) {
                this.die();
                return;
            }

            this.isParalyzed = true;
            this.paralysisTimer = 3.0;
            this.speed = this.baseSpeed;

            playSound('redBlink');
        } else {
            this.die();
        }
    }

    update(deltaTime, foods, player, allBots) {
        if (this.cooldownHit > 0) this.cooldownHit -= deltaTime;

        if (this.isParalyzed) {
            this.paralysisTimer -= deltaTime;
            if (this.paralysisTimer <= 0) {
                this.isParalyzed = false;
            }
        }

        if (!this.isParalyzed) {
            this.boostLevel = this.isBot ? this.boostLevel : speedBoostLevel;
            
            if (this.boostLevel > 1 && this.score > 0) {
                this.costTimer += deltaTime;
                const costInterval = this.boostLevel === 2 ? 1.0 : 0.33;
                if (this.costTimer >= costInterval) {
                    this.score = Math.max(0, this.score - 1);
                    if (!this.isBot) {
                        score = this.score;
                        if (scoreDisplay) scoreDisplay.textContent = score;
                    }
                    this.costTimer = 0;
                }
                this.speed = this.baseSpeed * (this.boostLevel === 2 ? 1.8 : 2.5);
            } else {
                this.speed = this.baseSpeed;
                if (!this.isBot && this.score <= 0) {
                    speedBoostLevel = 1;
                    if (speedDisplay) speedDisplay.textContent = 'x1';
                }
            }
        }

        if (this.isBot) {
            this.updateAI(foods, player, allBots);
        } else {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const dx = mouseScreen.x - centerX;
            const dy = mouseScreen.y - centerY;

            if (Math.hypot(dx, dy) > 10) {
                const targetAngle = Math.atan2(dy, dx);
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * (this.isParalyzed ? 0.04 : 0.15);
            }
        }

        this.segments[0].x += Math.cos(this.angle) * this.speed;
        this.segments[0].y += Math.sin(this.angle) * this.speed;
        this.segments[0].angle = this.angle;

        const head = this.segments[0];
        const radius = this.currentSize / 2;

        if (head.x - radius < 150 || head.x + radius > WORLD_WIDTH - 150 ||
            head.y - radius < 150 || head.y + radius > WORLD_HEIGHT - 150) {
            if (this.isBot) {
                this.targetAngle = Math.atan2(WORLD_HEIGHT / 2 - head.y, WORLD_WIDTH / 2 - head.x);
            } else {
                this.takeImpact();
                return;
            }
        }

        const size = this.currentSize;
        const segmentSpacing = size * 0.38;

        for (let i = 1; i < this.segments.length; i++) {
            const prev = this.segments[i - 1];
            const curr = this.segments[i];

            const segDx = prev.x - curr.x;
            const segDy = prev.y - curr.y;
            const segAngle = Math.atan2(segDy, segDx);

            curr.angle = segAngle;
            curr.x = prev.x - Math.cos(segAngle) * segmentSpacing;
            curr.y = prev.y - Math.sin(segAngle) * segmentSpacing;
        }

        if (player) {
            this.checkInteractions(allBots, player);
        }
    }

    checkInteractions(allBots, player) {
        const head = this.segments[0];
        const radius = this.currentSize / 2;

        if (!this.isBot) {
            allBots.forEach(bot => {
                for (let i = 2; i < bot.segments.length; i++) {
                    const seg = bot.segments[i];
                    const dist = Math.hypot(head.x - seg.x, head.y - seg.y);
                    if (dist < radius + bot.currentSize * 0.4) {
                        this.takeImpact();
                        break;
                    }
                }
            });
        } else {
            const allEntities = [...allBots, player].filter(e => e && e !== this);
            allEntities.forEach(other => {
                for (let i = 2; i < other.segments.length; i++) {
                    const seg = other.segments[i];
                    const dist = Math.hypot(head.x - seg.x, head.y - seg.y);
                    if (dist < radius + other.currentSize * 0.4) {
                        if (other === player) kills++;
                        this.die();
                        break;
                    }
                }
            });
        }
    }

    updateAI(foods, player, allBots) {
        this.aiTimer -= 0.016;
        const head = this.segments[0];

        let closestFood = null;
        let minDist = 400;

        foods.forEach(f => {
            const dist = Math.hypot(head.x - f.x, head.y - f.y);
            if (dist < minDist) {
                minDist = dist;
                closestFood = f;
            }
        });

        let dangerAngle = null;
        let obstacleDetected = false;
        const allEntities = [...allBots, player].filter(e => e && e !== this);

        allEntities.forEach(entity => {
            for (let i = 0; i < entity.segments.length; i += 3) {
                const seg = entity.segments[i];
                const dist = Math.hypot(head.x - seg.x, head.y - seg.y);
                if (dist < 120) {
                    obstacleDetected = true;
                    dangerAngle = Math.atan2(head.y - seg.y, head.x - seg.x);
                    break;
                }
            }
        });

        if (obstacleDetected && dangerAngle !== null) {
            this.targetAngle = dangerAngle + (Math.random() - 0.5) * 0.5;
        } else if (closestFood) {
            this.targetAngle = Math.atan2(closestFood.y - head.y, closestFood.x - head.x);
        } else if (this.aiTimer <= 0) {
            this.aiTimer = 3.0 + Math.random() * 2.0;
            this.targetAngle += (Math.random() - 0.5) * 1.2;
        }

        let diff = this.targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        
        this.angle += Math.max(-0.04, Math.min(0.04, diff));
    }

    addSegment() {
        const last = this.segments[this.segments.length - 1];
        this.segments.push({ x: last.x, y: last.y, angle: last.angle });
    }

    grow(amount = 1) {
        this.score += amount;
        if (!this.isBot) {
            score = this.score;
            if (scoreDisplay) scoreDisplay.textContent = score;
            playSound('eat');
        }
        for (let i = 0; i < amount; i++) {
            this.addSegment();
        }
    }

    die() {
        let remainingPoints = this.score + this.segments.length;
        const head = this.segments[0];

        while (remainingPoints > 0) {
            let val = Math.min(remainingPoints, Math.floor(Math.random() * 15) + 5);
            remainingPoints -= val;
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 90;
            if (typeof Food !== 'undefined') {
                foods.push(new Food(head.x + Math.cos(angle) * dist, head.y + Math.sin(angle) * dist, val));
            }
        }

        if (this.isBot) {
            this.targetScore = Math.floor(Math.random() * 68);
            this.reset(Math.random() * (WORLD_WIDTH - 800) + 400, Math.random() * (WORLD_HEIGHT - 800) + 400);
        } else {
            if (typeof triggerGameOver === 'function') {
                triggerGameOver();
            }
        }
    }

    draw(ctx, camera, isKing = false) {
        const head = this.segments[0];
        const size = this.currentSize;

        ctx.save();

        if (this.isParalyzed) {
            const redPulse = Math.sin(Date.now() * 0.02) * 0.4 + 0.6;
            if (graphicsMode === "high") {
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#ff0000';
            }
            ctx.globalAlpha = redPulse;
        }

        for (let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            let img = this.customSkin.body;

            if (i === 0) img = this.customSkin.head;
            else if (i === this.segments.length - 1) img = this.customSkin.tail;

            ctx.save();
            ctx.translate(seg.x - camera.x, seg.y - camera.y);
            ctx.rotate(seg.angle);

            if (graphicsMode === "high" && !this.isParalyzed) {
                ctx.shadowBlur = i === 0 ? 15 : 5;
                ctx.shadowColor = '#00ffff';
            }

            if (img && img.complete) {
                ctx.drawImage(img, -size / 2, -size / 2, size, size);
            }
            ctx.restore();
        }

        if (isKing) {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 20px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('👑', head.x - camera.x, head.y - camera.y - size / 2 - 25);
        }

        if (!this.isBot) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(`❤️ ${this.lives}`, head.x - camera.x, head.y - camera.y - size / 2 - 10);
        }

        ctx.restore();
    }
}

// ==========================================
// 5. CLASE COMIDA
// ==========================================
class Food {
    constructor(x, y, value = 1) {
        this.value = value;
        this.radius = Math.min(6 + value * 0.5, 14);
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        } else {
            this.spawn();
        }
        const colors = ['#00ffff', '#ff007f', '#ffff00', '#00ff66', '#ff9900'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    spawn() {
        this.x = Math.random() * (WORLD_WIDTH - 200) + 100;
        this.y = Math.random() * (WORLD_HEIGHT - 200) + 100;
        this.value = 1;
        this.radius = 6;
    }

    draw(ctx, camera) {
        if (this.x < camera.x - 50 || this.x > camera.x + canvas.width + 50 ||
            this.y < camera.y - 50 || this.y > camera.y + canvas.height + 50) {
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        if (graphicsMode === "high") {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }
        ctx.fill();
        ctx.restore();
    }
}

// ==========================================
// 6. VARIABLES GLOBALES Y UTILIDADES
// ==========================================
let playerSnake = null;
let bots = [];
let foods = [];
let lastTime = performance.now();

function drawWorldGrid(ctx, camera) {
    const gridSize = 100;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
        ctx.stroke();
    }

    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 8;
    if (graphicsMode === "high") {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0055';
    }
    ctx.strokeRect(-camera.x, -camera.y, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.restore();
}

function drawKingPointer(ctx, camera, king) {
    if (!king || !playerSnake) return;
    const pHead = playerSnake.segments[0];
    const kHead = king.segments[0];

    const dx = kHead.x - pHead.x;
    const dy = kHead.y - pHead.y;
    const dist = Math.hypot(dx, dy);

    if (dist > canvas.width / 2) {
        const angle = Math.atan2(dy, dx);
        const cx = canvas.width / 2 + Math.cos(angle) * (canvas.width / 2 - 60);
        const cy = canvas.height / 2 + Math.sin(angle) * (canvas.height / 2 - 60);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 24px Orbitron';
        ctx.fillText('👑▶', 0, 0);
        ctx.restore();
    }
}

function drawMinimap() {
    if (!minimapCtx) return;
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    const scaleX = minimapCanvas.width / WORLD_WIDTH;
    const scaleY = minimapCanvas.height / WORLD_HEIGHT;

    minimapCtx.fillStyle = '#ff0055';
    bots.forEach(bot => {
        const bx = bot.segments[0].x * scaleX;
        const by = bot.segments[0].y * scaleY;
        minimapCtx.fillRect(bx - 1, by - 1, 2, 2);
    });

    if (playerSnake) {
        const px = playerSnake.segments[0].x * scaleX;
        const py = playerSnake.segments[0].y * scaleY;
        minimapCtx.fillStyle = '#00ffff';
        minimapCtx.fillRect(px - 2, py - 2, 4, 4);
    }
}

function drawCrosshair(ctx) {
    if ((controlMode === "phone" || controlMode === "tablet") && !isGameRunning) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(mouseScreen.x, mouseScreen.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    if (graphicsMode === "high") {
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#00ffff';
    }
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
}

// ==========================================
// 7. CONTROL DE PARTIDA Y BUCLE
// ==========================================
function initBackgroundWorld() {
    bots = [];
    for (let i = 0; i < 30; i++) {
        let bx = Math.random() * (WORLD_WIDTH - 600) + 300;
        let by = Math.random() * (WORLD_HEIGHT - 600) + 300;
        const randomSkin = botSkins[Math.floor(Math.random() * botSkins.length)];
        bots.push(new Snake(bx, by, true, randomSkin, Math.floor(Math.random() * 68)));
    }
    foods = Array.from({ length: 300 }, () => new Food());
    playSelectedTheme();
    lastTime = performance.now();
    requestAnimationFrame(menuBackgroundLoop);
}

function menuBackgroundLoop(currentTime) {
    if (isGameRunning) return;

    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    bots.forEach(bot => bot.update(deltaTime, foods, null, bots));

    const camera = {
        x: WORLD_WIDTH / 2 - canvas.width / 2,
        y: WORLD_HEIGHT / 2 - canvas.height / 2
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWorldGrid(ctx, camera);
    foods.forEach(food => food.draw(ctx, camera));
    bots.forEach(bot => bot.draw(ctx, camera, false));

    requestAnimationFrame(menuBackgroundLoop);
}

function initGame() {
    score = 0;
    kills = 0;
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (playerNameDisplay) playerNameDisplay.textContent = nickname;

    const startX = WORLD_WIDTH / 2;
    const startY = WORLD_HEIGHT / 2;

    playerSnake = new Snake(startX, startY, false);

    if (playersCountDisplay) playersCountDisplay.textContent = bots.length + 1;

    isGameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function triggerGameOver() {
    isGameRunning = false;
    if (gameUI) gameUI.classList.add('hidden');
    if (minimapCanvas) minimapCanvas.classList.add('hidden');
    if (gameoverMenu) gameoverMenu.classList.remove('hidden');

    let allSnakes = [...bots, playerSnake];
    allSnakes.sort((a, b) => b.score - a.score);
    let rank = allSnakes.indexOf(playerSnake) + 1;

    if (resRank) resRank.textContent = `#${rank}`;
    if (resScore) resScore.textContent = score;
    if (resKills) resKills.textContent = kills;
}

function gameLoop(currentTime) {
    if (!isGameRunning) return;

    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    playerSnake.update(deltaTime, foods, playerSnake, bots);
    bots.forEach(bot => bot.update(deltaTime, foods, playerSnake, bots));

    let allEntities = [...bots, playerSnake];
    let king = allEntities.reduce((max, s) => s.score > max.score ? s : max, allEntities[0]);

    const camera = {
        x: playerSnake.segments[0].x - canvas.width / 2,
        y: playerSnake.segments[0].y - canvas.height / 2
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWorldGrid(ctx, camera);

    const pHead = playerSnake.segments[0];
    foods.forEach((food) => {
        food.draw(ctx, camera);

        const dist = Math.hypot(pHead.x - food.x, pHead.y - food.y);
        if (dist < playerSnake.currentSize / 2 + food.radius) {
            playerSnake.grow(food.value);
            food.spawn();
        }
    });

    bots.forEach(bot => {
        const bHead = bot.segments[0];
        foods.forEach(food => {
            const dist = Math.hypot(bHead.x - food.x, bHead.y - food.y);
            if (dist < bot.currentSize / 2 + food.radius) {
                bot.grow(food.value);
                food.spawn();
            }
        });
    });

    bots.forEach(bot => {
        bot.draw(ctx, camera, bot === king);
    });
    playerSnake.draw(ctx, camera, playerSnake === king);

    drawKingPointer(ctx, camera, king);
    drawMinimap();
    drawCrosshair(ctx);

    requestAnimationFrame(gameLoop);
}

// ==========================================
// 8. EVENTOS DE INICIO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    initBackgroundWorld();
});

if (startBtn) {
    startBtn.addEventListener('click', startGame);
}

if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        if (gameoverMenu) gameoverMenu.classList.add('hidden');
        if (gameUI) gameUI.classList.remove('hidden');
        if (minimapCanvas) minimapCanvas.classList.remove('hidden');
        initGame();
    });
}

if (nicknameInput) {
    nicknameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') startGame();
    });
}

function startGame() {
    enableAudioOnUserAction();

    const val = nicknameInput ? nicknameInput.value.trim() : "";
    if (val !== "") nickname = val;
    if (graphicsSelect) graphicsMode = graphicsSelect.value;
    if (deviceSelect) controlMode = deviceSelect.value;
    
    // Capturar y asegurar la música elegida al entrar
    if (musicSelect) {
        selectedMusicMode = musicSelect.value;
        playSelectedTheme();
    }

    if (startMenu) startMenu.classList.add('hidden');
    if (gameUI) gameUI.classList.remove('hidden');
    if (minimapCanvas) minimapCanvas.classList.remove('hidden');

    initGame();
}