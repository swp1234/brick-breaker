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
    UNBREAKABLE: { health: Infinity, color: '#34495e' }
};

const POWERUP_TYPES = {
    PADDLE_EXPAND: 'paddleExpand',
    SLOW_BALL: 'slowBall',
    MULTI_BALL: 'multiBall',
    LASER: 'laser',
    EXTRA_LIFE: 'extraLife'
};

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
        document.getElementById('btn-stats').addEventListener('click', () => this.showStats());
        document.getElementById('btn-stats-back').addEventListener('click', () => this.showMenu());

        // Game buttons
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-quit').addEventListener('click', () => {
            this.gameRunning = false;
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
            if (e.key === ' ') this.togglePause();
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

    startGame() {
        this.state = GAME_STATES.GAME;
        this.score = 0;
        this.lives = GAME_CONFIG.MAX_LIVES;
        this.currentStage = 1;
        this.gameRunning = false;
        this.gamePaused = false;
        this.balls = [];
        this.powerups = [];
        this.laser = null;

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
                'UNBREAKABLE', 'UNBREAKABLE', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'UNBREAKABLE', 'UNBREAKABLE',
                'SPECIAL', 'SPECIAL', 'STRONG', 'STRONG', 'STRONG', 'STRONG', 'SPECIAL', 'SPECIAL',
                'SPECIAL', 'STRONG', 'STRONG', 'NORMAL', 'NORMAL', 'STRONG', 'STRONG', 'SPECIAL',
                'UNBREAKABLE', 'UNBREAKABLE', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'SPECIAL', 'UNBREAKABLE', 'UNBREAKABLE'
            ]
        };

        return patterns[stage] || patterns[Math.min(11, stage)];
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

                // Bottom boundary (lose life)
                if (ball.y - ball.radius > GAME_CONFIG.CANVAS_HEIGHT) {
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
                this.initializeBalls();
                this.gameRunning = false;
                this.showTapHint();
            }
        }

        // Check stage complete
        if (this.bricks.every(b => !b.active)) {
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

                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                    ball.vx *= -1;
                } else {
                    ball.vy *= -1;
                }

                // Damage brick
                const originalHealth = brick.health;
                brick.health--;
                if (brick.health <= 0) {
                    brick.active = false;
                    this.score += 10 * originalHealth;
                    this.stats.bricksDestroyed++;

                    // Create particles
                    this.createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);

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
        switch(type) {
            case POWERUP_TYPES.PADDLE_EXPAND:
                this.paddle.width = Math.min(this.paddle.width + 20, 150);
                setTimeout(() => this.paddle.width = GAME_CONFIG.PADDLE_WIDTH, 10000);
                break;
            case POWERUP_TYPES.SLOW_BALL:
                this.balls.forEach(b => b.speed *= 0.8);
                setTimeout(() => this.balls.forEach(b => b.speed /= 0.8), 8000);
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
                break;
            case POWERUP_TYPES.EXTRA_LIFE:
                this.lives = Math.min(this.lives + 1, 5);
                break;
        }
        this.score += 50;
    }

    nextStage() {
        if (this.currentStage < GAME_CONFIG.MAX_STAGES) {
            this.currentStage++;
            if (window.sfx) window.sfx.playSuccessSound();
            this.generateBricks();
            this.balls.forEach(b => b.onPaddle = true);
            this.gameRunning = false;
            this.showTapHint();
        } else {
            this.endGame();
        }
    }

    endGame() {
        this.gameRunning = false;
        this.state = GAME_STATES.GAMEOVER;

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

        // Display leaderboard
        this.displayLeaderboard(leaderboardResult);

        this.showGameoverScreen();
        if (window.sfx) window.sfx.playGameOverSound();
    }

    reviveWithAd() {
        // Show interstitial ad
        this.showInterstitialAd(() => {
            this.lives++;
            this.initializeBalls();
            this.gameRunning = false;
            this.showGameScreen();
        });
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
        // Clear canvas
        this.ctx.fillStyle = 'rgba(15, 15, 35, 0.95)';
        this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

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
    }

    drawPaddle() {
        const paddle = this.paddle;

        // Main paddle
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

    drawBall(ball) {
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

    drawBrick(brick) {
        if (!brick.active) return;

        this.ctx.fillStyle = brick.color;
        this.ctx.shadowColor = `${brick.color}66`;
        this.ctx.shadowBlur = 8;
        this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        this.ctx.shadowColor = 'transparent';

        // Border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);

        // Health indicator for strong bricks
        if (brick.health > 1 && brick.health !== Infinity) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(brick.health, brick.x + brick.width / 2, brick.y + brick.height / 2 + 3);
        }
    }

    drawPowerup(powerup) {
        const colors = {
            [POWERUP_TYPES.PADDLE_EXPAND]: '#3498db',
            [POWERUP_TYPES.SLOW_BALL]: '#9b59b6',
            [POWERUP_TYPES.MULTI_BALL]: '#e91e63',
            [POWERUP_TYPES.LASER]: '#2ecc71',
            [POWERUP_TYPES.EXTRA_LIFE]: '#e74c3c'
        };

        const color = colors[powerup.type];
        this.ctx.fillStyle = color;
        this.ctx.shadowColor = `${color}88`;
        this.ctx.shadowBlur = 6;
        this.ctx.fillRect(powerup.x - powerup.width / 2, powerup.y, powerup.width, powerup.height);
        this.ctx.shadowColor = 'transparent';
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

            if (hitByLaser && brick.y < this.paddle.y) {
                brick.active = false;
                this.score += 15;
                this.stats.bricksDestroyed++;
                this.createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
                return false;
            }
            return true;
        });
    }

    updateHUD() {
        document.getElementById('hud-stage').textContent = `STAGE ${this.currentStage}`;
        document.getElementById('hud-score').textContent = this.score;

        const hearts = '❤️'.repeat(Math.max(0, this.lives));
        document.getElementById('hud-lives').textContent = hearts;
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

    let html = '<div class="leaderboard-title">🏆 Top 5 Scores</div>';
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
    html += '<button id="reset-leaderboard-btn" class="reset-btn">Reset Records</button>';

    leaderboardContainer.innerHTML = html;

    const resetBtn = leaderboardContainer.querySelector('#reset-leaderboard-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all records?')) {
                this.leaderboard.resetScores();
                this.highScore = 0;
                localStorage.setItem('bb_highscore', '0');
                this.displayLeaderboard({ isNewRecord: false, rank: -1, notifications: [] });
                alert('Records reset!');
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
window.addEventListener('DOMContentLoaded', () => {
    // Hide loader
    const loader = document.getElementById('app-loader');
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 500);

    // Start game
    window.game = new BrickBreakerGame();
});
