// تكوين اللعبة
const CONFIG = {
    GRAVITY: 0.6,
    JUMP_FORCE: -15,
    MOVE_SPEED: 6,
    CRAWL_SPEED: 3,
    MAX_HEALTH: 100,
    DAMAGE_AMOUNT: 25,
    HEAL_AMOUNT: 10,
    TOOL_COOLDOWN: 1000,
    HIDE_DURATION: 3000,
    SMOKE_DURATION: 5000
};

// حالة اللعبة
const gameState = {
    isPlaying: false,
    isPaused: false,
    level: 1,
    health: CONFIG.MAX_HEALTH,
    score: 0,
    tools: {
        smoke: 3,
        hack: 2,
        rope: 1
    },
    cooldowns: {
        smoke: 0,
        hack: 0,
        rope: 0,
        hide: 0
    },
    player: {
        x: 100,
        y: 100,
        width: 40,
        height: 60,
        velocityX: 0,
        velocityY: 0,
        isJumping: false,
        isCrawling: false,
        isHidden: false,
        direction: 'right',
        lastGroundY: 0
    },
    enemies: [],
    platforms: [],
    collectibles: [],
    cameras: [],
    activeEffects: []
};

// عناصر DOM
const elements = {
    screens: {
        main: document.getElementById('main-menu'),
        game: document.getElementById('game-screen'),
        instructions: document.getElementById('instructions-screen'),
        settings: document.getElementById('settings-screen'),
        result: document.getElementById('result-screen')
    },
    game: {
        area: document.getElementById('game-area'),
        player: document.getElementById('player'),
        platforms: document.getElementById('platforms'),
        enemies: document.getElementById('enemies'),
        collectibles: document.getElementById('collectibles')
    },
    hud: {
        level: document.getElementById('level-number'),
        health: document.getElementById('health-bar'),
        objective: document.getElementById('current-objective')
    },
    audio: {
        jump: document.getElementById('sound-jump'),
        hide: document.getElementById('sound-hide'),
        collect: document.getElementById('sound-collect'),
        hit: document.getElementById('sound-hit'),
        theme: document.getElementById('music-theme')
    }
};

// مدير الصوت
const AudioManager = {
    init() {
        this.volume = 0.8;
        this.musicVolume = 0.6;
        elements.audio.theme.volume = this.musicVolume;
    },
    
    play(soundName) {
        const sound = elements.audio[soundName];
        if (sound) {
            sound.volume = this.volume;
            sound.currentTime = 0;
            sound.play().catch(() => {});
        }
    },
    
    setVolume(volume) {
        this.volume = volume / 100;
        elements.audio.theme.volume = this.musicVolume * (volume / 100);
    },
    
    setMusicVolume(volume) {
        this.musicVolume = volume / 100;
        elements.audio.theme.volume = this.musicVolume * (this.volume);
    }
};

// مدير الشاشات
const ScreenManager = {
    show(screenName) {
        Object.values(elements.screens).forEach(screen => {
            screen.classList.add('hidden');
        });
        elements.screens[screenName].classList.remove('hidden');
    },
    
    showResult(won, stats) {
        const title = document.getElementById('result-title');
        const statsDiv = document.getElementById('result-stats');
        
        title.textContent = won ? 'مبروك! أكملت المرحلة' : 'حاول مرة أخرى';
        statsDiv.innerHTML = `
            <div>النقاط: ${stats.score}</div>
            <div>الوقت: ${stats.time}s</div>
            <div>الأدوات المستخدمة: ${stats.toolsUsed}</div>
        `;
        
        this.show('result');
    }
};

