/* ============================================
   무한의 계단 - 쿼카의 모험
   QuickQuokka 머리 + 몸통 합성, 오프스크린 캐시
   ============================================ */

const CONFIG = {
    STAIR_WIDTH: 100,
    STAIR_HEIGHT: 36,
    STAIR_GAP: 72,
    STAIR_RADIUS: 6,
    GROUND_Y: 0,
    SCORE_SPEED_UP: 10,
    SPEED_INCREMENT: 1.5,
    PREBUILD_COUNT: 40,
    STAIR_BUFFER_COUNT: 12,
    REMOVE_SCREENS: 2.5,
    CAMERA_LERP: 0.15,
    PLAYER_SCREEN_Y_RATIO: 0.6,
    INPUT_LOCK_MS: 90,
    MOVE_DURATION_MS: 85,
    CHAR_WIDTH: 38,
    CHAR_HEIGHT: 46,
    CACHE_HEIGHT: 128,
    BOUNCE_PX: 3,
    SQUASH_MIN: 0.96,
    SQUASH_MAX: 1.04,
    BODY_SWAY_PX: 2.5,
    QUOKKA_HEAD_SVG: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/QuickQuokka.svg'
};

let canvas, ctx, canvasWrapper;
let gameState = 'start';
let score = 0;
let stairs = [];
let player = null;
let particles = [];
let hills = [];
let canvasWidth = 420;
let canvasHeight = 760;
let cameraX = 0;
let cameraY = 0;
let gameSpeed = 1;
let animationFrame = 0;
let scoreDisplay, finalScoreDisplay, startScreen, gameoverScreen;
let startBtn, restartBtn;
let dpr = 1;
let charCache = null;
let charHeadImg = null;
let inputLockUntil = 0;
let moveStartTime = 0;
let moveStartX = 0;
let moveStartY = 0;
let lastCacheDpr = 0;

