/**
 * Brick Breaker Game - Main Application
 * Canvas-based 60fps game with physics engine
 */

const GAME_CONFIG = {
    CANVAS_WIDTH: 480,
    CANVAS_HEIGHT: 600,
    PADDLE_WIDTH: 80,
    PADDLE_HEIGHT: 12,
    BALL_RADIUS: 6,
    BRICK_ROWS: 4,
    BRICK_COLS: 8,
    BRICK_WIDTH: 50,
    BRICK_HEIGHT: 20,
    BRICK_PADDING: 4,
    PADDLE_MARGIN: 10,
    MAX_LIVES: 3,
    MAX_STAGES: 20
};

const GAME_STATES = {
    MENU: 'menu',
    GAME: 'game',
    PAUSE: 'pause',
    GAMEOVER: 'gameover',
    STATS: 'stats'
};

const BRICK_TYPES = {
    NORMAL: { health: 1, color: '#e74c3c' },
    STRONG: { health: 2, color: '#c0392b' },
    SPECIAL: { health: 3, color: '#f39c12' },
    EXPLOSIVE: { health: 1, color: '#ff6b35', explosive: true },
    UNBREAKABLE: { health: Infinity, color: '#34495e' }
};

const POWERUP_TYPES = {
    PADDLE_EXPAND: 'paddleExpand',
    SLOW_BALL: 'slowBall',
    MULTI_BALL: 'multiBall',
    LASER: 'laser',
    EXTRA_LIFE: 'extraLife',
    FIREBALL: 'fireball',
    SHIELD: 'shield',
    MAGNET: 'magnet'
};

// Preload image assets
const ASSETS = {
    bgImg: null,
    bgLoaded: false,
    paddleImg: null,
    paddleLoaded: false,
    ballImg: null,
    ballLoaded: false
};

(function preloadAssets() {
    const bg = new Image();
    bg.onload = () => { ASSETS.bgImg = bg; ASSETS.bgLoaded = true; };
    bg.onerror = () => { ASSETS.bgLoaded = false; };
    bg.src = 'assets/bg-opt.jpg';

    const paddle = new Image();
    paddle.onload = () => { ASSETS.paddleImg = paddle; ASSETS.paddleLoaded = true; };
    paddle.onerror = () => { ASSETS.paddleLoaded = false; };
    paddle.src = 'assets/paddle-opt.png';

    const ball = new Image();
    ball.onload = () => { ASSETS.ballImg = ball; ASSETS.ballLoaded = true; };
    ball.onerror = () => { ASSETS.ballLoaded = false; };
    ball.src = 'assets/ball-opt.png';
})();

// Confetti celebration effect
function spawnConfetti(count = 50) {
    const colors = ['#ff6b6b','#feca57','#48dbfb','#ff9ff3','#54a0ff','#5f27cd','#2ecc71','#e74c3c'];
    for (let i = 0; i < count; i++) {
        const c = document.createElement('div');
        const size = 6 + Math.random() * 8;
        const shapes = ['50%', '0', '50% 0 50% 50%'];
        c.style.cssText = `position:fixed;top:-10px;left:${Math.random()*100}%;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${shapes[Math.floor(Math.random()*shapes.length)]};z-index:99999;pointer-events:none;animation:confettiFall ${1.5+Math.random()*2.5}s cubic-bezier(0.25,0.46,0.45,0.94) forwards;opacity:0.9`;
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 5000);
    }
    if (!document.getElementById('confetti-style')) {
        const s = document.createElement('style');
        s.id = 'confetti-style';
        s.textContent = '@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1}50%{opacity:0.9}100%{transform:translateY(100vh) rotate(1080deg) scale(0.3);opacity:0}}';
        document.head.appendChild(s);
    }
}

// Level complete celebration with banner
function showLevelBanner(stage) {
    let banner = document.getElementById('level-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'level-banner';
        document.body.appendChild(banner);
    }
    const stageLabel = window.i18n?.t('hud.stage') || 'STAGE';
    const clearLabel = window.i18n?.t('game.stageClear') || 'CLEAR!';
    banner.innerHTML = `<div class="lb-stage">${stageLabel} ${stage}</div><div class="lb-clear">${clearLabel}</div>`;
    banner.className = 'level-banner-show';
    setTimeout(() => { banner.className = 'level-banner-hide'; }, 2200);
    setTimeout(() => { banner.className = ''; banner.innerHTML = ''; }, 2800);
}

class BrickBreakerGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d', { antialias: true });
        this.state = GAME_STATES.MENU;
        this.score = 0;
        this.highScore = localStorage.getItem('bb_highscore') || 0;
        this.lives = GAME_CONFIG.MAX_LIVES;
        this.currentStage = 1;
        this.gameRunning = false;
        this.gamePaused = false;

        this.paddle = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - GAME_CONFIG.PADDLE_WIDTH / 2,
            y: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_MARGIN - GAME_CONFIG.PADDLE_HEIGHT,
            width: GAME_CONFIG.PADDLE_WIDTH,
            height: GAME_CONFIG.PADDLE_HEIGHT,
            speed: 0,
            maxSpeed: 8
        };

        this.balls = [];
        this.bricks = [];
        this.powerups = [];
        this.particles = [];
        this.laser = null;
        this.fireball = null;
        this.shield = null;
        this.magnet = null;

        // Combo system
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = null;
        this.floatingTexts = [];
        this.shakeAmount = 0;
        this.shakeFrames = 0;

        // Streak system (bricks broken without paddle touch)
        this.streak = 0;
        this.bestStreak = 0;
        this.streakFlash = 0;

        // Active power-up tracking for HUD indicators
        this.activePowerups = [];

        // Level celebration state
        this.levelCelebrating = false;

        this.stats = {
            totalScore: 0,
            gamesPlayed: 0,
            maxStage: 1,
            bricksDestroyed: 0,
            totalPlayTime: 0
        };

        // Leaderboard system
        this.leaderboard = new LeaderboardManager('brick-breaker', 10);

        this.setupCanvas();
        this.setupEventListeners();
        this.loadStats();
        this.showMenu();
        this.startGameLoop();
    }

    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;

        // Ensure canvas fills the game screen
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';
    }

    setupEventListeners() {
        // Menu buttons
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-resume-game')?.addEventListener('click', () => {
            const saved = this.loadGameState();
            if (saved) this.startGame(saved);
        });
        document.getElementById('btn-stats').addEventListener('click', () => this.showStats());
        document.getElementById('btn-stats-back').addEventListener('click', () => this.showMenu());

        // Game buttons
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-quit').addEventListener('click', () => {
            this.gameRunning = false;
            // Keep saved state so player can resume from menu
            this.showMenu();
        });

        // Gameover buttons
        document.getElementById('btn-retry').addEventListener('click', () => this.startGame());
        document.getElementById('btn-menu').addEventListener('click', () => this.showMenu());
        document.getElementById('btn-revive').addEventListener('click', () => this.reviveWithAd());
        document.getElementById('btn-share').addEventListener('click', () => this.shareScore());

        // Paddle control
        this.canvas.addEventListener('mousemove', (e) => this.handlePaddleMove(e));
        this.canvas.addEventListener('touchmove', (e) => this.handlePaddleMove(e), { passive: false });
        this.canvas.addEventListener('click', () => {
            if (!this.gameRunning && this.state === GAME_STATES.GAME) {
                this.gameRunning = true;
                this.hideTapHint();
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                if (this.state === GAME_STATES.GAME) this.togglePause();
                else if (this.state === GAME_STATES.GAMEOVER) this.startGame();
            }
            if (e.key === 'Enter' && this.state === GAME_STATES.GAMEOVER) this.startGame();
            if (e.key === 'ArrowLeft') this.paddle.speed = -this.paddle.maxSpeed;
            if (e.key === 'ArrowRight') this.paddle.speed = this.paddle.maxSpeed;
        });
        document.addEventListener('keyup', () => this.paddle.speed = 0);
    }

    handlePaddleMove(e) {
        if (this.state !== GAME_STATES.GAME) return;

        const rect = this.canvas.getBoundingClientRect();
        let clientX = e.clientX || (e.touches && e.touches[0].clientX);

        if (clientX) {
            const x = clientX - rect.left;
            const targetX = Math.max(0, Math.min(x - this.paddle.width / 2, GAME_CONFIG.CANVAS_WIDTH - this.paddle.width));
            this.paddle.x += (targetX - this.paddle.x) * 0.2; // Smooth movement
        }
    }

    startGame(resumeState) {
        this.state = GAME_STATES.GAME;
        this.gameRunning = false;
        this.gamePaused = false;
        this.balls = [];
        this.powerups = [];
        this.laser = null;
        this.fireball = null;
        this.shield = null;
        this.magnet = null;
        this.combo = 0;
        this.maxCombo = 0;
        this.floatingTexts = [];
        this.streak = 0;
        this.bestStreak = 0;
        this.streakFlash = 0;
        this.activePowerups = [];
        this.levelCelebrating = false;

        if (resumeState) {
            this.score = resumeState.score;
            this.lives = resumeState.lives;
            this.currentStage = resumeState.currentStage;
        } else {
            this.clearGameState();
            this.score = 0;
            this.lives = GAME_CONFIG.MAX_LIVES;
            this.currentStage = 1;
        }

        this.initializeBalls();
        this.generateBricks();
        this.showGameScreen();
        this.updateHUD();
    }

    initializeBalls() {
        const ball = {
            x: this.paddle.x + this.paddle.width / 2,
            y: this.paddle.y - GAME_CONFIG.BALL_RADIUS * 2,
            vx: 0,
            vy: 0,
            radius: GAME_CONFIG.BALL_RADIUS,
            speed: 4,
            onPaddle: true
        };
        this.balls = [ball];
    }

    generateBricks() {
        this.bricks = [];
        const stagePattern = this.getStageBrickPattern(this.currentStage);

        for (let row = 0; row < GAME_CONFIG.BRICK_ROWS; row++) {
            for (let col = 0; col < GAME_CONFIG.BRICK_COLS; col++) {
                const idx = row * GAME_CONFIG.BRICK_COLS + col;
                const typeKey = stagePattern[idx] || 'NORMAL';
                const typeData = BRICK_TYPES[typeKey];

                const brick = {
                    x: col * (GAME_CONFIG.BRICK_WIDTH + GAME_CONFIG.BRICK_PADDING) + 10,
                    y: row * (GAME_CONFIG.BRICK_HEIGHT + GAME_CONFIG.BRICK_PADDING) + 60,
                    width: GAME_CONFIG.BRICK_WIDTH,
                    height: GAME_CONFIG.BRICK_HEIGHT,
                    health: typeData.health,
                    type: typeKey,
                    color: typeData.color,
                    active: true
                };
                this.bricks.push(brick);
            }
        }
    }

    getStageBrickPattern(stage) {
        const patterns = {
            // Improved Early game (Stages 1-4: All NORMAL for solid foundation)
            1: Array(32).fill('NORMAL'),
            2: Array(32).fill('NORMAL'),
            3: Array(32).fill('NORMAL'),
            4: Array(32).fill('NORMAL'),
            // Mid game (Normal - gradual introduction of difficulty)
            5: [
                'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL',
                'NORMAL', 'STRONG', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'STRONG', 'NORMAL',
                'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL',
                'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL'
            ],
            6: [
                'NORMAL', 'STRONG', 'NORMAL', 'STRONG', 'NORMAL', 'STRONG', 'NORMAL', 'STRONG',
                'STRONG', 'NORMAL', 'STRONG', 'NORMAL', 'STRONG', 'NORMAL', 'STRONG', 'NORMAL',
                'NORMAL', 'STRONG', 'NORMAL', 'STRONG', 'NORMAL', 'STRONG', 'NORMAL', 'STRONG',
                'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL'
            ],
            7: Array(32).fill('STRONG'),
            // Hard game (Stages 8-10: Introduce SPECIAL and UNBREAKABLE)
            8: [
                'UNBREAKABLE', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'UNBREAKABLE',
                'NORMAL', 'SPECIAL', 'STRONG', 'STRONG', 'STRONG', 'STRONG', 'SPECIAL', 'NORMAL',
                'NORMAL', 'STRONG', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'STRONG', 'NORMAL',
                'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL'
            ],
            9: [
                'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL',
                'STRONG', 'STRONG', 'STRONG', 'STRONG', 'STRONG', 'STRONG', 'STRONG', 'STRONG',
                'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL',
                'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL'
            ],
            // Expert game (Extreme)
            10: [
                'UNBREAKABLE', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'UNBREAKABLE',
                'SPECIAL', 'STRONG', 'STRONG', 'STRONG', 'STRONG', 'STRONG', 'STRONG', 'SPECIAL',
                'SPECIAL', 'STRONG', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'STRONG', 'SPECIAL',
                'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'NORMAL'
            ],
            11: [
                'UNBREAKABLE', 'UNBREAKABLE', 'SPECIAL', 'EXPLOSIVE', 'EXPLOSIVE', 'SPECIAL', 'UNBREAKABLE', 'UNBREAKABLE',
                'SPECIAL', 'SPECIAL', 'STRONG', 'STRONG', 'STRONG', 'STRONG', 'SPECIAL', 'SPECIAL',
                'SPECIAL', 'STRONG', 'EXPLOSIVE', 'NORMAL', 'NORMAL', 'EXPLOSIVE', 'STRONG', 'SPECIAL',
                'UNBREAKABLE', 'UNBREAKABLE', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'UNBREAKABLE', 'UNBREAKABLE'
            ]
        };

        if (patterns[stage]) return patterns[stage];
        // Procedural stages 12-20
        return this.generateProceduralPattern(stage);
    }

    generateProceduralPattern(stage) {
        const types = ['NORMAL', 'STRONG', 'SPECIAL', 'UNBREAKABLE', 'EXPLOSIVE'];
        const weights = {
            NORMAL:      Math.max(0.1, 0.5 - (stage - 12) * 0.04),
            STRONG:      0.25,
            SPECIAL:     Math.min(0.3, 0.1 + (stage - 12) * 0.025),
            UNBREAKABLE: Math.min(0.15, 0.05 + (stage - 12) * 0.01),
            EXPLOSIVE:   Math.min(0.12, 0.03 + (stage - 12) * 0.01)
        };
        const pattern = [];
        for (let i = 0; i < 32; i++) {
            let r = Math.random();
            let chosen = 'NORMAL';
            for (const t of types) {
                r -= weights[t];
                if (r <= 0) { chosen = t; break; }
            }
            pattern.push(chosen);
        }
        return pattern;
    }

    update() {
        if (!this.gameRunning || this.gamePaused) return;

        // Update paddle position
        this.paddle.x = Math.max(0, Math.min(this.paddle.x + this.paddle.speed, GAME_CONFIG.CANVAS_WIDTH - this.paddle.width));

        // Update balls
        this.balls = this.balls.filter(ball => {
            if (ball.onPaddle && this.gameRunning) {
                ball.x = this.paddle.x + this.paddle.width / 2;
                ball.y = this.paddle.y - ball.radius * 2;

                // Launch ball on click/tap
                if (Math.random() < 0.01) { // Auto-launch after delay
                    ball.onPaddle = false;
                    ball.vx = (Math.random() - 0.5) * 2 * ball.speed;
                    ball.vy = -ball.speed;
                }
            } else {
                ball.x += ball.vx;
                ball.y += ball.vy;

                // Wall collisions
                if (ball.x - ball.radius < 0 || ball.x + ball.radius > GAME_CONFIG.CANVAS_WIDTH) {
                    ball.vx *= -1;
                    ball.x = Math.max(ball.radius, Math.min(GAME_CONFIG.CANVAS_WIDTH - ball.radius, ball.x));
                    if (window.sfx) window.sfx.playWallSound();
                }
                if (ball.y - ball.radius < 0) {
                    ball.vy *= -1;
                    if (window.sfx) window.sfx.playWallSound();
                }

                // Bottom boundary (lose life or shield bounce)
                if (ball.y - ball.radius > GAME_CONFIG.CANVAS_HEIGHT) {
                    if (this.shield && this.shield.active && this.shield.hits > 0) {
                        ball.vy = -Math.abs(ball.vy);
                        ball.y = GAME_CONFIG.CANVAS_HEIGHT - ball.radius;
                        this.shield.hits--;
                        if (this.shield.hits <= 0) this.shield.active = false;
                        if (window.sfx) window.sfx.playWallSound();
                        return true;
                    }
                    return false; // Remove ball
                }

                // Paddle collision
                this.checkPaddleCollision(ball);

                // Brick collision
                this.checkBrickCollision(ball);

                // Powerup collision
                this.checkPowerupCollision(ball);
            }
            return true;
        });

        // Update powerups
        this.powerups = this.powerups.filter(powerup => {
            powerup.y += 2;
            return powerup.y < GAME_CONFIG.CANVAS_HEIGHT;
        });

        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.15; // Gravity
            particle.life--;
            return particle.life > 0;
        });

        // Check game over
        if (this.balls.length === 0) {
            this.lives--;
            if (this.lives <= 0) {
                this.endGame();
            } else {
                this.saveGameState();
                this.initializeBalls();
                this.gameRunning = false;
                this.showTapHint();
            }
        }

        // Check stage complete
        if (!this.levelCelebrating && this.bricks.every(b => !b.active)) {
            this.nextStage();
        }

        this.updateHUD();
    }

    checkPaddleCollision(ball) {
        const paddle = this.paddle;
        if (ball.y + ball.radius > paddle.y &&
            ball.y - ball.radius < paddle.y + paddle.height &&
            ball.x > paddle.x &&
            ball.x < paddle.x + paddle.width) {

            // Magnet: stick ball to paddle
            if (this.magnet && this.magnet.active && !ball.onPaddle) {
                ball.onPaddle = true;
                ball.magnetStuck = true;
                ball.y = paddle.y - ball.radius;
                ball.vx = 0;
                ball.vy = 0;
                if (window.sfx) window.sfx.playPaddleSound();
                return;
            }

            ball.vy = -Math.abs(ball.vy);
            const hitPos = (ball.x - paddle.x) / paddle.width - 0.5;
            ball.vx += hitPos * 3;

            // Limit speed
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed > ball.speed * 1.5) {
                ball.vx = (ball.vx / speed) * (ball.speed * 1.5);
                ball.vy = (ball.vy / speed) * (ball.speed * 1.5);
            }

            if (window.sfx) window.sfx.playPaddleSound();

            // Reset combo on paddle hit
            if (this.combo >= 3) {
                this.addFloatingText(`${this.combo}x COMBO!`, ball.x, this.paddle.y - 30, '#f39c12');
            }
            this.combo = 0;

            // End streak on paddle touch
            if (this.streak >= 3) {
                const streakLabel = window.i18n?.t('game.streak') || 'STREAK';
                this.addFloatingText(`${this.streak} ${streakLabel}!`, ball.x, this.paddle.y - 50, '#48dbfb');
            }
            if (this.streak > this.bestStreak) this.bestStreak = this.streak;
            this.streak = 0;
        }
    }

    checkBrickCollision(ball) {
        for (let brick of this.bricks) {
            if (!brick.active) continue;

            if (ball.x > brick.x &&
                ball.x < brick.x + brick.width &&
                ball.y > brick.y &&
                ball.y < brick.y + brick.height) {

                // Determine collision direction
                const overlapLeft = (ball.x + ball.radius) - brick.x;
                const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
                const overlapTop = (ball.y + ball.radius) - brick.y;
                const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);

                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                // Fireball passes through without bouncing
                const isFireball = this.fireball && this.fireball.active;
                if (!isFireball) {
                    if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                        ball.vx *= -1;
                    } else {
                        ball.vy *= -1;
                    }
                }

                // Damage brick (fireball deals 2x damage)
                const originalHealth = brick.health;
                brick.health -= isFireball ? 2 : 1;
                if (brick.health <= 0) {
                    brick.active = false;
                    this.combo++;
                    this.streak++;
                    this.streakFlash = 30;
                    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
                    const comboMultiplier = Math.min(this.combo, 10);
                    const streakBonus = this.streak >= 5 ? Math.floor(this.streak / 5) : 0;
                    const points = 10 * originalHealth * (comboMultiplier + streakBonus);
                    this.score += points;
                    this.stats.bricksDestroyed++;

                    // Floating score text
                    const label = this.combo >= 2 ? `+${points} (${this.combo}x)` : `+${points}`;
                    this.addFloatingText(label, brick.x + brick.width / 2, brick.y, this.combo >= 5 ? '#f39c12' : '#fff');

                    // Haptic feedback for brick destruction and combos
                    if (this.combo >= 3) {
                        if (typeof Haptic !== 'undefined') Haptic.medium();
                    } else {
                        if (typeof Haptic !== 'undefined') Haptic.light();
                    }

                    // Screen shake on high combos
                    if (this.combo >= 5) this.triggerShake(this.combo >= 10 ? 5 : 3);

                    // Create particles
                    this.createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);

                    // Explosive brick: destroy adjacent bricks
                    if (BRICK_TYPES[brick.type] && BRICK_TYPES[brick.type].explosive) {
                        this.explodeBrick(brick);
                    }

                    // Drop powerup
                    if (Math.random() < 0.15) {
                        this.dropPowerup(brick.x + brick.width / 2, brick.y + brick.height / 2);
                    }
                }

                if (window.sfx) window.sfx.playBrickSound(brick.type.toLowerCase());

                break;
            }
        }
    }

    explodeBrick(brick) {
        const cx = brick.x + brick.width / 2;
        const cy = brick.y + brick.height / 2;
        const radius = 70;
        this.triggerShake(6);
        if (typeof Haptic !== 'undefined') Haptic.heavy();
        // Orange explosion particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02,
                color: '#ff6b35',
                radius: 3 + Math.random() * 3
            });
        }
        // Destroy adjacent bricks within radius
        for (const b of this.bricks) {
            if (!b.active || b === brick || b.health === Infinity) continue;
            const dx = (b.x + b.width / 2) - cx;
            const dy = (b.y + b.height / 2) - cy;
            if (dx * dx + dy * dy < radius * radius) {
                b.health = 0;
                b.active = false;
                this.combo++;
                this.score += 10;
                this.stats.bricksDestroyed++;
                this.createParticles(b.x + b.width / 2, b.y + b.height / 2, b.color);
                this.addFloatingText('BOOM', b.x + b.width / 2, b.y, '#ff6b35');
            }
        }
    }

    dropPowerup(x, y) {
        const types = Object.values(POWERUP_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];

        this.powerups.push({
            x, y,
            type,
            width: 20,
            height: 10,
            speed: 2
        });
    }

    checkPowerupCollision(ball) {
        this.powerups = this.powerups.filter(powerup => {
            if (ball.x > powerup.x &&
                ball.x < powerup.x + powerup.width &&
                ball.y > powerup.y &&
                ball.y < powerup.y + powerup.height) {

                this.activatePowerup(powerup.type);
                if (window.sfx) window.sfx.playPowerupSound();
                return false; // Remove powerup
            }
            return true;
        });
    }

    activatePowerup(type) {
        const powerupNames = {
            [POWERUP_TYPES.PADDLE_EXPAND]: window.i18n?.t('powerups.paddleExpand') || 'Paddle+',
            [POWERUP_TYPES.SLOW_BALL]: window.i18n?.t('powerups.slowBall') || 'Slow',
            [POWERUP_TYPES.MULTI_BALL]: window.i18n?.t('powerups.multiBall') || 'Multi',
            [POWERUP_TYPES.LASER]: window.i18n?.t('powerups.laser') || 'Laser',
            [POWERUP_TYPES.EXTRA_LIFE]: window.i18n?.t('powerups.extraLife') || '+Life',
            [POWERUP_TYPES.FIREBALL]: window.i18n?.t('powerups.fireball') || 'Fire',
            [POWERUP_TYPES.SHIELD]: window.i18n?.t('powerups.shield') || 'Shield',
            [POWERUP_TYPES.MAGNET]: window.i18n?.t('powerups.magnet') || 'Magnet'
        };
        const powerupIcons = {
            [POWERUP_TYPES.PADDLE_EXPAND]: '\u2194',
            [POWERUP_TYPES.SLOW_BALL]: '\u23F3',
            [POWERUP_TYPES.MULTI_BALL]: '\u2726',
            [POWERUP_TYPES.LASER]: '\u26A1',
            [POWERUP_TYPES.EXTRA_LIFE]: '\u2764',
            [POWERUP_TYPES.FIREBALL]: '\u{1F525}',
            [POWERUP_TYPES.SHIELD]: '\u{1F6E1}',
            [POWERUP_TYPES.MAGNET]: '\u{1F9F2}'
        };
        const powerupColors = {
            [POWERUP_TYPES.PADDLE_EXPAND]: '#3498db',
            [POWERUP_TYPES.SLOW_BALL]: '#9b59b6',
            [POWERUP_TYPES.MULTI_BALL]: '#e91e63',
            [POWERUP_TYPES.LASER]: '#2ecc71',
            [POWERUP_TYPES.EXTRA_LIFE]: '#e74c3c',
            [POWERUP_TYPES.FIREBALL]: '#ff6b00',
            [POWERUP_TYPES.SHIELD]: '#00c8ff',
            [POWERUP_TYPES.MAGNET]: '#f1c40f'
        };

        let duration = 0;

        switch(type) {
            case POWERUP_TYPES.PADDLE_EXPAND:
                this.paddle.width = Math.min(this.paddle.width + 20, 150);
                duration = 10000;
                setTimeout(() => this.paddle.width = GAME_CONFIG.PADDLE_WIDTH, duration);
                break;
            case POWERUP_TYPES.SLOW_BALL:
                this.balls.forEach(b => b.speed *= 0.8);
                duration = 8000;
                setTimeout(() => this.balls.forEach(b => b.speed /= 0.8), duration);
                break;
            case POWERUP_TYPES.MULTI_BALL:
                if (this.balls.length < 5) {
                    const newBall = {...this.balls[0]};
                    newBall.vx = -newBall.vx;
                    this.balls.push(newBall);
                }
                break;
            case POWERUP_TYPES.LASER:
                this.laser = { active: true, time: 300 };
                duration = 5000;
                break;
            case POWERUP_TYPES.EXTRA_LIFE:
                this.lives = Math.min(this.lives + 1, 5);
                break;
            case POWERUP_TYPES.FIREBALL:
                this.fireball = { active: true, time: 300 };
                duration = 5000;
                break;
            case POWERUP_TYPES.SHIELD:
                this.shield = { active: true, hits: 3 };
                duration = -1; // hit-based, not time-based
                break;
            case POWERUP_TYPES.MAGNET:
                this.magnet = { active: true, time: 400 };
                duration = 6700;
                break;
        }

        // Track active powerup for HUD indicator
        if (duration !== 0) {
            const entry = {
                type,
                name: powerupNames[type] || type,
                icon: powerupIcons[type] || '?',
                color: powerupColors[type] || '#fff',
                startTime: Date.now(),
                duration: duration > 0 ? duration : Infinity
            };
            // Remove existing of same type
            this.activePowerups = this.activePowerups.filter(p => p.type !== type);
            this.activePowerups.push(entry);
            if (duration > 0) {
                setTimeout(() => {
                    this.activePowerups = this.activePowerups.filter(p => p.type !== type);
                }, duration);
            }
        }

        // Flash powerup name
        this.addFloatingText(`${powerupIcons[type] || ''} ${powerupNames[type] || type}`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 40, powerupColors[type] || '#fff');

        this.score += 50;
    }

    nextStage() {
        if (this.currentStage < GAME_CONFIG.MAX_STAGES) {
            const clearedStage = this.currentStage;
            this.currentStage++;
            if (window.sfx) window.sfx.playSuccessSound();

            // Enhanced level celebration
            this.levelCelebrating = true;
            spawnConfetti(80);
            showLevelBanner(clearedStage);
            if (typeof Haptic !== 'undefined') Haptic.heavy();

            // Stage clear bonus
            const stageBonus = clearedStage * 100;
            this.score += stageBonus;
            this.addFloatingText(`+${stageBonus} BONUS!`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 60, '#2ecc71');

            setTimeout(() => {
                this.levelCelebrating = false;
                this.generateBricks();
                this.balls.forEach(b => b.onPaddle = true);
                this.gameRunning = false;
                this.activePowerups = [];
                this.streak = 0;
                this.saveGameState();
                this.showTapHint();
            }, 2000);
        } else {
            this.clearGameState();
            this.endGame();
        }
    }

    showNewBest() {
        let el = document.getElementById('new-best-flash');
        if (!el) {
            el = document.createElement('div');
            el.id = 'new-best-flash';
            el.style.cssText = 'position:fixed;top:20%;left:50%;transform:translate(-50%,-50%) scale(0);font-size:32px;font-weight:800;color:#fbbf24;text-shadow:0 0 30px rgba(251,191,36,0.6);pointer-events:none;z-index:200;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.4s;opacity:0;white-space:nowrap;';
            document.body.appendChild(el);
        }
        el.textContent = window.i18n?.t('hud.newBest') || '\u{1F3C6} NEW BEST!';
        el.style.transform = 'translate(-50%,-50%) scale(1.2)';
        el.style.opacity = '1';
        setTimeout(() => {
            el.style.transform = 'translate(-50%,-50%) scale(0.8)';
            el.style.opacity = '0';
        }, 1200);
    }

    endGame() {
        this.gameRunning = false;
        this.state = GAME_STATES.GAMEOVER;
        this.clearGameState();

        // Add score to leaderboard
        const leaderboardResult = this.leaderboard.addScore(this.score, {
            stage: this.currentStage,
            bricksDestroyed: this.stats.bricksDestroyed
        });

        const isNewRecord = leaderboardResult.isNewRecord;
        if (isNewRecord) {
            this.highScore = this.score;
            localStorage.setItem('bb_highscore', this.highScore);
            document.getElementById('go-new-record').classList.remove('hidden');
            this.showNewBest();
            spawnConfetti();
        } else {
            document.getElementById('go-new-record').classList.add('hidden');
        }

        this.stats.totalScore += this.score;
        this.stats.gamesPlayed++;
        this.stats.maxStage = Math.max(this.stats.maxStage, this.currentStage);
        this.saveStats();

        document.getElementById('go-score').textContent = this.score;
        document.getElementById('go-best').textContent = this.highScore;
        document.getElementById('go-stage').querySelector('.stage-value').textContent = this.currentStage;

        // Show best streak in gameover
        const streakEl = document.getElementById('go-streak');
        if (streakEl) {
            streakEl.querySelector('.streak-value').textContent = this.bestStreak;
            if (this.bestStreak >= 3) {
                streakEl.classList.remove('hidden');
            } else {
                streakEl.classList.add('hidden');
            }
        }

        // Display leaderboard
        this.displayLeaderboard(leaderboardResult);

        if (typeof DailyStreak !== 'undefined') DailyStreak.report(this.score);
        if (typeof GameAchievements !== 'undefined') GameAchievements.report({
            bestScore: this.highScore,
            totalGames: this.stats.gamesPlayed,
            bestStage: this.stats.maxStage
        });

        const showResult = () => {
            this.showGameoverScreen();
            if (window.sfx) window.sfx.playGameOverSound();
            if (typeof Haptic !== 'undefined') Haptic.heavy();
        };

        if (typeof GameAds !== 'undefined') {
            GameAds.showInterstitial({ onComplete: () => showResult() });
        } else {
            showResult();
        }
    }

    reviveWithAd() {
        const doRevive = () => {
            this.lives++;
            this.initializeBalls();
            this.gameRunning = false;
            this.showGameScreen();
        };

        if (typeof GameAds !== 'undefined') {
            GameAds.showRewarded({
                onReward: () => doRevive(),
                onSkip: () => {}
            });
        } else {
            doRevive(); // fallback
        }
    }

    shareScore() {
        const shareTemplate = window.i18n?.t('share_msg.text') || '🧱 Brick Breaker: {score} pts! Stage: {stage}\n\nTry it: https://dopabrain.com/brick-breaker/';
        const text = shareTemplate.replace('{score}', this.score).replace('{stage}', this.currentStage);

        if (navigator.share) {
            navigator.share({
                title: 'Brick Breaker',
                text: text,
                url: 'https://dopabrain.com/brick-breaker/'
            }).catch(() => {});
        } else {
            // Fallback
            alert(text);
        }
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                color: color,
                life: 20
            });
        }
    }

    render() {
        this.ctx.save();

        // Screen shake
        if (this.shakeFrames > 0) {
            const sx = (Math.random() - 0.5) * this.shakeAmount;
            const sy = (Math.random() - 0.5) * this.shakeAmount;
            this.ctx.translate(sx, sy);
            this.shakeFrames--;
        }

        // Clear canvas with background image or solid fallback
        if (ASSETS.bgLoaded && ASSETS.bgImg) {
            this.ctx.drawImage(ASSETS.bgImg, 0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
            // Semi-transparent overlay to keep game elements visible
            this.ctx.fillStyle = 'rgba(15, 15, 35, 0.55)';
            this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        } else {
            this.ctx.fillStyle = 'rgba(15, 15, 35, 0.95)';
            this.ctx.fillRect(-5, -5, GAME_CONFIG.CANVAS_WIDTH + 10, GAME_CONFIG.CANVAS_HEIGHT + 10);
        }

        // Grid background
        this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.05)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < GAME_CONFIG.CANVAS_WIDTH; i += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, GAME_CONFIG.CANVAS_HEIGHT);
            this.ctx.stroke();
        }

        // Draw paddle
        this.drawPaddle();

        // Draw balls
        this.balls.forEach(ball => this.drawBall(ball));

        // Draw bricks
        this.bricks.forEach(brick => this.drawBrick(brick));

        // Draw powerups
        this.powerups.forEach(powerup => this.drawPowerup(powerup));

        // Draw particles
        this.particles.forEach(particle => this.drawParticle(particle));

        // Draw laser effect
        if (this.laser && this.laser.active) {
            this.drawLaser();
            this.laser.time--;
            if (this.laser.time <= 0) this.laser.active = false;
        }

        // Fireball timer & visual
        if (this.fireball && this.fireball.active) {
            this.fireball.time--;
            if (this.fireball.time <= 0) this.fireball.active = false;
            // Draw fire trail on balls
            this.balls.forEach(b => {
                if (b.onPaddle) return;
                const grd = this.ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.5);
                grd.addColorStop(0, 'rgba(255,165,0,0.6)');
                grd.addColorStop(0.5, 'rgba(255,69,0,0.3)');
                grd.addColorStop(1, 'rgba(255,0,0,0)');
                this.ctx.fillStyle = grd;
                this.ctx.beginPath();
                this.ctx.arc(b.x, b.y, b.radius * 2.5, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }

        // Shield visual
        if (this.shield && this.shield.active) {
            const sy = GAME_CONFIG.CANVAS_HEIGHT - 3;
            const alpha = 0.3 + Math.sin(Date.now() / 200) * 0.15;
            this.ctx.strokeStyle = `rgba(0,200,255,${alpha})`;
            this.ctx.lineWidth = 3;
            this.ctx.shadowColor = '#00c8ff';
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.moveTo(0, sy);
            this.ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, sy);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            // Shield hits indicator
            this.ctx.fillStyle = '#00c8ff';
            this.ctx.font = 'bold 10px sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`\u{1F6E1} ${this.shield.hits}`, GAME_CONFIG.CANVAS_WIDTH - 8, sy - 6);
        }

        // Magnet timer
        if (this.magnet && this.magnet.active) {
            this.magnet.time--;
            if (this.magnet.time <= 0) this.magnet.active = false;
        }

        // Draw floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            const alpha = ft.life / 40;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = ft.color;
            this.ctx.font = 'bold 14px -apple-system, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ft.text, ft.x, ft.y);
            ft.y -= 1;
            ft.life--;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
        this.ctx.globalAlpha = 1;

        // Draw combo counter
        if (this.combo >= 2) {
            this.ctx.fillStyle = this.combo >= 5 ? '#f39c12' : '#fff';
            this.ctx.font = `bold ${Math.min(24 + this.combo, 40)}px -apple-system, sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.globalAlpha = 0.8;
            this.ctx.fillText(`${this.combo}x ${window.i18n?.t('game.combo') || 'COMBO'}`, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);
            this.ctx.globalAlpha = 1;
        }

        // Draw streak counter (top-right of canvas)
        if (this.streak >= 2) {
            const streakLabel = window.i18n?.t('game.streak') || 'STREAK';
            const alpha = this.streakFlash > 0 ? 1 : 0.7;
            this.ctx.globalAlpha = alpha;
            this.ctx.textAlign = 'right';

            // Streak background pill
            const streakText = `${this.streak} ${streakLabel}`;
            this.ctx.font = 'bold 13px -apple-system, sans-serif';
            const tw = this.ctx.measureText(streakText).width;
            const px = GAME_CONFIG.CANVAS_WIDTH - 10;
            const py = 18;
            this.ctx.fillStyle = 'rgba(72, 219, 251, 0.15)';
            this.ctx.beginPath();
            this.ctx.roundRect(px - tw - 14, py - 12, tw + 20, 22, 11);
            this.ctx.fill();

            // Streak text
            this.ctx.fillStyle = this.streak >= 10 ? '#feca57' : '#48dbfb';
            this.ctx.fillText(streakText, px, py + 2);
            this.ctx.globalAlpha = 1;
        }
        if (this.streakFlash > 0) this.streakFlash--;

        // Draw multiplier display (left side under bricks)
        const currentMultiplier = Math.min(this.combo, 10) + (this.streak >= 5 ? Math.floor(this.streak / 5) : 0);
        if (currentMultiplier >= 2) {
            const multLabel = window.i18n?.t('game.multiplier') || 'MULTIPLIER';
            this.ctx.textAlign = 'left';
            this.ctx.font = 'bold 12px -apple-system, sans-serif';
            const my = GAME_CONFIG.CANVAS_HEIGHT - 50;
            // Background pill
            this.ctx.fillStyle = 'rgba(243, 156, 18, 0.15)';
            this.ctx.beginPath();
            this.ctx.roundRect(6, my - 10, 90, 22, 11);
            this.ctx.fill();
            // Text
            this.ctx.fillStyle = currentMultiplier >= 5 ? '#feca57' : '#f39c12';
            this.ctx.fillText(`x${currentMultiplier} ${multLabel}`, 14, my + 4);
        }

        // Draw active power-up indicators (bottom-right HUD)
        if (this.activePowerups.length > 0) {
            const now = Date.now();
            let iy = GAME_CONFIG.CANVAS_HEIGHT - 60;
            this.ctx.textAlign = 'right';

            // Remove expired shield if inactive
            this.activePowerups = this.activePowerups.filter(p => {
                if (p.type === POWERUP_TYPES.SHIELD && this.shield && !this.shield.active) return false;
                return true;
            });

            for (const pu of this.activePowerups) {
                const elapsed = now - pu.startTime;
                const remaining = pu.duration === Infinity ? 1 : Math.max(0, 1 - elapsed / pu.duration);

                // Background pill
                this.ctx.fillStyle = `rgba(0,0,0,0.4)`;
                this.ctx.beginPath();
                this.ctx.roundRect(GAME_CONFIG.CANVAS_WIDTH - 100, iy - 10, 94, 20, 10);
                this.ctx.fill();

                // Timer bar
                if (pu.duration !== Infinity) {
                    this.ctx.fillStyle = pu.color;
                    this.ctx.globalAlpha = 0.5;
                    this.ctx.beginPath();
                    this.ctx.roundRect(GAME_CONFIG.CANVAS_WIDTH - 100, iy - 10, 94 * remaining, 20, 10);
                    this.ctx.fill();
                    this.ctx.globalAlpha = 1;
                }

                // Icon + name
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 11px -apple-system, sans-serif';
                const label = pu.type === POWERUP_TYPES.SHIELD && this.shield
                    ? `${pu.icon} ${this.shield.hits}`
                    : `${pu.icon} ${pu.name}`;
                this.ctx.fillText(label, GAME_CONFIG.CANVAS_WIDTH - 10, iy + 3);

                iy -= 24;
            }
        }

        this.ctx.restore();
    }

    drawPaddle() {
        const paddle = this.paddle;

        if (ASSETS.paddleLoaded && ASSETS.paddleImg) {
            // Draw paddle sprite scaled to current paddle dimensions
            this.ctx.shadowColor = 'rgba(0, 255, 255, 0.6)';
            this.ctx.shadowBlur = 12;
            this.ctx.drawImage(ASSETS.paddleImg, paddle.x, paddle.y, paddle.width, paddle.height);
            this.ctx.shadowColor = 'transparent';
        } else {
            // Fallback: solid paddle
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.9)';
            this.ctx.shadowColor = 'rgba(231, 76, 60, 0.6)';
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
            this.ctx.shadowColor = 'transparent';

            // Glow
            this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
        }
    }

    drawBall(ball) {
        if (ASSETS.ballLoaded && ASSETS.ballImg) {
            // Draw ball sprite centered on ball position
            const size = ball.radius * 2;
            this.ctx.shadowColor = 'rgba(0, 255, 255, 0.6)';
            this.ctx.shadowBlur = 10;
            this.ctx.drawImage(ASSETS.ballImg, ball.x - ball.radius, ball.y - ball.radius, size, size);
            this.ctx.shadowColor = 'transparent';
        } else {
            // Fallback: filled circle
            this.ctx.fillStyle = '#f39c12';
            this.ctx.shadowColor = 'rgba(243, 156, 18, 0.6)';
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowColor = 'transparent';

            // Glow
            this.ctx.strokeStyle = 'rgba(243, 156, 18, 0.7)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }

    drawBrick(brick) {
        if (!brick.active) return;
        const ctx = this.ctx;
        const { x, y, width: w, height: h, color } = brick;
        const m = 1;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + 2, y + 2, w, h);

        // Main fill with glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = color;
        ctx.fillRect(x + m, y + m, w - m * 2, h - m * 2);
        ctx.shadowBlur = 0;

        // Top-to-bottom gradient (3D depth)
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, 'rgba(255,255,255,0.35)');
        grad.addColorStop(0.35, 'rgba(255,255,255,0.08)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = grad;
        ctx.fillRect(x + m, y + m, w - m * 2, h - m * 2);

        // Inner shine (radial highlight)
        const sr = Math.min(w, h) * 0.4;
        const shine = ctx.createRadialGradient(x + sr * 0.6, y + sr * 0.5, 0, x + sr, y + sr, sr);
        shine.addColorStop(0, 'rgba(255,255,255,0.3)');
        shine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = shine;
        ctx.fillRect(x + m, y + m, w - m * 2, h - m * 2);

        // Top edge highlight
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + m, y + m, w - m * 2, 2);

        // Left edge highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + m, y + m, 2, h - m * 2);

        // Bottom edge shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + m, y + h - 3, w - m * 2, 2);

        // Right edge shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x + w - 3, y + m, 2, h - m * 2);

        // Unbreakable: metallic cross pattern
        if (brick.type === 'UNBREAKABLE') {
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + w * 0.25, y + 2);
            ctx.lineTo(x + w * 0.25, y + h - 2);
            ctx.moveTo(x + w * 0.75, y + 2);
            ctx.lineTo(x + w * 0.75, y + h - 2);
            ctx.stroke();
        }

        // Health indicator for strong bricks (cracks)
        if (brick.health > 1 && brick.health !== Infinity) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(brick.health, x + w / 2, y + h / 2 + 3);
        }

        // Explosive brick indicator
        if (brick.type === 'EXPLOSIVE') {
            const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255,107,53,${pulse})`;
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('\u{1F4A5}', x + w / 2, y + h / 2 + 4);
        }
    }

    drawPowerup(powerup) {
        const colors = {
            [POWERUP_TYPES.PADDLE_EXPAND]: '#3498db',
            [POWERUP_TYPES.SLOW_BALL]: '#9b59b6',
            [POWERUP_TYPES.MULTI_BALL]: '#e91e63',
            [POWERUP_TYPES.LASER]: '#2ecc71',
            [POWERUP_TYPES.EXTRA_LIFE]: '#e74c3c',
            [POWERUP_TYPES.FIREBALL]: '#ff6b00',
            [POWERUP_TYPES.SHIELD]: '#00c8ff',
            [POWERUP_TYPES.MAGNET]: '#f1c40f'
        };
        const icons = {
            [POWERUP_TYPES.PADDLE_EXPAND]: '\u2194',
            [POWERUP_TYPES.SLOW_BALL]: '\u23F3',
            [POWERUP_TYPES.MULTI_BALL]: '\u2726',
            [POWERUP_TYPES.LASER]: '\u26A1',
            [POWERUP_TYPES.EXTRA_LIFE]: '\u2764',
            [POWERUP_TYPES.FIREBALL]: '\u{1F525}',
            [POWERUP_TYPES.SHIELD]: '\u{1F6E1}',
            [POWERUP_TYPES.MAGNET]: '\u{1F9F2}'
        };

        const ctx = this.ctx;
        const color = colors[powerup.type];
        const px = powerup.x - powerup.width / 2;
        const py = powerup.y;
        const pw = powerup.width;
        const ph = powerup.height;

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Gradient overlay
        const grad = ctx.createLinearGradient(px, py, px, py + ph);
        grad.addColorStop(0, 'rgba(255,255,255,0.4)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 4);
        ctx.fill();

        // Icon
        const icon = icons[powerup.type];
        if (icon) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, px + pw / 2, py + ph / 2);
            ctx.textBaseline = 'alphabetic';
        }
    }

    drawParticle(particle) {
        this.ctx.fillStyle = particle.color;
        this.ctx.globalAlpha = particle.life / 20;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }

    drawLaser() {
        if (!this.laser || !this.laser.active) return;

        // Draw vertical laser beams from paddle edges
        const x1 = this.paddle.x;
        const x2 = this.paddle.x + this.paddle.width;

        [x1, x2].forEach(x => {
            this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.shadowColor = 'rgba(46, 204, 113, 0.6)';
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.paddle.y);
            this.ctx.lineTo(x, 0);
            this.ctx.stroke();
            this.ctx.shadowColor = 'transparent';
        });

        // Destroy bricks touched by laser
        this.bricks = this.bricks.filter(brick => {
            if (!brick.active) return true;

            const hitByLaser = (this.laser.active && (
                (brick.x + brick.width / 2 > this.paddle.x && brick.x + brick.width / 2 < this.paddle.x + this.paddle.width) ||
                (Math.abs(brick.x - this.paddle.x) < 2 || Math.abs(brick.x + brick.width - this.paddle.x - this.paddle.width) < 2)
            ));

            if (hitByLaser && brick.y < this.paddle.y && brick.health !== Infinity) {
                brick.active = false;
                this.score += 15;
                this.stats.bricksDestroyed++;
                this.createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
                if (BRICK_TYPES[brick.type] && BRICK_TYPES[brick.type].explosive) {
                    this.explodeBrick(brick);
                }
                return false;
            }
            return true;
        });
    }

    addFloatingText(text, x, y, color = '#fff') {
        this.floatingTexts.push({ text, x, y, life: 40, color });
    }

    triggerShake(intensity) {
        this.shakeAmount = intensity;
        this.shakeFrames = 8;
    }

    updateHUD() {
        document.getElementById('hud-stage').textContent = `${window.i18n?.t('hud.stage') || 'STAGE'} ${this.currentStage}`;
        document.getElementById('hud-score').textContent = this.score;

        const hearts = '❤️'.repeat(Math.max(0, this.lives));
        document.getElementById('hud-lives').textContent = hearts;

        // Brick progress bar
        let progressEl = document.getElementById('brick-progress');
        if (!progressEl) {
            progressEl = document.createElement('div');
            progressEl.id = 'brick-progress';
            progressEl.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:3px;background:rgba(255,255,255,0.1);pointer-events:none;z-index:10;';
            const fill = document.createElement('div');
            fill.id = 'brick-progress-fill';
            fill.style.cssText = 'height:100%;background:linear-gradient(90deg,#10b981,#fbbf24);transition:width 0.3s ease;border-radius:0 2px 2px 0;';
            progressEl.appendChild(fill);
            const gameScreen = document.getElementById('game-screen') || document.querySelector('canvas')?.parentElement;
            if (gameScreen) { gameScreen.style.position = 'relative'; gameScreen.appendChild(progressEl); }
        }
        const fillEl = document.getElementById('brick-progress-fill');
        if (fillEl && this.bricks) {
            const total = this.bricks.length;
            const cleared = this.bricks.filter(b => !b.active).length;
            fillEl.style.width = total > 0 ? ((cleared / total) * 100) + '%' : '0%';
        }
    }

    togglePause() {
        if (this.state !== GAME_STATES.GAME) return;

        this.gamePaused = !this.gamePaused;

        if (this.gamePaused) {
            document.getElementById('pause-overlay').classList.remove('hidden');
        } else {
            document.getElementById('pause-overlay').classList.add('hidden');
        }
    }

    showMenu() {
        this.state = GAME_STATES.MENU;
        this.showScreen('menu-screen');
        document.getElementById('hs-value').textContent = this.highScore;

        // Show or hide resume button based on saved state
        const resumeBtn = document.getElementById('btn-resume-game');
        const savedState = this.loadGameState();
        if (resumeBtn) {
            if (savedState) {
                resumeBtn.classList.remove('hidden');
                resumeBtn.textContent = (window.i18n?.t('menu.resume') || 'Resume') + ' (' + (window.i18n?.t('hud.stage') || 'Stage') + ' ' + savedState.currentStage + ')';
            } else {
                resumeBtn.classList.add('hidden');
            }
        }
    }

    showGameScreen() {
        this.state = GAME_STATES.GAME;
        this.showScreen('game-screen');
        this.showTapHint();
    }

    showGameoverScreen() {
        this.state = GAME_STATES.GAMEOVER;
        this.showScreen('gameover-screen');
    }

    showStats() {
        this.state = GAME_STATES.STATS;
        this.showScreen('stats-screen');

        const statsHtml = `
            <div class="stat-item">
                <span class="stat-label">${window.i18n?.t('stats_detail.totalScore') || 'Total Score'}</span>
                <span class="stat-value">${this.stats.totalScore}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">${window.i18n?.t('stats_detail.gamesPlayed') || 'Games Played'}</span>
                <span class="stat-value">${this.stats.gamesPlayed}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">${window.i18n?.t('stats_detail.maxStage') || 'Max Stage'}</span>
                <span class="stat-value">${this.stats.maxStage}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">${window.i18n?.t('stats_detail.bricksDestroyed') || 'Bricks Destroyed'}</span>
                <span class="stat-value">${this.stats.bricksDestroyed}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">${window.i18n?.t('stats_detail.avgScore') || 'Avg Score'}</span>
                <span class="stat-value">${Math.round(this.stats.totalScore / Math.max(1, this.stats.gamesPlayed))}</span>
            </div>
        `;

        document.getElementById('stats-content').innerHTML = statsHtml;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    }

    showTapHint() {
        document.getElementById('tap-hint').classList.remove('hidden');
    }

    hideTapHint() {
        document.getElementById('tap-hint').classList.add('hidden');
    }

    showInterstitialAd(callback) {
        const overlay = document.getElementById('interstitial-overlay');
        const closeBtn = document.getElementById('btn-close-ad');
        let countdown = 5;

        overlay.classList.remove('hidden');
        closeBtn.classList.add('hidden');
        document.getElementById('ad-countdown').textContent = countdown;

        const interval = setInterval(() => {
            countdown--;
            document.getElementById('ad-countdown').textContent = countdown;

            if (countdown <= 0) {
                clearInterval(interval);
                closeBtn.classList.remove('hidden');
            }
        }, 1000);

        closeBtn.onclick = () => {
            clearInterval(interval);
            overlay.classList.add('hidden');
            callback();
        };
    }

    // --- Session persistence (between-level save/resume) ---

    saveGameState() {
        const state = {
            currentStage: this.currentStage,
            lives: this.lives,
            score: this.score
        };
        localStorage.setItem('brickBreaker_gameState', JSON.stringify(state));
    }

    loadGameState() {
        const saved = localStorage.getItem('brickBreaker_gameState');
        if (!saved) return null;
        try {
            return JSON.parse(saved);
        } catch (e) {
            return null;
        }
    }

    clearGameState() {
        localStorage.removeItem('brickBreaker_gameState');
    }

    saveStats() {
        localStorage.setItem('bb_stats', JSON.stringify(this.stats));
    }

    loadStats() {
        const saved = localStorage.getItem('bb_stats');
        if (saved) {
            this.stats = JSON.parse(saved);
        }
    }

    startGameLoop() {
        const gameLoop = () => {
            this.update();
            if (this.state === GAME_STATES.GAME) {
                this.render();
            }
            requestAnimationFrame(gameLoop);
        };
        requestAnimationFrame(gameLoop);
    }
}