// مدير المستويات
const LevelManager = {
    async loadLevel(level) {
        const levelData = await this.getLevelData(level);
        this.clearLevel();
        this.createPlatforms(levelData.platforms);
        this.createEnemies(levelData.enemies);
        this.createCollectibles(levelData.collectibles);
        this.createCameras(levelData.cameras);
        this.setObjective(levelData.objective);
        this.resetPlayer(levelData.playerStart);
    },
    
    async getLevelData(level) {
        // في الإصدار النهائي، سيتم تحميل البيانات من ملف خارجي
        return {
            playerStart: { x: 100, y: 100 },
            objective: `المرحلة ${level}: تجنب الحراس والكاميرات`,
            platforms: [
                { x: 0, y: 500, width: 800, height: 40 },
                { x: 200, y: 300, width: 200, height: 20 },
                { x: 500, y: 200, width: 200, height: 20 }
            ],
            enemies: [
                { x: 300, y: 440, patrol: [200, 400] },
                { x: 600, y: 140, patrol: [500, 700] }
            ],
            collectibles: [
                { x: 250, y: 250, type: 'smoke' },
                { x: 550, y: 150, type: 'health' }
            ],
            cameras: [
                { x: 400, y: 100, angle: 45, range: 200 }
            ]
        };
    },
    
    clearLevel() {
        elements.game.platforms.innerHTML = '';
        elements.game.enemies.innerHTML = '';
        elements.game.collectibles.innerHTML = '';
        gameState.platforms = [];
        gameState.enemies = [];
        gameState.collectibles = [];
        gameState.cameras = [];
    },
    
    createPlatforms(platforms) {
        platforms.forEach(platform => {
            const element = document.createElement('div');
            element.className = 'platform';
            element.style.left = platform.x + 'px';
            element.style.top = platform.y + 'px';
            element.style.width = platform.width + 'px';
            element.style.height = platform.height + 'px';
            elements.game.platforms.appendChild(element);
            gameState.platforms.push({ ...platform, element });
        });
    },
    
    createEnemies(enemies) {
        enemies.forEach(enemy => {
            const element = document.createElement('div');
            element.className = 'enemy';
            element.style.left = enemy.x + 'px';
            element.style.top = enemy.y + 'px';
            elements.game.enemies.appendChild(element);
            gameState.enemies.push({
                ...enemy,
                element,
                direction: 1,
                state: 'patrol'
            });
        });
    },
    
    createCollectibles(collectibles) {
        collectibles.forEach(item => {
            const element = document.createElement('div');
            element.className = `collectible ${item.type}`;
            element.style.left = item.x + 'px';
            element.style.top = item.y + 'px';
            elements.game.collectibles.appendChild(element);
            gameState.collectibles.push({ ...item, element });
        });
    },
    
    createCameras(cameras) {
        cameras.forEach(camera => {
            const element = document.createElement('div');
            element.className = 'camera';
            element.style.left = camera.x + 'px';
            element.style.top = camera.y + 'px';
            element.style.transform = `rotate(${camera.angle}deg)`;
            elements.game.area.appendChild(element);
            
            const vision = document.createElement('div');
            vision.className = 'camera-vision';
            vision.style.width = camera.range + 'px';
            element.appendChild(vision);
            
            gameState.cameras.push({ ...camera, element, vision });
        });
    },
    
    setObjective(objective) {
        elements.hud.objective.textContent = objective;
    },
    
    resetPlayer(position) {
        gameState.player.x = position.x;
        gameState.player.y = position.y;
        gameState.player.velocityX = 0;
        gameState.player.velocityY = 0;
        gameState.player.isJumping = false;
        gameState.player.isCrawling = false;
        gameState.player.isHidden = false;
        updatePlayerPosition();
    }
};

// التحكم
const controls = {
    left: false,
    right: false,
    up: false,
    down: false,
    space: false
};

// معالجة المدخلات
function handleKeyDown(e) {
    switch(e.key) {
        case 'ArrowLeft':
            controls.left = true;
            moveLeft();
            break;
        case 'ArrowRight':
            controls.right = true;
            moveRight();
            break;
        case 'ArrowUp':
            controls.up = true;
            jump();
            break;
        case 'ArrowDown':
            controls.down = true;
            toggleCrawl();
            break;
        case ' ':
            controls.space = true;
            toggleHide();
            break;
        case '1':
            useTool('smoke');
            break;
        case '2':
            useTool('hack');
            break;
        case '3':
            useTool('rope');
            break;
    }
}

function handleKeyUp(e) {
    switch(e.key) {
        case 'ArrowLeft':
            controls.left = false;
            if (!controls.right) stopMoving();
            break;
        case 'ArrowRight':
            controls.right = false;
            if (!controls.left) stopMoving();
            break;
        case 'ArrowUp':
            controls.up = false;
            break;
        case 'ArrowDown':
            controls.down = false;
            if (gameState.player.isCrawling) toggleCrawl();
            break;
        case ' ':
            controls.space = false;
            break;
    }
}

// وظائف الحركة
function moveLeft() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    gameState.player.velocityX = gameState.player.isCrawling ? -CONFIG.CRAWL_SPEED : -CONFIG.MOVE_SPEED;
    gameState.player.direction = 'left';
    elements.game.player.style.transform = 'scaleX(-1)';
}