function roundRectFallback(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawFallbackHead(cctx, cx, cy, headR) {
    cctx.fillStyle = '#E5D0B5';
    cctx.beginPath();
    cctx.arc(cx, cy, headR, 0, Math.PI * 2);
    cctx.fill();
    cctx.strokeStyle = '#B8956A';
    cctx.lineWidth = 2;
    cctx.stroke();
    cctx.fillStyle = '#4A3828';
    cctx.beginPath();
    cctx.arc(cx - headR * 0.35, cy - headR * 0.1, headR * 0.15, 0, Math.PI * 2);
    cctx.arc(cx + headR * 0.35, cy - headR * 0.1, headR * 0.15, 0, Math.PI * 2);
    cctx.fill();
    cctx.fillStyle = '#5D4E37';
    cctx.beginPath();
    cctx.ellipse(cx, cy + headR * 0.2, headR * 0.12, headR * 0.15, 0, 0, Math.PI * 2);
    cctx.fill();
    cctx.strokeStyle = '#6B5B45';
    cctx.lineWidth = headR * 0.08;
    cctx.beginPath();
    cctx.arc(cx, cy + headR * 0.35, headR * 0.25, 0.2 * Math.PI, 0.8 * Math.PI);
    cctx.stroke();
}

function drawBodyParts(cctx, cw, ch) {
    const cx = cw / 2;
    const bodyTop = ch * 0.38;
    const bodyBottom = ch * 0.95;

    cctx.save();

    const bodyH = (bodyBottom - bodyTop) * 0.9;
    const bodyW = cw * 0.6;
    const bodyCx = cx;
    const bodyCy = bodyTop + bodyH / 2 + ch * 0.02;

    const bodyGrad = cctx.createLinearGradient(bodyCx - bodyW / 2, bodyTop, bodyCx + bodyW / 2, bodyBottom);
    bodyGrad.addColorStop(0, '#D4B896');
    bodyGrad.addColorStop(0.4, '#C9A87C');
    bodyGrad.addColorStop(0.7, '#B8956A');
    bodyGrad.addColorStop(1, '#A67C52');
    cctx.fillStyle = bodyGrad;
    cctx.beginPath();
    cctx.ellipse(bodyCx, bodyCy, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
    cctx.fill();
    cctx.fillStyle = 'rgba(0,0,0,0.06)';
    cctx.beginPath();
    cctx.ellipse(bodyCx + bodyW * 0.15, bodyCy + bodyH * 0.1, bodyW * 0.35, bodyH * 0.4, 0, 0, Math.PI * 2);
    cctx.fill();
    cctx.fillStyle = 'rgba(255,255,255,0.25)';
    cctx.beginPath();
    cctx.ellipse(bodyCx - bodyW * 0.2, bodyCy - bodyH * 0.15, bodyW * 0.25, bodyH * 0.35, 0, 0, Math.PI * 2);
    cctx.fill();

    const legY = bodyBottom - ch * 0.08;
    const legH = ch * 0.12;
    const footH = ch * 0.05;
    cctx.fillStyle = '#B8956A';
    cctx.beginPath();
    cctx.ellipse(cx - bodyW * 0.2, legY + legH / 2, bodyW * 0.12, legH / 2, 0, 0, Math.PI * 2);
    cctx.ellipse(cx + bodyW * 0.2, legY + legH / 2, bodyW * 0.12, legH / 2, 0, 0, Math.PI * 2);
    cctx.fill();
    cctx.fillStyle = '#9A7B4A';
    cctx.beginPath();
    cctx.ellipse(cx - bodyW * 0.2, legY + legH, bodyW * 0.14, footH, 0, 0, Math.PI * 2);
    cctx.ellipse(cx + bodyW * 0.2, legY + legH, bodyW * 0.14, footH, 0, 0, Math.PI * 2);
    cctx.fill();

    cctx.fillStyle = '#A67C52';
    cctx.beginPath();
    cctx.moveTo(bodyCx + bodyW * 0.35, bodyCy + bodyH * 0.2);
    cctx.quadraticCurveTo(bodyCx + bodyW * 0.6, bodyCy, bodyCx + bodyW * 0.4, bodyCy + bodyH * 0.5);
    cctx.quadraticCurveTo(bodyCx + bodyW * 0.35, bodyCy + bodyH * 0.35, bodyCx + bodyW * 0.35, bodyCy + bodyH * 0.2);
    cctx.fill();

    cctx.restore();
}

function buildCharCache(headImg) {
    const cacheH = CONFIG.CACHE_HEIGHT;
    const cacheW = cacheH * (CONFIG.CHAR_WIDTH / CONFIG.CHAR_HEIGHT);
    const cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = Math.ceil(cacheW * dpr);
    cacheCanvas.height = Math.ceil(cacheH * dpr);
    const cctx = cacheCanvas.getContext('2d');
    cctx.scale(dpr, dpr);

    const cw = cacheW;
    const ch = cacheH;
    const cx = cw / 2;

    drawBodyParts(cctx, cw, ch);

    const headR = Math.min(cw, ch) * 0.32;
    const headY = ch * 0.32;

    if (headImg && headImg.complete && headImg.naturalWidth > 0) {
        const headSize = headR * 2.2;
        cctx.drawImage(headImg, cx - headSize / 2, headY - headSize / 2, headSize, headSize);
    } else {
        drawFallbackHead(cctx, cx, headY, headR);
    }

    charCache = cacheCanvas;
    lastCacheDpr = dpr;
}

function loadQuokkaHead() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        charHeadImg = img;
        buildCharCache(img);
    };
    img.onerror = () => {
        charHeadImg = null;
        buildCharCache(null);
    };
    img.src = CONFIG.QUOKKA_HEAD_SVG;
}

function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvasWrapper = document.getElementById('canvas-wrapper');
    scoreDisplay = document.getElementById('score');
    finalScoreDisplay = document.getElementById('final-score');
    startScreen = document.getElementById('start-screen');
    gameoverScreen = document.getElementById('gameover-screen');
    startBtn = document.getElementById('start-btn');
    restartBtn = document.getElementById('restart-btn');

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', onResize);

    createHills();
    resizeCanvas();
    buildCharCache(null);
    loadQuokkaHead();
    resetGame();

    requestAnimationFrame(gameLoop);
}