// Add displayLeaderboard method to BrickBreakerGame
BrickBreakerGame.prototype.displayLeaderboard = function(leaderboardResult) {
    const gameoverScreen = document.getElementById('gameover-screen');
    let leaderboardContainer = gameoverScreen.querySelector('.leaderboard-section');
    if (!leaderboardContainer) {
        leaderboardContainer = document.createElement('div');
        leaderboardContainer.className = 'leaderboard-section';
        gameoverScreen.appendChild(leaderboardContainer);
    }

    const topScores = this.leaderboard.getTopScores(5);
    const currentScore = parseInt(document.getElementById('go-score').textContent);

    let html = '<div class="leaderboard-title">' + (window.i18n?.t('leaderboard.title') || '🏆 Top 5 Scores') + '</div>';
    html += '<div class="leaderboard-list">';

    topScores.forEach((entry, index) => {
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        const isCurrentScore = entry.score === currentScore && leaderboardResult.isNewRecord;
        const classes = isCurrentScore ? 'leaderboard-item highlight' : 'leaderboard-item';

        html += `
            <div class="${classes}">
                <span class="medal">${medals[index] || (index + 1) + '.'}</span>
                <span class="score-value">${entry.score}</span>
                <span class="score-date">${entry.date}</span>
            </div>
        `;
    });

    html += '</div>';
    html += '<button id="reset-leaderboard-btn" class="reset-btn">' + (window.i18n?.t('leaderboard.resetButton') || 'Reset Records') + '</button>';

    leaderboardContainer.innerHTML = html;

    const resetBtn = leaderboardContainer.querySelector('#reset-leaderboard-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm(window.i18n?.t('leaderboard.confirmReset') || 'Are you sure you want to reset all records?')) {
                this.leaderboard.resetScores();
                this.highScore = 0;
                localStorage.setItem('bb_highscore', '0');
                this.displayLeaderboard({ isNewRecord: false, rank: -1, notifications: [] });
                alert(window.i18n?.t('leaderboard.resetSuccess') || 'Records reset!');
            }
        });
    }

    leaderboardResult.notifications.forEach(notif => {
        this.showNotification(notif);
    });
};