function moveRight() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    gameState.player.velocityX = gameState.player.isCrawling ? CONFIG.CRAWL_SPEED : CONFIG.MOVE_SPEED;
    gameState.player.direction = 'right';
    elements.game.player.style.transform = 'scaleX(1)';
}

function stopMoving() {
    gameState.player.velocityX = 0;
}

function jump() {
    if (!gameState.isPlaying || gameState.isPaused || 
        gameState.player.isJumping || gameState.player.isCrawling) return;
    
    gameState.player.velocityY = CONFIG.JUMP_FORCE;
    gameState.player.isJumping = true;
    gameState.player.lastGroundY = gameState.player.y;
    AudioManager.play('jump');
}

function toggleCrawl() {
    if (!gameState.isPlaying || gameState.isPaused || gameState.player.isJumping) return;
    
    gameState.player.isCrawling = !gameState.player.isCrawling;
    elements.game.player.classList.toggle('crawling');
    
    if (gameState.player.velocityX !== 0) {
        const direction = gameState.player.velocityX > 0 ? 1 : -1;
        gameState.player.velocityX = direction * (gameState.player.isCrawling ? CONFIG.CRAWL_SPEED : CONFIG.MOVE_SPEED);
    }
}

function toggleHide() {
    if (!gameState.isPlaying || gameState.isPaused || 
        gameState.cooldowns.hide > Date.now()) return;
    
    gameState.player.isHidden = !gameState.player.isHidden;
    elements.game.player.classList.toggle('hidden');
    
    if (gameState.player.isHidden) {
        gameState.cooldowns.hide = Date.now() + CONFIG.HIDE_DURATION;
        setTimeout(() => {
            gameState.player.isHidden = false;
            elements.game.player.classList.remove('hidden');
        }, CONFIG.HIDE_DURATION);
    }
    
    AudioManager.play('hide');
}

// استخدام الأدوات
function useTool(toolType) {
    if (!gameState.isPlaying || gameState.isPaused || 
        gameState.tools[toolType] <= 0 || 
        gameState.cooldowns[toolType] > Date.now()) return;
    
    gameState.tools[toolType]--;
    gameState.cooldowns[toolType] = Date.now() + CONFIG.TOOL_COOLDOWN;
    updateToolCount(toolType);
    
    switch(toolType) {
        case 'smoke':
            createSmokeEffect();
            break;
        case 'hack':
            hackNearbyCamera();
            break;
        case 'rope':
            useRope();
            break;
    }
}

function createSmokeEffect() {
    const smoke = document.createElement('div');
    smoke.className = 'smoke-effect';
    smoke.style.left = gameState.player.x + 'px';
    smoke.style.top = gameState.player.y + 'px';
    elements.game.area.appendChild(smoke);
    
    gameState.activeEffects.push({
        type: 'smoke',
        element: smoke,
        x: gameState.player.x,
        y: gameState.player.y,
        radius: 100,
        endTime: Date.now() + CONFIG.SMOKE_DURATION
    });
    
    setTimeout(() => {
        smoke.remove();
        gameState.activeEffects = gameState.activeEffects.filter(effect => effect.element !== smoke);
    }, CONFIG.SMOKE_DURATION);
}

function hackNearbyCamera() {
    const nearbyCamera = findNearbyCamera();
    if (nearbyCamera) {
        nearbyCamera.element.classList.add('hacked');
        nearbyCamera.isHacked = true;
        setTimeout(() => {
            nearbyCamera.element.classList.remove('hacked');
            nearbyCamera.isHacked = false;
        }, 5000);
    }
}

function useRope() {
    if (!gameState.player.isJumping) {
        const targetY = gameState.player.lastGroundY - 200;
        gameState.player.velocityY = CONFIG.JUMP_FORCE * 1.5;
        gameState.player.y = targetY;
        gameState.player.isJumping = true;
    }
}

// تحديث حالة اللعبة
function updateGameState() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    updatePlayerPosition();
    updateEnemies();
    updateCameras();
    checkCollisions();
    updateEffects();
    
    requestAnimationFrame(updateGameState);
}

