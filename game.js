/* ============================================
   무한의 계단 - 쿼카의 모험
   캐릭터: 머리(QuickQuokka) 정면 고정 + 몸통만 dir별 측면(LEFT/RIGHT)
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
    INPUT_LOCK_MS: 50,
    MOVE_DURATION_MS: 145,
    TURN_POSE_MS: 100,
    ARC_HEIGHT: 22,
    CHAR_WIDTH: 38,
    CHAR_HEIGHT: 46,
    CACHE_HEIGHT: 192,
    CACHE_PADDING: 60,
    CHAR_VISUAL_SCALE: 1.5,
    BOUNCE_PX: 4,
    SQUASH_JUMP: 0.94,
    STRETCH_JUMP: 1.06,
    LAND_SQUASH: 0.96,
    BODY_SWAY_PX: 2.5,
    DEATH_FACE_MS: 150,
    SCREEN_SHAKE_AMT: 3,
    HEAD_FRONT_OFFSET_PX: 4,
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
let startBtn, restartBtn, btnClimb, btnTurn;
let debugPanel = null;
let dpr = 1;
let headCache = null;
let bodyCacheLeft = null;
let bodyCacheRight = null;
let charHeadImg = null;
let inputLockUntil = 0;
let moveStartTime = 0;
let moveStartX = 0;
let moveStartY = 0;
let lastCacheDpr = 0;
let playerDir = 'right';
let moveType = 'step';
let deathPopupTime = 0;
let shakeSeed = 0;
let lastRenderTime = 0;
let rafId = null;

const debugMode = typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === '1';

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

function drawCheekBlushOnHead(cctx, cx, cy, headR) {
    const cheekR = headR * 0.22;
    const cheekY = cy + headR * 0.06;
    [1, -1].forEach(s => {
        const g = cctx.createRadialGradient(
            cx + s * headR * 0.38 - cheekR * 0.3, cheekY, 0,
            cx + s * headR * 0.38, cheekY, cheekR
        );
        g.addColorStop(0, 'rgba(255, 180, 170, 0.35)');
        g.addColorStop(0.6, 'rgba(255, 150, 140, 0.2)');
        g.addColorStop(1, 'transparent');
        cctx.fillStyle = g;
        cctx.beginPath();
        cctx.ellipse(cx + s * headR * 0.38, cheekY, cheekR, cheekR * 0.85, 0, 0, Math.PI * 2);
        cctx.fill();
    });
}

function drawEyeSparkleOnHead(cctx, cx, cy, headR) {
    const eyeX = headR * 0.3;
    const eyeY = cy - headR * 0.08;
    const bigR = headR * 0.05;
    const smallR = headR * 0.025;
    [1, -1].forEach(s => {
        const ex = cx + s * eyeX;
        cctx.fillStyle = 'rgba(255,255,255,0.9)';
        cctx.beginPath();
        cctx.arc(ex - s * headR * 0.06, eyeY - headR * 0.02, bigR, 0, Math.PI * 2);
        cctx.fill();
        cctx.fillStyle = 'rgba(255,255,255,0.75)';
        cctx.beginPath();
        cctx.arc(ex + s * headR * 0.08, eyeY + headR * 0.03, smallR, 0, Math.PI * 2);
        cctx.fill();
    });
}

function drawDeathOverlay(cctx, cx, cy, headR) {
    const eyeX = headR * 0.3;
    const eyeY = cy - headR * 0.08;
    cctx.strokeStyle = '#4A3828';
    cctx.lineWidth = headR * 0.05;
    cctx.lineCap = 'round';
    [1, -1].forEach(s => {
        const ex = cx + s * eyeX;
        cctx.beginPath();
        cctx.moveTo(ex - headR * 0.1, eyeY - headR * 0.06);
        cctx.lineTo(ex + headR * 0.1, eyeY + headR * 0.06);
        cctx.moveTo(ex + headR * 0.1, eyeY - headR * 0.06);
        cctx.lineTo(ex - headR * 0.1, eyeY + headR * 0.06);
        cctx.stroke();
    });
    cctx.fillStyle = '#5D4E37';
    cctx.beginPath();
    cctx.ellipse(cx, cy + headR * 0.38, headR * 0.12, headR * 0.14, 0, 0, Math.PI * 2);
    cctx.fill();
}

function buildHeadCache(headImg) {
    const cacheH = CONFIG.CACHE_HEIGHT;
    const cacheW = cacheH * (CONFIG.CHAR_WIDTH / CONFIG.CHAR_HEIGHT);
    const pad = CONFIG.CACHE_PADDING || 60;
    const cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = cacheW + pad * 2;
    cacheCanvas.height = cacheH + pad * 2;
    const cctx = cacheCanvas.getContext('2d');
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.translate(pad, pad);

    const cw = cacheW;
    const ch = cacheH;
    const cx = cw / 2;
    const headR = Math.min(cw, ch) * 0.32;
    const headY = ch * 0.32;

    if (headImg && headImg.complete && headImg.naturalWidth > 0) {
        const headSize = headR * 2.2;
        cctx.drawImage(headImg, cx - headSize / 2, headY - headSize / 2, headSize, headSize);
        drawCheekBlushOnHead(cctx, cx, headY, headR);
        drawEyeSparkleOnHead(cctx, cx, headY, headR);
    } else {
        cctx.fillStyle = '#E5D0B5';
        cctx.beginPath();
        cctx.arc(cx, headY, headR, 0, Math.PI * 2);
        cctx.fill();
        cctx.strokeStyle = '#B8956A';
        cctx.lineWidth = 2;
        cctx.stroke();
        cctx.fillStyle = '#4A3828';
        cctx.beginPath();
        cctx.arc(cx - headR * 0.32, headY - headR * 0.08, headR * 0.12, 0, Math.PI * 2);
        cctx.arc(cx + headR * 0.32, headY - headR * 0.08, headR * 0.12, 0, Math.PI * 2);
        cctx.fill();
        drawEyeSparkleOnHead(cctx, cx, headY, headR);
        cctx.fillStyle = '#5D4E37';
        cctx.beginPath();
        cctx.ellipse(cx, headY + headR * 0.18, headR * 0.1, headR * 0.12, 0, 0, Math.PI * 2);
        cctx.fill();
        drawCheekBlushOnHead(cctx, cx, headY, headR);
    }

    headCache = cacheCanvas;
}

function drawBodyForDir(cctx, cw, ch, dir, pad) {
    const padX = pad || 0;
    const padY = pad || 0;
    const contentW = cw - padX * 2;
    const contentH = ch - padY * 2;
    cctx.translate(padX, padY);
    const cx = contentW / 2;
    const frontSign = (dir === 'right') ? 1 : -1;
    const bodyTop = contentH * 0.35;
    const bodyBottom = contentH * 0.96;
    const bodyH = (bodyBottom - bodyTop) * 0.92;
    const bodyCx = cx;
    const bodyCy = bodyTop + bodyH * 0.45;
    const frontExt = contentW * 0.22;
    const backExt = contentW * 0.24;
    const bellyW = contentW * 0.30;
    const highlightX = bodyCx + frontSign * contentW * 0.18;
    const shadowX = bodyCx - frontSign * contentW * 0.18;

    cctx.save();

    function pearBodyPath() {
        const topY = bodyTop + bodyH * 0.08;
        const botY = bodyBottom - bodyH * 0.08;
        const midY = bodyCy;
        cctx.beginPath();
        cctx.moveTo(bodyCx + frontSign * frontExt, topY + bodyH * 0.1);
        cctx.quadraticCurveTo(bodyCx + frontSign * frontExt, midY, bodyCx + frontSign * frontExt * 0.85, botY - bodyH * 0.05);
        cctx.quadraticCurveTo(bodyCx, botY + bodyH * 0.1, bodyCx - frontSign * bellyW, botY - bodyH * 0.08);
        cctx.quadraticCurveTo(bodyCx - frontSign * (backExt + bellyW * 0.35), midY + bodyH * 0.1, bodyCx - frontSign * backExt, topY);
        cctx.quadraticCurveTo(bodyCx - frontSign * backExt * 0.6, topY - bodyH * 0.05, bodyCx + frontSign * frontExt, topY + bodyH * 0.1);
        cctx.closePath();
    }

    let tailStartX = bodyCx - frontSign * backExt * 0.85;
    const tailStartY = bodyBottom - bodyH * 0.32;
    let tailMid1X = bodyCx - frontSign * (backExt + contentW * 0.08);
    const tailMid1Y = bodyBottom + contentH * 0.01;
    let tailMid2X = bodyCx - frontSign * (backExt + contentW * 0.20);
    const tailMid2Y = bodyBottom - contentH * 0.05;
    let tailEndX = bodyCx - frontSign * (backExt + contentW * 0.30);
    let tailEndY = bodyBottom - contentH * 0.06;
    tailEndX = Math.max(12, Math.min(contentW - 12, tailEndX));
    tailEndY = Math.max(12, Math.min(contentH - 12, tailEndY));
    tailMid1X = (tailStartX + tailEndX) / 2 - frontSign * 5;
    tailMid2X = (tailStartX + tailEndX) / 2 - frontSign * 15;

    function tailPath() {
        cctx.beginPath();
        cctx.moveTo(tailStartX, tailStartY);
        cctx.quadraticCurveTo(tailMid1X, tailMid1Y, tailMid2X, tailMid2Y);
        cctx.quadraticCurveTo(tailEndX + frontSign * 8, tailEndY, tailEndX, tailEndY);
    }
    cctx.strokeStyle = 'rgba(60,45,30,0.8)';
    cctx.lineWidth = 22;
    cctx.lineCap = 'round';
    cctx.lineJoin = 'round';
    tailPath();
    cctx.stroke();
    cctx.strokeStyle = '#8B6B3A';
    cctx.lineWidth = 20;
    tailPath();
    cctx.stroke();
    cctx.fillStyle = '#8B6B3A';
    cctx.beginPath();
    cctx.ellipse(tailEndX, tailEndY, 10, 10, 0, 0, Math.PI * 2);
    cctx.fill();
    cctx.strokeStyle = 'rgba(60,45,30,0.6)';
    cctx.lineWidth = 1;
    cctx.stroke();

    const drawHindLeg = (thighRx, thighRy, footW, footH, legX, legY, color, alpha) => {
        cctx.globalAlpha = alpha;
        cctx.fillStyle = color;
        cctx.beginPath();
        cctx.ellipse(legX, legY - thighRy * 0.5, thighRx, thighRy, 0, 0, Math.PI * 2);
        cctx.fill();
        cctx.fillStyle = color;
        cctx.beginPath();
        cctx.ellipse(legX, legY + contentH * 0.03, footW, footH, 0, 0, Math.PI * 2);
        cctx.fill();
        cctx.globalAlpha = 1;
    };

    const hindLegX = bodyCx - frontSign * contentW * 0.18;
    const hindLegY = bodyBottom - contentH * 0.02;

    drawHindLeg(13, 9, 15, 7, hindLegX, hindLegY, '#9A7B4A', 0.75);

    const bodyGrad = cctx.createLinearGradient(bodyCx - contentW / 2, bodyTop, bodyCx + contentW / 2, bodyBottom);
    bodyGrad.addColorStop(0, '#D4B896');
    bodyGrad.addColorStop(0.35, '#C9A87C');
    bodyGrad.addColorStop(0.65, '#B8956A');
    bodyGrad.addColorStop(1, '#A67C52');
    cctx.fillStyle = bodyGrad;
    pearBodyPath();
    cctx.fill();

    cctx.fillStyle = 'rgba(0,0,0,0.06)';
    cctx.beginPath();
    cctx.ellipse(shadowX, bodyCy + bodyH * 0.1, contentW * 0.15, bodyH * 0.3, 0, 0, Math.PI * 2);
    cctx.fill();
    cctx.fillStyle = 'rgba(255,255,255,0.16)';
    cctx.beginPath();
    cctx.ellipse(highlightX, bodyCy - bodyH * 0.08, contentW * 0.13, bodyH * 0.26, 0, 0, Math.PI * 2);
    cctx.fill();

    drawHindLeg(14, 10, 16, 8, bodyCx + frontSign * contentW * 0.08, bodyBottom - contentH * 0.01, '#8B6B3A', 0.9);

    const frontPawBaseX = bodyCx + frontSign * (frontExt + 6);
    const pawRx = 8;
    const pawRy = 6;
    [[-1, -2], [1, 3]].forEach(([s, yOff]) => {
        const px = frontPawBaseX + frontSign * s * 10;
        const py = bodyCy - bodyH * 0.15 + yOff;
        cctx.fillStyle = 'rgba(0,0,0,0.2)';
        cctx.beginPath();
        cctx.ellipse(px, py + 3, pawRx, pawRy, 0, 0, Math.PI * 2);
        cctx.fill();
        cctx.fillStyle = '#8B6B3A';
        cctx.beginPath();
        cctx.ellipse(px, py, pawRx, pawRy, 0, 0, Math.PI * 2);
        cctx.fill();
        cctx.strokeStyle = '#5D4A35';
        cctx.lineWidth = 2;
        cctx.stroke();
        cctx.fillStyle = 'rgba(255,255,255,0.25)';
        cctx.beginPath();
        cctx.ellipse(px - frontSign * 3, py - 2, 3, 2.5, 0, 0, Math.PI * 2);
        cctx.fill();
    });

    cctx.restore();
}

function buildBodyCaches() {
    const baseH = CONFIG.CACHE_HEIGHT;
    const baseW = baseH * (CONFIG.CHAR_WIDTH / CONFIG.CHAR_HEIGHT);
    const pad = CONFIG.CACHE_PADDING || 60;
    const cacheW = baseW + pad * 2;
    const cacheH = baseH + pad * 2;

    const buildOne = (dir) => {
        const cacheCanvas = document.createElement('canvas');
        cacheCanvas.width = cacheW;
        cacheCanvas.height = cacheH;
        const cctx = cacheCanvas.getContext('2d');
        cctx.setTransform(1, 0, 0, 1, 0, 0);
        drawBodyForDir(cctx, cacheW, cacheH, dir, pad);
        return cacheCanvas;
    };

    bodyCacheLeft = buildOne('left');
    bodyCacheRight = buildOne('right');
}

function buildAllCaches(headImg) {
    buildHeadCache(headImg);
    buildBodyCaches();
    lastCacheDpr = dpr;
}

function loadQuokkaHead() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        charHeadImg = img;
        buildAllCaches(img);
    };
    img.onerror = () => {
        charHeadImg = null;
        buildAllCaches(null);
    };
    img.src = CONFIG.QUOKKA_HEAD_SVG;
}

function handleClimb() {
    if (gameState === 'start' || gameState === 'gameover') {
        startGame();
        return;
    }
    if (gameState !== 'playing') return;
    if (!player || player.isFalling || player.isMoving) return;

    const now = performance.now();
    if (now < inputLockUntil) return;

    inputLockUntil = now + CONFIG.INPUT_LOCK_MS;
    moveType = 'step';
    tryMove(playerDir);
}

function handleTurn() {
    if (gameState === 'start' || gameState === 'gameover') {
        startGame();
        return;
    }
    if (!player || player.isFalling || player.isMoving) return;

    const now = performance.now();
    if (now < inputLockUntil) return;

    inputLockUntil = now + CONFIG.INPUT_LOCK_MS;
    playerDir = playerDir === 'left' ? 'right' : 'left';
    moveType = 'turn';
    tryMove(playerDir);
}

function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvasWrapper = document.getElementById('canvas-wrapper');
    if (!canvasWrapper || !ctx) return;
    scoreDisplay = document.getElementById('score');
    finalScoreDisplay = document.getElementById('final-score');
    startScreen = document.getElementById('start-screen');
    gameoverScreen = document.getElementById('gameover-screen');
    startBtn = document.getElementById('start-btn');
    restartBtn = document.getElementById('restart-btn');
    btnClimb = document.getElementById('btn-climb');
    btnTurn = document.getElementById('btn-turn');
    debugPanel = document.getElementById('debug-panel');

    if (debugPanel) {
        debugPanel.classList.toggle('hidden', !debugMode);
    }

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    document.addEventListener('keydown', handleKeyDown, { capture: true });

    const climbHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClimb();
    };
    const turnHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTurn();
    };

    btnClimb.addEventListener('pointerdown', climbHandler);
    btnClimb.addEventListener('touchstart', climbHandler, { passive: false });
    btnTurn.addEventListener('pointerdown', turnHandler);
    btnTurn.addEventListener('touchstart', turnHandler, { passive: false });

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function() { setTimeout(onResize, 150); });
    window.addEventListener('pageshow', function(e) {
        if (e.persisted) {
            onResize();
            rafId = requestAnimationFrame(gameLoop);
        }
    });

    createHills();
    resizeCanvas();
    buildAllCaches(null);
    loadQuokkaHead();
    resetGame();

    requestAnimationFrame(function() {
        if (canvasWrapper && (canvasWidth <= 0 || canvasHeight <= 0) && (canvasWrapper.clientWidth > 0 || canvasWrapper.clientHeight > 0)) {
            resizeCanvas();
            buildAllCaches(charHeadImg);
        }
    });

    rafId = requestAnimationFrame(gameLoop);
}

function onResize() {
    resizeCanvas();
    if (dpr !== lastCacheDpr) {
        buildAllCaches(charHeadImg);
    }
}

function resizeCanvas() {
    if (!canvasWrapper || !canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = canvasWrapper.clientWidth || 1;
    const cssH = Math.max(1, canvasWrapper.clientHeight || 1);

    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.ceil(cssW * dpr);
    canvas.height = Math.ceil(cssH * dpr);

    canvasWidth = cssW;
    canvasHeight = cssH;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createHills() {
    hills = [
        { baseY: 0.65, amplitude: 30, freq: 0.006, parallax: 0.15, color: '#8ECDD4', alpha: 0.45 },
        { baseY: 0.72, amplitude: 55, freq: 0.009, parallax: 0.35, color: '#7DCEA0', alpha: 0.75 },
        { baseY: 0.78, amplitude: 70, freq: 0.008, parallax: 0.5, color: '#52BE80', alpha: 0.95 },
        { baseY: 0.84, amplitude: 85, freq: 0.005, parallax: 0.7, color: '#27AE60', alpha: 1 }
    ];
}

function resetGame() {
    score = 0;
    gameSpeed = 1;
    particles = [];
    stairs = [];
    inputLockUntil = 0;
    playerDir = 'right';
    deathPopupTime = 0;

    const groundX = -CONFIG.STAIR_WIDTH / 2;
    stairs.push({
        worldX: groundX,
        worldY: CONFIG.GROUND_Y,
        width: CONFIG.STAIR_WIDTH,
        height: CONFIG.STAIR_HEIGHT
    });

    for (let i = 0; i < CONFIG.PREBUILD_COUNT; i++) generateNextStair(i === 0);

    player = {
        worldX: -CONFIG.CHAR_WIDTH / 2,
        worldY: CONFIG.GROUND_Y - CONFIG.CHAR_HEIGHT - 4,
        width: CONFIG.CHAR_WIDTH,
        height: CONFIG.CHAR_HEIGHT,
        targetWorldX: null,
        targetWorldY: null,
        isMoving: false,
        isFalling: false,
        fallSpeed: 0,
        fallRotation: 0,
        fallStartTime: 0
    };

    cameraX = player.worldX + player.width / 2;
    cameraY = player.worldY + player.height / 2;

    scoreDisplay.textContent = '0';
}

function generateNextStair(forceRight) {
    const last = stairs[stairs.length - 1];
    const isLeft = forceRight ? false : (Math.random() < 0.5);
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
    if (!player) return null;
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

function getNextDir() {
    const current = getCurrentStair();
    const next = getNextStair();
    if (!current || !next) return null;
    return next.worldX < current.worldX ? 'left' : 'right';
}

function ensureStairBuffer() {
    const topWorldY = cameraY - canvasHeight * CONFIG.PLAYER_SCREEN_Y_RATIO;
    const threshold = topWorldY - CONFIG.STAIR_BUFFER_COUNT * CONFIG.STAIR_GAP;
    while (stairs.length > 0 && Math.min(...stairs.map(s => s.worldY)) > threshold) {
        generateNextStair(false);
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
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleClimb();
    } else if (e.key === 'Shift' || e.key === 'Enter') {
        e.preventDefault();
        if (gameState === 'start' || gameState === 'gameover') {
            startGame();
        } else {
            handleTurn();
        }
    }
}

function tryMove(direction) {
    const currentStair = getCurrentStair();
    const nextStair = getNextStair();

    if (!currentStair || !nextStair) return;

    const nextIsOnLeft = nextStair.worldX < currentStair.worldX;
    const correctDirection = nextIsOnLeft ? 'left' : 'right';

    const isFirstMove = score === 0;
    if (!isFirstMove && direction !== correctDirection) {
        player.isFalling = true;
        player.fallSpeed = 0;
        player.fallRotation = 0;
        player.fallStartTime = performance.now();
        deathPopupTime = performance.now();
        createFallParticles();
        createDeathParticles();
        return;
    }

    if (isFirstMove) playerDir = correctDirection;

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

function createDeathParticles() {
    const cx = player.worldX + player.width / 2;
    const cy = player.worldY + player.height / 2;
    for (let i = 0; i < 8; i++) {
        particles.push({
            worldX: cx + (Math.random() - 0.5) * 30,
            worldY: cy - 20,
            vx: (Math.random() - 0.5) * 6,
            vy: -4 - Math.random() * 4,
            size: 3 + Math.random() * 4,
            color: 'rgba(255,255,220,0.9)',
            life: 1
        });
    }
    for (let i = 0; i < 6; i++) {
        particles.push({
            worldX: cx + (Math.random() - 0.5) * 40,
            worldY: cy,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 6,
            size: 4 + Math.random() * 5,
            color: `hsl(${45 + Math.random() * 15}, 80%, 60%)`,
            life: 1
        });
    }
}

function createLandingParticles() {
    const cx = player.worldX + player.width / 2;
    const cy = player.worldY + player.height;
    for (let i = 0; i < 5; i++) {
        particles.push({
            worldX: cx + (Math.random() - 0.5) * 20,
            worldY: cy,
            vx: (Math.random() - 0.5) * 4,
            vy: -2 - Math.random() * 3,
            size: 2 + Math.random() * 3,
            color: 'rgba(255,235,200,0.8)',
            life: 1
        });
    }
}

function pseudoRandom() {
    shakeSeed = (shakeSeed * 1103515245 + 12345) & 0x7fffffff;
    return shakeSeed / 0x7fffffff;
}

function applyCameraTransform() {
    let shakeX = 0, shakeY = 0;
    if (player && player.isFalling) {
        shakeX = (pseudoRandom() - 0.5) * CONFIG.SCREEN_SHAKE_AMT * 2;
        shakeY = (pseudoRandom() - 0.5) * CONFIG.SCREEN_SHAKE_AMT * 2;
    }
    ctx.translate(
        canvasWidth / 2 - cameraX + shakeX,
        canvasHeight * CONFIG.PLAYER_SCREEN_Y_RATIO - cameraY + shakeY
    );
}

function drawBackground() {
    ctx.save();

    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGrad.addColorStop(0, '#4A90D9');
    skyGrad.addColorStop(0.2, '#6BA3E8');
    skyGrad.addColorStop(0.4, '#87CEEB');
    skyGrad.addColorStop(0.55, '#B0E0E6');
    skyGrad.addColorStop(0.7, '#98D8C8');
    skyGrad.addColorStop(0.85, '#6BBF8A');
    skyGrad.addColorStop(1, '#52BE80');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const sunX = canvasWidth * 0.75;
    const sunY = canvasHeight * 0.25;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120);
    sunGrad.addColorStop(0, 'rgba(255,255,220,0.4)');
    sunGrad.addColorStop(0.4, 'rgba(255,255,200,0.15)');
    sunGrad.addColorStop(0.7, 'rgba(255,255,255,0.05)');
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(sunX - 120, sunY - 120, 240, 240);

    const sunX2 = canvasWidth * 0.2;
    const sunY2 = canvasHeight * 0.35;
    const sunGrad2 = ctx.createRadialGradient(sunX2, sunY2, 0, sunX2, sunY2, 80);
    sunGrad2.addColorStop(0, 'rgba(255,255,255,0.2)');
    sunGrad2.addColorStop(0.6, 'rgba(255,255,255,0.04)');
    sunGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad2;
    ctx.fillRect(sunX2 - 80, sunY2 - 80, 160, 160);

    hills.forEach(hill => {
        const parallaxY = cameraY * hill.parallax * 0.5;
        const baseY = canvasHeight * hill.baseY + parallaxY;
        ctx.fillStyle = hill.color;
        ctx.globalAlpha = hill.alpha;
        ctx.beginPath();
        ctx.moveTo(-100, canvasHeight + 80);
        for (let sx = -100; sx <= canvasWidth + 120; sx += 35) {
            const sy = baseY + Math.sin((sx + cameraX * 0.1) * hill.freq) * hill.amplitude;
            ctx.lineTo(sx, sy);
        }
        ctx.lineTo(canvasWidth + 120, canvasHeight + 80);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    ctx.restore();
}

function drawClouds() {
    ctx.save();
    const t = animationFrame * 0.015;
    const ox = (cameraX * 0.02) % 400;
    const oxSmall = (cameraX * 0.05 + t * 20) % 350;

    for (let i = 0; i < 5; i++) {
        const sx = ((i * 380 + ox) % (canvasWidth + 400)) - 100;
        const sy = ((i * 130 + 30 - cameraY * 0.03) % (canvasHeight * 0.5 + 80)) - 20;
        if (sy < -60 || sy > canvasHeight * 0.6) continue;
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = 'rgba(255,255,255,0.98)';
        ctx.beginPath();
        ctx.arc(sx, sy, 42, 0, Math.PI * 2);
        ctx.arc(sx + 52, sy - 10, 52, 0, Math.PI * 2);
        ctx.arc(sx + 105, sy, 42, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let i = 0; i < 6; i++) {
        const sx = ((i * 180 + oxSmall) % (canvasWidth + 200)) - 50;
        const sy = ((i * 95 + 80 - cameraY * 0.08) % (canvasHeight * 0.45 + 60)) + 20;
        if (sy < -30 || sy > canvasHeight) continue;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(sx, sy, 22, 0, Math.PI * 2);
        ctx.arc(sx + 28, sy - 5, 28, 0, Math.PI * 2);
        ctx.arc(sx + 55, sy, 22, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawSkyDecorations() {
    ctx.save();
    const t = animationFrame * 0.02;
    const seed = (n) => ((n * 7919 + 9973) % 10000) / 10000;

    for (let i = 0; i < 12; i++) {
        const px = (i * 234 + Math.floor(t * 50) % 200) % (canvasWidth + 100) - 20;
        const py = (seed(i) * canvasHeight * 0.5 + (t * 30) % 200) % (canvasHeight * 0.55) + 10;
        const pulse = 0.6 + 0.4 * Math.sin(t + i);
        ctx.globalAlpha = 0.25 * pulse;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    const birdX = ((animationFrame * 0.8 + 1200) % (canvasWidth + 150)) - 50;
    const birdY = canvasHeight * 0.15 + Math.sin(animationFrame * 0.1) * 8;
    if (birdX > -30 && birdX < canvasWidth + 30) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = 'rgba(80,70,60,0.8)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(birdX, birdY);
        ctx.lineTo(birdX + 12, birdY - 4);
        ctx.moveTo(birdX, birdY);
        ctx.lineTo(birdX + 12, birdY + 4);
        ctx.stroke();
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

function drawDeathPopup() {
    if (!deathPopupTime || !player) return;
    const elapsed = (performance.now() - deathPopupTime) / 1000;
    if (elapsed > 1) return;
    const alpha = Math.max(0, 1 - elapsed * 1.2);
    ctx.save();
    ctx.translate(canvasWidth / 2 - cameraX, canvasHeight * CONFIG.PLAYER_SCREEN_Y_RATIO - cameraY);
    const wx = player.worldX + player.width / 2;
    const wy = player.worldY - 35;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = `rgba(80,40,40,${alpha})`;
    ctx.textAlign = 'center';
    ctx.fillText('아!', wx, wy);
    ctx.restore();
}

function drawPlayer() {
    animationFrame++;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    applyCameraTransform();

    const x = player.worldX;
    const w = player.width;
    const h = player.height;

    const now = performance.now();
    const isFacingLeft = playerDir === 'left';

    let squashY = 1;
    let squashX = 1;
    let bounceY = 0;
    let turnTilt = 0;
    let rot = 0;

    if (player.isMoving) {
        const elapsed = now - moveStartTime;
        const duration = Math.max(100, CONFIG.MOVE_DURATION_MS - (gameSpeed - 1) * 12);
        const t = Math.min(1, elapsed / duration);

        const squashPhase = Math.min(1, t * 6);
        const stretchPhase = Math.max(0, Math.min(1, (t - 0.15) / 0.7));
        const landPhase = Math.max(0, t - 0.88);

        squashY = 1;
        if (squashPhase < 1) {
            squashY = CONFIG.SQUASH_JUMP + (1 - CONFIG.SQUASH_JUMP) * squashPhase;
        } else if (stretchPhase < 1 && stretchPhase > 0) {
            squashY = 1 + (CONFIG.STRETCH_JUMP - 1) * Math.sin(stretchPhase * Math.PI);
        } else if (landPhase > 0) {
            const landT = Math.min(1, landPhase * 8);
            squashY = CONFIG.LAND_SQUASH + (1 - CONFIG.LAND_SQUASH) * landT;
        }
        squashX = 1 / squashY;

        bounceY = Math.sin(t * Math.PI) * CONFIG.BOUNCE_PX * 1.5;

        if (moveType === 'turn' && elapsed < CONFIG.TURN_POSE_MS) {
            turnTilt = (elapsed / CONFIG.TURN_POSE_MS) * Math.PI * 0.15;
        }
    } else if (player.isFalling) {
        rot = player.fallRotation;
        turnTilt = 0;
        squashY = 0.98;
        squashX = 1.02;
    } else {
        bounceY = Math.sin(animationFrame * 0.18) * CONFIG.BOUNCE_PX * 0.5;
        const sway = Math.sin(animationFrame * 0.15) * CONFIG.BODY_SWAY_PX;
        squashX = 1 + sway * 0.02;
        squashY = 1 - Math.abs(sway) * 0.015;
    }

    const drawW = w * squashX * CONFIG.CHAR_VISUAL_SCALE;
    const drawH = h * squashY * CONFIG.CHAR_VISUAL_SCALE;
    const drawYAnchor = player.worldY + player.height - drawH + bounceY;
    const cx = x + w / 2;

    ctx.translate(cx, drawYAnchor + drawH / 2);
    if (rot !== 0) ctx.rotate(rot);
    if (turnTilt !== 0) ctx.rotate(turnTilt * (isFacingLeft ? 1 : -1));
    ctx.translate(-cx, -(drawYAnchor + drawH / 2));

    const drawLeft = x + (w - drawW) / 2;

    if (player.isFalling) ctx.globalAlpha = 0.9;

    const pad = CONFIG.CACHE_PADDING || 60;
    const contentW = CONFIG.CACHE_HEIGHT * (CONFIG.CHAR_WIDTH / CONFIG.CHAR_HEIGHT);
    const contentH = CONFIG.CACHE_HEIGHT;

    const headOffset = (isFacingLeft ? -1 : 1) * CONFIG.HEAD_FRONT_OFFSET_PX;
    const headSize = drawH * 0.72;
    const headX = drawLeft + (drawW - headSize) / 2 + headOffset;
    const headY = drawYAnchor + drawH * 0.08;

    const bodyCache = isFacingLeft ? bodyCacheLeft : bodyCacheRight;
    if (bodyCache && bodyCache.width > 0) {
        ctx.drawImage(bodyCache, pad, pad, contentW, contentH, drawLeft, drawYAnchor, drawW, drawH);
    }

    if (headCache && headCache.width > 0) {
        ctx.drawImage(headCache, pad, pad, contentW, contentH, headX, headY, headSize, headSize * (contentH / contentW));

        if (player.isFalling && (now - player.fallStartTime) < CONFIG.DEATH_FACE_MS + 50) {
            const headCx = headX + headSize / 2;
            const headCy = headY + headSize * 0.38;
            const headR = headSize * 0.28;
            drawDeathOverlay(ctx, headCx, headCy, headR);
        }
    }

    ctx.globalAlpha = 1;

    if (debugMode && player) {
        const headSizeH = headSize * (contentH / contentW);
        const bboxLeft = Math.min(drawLeft, headX);
        const bboxRight = Math.max(drawLeft + drawW, headX + headSize);
        const bboxTop = headY;
        const bboxBottom = drawYAnchor + drawH;
        const feetX = x + w / 2;
        const feetY = drawYAnchor + drawH;

        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(bboxLeft, bboxTop, bboxRight - bboxLeft, bboxBottom - bboxTop);

        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(feetX - 12, feetY);
        ctx.lineTo(feetX + 12, feetY);
        ctx.moveTo(feetX, feetY - 12);
        ctx.lineTo(feetX, feetY + 12);
        ctx.stroke();
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(`dir=${playerDir === 'left' ? 'LEFT' : 'RIGHT'}`, feetX, feetY - 18);
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

function updateDebugPanel() {
    if (!debugPanel || !debugMode) return;
    if (gameState !== 'playing' || !player) {
        debugPanel.textContent = '';
        return;
    }
    const nextDir = getNextDir();
    debugPanel.textContent = `dir: ${playerDir} | nextDir: ${nextDir || '-'}`;
}

function updateCanvasDebugInfo() {
    if (!debugMode) return;
    let el = document.getElementById('canvas-debug-info');
    if (!el) {
        el = document.createElement('div');
        el.id = 'canvas-debug-info';
        el.style.cssText = 'position:fixed;top:4px;left:4px;font-size:9px;font-family:monospace;color:#333;background:rgba(255,255,255,0.85);padding:4px 6px;border-radius:4px;pointer-events:none;z-index:9999;';
        document.body.appendChild(el);
    }
    const cacheW = CONFIG.CACHE_HEIGHT * (CONFIG.CHAR_WIDTH / CONFIG.CHAR_HEIGHT) + (CONFIG.CACHE_PADDING || 60) * 2;
    const cacheH = CONFIG.CACHE_HEIGHT + (CONFIG.CACHE_PADDING || 60) * 2;
    el.textContent = 'cssW=' + canvasWidth + ' cssH=' + canvasHeight +
        ' dpr=' + dpr + ' | cache ' + cacheW + 'x' + cacheH +
        ' pad=' + (CONFIG.CACHE_PADDING || 60);
}

function gameLoop() {
    lastRenderTime = performance.now();
    rafId = requestAnimationFrame(gameLoop);

    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (gameState === 'start') {
        drawBackground();
        drawClouds();
        drawSkyDecorations();
    } else if (gameState === 'playing') {
        updateGame();
        drawBackground();
        drawClouds();
        drawSkyDecorations();
        drawStairs();
        drawParticles();
        drawPlayer();
        if (player && player.isFalling) drawDeathPopup();
        updateDebugPanel();
    } else if (gameState === 'gameover') {
        updateDebugPanel();
    }

    if (debugMode) {
        updateCanvasDebugInfo();
    }
}

function updateGame() {
    cameraX += (player.worldX + player.width / 2 - cameraX) * CONFIG.CAMERA_LERP;
    cameraY += (player.worldY + player.height / 2 - cameraY) * CONFIG.CAMERA_LERP;

    ensureStairBuffer();
    removeOffscreenStairs();

    if (player.isMoving) {
        const now = performance.now();
        const duration = Math.max(100, CONFIG.MOVE_DURATION_MS - (gameSpeed - 1) * 12);
        const elapsed = now - moveStartTime;
        const t = Math.min(1, elapsed / duration);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        const arcOffset = CONFIG.ARC_HEIGHT * 4 * t * (1 - t);
        player.worldX = moveStartX + (player.targetWorldX - moveStartX) * ease;
        player.worldY = moveStartY + (player.targetWorldY - moveStartY) * ease - arcOffset;

        if (t >= 1) {
            player.worldX = player.targetWorldX;
            player.worldY = player.targetWorldY;
            player.isMoving = false;
            score++;
            scoreDisplay.textContent = score;
            createLandingParticles();

            if (score % CONFIG.SCORE_SPEED_UP === 0) {
                gameSpeed = Math.min(4, gameSpeed + CONFIG.SPEED_INCREMENT * 0.2);
            }
            generateNextStair(false);
        }
    }

    if (player.isFalling) {
        player.fallSpeed += 1;
        player.fallRotation += 0.08;
        player.worldY += player.fallSpeed;
        if (player.worldY > CONFIG.GROUND_Y + canvasHeight * 2) gameOver();
    }
}

function gameOver() {
    gameState = 'gameover';
    finalScoreDisplay.textContent = score;
    gameoverScreen.classList.remove('hidden');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