function onResize() {
    resizeCanvas();
    if (dpr !== lastCacheDpr) {
        buildCharCache(charHeadImg);
    }
}

function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvasWrapper.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
}

function createHills() {
    hills = [
        { baseY: 0.75, amplitude: 50, freq: 0.012, parallax: 0.3, color: '#7DCEA0', alpha: 1 },
        { baseY: 0.78, amplitude: 70, freq: 0.008, parallax: 0.5, color: '#52BE80', alpha: 0.9 },
        { baseY: 0.82, amplitude: 90, freq: 0.005, parallax: 0.7, color: '#27AE60', alpha: 0.8 }
    ];
}

function resetGame() {
    score = 0;
    gameSpeed = 1;
    particles = [];
    stairs = [];
    inputLockUntil = 0;

    const groundX = -CONFIG.STAIR_WIDTH / 2;
    stairs.push({
        worldX: groundX,
        worldY: CONFIG.GROUND_Y,
        width: CONFIG.STAIR_WIDTH,
        height: CONFIG.STAIR_HEIGHT
    });

    for (let i = 0; i < CONFIG.PREBUILD_COUNT; i++) generateNextStair();

    player = {
        worldX: -CONFIG.CHAR_WIDTH / 2,
        worldY: CONFIG.GROUND_Y - CONFIG.CHAR_HEIGHT - 4,
        width: CONFIG.CHAR_WIDTH,
        height: CONFIG.CHAR_HEIGHT,
        targetWorldX: null,
        targetWorldY: null,
        isMoving: false,
        isFalling: false,
        fallSpeed: 0
    };

    cameraX = player.worldX + player.width / 2;
    cameraY = player.worldY + player.height / 2;

    scoreDisplay.textContent = '0';
}

function generateNextStair() {
    const last = stairs[stairs.length - 1];
    const isLeft = Math.random() < 0.5;
    const newY = last.worldY - CONFIG.STAIR_GAP;
    const newX = isLeft ? last.worldX - CONFIG.STAIR_WIDTH : last.worldX + CONFIG.STAIR_WIDTH;
    stairs.push({
        worldX: newX,
        worldY: newY,
        width: CONFIG.STAIR_WIDTH,
        height: CONFIG.STAIR_HEIGHT,
        isLeft
    });
}

function getCurrentStair() {
    const feetY = player.worldY + player.height;
    const candidates = stairs.filter(s => s.worldY <= feetY + 8 && s.worldY + s.height >= feetY - 5);
    return candidates.reduce((a, b) => (!a || a.worldY < b.worldY ? b : a), null);
}

function getNextStair() {
    const current = getCurrentStair();
    if (!current) return null;
    const above = stairs.filter(s => s.worldY < current.worldY);
    return above.reduce((a, b) => (!a || a.worldY < b.worldY ? b : a), null);
}

function ensureStairBuffer() {
    const topWorldY = cameraY - canvasHeight * CONFIG.PLAYER_SCREEN_Y_RATIO;
    const threshold = topWorldY - CONFIG.STAIR_BUFFER_COUNT * CONFIG.STAIR_GAP;
    while (stairs.length > 0 && Math.min(...stairs.map(s => s.worldY)) > threshold) {
        generateNextStair();
    }
}

function removeOffscreenStairs() {
    const bottomWorldY = cameraY + canvasHeight * (1 - CONFIG.PLAYER_SCREEN_Y_RATIO);
    const threshold = bottomWorldY + CONFIG.REMOVE_SCREENS * canvasHeight;
    for (let i = stairs.length - 1; i >= 0; i--) {
        if (stairs[i].worldY > threshold) stairs.splice(i, 1);
    }
}

function startGame() {
    resetGame();
    gameState = 'playing';
    startScreen.style.display = 'none';
    gameoverScreen.classList.add('hidden');
}

function handleKeyDown(e) {
    if (e.repeat) {
        e.preventDefault();
        return;
    }
    if (gameState !== 'playing') return;
    if (player.isFalling || player.isMoving) return;

    const now = performance.now();
    if (now < inputLockUntil) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        inputLockUntil = now + CONFIG.INPUT_LOCK_MS;
        tryMove(e.key === 'ArrowLeft' ? 'left' : 'right');
    }
}