function updatePlayerPosition() {
    // تطبيق الجاذبية
    gameState.player.velocityY += CONFIG.GRAVITY;
    
    // تحديث الموقع
    gameState.player.x += gameState.player.velocityX;
    gameState.player.y += gameState.player.velocityY;
    
    // تطبيق الموقع
    elements.game.player.style.left = gameState.player.x + 'px';
    elements.game.player.style.top = gameState.player.y + 'px';
    
    // التحقق من الحدود
    checkBoundaries();
}

function updateEnemies() {
    gameState.enemies.forEach(enemy => {
        if (enemy.state === 'patrol') {
            const [start, end] = enemy.patrol;
            enemy.x += enemy.direction * 2;
            
            if (enemy.x <= start) {
                enemy.direction = 1;
                enemy.element.style.transform = 'scaleX(1)';
            } else if (enemy.x >= end) {
                enemy.direction = -1;
                enemy.element.style.transform = 'scaleX(-1)';
            }
            
            enemy.element.style.left = enemy.x + 'px';
        }
    });
}

function updateCameras() {
    gameState.cameras.forEach(camera => {
        if (!camera.isHacked) {
            const angle = Math.sin(Date.now() / 1000) * 30 + camera.angle;
            camera.element.style.transform = `rotate(${angle}deg)`;
        }
    });
}

function checkCollisions() {
    // التصادم مع المنصات
    const onPlatform = gameState.platforms.some(platform => {
        if (checkPlatformCollision(platform)) {
            if (gameState.player.velocityY > 0) {
                gameState.player.y = platform.y - gameState.player.height;
                gameState.player.velocityY = 0;
                gameState.player.isJumping = false;
                gameState.player.lastGroundY = gameState.player.y;
                return true;
            }
        }
        return false;
    });
    
    if (!onPlatform && !gameState.player.isJumping) {
        gameState.player.isJumping = true;
    }
    
    // التصادم مع الأعداء
    if (!gameState.player.isHidden && !isInSmoke()) {
        gameState.enemies.forEach(enemy => {
            if (checkEnemyCollision(enemy)) {
                takeDamage();
            }
        });
    }
    
    // التصادم مع العناصر القابلة للجمع
    gameState.collectibles.forEach(item => {
        if (checkCollectibleCollision(item)) {
            collectItem(item);
        }
    });
    
    // التحقق من رؤية الكاميرات
    if (!gameState.player.isHidden && !isInSmoke()) {
        gameState.cameras.forEach(camera => {
            if (!camera.isHacked && isInCameraView(camera)) {
                takeDamage();
            }
        });
    }
}

function checkPlatformCollision(platform) {
    return (
        gameState.player.x < platform.x + platform.width &&
        gameState.player.x + gameState.player.width > platform.x &&
        gameState.player.y + gameState.player.height > platform.y &&
        gameState.player.y < platform.y + platform.height
    );
}

function checkEnemyCollision(enemy) {
    const margin = 10;
    return (
        gameState.player.x + margin < enemy.x + 40 &&
        gameState.player.x + gameState.player.width - margin > enemy.x &&
        gameState.player.y + margin < enemy.y + 60 &&
        gameState.player.y + gameState.player.height - margin > enemy.y
    );
}

function checkCollectibleCollision(item) {
    return (
        gameState.player.x < item.x + 30 &&
        gameState.player.x + gameState.player.width > item.x &&
        gameState.player.y < item.y + 30 &&
        gameState.player.y + gameState.player.height > item.y
    );
}

function isInCameraView(camera) {
    // حساب المسافة والزاوية بين اللاعب والكاميرا
    const dx = gameState.player.x - camera.x;
    const dy = gameState.player.y - camera.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > camera.range) return false;
    
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const cameraAngle = parseFloat(camera.element.style.transform.replace('rotate(', '').replace('deg)', ''));
    
    return Math.abs(angle - cameraAngle) < 30;
}

function isInSmoke() {
    return gameState.activeEffects.some(effect => {
        if (effect.type === 'smoke') {
            const dx = gameState.player.x - effect.x;
            const dy = gameState.player.y - effect.y;
            return Math.sqrt(dx * dx + dy * dy) < effect.radius;
        }
        return false;
    });
}

function collectItem(item) {
    if (item.type === 'health') {
        heal(CONFIG.HEAL_AMOUNT);
    } else {
        gameState.tools[item.type]++;
        updateToolCount(item.type);
    }
    
    item.element.remove();
    gameState.collectibles = gameState.collectibles.filter(i => i !== item);
    AudioManager.play('collect');
}