BrickBreakerGame.prototype.showNotification = function(notification) {
    const notifEl = document.createElement('div');
    notifEl.className = `notification notification-${notification.type}`;
    notifEl.textContent = notification.message;
    notifEl.style.position = 'fixed';
    notifEl.style.top = '20px';
    notifEl.style.right = '20px';
    notifEl.style.padding = '12px 20px';
    notifEl.style.backgroundColor = notification.type === 'new-record' ? '#FFD700' : '#4CAF50';
    notifEl.style.color = '#000';
    notifEl.style.borderRadius = '8px';
    notifEl.style.fontSize = '14px';
    notifEl.style.fontWeight = 'bold';
    notifEl.style.zIndex = '9999';
    notifEl.style.animation = 'slideIn 0.3s ease-out';

    document.body.appendChild(notifEl);

    setTimeout(() => {
        notifEl.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notifEl.remove(), 300);
    }, 3000);
};

// Initialize game when DOM is loaded
// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    });
}

window.addEventListener('DOMContentLoaded', () => {
    // Hide loader
    const loader = document.getElementById('app-loader');
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 500);

    // Start game
    window.game = new BrickBreakerGame();
    if (typeof GameAds !== 'undefined') GameAds.init();
    if (typeof DailyStreak !== 'undefined') DailyStreak.init({ gameId: 'brick-breaker', bestScoreKey: 'bb_highscore', minTarget: 50 });
    if (typeof GameAchievements !== 'undefined') GameAchievements.init({
        gameId: 'brick-breaker',
        defs: [
            { id: 'score_1000', stat: 'bestScore', target: 1000, icon: '⭐', name: 'Brick Smasher' },
            { id: 'score_5000', stat: 'bestScore', target: 5000, icon: '🏆', name: 'Brick Master' },
            { id: 'score_10000', stat: 'bestScore', target: 10000, icon: '👑', name: 'Brick Legend' },
            { id: 'games_10', stat: 'totalGames', target: 10, icon: '🎮', name: 'Regular Player' },
            { id: 'stage_5', stat: 'bestStage', target: 5, icon: '🔥', name: 'Stage Warrior' },
            { id: 'stage_10', stat: 'bestStage', target: 10, icon: '💎', name: 'Stage Champion' }
        ]
    });
});