function tryMove(direction) {
    const currentStair = getCurrentStair();
    const nextStair = getNextStair();

    if (!currentStair || !nextStair) return;

    const nextIsOnLeft = nextStair.worldX < currentStair.worldX;
    const correctDirection = nextIsOnLeft ? 'left' : 'right';

    if (direction !== correctDirection) {
        player.isFalling = true;
        player.fallSpeed = 0;
        createFallParticles();
        return;
    }

    const targetWorldX = nextStair.worldX + nextStair.width / 2 - player.width / 2;
    const targetWorldY = nextStair.worldY - player.height - 4;

    moveStartX = player.worldX;
    moveStartY = player.worldY;
    player.targetWorldX = targetWorldX;
    player.targetWorldY = targetWorldY;
    player.isMoving = true;
    moveStartTime = performance.now();
}

function createFallParticles() {
    const cx = player.worldX + player.width / 2;
    const cy = player.worldY + player.height / 2;
    for (let i = 0; i < 18; i++) {
        particles.push({
            worldX: cx,
            worldY: cy,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: 5 + Math.random() * 8,
            color: `hsl(${25 + Math.random() * 25}, 75%, 55%)`,
            life: 1
        });
    }
}

function applyCameraTransform() {
    ctx.translate(canvasWidth / 2 - cameraX, canvasHeight * CONFIG.PLAYER_SCREEN_Y_RATIO - cameraY);
}