function takeDamage() {
    gameState.health -= CONFIG.DAMAGE_AMOUNT;
    updateHealth();
    AudioManager.play('hit');
    
    elements.game.player.classList.add('damaged');
    setTimeout(() => {
        elements.game.player.classList.remove('damaged');
    }, 200);
    
    if (gameState.health <= 0) {
        gameOver();
    }
}

function heal(amount) {
    gameState.health = Math.min(gameState.health + amount, CONFIG.MAX_HEALTH);
    updateHealth();
}

function updateHealth() {
    elements.hud.health.style.width = (gameState.health / CONFIG.MAX_HEALTH * 100) + '%';
}

function updateToolCount(toolType) {
    const toolElement = document.querySelector(`[data-tool="${toolType}"] .tool-count`);
    if (toolElement) {
        toolElement.textContent = gameState.tools[toolType];
    }
}

function checkBoundaries() {
    const maxX = elements.game.area.offsetWidth - gameState.player.width;
    const maxY = elements.game.area.offsetHeight - gameState.player.height;
    
    if (gameState.player.x < 0) gameState.player.x = 0;
    if (gameState.player.x > maxX) gameState.player.x = maxX;
    if (gameState.player.y < 0) {
        gameState.player.y = 0;
        gameState.player.velocityY = 0;
    }
    if (gameState.player.y > maxY) {
        gameState.player.y = maxY;
        gameState.player.velocityY = 0;
        gameState.player.isJumping = false;
    }
}

// وظائف اللعبة الرئيسية
function startGame() {
    gameState.isPlaying = true;
    gameState.health = CONFIG.MAX_HEALTH;
    gameState.level = 1;
    gameState.score = 0;
    
    resetTools();
    ScreenManager.show('game');
    LevelManager.loadLevel(1);
    AudioManager.play('theme');
    
    requestAnimationFrame(updateGameState);
}

function resetTools() {
    gameState.tools = {
        smoke: 3,
        hack: 2,
        rope: 1
    };
    Object.keys(gameState.tools).forEach(updateToolCount);
}

function pauseGame() {
    gameState.isPaused = true;
    elements.audio.theme.pause();
}

function resumeGame() {
    gameState.isPaused = false;
    elements.audio.theme.play();
}

function gameOver() {
    gameState.isPlaying = false;
    const stats = {
        score: gameState.score,
        time: Math.floor((Date.now() - gameState.startTime) / 1000),
        toolsUsed: 6 - (gameState.tools.smoke + gameState.tools.hack + gameState.tools.rope)
    };
    ScreenManager.showResult(false, stats);
}

function nextLevel() {
    gameState.level++;
    if (gameState.level > 50) {
        winGame();
    } else {
        LevelManager.loadLevel(gameState.level);
    }
}

function winGame() {
    gameState.isPlaying = false;
    const stats = {
        score: gameState.score,
        time: Math.floor((Date.now() - gameState.startTime) / 1000),
        toolsUsed: 6 - (gameState.tools.smoke + gameState.tools.hack + gameState.tools.rope)
    };
    ScreenManager.showResult(true, stats);
}

function createMatrixEffect(container) {
    const chars = 'أبجدحهوزحطيكلمنسعفصقرشتثخذضظغ0123456789';
    const columns = Math.floor(window.innerWidth / 14);
    const drops = new Array(columns).fill(0);
    
    function createCharacter(x) {
        const char = document.createElement('div');
        char.className = 'matrix-char';
        char.style.left = x * 14 + 'px';
        char.style.animationDuration = 2 + Math.random() * 3 + 's';
        char.textContent = chars[Math.floor(Math.random() * chars.length)];
        container.appendChild(char);
        
        char.addEventListener('animationend', () => {
            char.remove();
            drops[Math.floor(x)] = 0;
        });
    }
    
    function rain() {
        for (let i = 0; i < drops.length; i++) {
            if (Math.random() > 0.975 && drops[i] === 0) {
                drops[i] = 1;
                createCharacter(i);
            }
        }
    }
    
    setInterval(rain, 50);
}

// إعداد المستمعين
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

// تهيئة اللعبة
window.addEventListener('load', () => {
    AudioManager.init();
    ScreenManager.show('main');
    
    // إعداد تأثير المصفوفة
    const matrix = document.getElementById('matrix-bg');
    createMatrixEffect(matrix);
}); 