function drawBackground() {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.4, '#B0E0E6');
    grad.addColorStop(0.75, '#98D8C8');
    grad.addColorStop(1, '#52BE80');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    hills.forEach(hill => {
        const parallaxY = cameraY * hill.parallax * 0.5;
        const baseY = canvasHeight * hill.baseY + parallaxY;
        ctx.fillStyle = hill.color;
        ctx.globalAlpha = hill.alpha;
        ctx.beginPath();
        ctx.moveTo(-100, canvasHeight + 50);
        for (let sx = -100; sx <= canvasWidth + 100; sx += 40) {
            const sy = baseY + Math.sin((sx + cameraX * 0.1) * hill.freq) * hill.amplitude;
            ctx.lineTo(sx, sy);
        }
        ctx.lineTo(canvasWidth + 100, canvasHeight + 50);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    ctx.restore();
}

function drawClouds() {
    ctx.save();
    const oy = (cameraY * 0.05) % 200;
    const ox = (cameraX * 0.03) % 280;
    for (let i = 0; i < 8; i++) {
        const sx = ((i * 320 + ox) % (canvasWidth + 350)) - 80;
        const sy = ((i * 110 + 40 - oy) % (canvasHeight + 120)) - 40;
        if (sy < -50 || sy > canvasHeight + 50) continue;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(sx, sy, 35, 0, Math.PI * 2);
        ctx.arc(sx + 45, sy - 8, 45, 0, Math.PI * 2);
        ctx.arc(sx + 90, sy, 35, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawStairs() {
    ctx.save();
    applyCameraTransform();

    stairs.forEach(stair => {
        const screenY = stair.worldY - cameraY + canvasHeight * CONFIG.PLAYER_SCREEN_Y_RATIO;
        if (screenY > canvasHeight + 150 || screenY < -150) return;
        const x = stair.worldX, y = stair.worldY, w = stair.width, h = stair.height, r = CONFIG.STAIR_RADIUS;

        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
        } else roundRectFallback(x, y, w, h, r);

        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, '#FF6B6B');
        grad.addColorStop(0.3, '#EE5A5A');
        grad.addColorStop(0.6, '#C0392B');
        grad.addColorStop(1, '#922B21');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#641E16';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,235,220,0.95)';
        ctx.fillRect(x + 2, y + 2, w - 4, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(x + 3, y + h - 8, w - 6, 5);
        for (let px = x + 14; px < x + w - 14; px += 18) {
            for (let py = y + 22; py < y + h - 14; py += 16) {
                ctx.fillStyle = 'rgba(0,0,0,0.06)';
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
    ctx.restore();
}

function drawPlayer() {
    animationFrame++;
    ctx.save();
    applyCameraTransform();

    const x = player.worldX;
    let drawY = player.worldY;
    const w = player.width;
    const h = player.height;

    let squashY = 1;
    let squashX = 1;
    let bounceY = 0;

    if (player.isMoving) {
        const now = performance.now();
        const elapsed = now - moveStartTime;
        const dur = Math.max(55, CONFIG.MOVE_DURATION_MS - (gameSpeed - 1) * 10);
        const t = Math.min(1, elapsed / dur);
        squashY = CONFIG.SQUASH_MIN + (CONFIG.SQUASH_MAX - CONFIG.SQUASH_MIN) * Math.sin(t * Math.PI);
        squashX = 1 / squashY;
        bounceY = Math.sin(t * Math.PI) * CONFIG.BOUNCE_PX * 1.2;
    } else if (!player.isFalling) {
        bounceY = Math.sin(animationFrame * 0.18) * CONFIG.BOUNCE_PX;
        const sway = Math.sin(animationFrame * 0.15) * CONFIG.BODY_SWAY_PX;
        squashX = 1 + sway * 0.02;
        squashY = 1 - Math.abs(sway) * 0.015;
    }

    drawY += bounceY;

    if (charCache && charCache.width > 0) {
        const drawW = w * squashX;
        const drawH = h * squashY;
        ctx.drawImage(charCache, x + (w - drawW) / 2, drawY + (h - drawH) / 2, drawW, drawH);
    } else {
        if (player.isFalling) ctx.globalAlpha = 0.85;
        ctx.save();
        ctx.translate(x, drawY);
        drawBodyParts(ctx, w, h);
        const headR = Math.min(w, h) * 0.28;
        drawFallbackHead(ctx, w / 2, h * 0.32, headR);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

function drawParticles() {
    ctx.save();
    applyCameraTransform();
    particles.forEach((p, i) => {
        p.worldX += p.vx;
        p.worldY += p.vy;
        p.vy += 0.35;
        p.life -= 0.018;
        if (p.life <= 0) {
            particles.splice(i, 1);
            return;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.worldX, p.worldY, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    ctx.restore();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (gameState === 'start') {
        drawBackground();
        drawClouds();
    } else if (gameState === 'playing') {
        updateGame();
        drawBackground();
        drawClouds();
        drawStairs();
        drawParticles();
        drawPlayer();
    }

    requestAnimationFrame(gameLoop);
}

function updateGame() {
    cameraX += (player.worldX + player.width / 2 - cameraX) * CONFIG.CAMERA_LERP;
    cameraY += (player.worldY + player.height / 2 - cameraY) * CONFIG.CAMERA_LERP;

    ensureStairBuffer();
    removeOffscreenStairs();

    if (player.isMoving) {
        const now = performance.now();
        const duration = Math.max(55, CONFIG.MOVE_DURATION_MS - (gameSpeed - 1) * 10);
        const elapsed = now - moveStartTime;
        const t = Math.min(1, elapsed / duration);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        player.worldX = moveStartX + (player.targetWorldX - moveStartX) * ease;
        player.worldY = moveStartY + (player.targetWorldY - moveStartY) * ease;

        if (t >= 1) {
            player.worldX = player.targetWorldX;
            player.worldY = player.targetWorldY;
            player.isMoving = false;
            score++;
            scoreDisplay.textContent = score;

            if (score % CONFIG.SCORE_SPEED_UP === 0) {
                gameSpeed = Math.min(4, gameSpeed + CONFIG.SPEED_INCREMENT * 0.2);
            }
            generateNextStair();
        }
    }

    if (player.isFalling) {
        player.fallSpeed += 1;
        player.worldY += player.fallSpeed;
        if (player.worldY > CONFIG.GROUND_Y + canvasHeight * 2) gameOver();
    }
}

function gameOver() {
    gameState = 'gameover';
    finalScoreDisplay.textContent = score;
    gameoverScreen.classList.remove('hidden');
}

window.addEventListener('load', init);
