import { useEffect, useRef, useState, useCallback } from 'react';
import './_GoForward.scss';

/** 遊戲狀態 */
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

/** 平台類型 */
type PlatformType = 'normal' | 'fake' | 'falling' | 'ceiling';

/** 玩家狀態 */
interface Player {
    x: number;
    y: number;
    vx: number;
    vy: number;
    isGrounded: boolean;
}

/** 平台 */
interface Platform {
    x: number;
    y: number;
    width: number;
    height: number;
    type: PlatformType;
    isFalling?: boolean;
    triggered?: boolean;   // 墜落平台是否已被觸發
    standTime?: number;    // 觸發後的計時
    fallSpeed?: number;
}

/** 障礙物 */
interface Obstacle {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** 輸入狀態 */
interface InputState {
    left: boolean;
    right: boolean;
    jump: boolean;
}

/** 鏡頭 */
interface Camera {
    x: number;
}

/** 背景色塊 */
interface BackgroundBlock {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    alpha: number;
    parallax: number;  // 視差係數（0.1~0.9，越小移動越慢）
}

/** 遊戲設定 */
const CONFIG = {
    // 畫布設定
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 400,

    // 格子大小
    TILE_SIZE: 32,

    // 主角設定
    PLAYER_SIZE: 28,
    PLAYER_COLOR: '#4ecca3',

    // 物理設定
    GRAVITY: 0.6,
    JUMP_FORCE: -13,
    GROUND_ACCELERATION: 0.8,
    AIR_ACCELERATION: 0.4,
    MAX_SPEED_X: 9,                // 提高最大速度
    FRICTION: 0.85,
    FRICTION_HIGH_SPEED: 0.92,    // 高速時摩擦力更小（更滑）
    AIR_RESISTANCE: 0.98,
    HIGH_SPEED_THRESHOLD: 5,      // 高速閾值

    // 鏡頭設定
    CAMERA_OFFSET_X: 0.4,

    // 地形生成設定
    PLATFORM_MIN_WIDTH: 3,
    PLATFORM_MAX_WIDTH: 10,
    PLATFORM_HEIGHT: 12,          // 平台厚度改薄
    GAP_MIN_WIDTH: 2,
    GAP_MAX_WIDTH: 4,
    HEIGHT_VARIATION: 2,

    // 特殊平台設定
    FAKE_PLATFORM_CHANCE: 0.08,
    FALLING_PLATFORM_CHANCE: 0.1,
    TUNNEL_CHANCE: 0.08,
    FALLING_PLATFORM_DELAY: 120,   // 2秒（60fps * 2）
    FALLING_PLATFORM_COLOR: '#f1c40f',
    FAKE_PLATFORM_HEIGHT_DIFF: 4,  // 騙人平台高度差（tile數）

    // 障礙物設定
    OBSTACLE_CHANCE: 0.12,
    OBSTACLE_COLOR: '#ffffff',     // 尖刺改白色
    OBSTACLE_WIDTH: 20,
    OBSTACLE_HEIGHT: 24,

    // 顏色設定
    PLATFORM_COLOR: '#45567d',
    PLATFORM_TOP_COLOR: '#5a6f94',
    CEILING_COLOR: '#3d4f6f',
    BACKGROUND_COLOR: '#1b1b32',

    // 背景色塊
    BG_BLOCK_COLORS: ['#2d2d5a', '#3a3a6a', '#252550', '#1f1f45'],

    // 主角動畫
    SLIME_CYCLE: 60,              // 史萊姆動畫週期（幀數）
    SLIME_AMPLITUDE: 0.08,        // 史萊姆變形幅度
    SPEED_SQUASH: 0.15,           // 高速時壓扁幅度

    // 跳躍距離計算（用於確保平台可達）
    // 跳躍時間 ≈ 2 * |JUMP_FORCE| / GRAVITY = 2 * 13 / 0.6 ≈ 43 幀
    // 最大跳躍距離 = MAX_SPEED_X * 43 ≈ 387 像素
    // 保守估計（考慮加速時間）約 280 像素
    MAX_JUMP_DISTANCE: 280,
    MAX_JUMP_HEIGHT: 140,         // 最大跳躍高度（約 JUMP_FORCE^2 / (2*GRAVITY)）

    // 遊戲迴圈
    FPS: 60,
} as const;

/**
 * GoForward - 2D 平台跳躍遊戲
 * @see _mds/spec-v1.md 規格書
 */
export default function GoForward() {
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const frameCountRef = useRef<number>(0);

    const playerRef = useRef<Player>({
        x: 100,
        y: 200,
        vx: 0,
        vy: 0,
        isGrounded: false,
    });

    const cameraRef = useRef<Camera>({ x: 0 });
    const platformsRef = useRef<Platform[]>([]);
    const obstaclesRef = useRef<Obstacle[]>([]);
    const bgBlocksRef = useRef<BackgroundBlock[]>([]);
    const inputRef = useRef<InputState>({ left: false, right: false, jump: false });
    const maxDistanceRef = useRef<number>(0);
    const lastPlatformEndRef = useRef<number>(0);
    const currentStandingPlatformRef = useRef<Platform | null>(null);
    // 追蹤最後一個可站立平台的資訊（用於確保跳躍可達）
    const lastStandableRef = useRef<{ x: number; endX: number; y: number }>({ x: 0, endX: 0, y: 0 });

    // States
    const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('goforward-highscore');
        return saved ? parseInt(saved, 10) : 0;
    });

    /**
     * 生成背景色塊
     */
    const generateBackgroundBlocks = useCallback((startX: number, endX: number): BackgroundBlock[] => {
        const blocks: BackgroundBlock[] = [];
        let x = startX;

        while (x < endX) {
            if (Math.random() < 0.3) {
                blocks.push({
                    x,
                    y: Math.random() * CONFIG.CANVAS_HEIGHT * 0.8,
                    width: 50 + Math.random() * 150,
                    height: 30 + Math.random() * 100,
                    color: CONFIG.BG_BLOCK_COLORS[Math.floor(Math.random() * CONFIG.BG_BLOCK_COLORS.length)],
                    alpha: 0.15 + Math.random() * 0.2,
                    parallax: 0.1 + Math.random() * 0.8,  // 隨機視差係數 0.1~0.9
                });
            }
            x += 100 + Math.random() * 200;
        }

        return blocks;
    }, []);

    /**
     * 產生初始平台
     */
    const generateInitialPlatforms = useCallback(() => {
        const platforms: Platform[] = [];
        const groundY = CONFIG.CANVAS_HEIGHT - CONFIG.TILE_SIZE * 2;

        // 起始平台（較長較平）
        const startPlatformWidth = CONFIG.TILE_SIZE * 12;
        platforms.push({
            x: 0,
            y: groundY,
            width: startPlatformWidth,
            height: CONFIG.PLATFORM_HEIGHT,
            type: 'normal',
        });

        lastPlatformEndRef.current = startPlatformWidth;
        // 初始化最後可站立平台記錄
        lastStandableRef.current = { x: 0, endX: startPlatformWidth, y: groundY };

        // 生成更多平台
        let currentX = lastPlatformEndRef.current;
        let currentY = groundY;

        for (let i = 0; i < 20; i++) {
            // 間隙
            const gapWidth = CONFIG.TILE_SIZE * (CONFIG.GAP_MIN_WIDTH + Math.floor(Math.random() * (CONFIG.GAP_MAX_WIDTH - CONFIG.GAP_MIN_WIDTH + 1)));
            currentX += gapWidth;

            // 高度變化
            const heightChange = Math.floor(Math.random() * (CONFIG.HEIGHT_VARIATION * 2 + 1)) - CONFIG.HEIGHT_VARIATION;
            currentY = Math.max(
                CONFIG.TILE_SIZE * 4,
                Math.min(CONFIG.CANVAS_HEIGHT - CONFIG.TILE_SIZE * 3, currentY + heightChange * CONFIG.TILE_SIZE)
            );

            // 平台寬度
            const platformWidth = CONFIG.TILE_SIZE * (CONFIG.PLATFORM_MIN_WIDTH + Math.floor(Math.random() * (CONFIG.PLATFORM_MAX_WIDTH - CONFIG.PLATFORM_MIN_WIDTH + 1)));

            platforms.push({
                x: currentX,
                y: currentY,
                width: platformWidth,
                height: CONFIG.PLATFORM_HEIGHT,
                type: 'normal',
            });

            // 更新最後可站立平台
            lastStandableRef.current = { x: currentX, endX: currentX + platformWidth, y: currentY };

            currentX += platformWidth;
        }

        lastPlatformEndRef.current = currentX;

        // 生成背景色塊
        bgBlocksRef.current = generateBackgroundBlocks(0, currentX + CONFIG.CANVAS_WIDTH);

        return platforms;
    }, [generateBackgroundBlocks]);

    /**
     * 檢查平台是否在跳躍可達範圍內
     */
    const isReachable = useCallback((fromX: number, fromY: number, toX: number, toY: number): boolean => {
        const horizontalDist = toX - fromX;
        const verticalDist = fromY - toY;  // 正值表示目標更高

        // 水平距離超過最大跳躍距離
        if (horizontalDist > CONFIG.MAX_JUMP_DISTANCE) return false;

        // 目標太高（超過最大跳躍高度）
        if (verticalDist > CONFIG.MAX_JUMP_HEIGHT) return false;

        // 考慮高度差對水平距離的影響（越高越難跳遠）
        const effectiveMaxDist = CONFIG.MAX_JUMP_DISTANCE - Math.max(0, verticalDist) * 0.5;
        return horizontalDist <= effectiveMaxDist;
    }, []);

    /**
     * 動態生成更多平台
     */
    const generateMorePlatforms = useCallback(() => {
        const camera = cameraRef.current;
        const viewRight = camera.x + CONFIG.CANVAS_WIDTH;

        while (lastPlatformEndRef.current < viewRight + CONFIG.CANVAS_WIDTH) {
            const platforms = platformsRef.current;
            const lastStandable = lastStandableRef.current;
            const lastPlatform = platforms[platforms.length - 1];
            const lastWasFake = lastPlatform?.type === 'fake';

            // 使用最後可站立平台的高度作為基準
            const baseY = lastStandable.y;

            // 根據距離增加難度
            const distance = maxDistanceRef.current;
            const difficultyFactor = Math.min(1, distance / 5000);

            // 間隙（隨距離增加）
            const minGap = CONFIG.GAP_MIN_WIDTH + Math.floor(difficultyFactor * 1);
            const maxGap = CONFIG.GAP_MAX_WIDTH + Math.floor(difficultyFactor * 2);
            const gapWidth = CONFIG.TILE_SIZE * (minGap + Math.floor(Math.random() * (maxGap - minGap + 1)));

            // 【關鍵修正】如果上一個是 fake 平台，這次的位置要從 lastStandable 計算
            // 確保玩家能從最後一個可站立平台跳到這個平台
            let currentX: number;
            if (lastWasFake) {
                // fake 平台後，位置基於 lastStandable 計算，確保可達
                currentX = lastStandable.endX + gapWidth;
            } else {
                currentX = lastPlatformEndRef.current + gapWidth;
            }

            // 檢查距離最後可站立平台的距離
            const distFromLastStandable = currentX - lastStandable.endX;

            // 決定平台類型
            let platformType: PlatformType = 'normal';
            const typeRoll = Math.random();

            // 如果上一個是 fake，或者距離太遠，強制生成可站立平台
            const mustBeStandable = lastWasFake || distFromLastStandable > CONFIG.MAX_JUMP_DISTANCE * 0.7;

            if (!mustBeStandable) {
                // 騙人平台（隨難度增加機率）
                if (typeRoll < CONFIG.FAKE_PLATFORM_CHANCE + difficultyFactor * 0.1) {
                    platformType = 'fake';
                }
                // 墜落平台
                else if (typeRoll < CONFIG.FAKE_PLATFORM_CHANCE + CONFIG.FALLING_PLATFORM_CHANCE + difficultyFactor * 0.15) {
                    platformType = 'falling';
                }
            }

            // 高度變化
            const heightVariation = CONFIG.HEIGHT_VARIATION + Math.floor(difficultyFactor * 1);
            let currentY = baseY;

            // 騙人平台：高度差更大（基於 baseY 計算）
            if (platformType === 'fake') {
                const fakeDiff = CONFIG.FAKE_PLATFORM_HEIGHT_DIFF + Math.floor(Math.random() * 2);
                // 隨機決定往上還是往下
                if (Math.random() < 0.5) {
                    currentY = Math.max(CONFIG.TILE_SIZE * 2, baseY - fakeDiff * CONFIG.TILE_SIZE);
                } else {
                    currentY = CONFIG.CANVAS_HEIGHT - CONFIG.TILE_SIZE;
                }
            } else {
                // 可站立平台：基於 baseY 計算高度變化，確保從最後可站立平台可以跳到
                const heightChange = Math.floor(Math.random() * (heightVariation * 2 + 1)) - heightVariation;
                let proposedY = Math.max(
                    CONFIG.TILE_SIZE * 4,
                    Math.min(CONFIG.CANVAS_HEIGHT - CONFIG.TILE_SIZE * 3, baseY + heightChange * CONFIG.TILE_SIZE)
                );

                // 檢查是否可達，如果不可達則調整高度
                if (!isReachable(lastStandable.endX, lastStandable.y, currentX, proposedY)) {
                    // 調整到可達的高度（不能太高）
                    const maxReachableHeight = lastStandable.y - CONFIG.MAX_JUMP_HEIGHT + 20;
                    proposedY = Math.max(proposedY, maxReachableHeight);
                }

                currentY = proposedY;
            }

            // 平台寬度
            const minWidth = Math.max(2, CONFIG.PLATFORM_MIN_WIDTH - Math.floor(difficultyFactor * 1));
            const maxWidth = Math.max(4, CONFIG.PLATFORM_MAX_WIDTH - Math.floor(difficultyFactor * 3));
            let platformWidth = CONFIG.TILE_SIZE * (minWidth + Math.floor(Math.random() * (maxWidth - minWidth + 1)));

            // 墜落平台較短
            if (platformType === 'falling') {
                platformWidth = CONFIG.TILE_SIZE * (2 + Math.floor(Math.random() * 2));
            }

            const newPlatform: Platform = {
                x: currentX,
                y: currentY,
                width: platformWidth,
                height: CONFIG.PLATFORM_HEIGHT,
                type: platformType,
                triggered: false,
                standTime: 0,
                isFalling: false,
                fallSpeed: 0,
            };

            platforms.push(newPlatform);

            // 更新最後可站立平台記錄（normal 和 falling 都是可站立的）
            if (platformType !== 'fake') {
                lastStandableRef.current = {
                    x: currentX,
                    endX: currentX + platformWidth,
                    y: currentY,
                };
            }

            // 天花板（限制跳躍高度）- 放在間隙上方
            // 只在可站立平台後生成，且前一個也是可站立平台
            if (platformType !== 'fake' && !lastWasFake && Math.random() < CONFIG.TUNNEL_CHANCE + difficultyFactor * 0.08) {
                // 天花板覆蓋間隙區域
                const gapStartX = lastStandable.endX;
                const gapEndX = currentX;
                const ceilingWidth = gapEndX - gapStartX + CONFIG.TILE_SIZE * 2;

                // 天花板高度：取兩個平台中較高的那個，再往上約 1.5 個玩家高度
                // 這樣玩家必須用較低的跳躍才能通過
                const higherPlatformY = Math.min(lastStandable.y, currentY);
                const ceilingY = higherPlatformY - CONFIG.PLAYER_SIZE * 1.8;

                // 確保天花板不會太高（要能撞到）也不會太低（要能通過）
                if (ceilingY > CONFIG.TILE_SIZE * 2 && ceilingY < higherPlatformY - CONFIG.PLAYER_SIZE - 10) {
                    platforms.push({
                        x: gapStartX - CONFIG.TILE_SIZE,
                        y: ceilingY,
                        width: ceilingWidth,
                        height: CONFIG.PLATFORM_HEIGHT,
                        type: 'ceiling',
                    });
                }
            }

            // 障礙物（只在一般平台和墜落平台上）
            if ((platformType === 'normal' || platformType === 'falling') &&
                Math.random() < CONFIG.OBSTACLE_CHANCE + difficultyFactor * 0.12) {
                const obstacleX = currentX + CONFIG.TILE_SIZE + Math.random() * (platformWidth - CONFIG.TILE_SIZE * 2 - CONFIG.OBSTACLE_WIDTH);
                if (obstacleX > currentX && obstacleX + CONFIG.OBSTACLE_WIDTH < currentX + platformWidth) {
                    obstaclesRef.current.push({
                        x: obstacleX,
                        y: currentY - CONFIG.OBSTACLE_HEIGHT,
                        width: CONFIG.OBSTACLE_WIDTH,
                        height: CONFIG.OBSTACLE_HEIGHT,
                    });
                }
            }

            lastPlatformEndRef.current = currentX + platformWidth;
        }

        // 生成更多背景色塊
        const lastBgBlock = bgBlocksRef.current[bgBlocksRef.current.length - 1];
        const bgEndX = lastBgBlock ? lastBgBlock.x + lastBgBlock.width : 0;
        if (bgEndX < viewRight + CONFIG.CANVAS_WIDTH) {
            const newBlocks = generateBackgroundBlocks(bgEndX, viewRight + CONFIG.CANVAS_WIDTH * 2);
            bgBlocksRef.current.push(...newBlocks);
        }
    }, [generateBackgroundBlocks]);

    /**
     * 清除離開畫面的物件
     */
    const cleanupOffscreenObjects = useCallback(() => {
        const camera = cameraRef.current;
        const cleanupBoundary = camera.x - CONFIG.CANVAS_WIDTH;

        platformsRef.current = platformsRef.current.filter(
            p => p.x + p.width > cleanupBoundary && !p.isFalling
        );
        obstaclesRef.current = obstaclesRef.current.filter(
            o => o.x + o.width > cleanupBoundary
        );
        bgBlocksRef.current = bgBlocksRef.current.filter(
            b => b.x + b.width > cleanupBoundary
        );
    }, []);

    /**
     * 更新墜落平台
     * 一旦被觸發就開始計時，2秒後墜落（不管玩家是否還站在上面）
     */
    const updateFallingPlatforms = useCallback(() => {
        for (const platform of platformsRef.current) {
            if (platform.type === 'falling') {
                // 已被觸發但還沒開始掉落：持續計時
                if (platform.triggered && !platform.isFalling) {
                    platform.standTime = (platform.standTime || 0) + 1;
                    if (platform.standTime >= CONFIG.FALLING_PLATFORM_DELAY) {
                        platform.isFalling = true;
                    }
                }
                // 正在墜落
                if (platform.isFalling) {
                    platform.fallSpeed = (platform.fallSpeed || 0) + 0.3;
                    platform.y += platform.fallSpeed;
                }
            }
        }
    }, []);

    /**
     * 碰撞檢測：玩家與平台
     */
    const checkPlatformCollision = useCallback((player: Player): { grounded: boolean; newY: number; platform: Platform | null } => {
        const playerLeft = player.x;
        const playerRight = player.x + CONFIG.PLAYER_SIZE;
        const playerBottom = player.y + CONFIG.PLAYER_SIZE;
        const playerTop = player.y;

        let grounded = false;
        let newY = player.y;
        let standingPlatform: Platform | null = null;

        for (const platform of platformsRef.current) {
            // 跳過正在墜落的平台（除非玩家在上面）
            if (platform.isFalling && currentStandingPlatformRef.current !== platform) continue;

            // 跳過騙人平台（無法站上去）
            if (platform.type === 'fake') continue;

            const platLeft = platform.x;
            const platRight = platform.x + platform.width;
            const platTop = platform.y;
            const platBottom = platform.y + platform.height;

            // 水平重疊檢查
            if (playerRight > platLeft && playerLeft < platRight) {
                // 天花板碰撞（從下方撞到）
                if (platform.type === 'ceiling' && player.vy < 0) {
                    if (playerTop <= platBottom && playerBottom > platBottom) {
                        player.vy = 0;
                        player.y = platBottom;
                        newY = platBottom;
                    }
                }
                // 從上方落下到平台上
                else if (player.vy >= 0 && playerBottom >= platTop && playerTop < platTop) {
                    grounded = true;
                    newY = platTop - CONFIG.PLAYER_SIZE;
                    standingPlatform = platform;
                }
            }
        }

        return { grounded, newY, platform: standingPlatform };
    }, []);

    /**
     * 碰撞檢測：玩家與障礙物
     */
    const checkObstacleCollision = useCallback((player: Player): boolean => {
        const playerLeft = player.x + 4;
        const playerRight = player.x + CONFIG.PLAYER_SIZE - 4;
        const playerTop = player.y + 4;
        const playerBottom = player.y + CONFIG.PLAYER_SIZE - 4;

        for (const obstacle of obstaclesRef.current) {
            const obsLeft = obstacle.x;
            const obsRight = obstacle.x + obstacle.width;
            const obsTop = obstacle.y;
            const obsBottom = obstacle.y + obstacle.height;

            if (playerRight > obsLeft && playerLeft < obsRight &&
                playerBottom > obsTop && playerTop < obsBottom) {
                return true;
            }
        }

        return false;
    }, []);

    /**
     * 更新玩家物理狀態
     */
    const updatePlayer = useCallback(() => {
        const player = playerRef.current;
        const input = inputRef.current;

        // 水平移動
        const acceleration = player.isGrounded ? CONFIG.GROUND_ACCELERATION : CONFIG.AIR_ACCELERATION;
        const currentSpeed = Math.abs(player.vx);
        const isHighSpeed = currentSpeed > CONFIG.HIGH_SPEED_THRESHOLD;

        if (input.left) {
            player.vx -= acceleration;
        }
        if (input.right) {
            player.vx += acceleration;
        }

        // 摩擦力/空氣阻力
        if (player.isGrounded) {
            if (!input.left && !input.right) {
                // 高速時摩擦力更小，慣性更明顯
                const friction = isHighSpeed ? CONFIG.FRICTION_HIGH_SPEED : CONFIG.FRICTION;
                player.vx *= friction;
            }
        } else {
            player.vx *= CONFIG.AIR_RESISTANCE;
        }

        // 限制最大速度
        player.vx = Math.max(-CONFIG.MAX_SPEED_X, Math.min(CONFIG.MAX_SPEED_X, player.vx));

        // 極小速度歸零
        if (Math.abs(player.vx) < 0.1) {
            player.vx = 0;
        }

        // 跳躍
        if (input.jump && player.isGrounded) {
            player.vy = CONFIG.JUMP_FORCE;
            player.isGrounded = false;
        }

        // 重力
        if (!player.isGrounded) {
            player.vy += CONFIG.GRAVITY;
        }

        // 更新位置
        player.x += player.vx;
        player.y += player.vy;

        // 平台碰撞
        const collision = checkPlatformCollision(player);
        if (collision.grounded && player.vy >= 0) {
            player.y = collision.newY;
            player.vy = 0;
            player.isGrounded = true;

            // 處理墜落平台：踩上就觸發計時
            if (collision.platform) {
                currentStandingPlatformRef.current = collision.platform;
                if (collision.platform.type === 'falling' && !collision.platform.triggered) {
                    collision.platform.triggered = true;  // 標記已觸發，開始計時
                }
            }
        } else {
            player.isGrounded = false;
            currentStandingPlatformRef.current = null;
        }

        // 左邊界限制
        const minX = cameraRef.current.x;
        if (player.x < minX) {
            player.x = minX;
            player.vx = 0;
        }

        // 更新最大距離和分數
        if (player.x > maxDistanceRef.current) {
            maxDistanceRef.current = player.x;
            setScore(Math.floor(maxDistanceRef.current / 10));
        }
    }, [checkPlatformCollision]);

    /**
     * 更新鏡頭位置
     */
    const updateCamera = useCallback(() => {
        const player = playerRef.current;
        const camera = cameraRef.current;

        const playerScreenX = player.x - camera.x;
        const cameraThreshold = CONFIG.CANVAS_WIDTH * CONFIG.CAMERA_OFFSET_X;

        if (playerScreenX > cameraThreshold) {
            camera.x = player.x - cameraThreshold;
        }
    }, []);

    /**
     * 檢查遊戲結束條件
     */
    const checkGameOver = useCallback((): boolean => {
        const player = playerRef.current;

        if (player.y > CONFIG.CANVAS_HEIGHT + 50) {
            return true;
        }

        if (checkObstacleCollision(player)) {
            return true;
        }

        return false;
    }, [checkObstacleCollision]);

    /**
     * 繪製遊戲畫面
     */
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const camera = cameraRef.current;
        const player = playerRef.current;
        const frame = frameCountRef.current;

        // 清空畫布
        ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // 繪製背景色塊（帶視差效果）
        for (const block of bgBlocksRef.current) {
            // 視差：parallax 越小移動越慢，干擾玩家速度感
            const screenX = block.x - camera.x * block.parallax;
            if (screenX + block.width > -200 && screenX < CONFIG.CANVAS_WIDTH + 200) {
                ctx.globalAlpha = block.alpha;
                ctx.fillStyle = block.color;
                ctx.fillRect(screenX, block.y, block.width, block.height);
                ctx.globalAlpha = 1;
            }
        }

        // 繪製平台
        for (const platform of platformsRef.current) {
            const screenX = platform.x - camera.x;

            if (screenX + platform.width > 0 && screenX < CONFIG.CANVAS_WIDTH) {
                // 根據平台類型選擇顏色
                if (platform.type === 'falling') {
                    // 墜落平台 - 黃色
                    ctx.fillStyle = CONFIG.FALLING_PLATFORM_COLOR;
                    ctx.fillRect(screenX, platform.y, platform.width, platform.height);
                    // 被觸發後就開始閃爍（不管玩家是否還站著）
                    if (platform.triggered && !platform.isFalling) {
                        // 閃爍頻率隨時間加快
                        const progress = (platform.standTime || 0) / CONFIG.FALLING_PLATFORM_DELAY;
                        const flashSpeed = Math.max(2, 8 - Math.floor(progress * 6));
                        if (Math.floor(frame / flashSpeed) % 2 === 0) {
                            ctx.fillStyle = 'rgba(255,255,255,0.4)';
                            ctx.fillRect(screenX, platform.y, platform.width, platform.height);
                        }
                    }
                } else if (platform.type === 'fake') {
                    // 騙人平台 - 更淡的顏色（約 50% 透明度感）
                    ctx.fillStyle = '#2a3a56';
                    ctx.fillRect(screenX, platform.y, platform.width, platform.height);
                    ctx.fillStyle = '#354565';
                    ctx.fillRect(screenX, platform.y, platform.width, 3);
                } else if (platform.type === 'ceiling') {
                    // 天花板 - 和一般平台相同樣式
                    ctx.fillStyle = CONFIG.PLATFORM_COLOR;
                    ctx.fillRect(screenX, platform.y, platform.width, platform.height);
                    // 底部亮邊（因為是天花板，亮邊在下方）
                    ctx.fillStyle = CONFIG.PLATFORM_TOP_COLOR;
                    ctx.fillRect(screenX, platform.y + platform.height - 3, platform.width, 3);
                } else {
                    // 一般平台
                    ctx.fillStyle = CONFIG.PLATFORM_COLOR;
                    ctx.fillRect(screenX, platform.y, platform.width, platform.height);
                    ctx.fillStyle = CONFIG.PLATFORM_TOP_COLOR;
                    ctx.fillRect(screenX, platform.y, platform.width, 3);
                }
            }
        }

        // 繪製障礙物（尖刺）- 白色
        for (const obstacle of obstaclesRef.current) {
            const screenX = obstacle.x - camera.x;

            if (screenX + obstacle.width > 0 && screenX < CONFIG.CANVAS_WIDTH) {
                ctx.fillStyle = CONFIG.OBSTACLE_COLOR;
                ctx.beginPath();
                ctx.moveTo(screenX, obstacle.y + obstacle.height);
                ctx.lineTo(screenX + obstacle.width / 2, obstacle.y);
                ctx.lineTo(screenX + obstacle.width, obstacle.y + obstacle.height);
                ctx.closePath();
                ctx.fill();
            }
        }

        // 繪製玩家（帶動態效果）
        const playerScreenX = player.x - camera.x;
        const speedRatio = Math.abs(player.vx) / CONFIG.MAX_SPEED_X;

        // 史萊姆動畫：idle時微微伸縮
        const slimePhase = (frame % CONFIG.SLIME_CYCLE) / CONFIG.SLIME_CYCLE;
        const slimeScale = Math.sin(slimePhase * Math.PI * 2) * CONFIG.SLIME_AMPLITUDE;

        // 高速時壓扁效果
        const speedSquash = speedRatio * CONFIG.SPEED_SQUASH;

        // 計算最終變形
        const scaleX = 1 + speedSquash + slimeScale;
        const scaleY = 1 - speedSquash - slimeScale;

        const drawWidth = CONFIG.PLAYER_SIZE * scaleX;
        const drawHeight = CONFIG.PLAYER_SIZE * scaleY;
        const offsetX = (CONFIG.PLAYER_SIZE - drawWidth) / 2;
        const offsetY = CONFIG.PLAYER_SIZE - drawHeight;

        // 主角圓角（更像史萊姆）
        const playerX = playerScreenX + offsetX;
        const playerY = player.y + offsetY;
        const cornerRadius = Math.min(drawWidth, drawHeight) * 0.35;

        ctx.fillStyle = CONFIG.PLAYER_COLOR;
        ctx.beginPath();
        ctx.roundRect(playerX, playerY, drawWidth, drawHeight, cornerRadius);
        ctx.fill();

        // 玩家眼睛（也加圓角）
        ctx.fillStyle = '#1b1b32';
        const eyeOffsetX = player.vx >= 0 ? drawWidth * 0.55 : drawWidth * 0.2;
        const eyeWidth = 5 * scaleX;
        const eyeHeight = 5 * scaleY;
        const eyeRadius = Math.min(eyeWidth, eyeHeight) * 0.3;
        ctx.beginPath();
        ctx.roundRect(
            playerX + eyeOffsetX,
            playerY + drawHeight * 0.25,
            eyeWidth,
            eyeHeight,
            eyeRadius
        );
        ctx.fill();
    }, []);

    /**
     * 遊戲主迴圈
     */
    const gameLoop = useCallback((timestamp: number) => {
        if (lastTimeRef.current === 0) {
            lastTimeRef.current = timestamp;
        }

        const deltaTime = timestamp - lastTimeRef.current;

        if (deltaTime >= 1000 / CONFIG.FPS) {
            lastTimeRef.current = timestamp;
            frameCountRef.current++;

            // 更新遊戲狀態
            updatePlayer();
            updateCamera();
            updateFallingPlatforms();
            generateMorePlatforms();
            cleanupOffscreenObjects();

            // 檢查遊戲結束
            if (checkGameOver()) {
                setGameStatus('gameover');
                const finalScore = Math.floor(maxDistanceRef.current / 10);
                setScore(finalScore);
                if (finalScore > highScore) {
                    setHighScore(finalScore);
                    localStorage.setItem('goforward-highscore', finalScore.toString());
                }
                return;
            }

            // 繪製
            render();
        }

        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }, [updatePlayer, updateCamera, updateFallingPlatforms, generateMorePlatforms, cleanupOffscreenObjects, checkGameOver, render, highScore]);

    /**
     * 開始遊戲
     */
    const startGame = useCallback(() => {
        playerRef.current = {
            x: 100,
            y: 200,
            vx: 0,
            vy: 0,
            isGrounded: false,
        };

        cameraRef.current = { x: 0 };
        maxDistanceRef.current = 0;
        setScore(0);
        frameCountRef.current = 0;

        platformsRef.current = generateInitialPlatforms();
        obstaclesRef.current = [];
        currentStandingPlatformRef.current = null;

        inputRef.current = { left: false, right: false, jump: false };
        lastTimeRef.current = 0;

        setGameStatus('playing');
    }, [generateInitialPlatforms]);

    /**
     * 暫停/繼續遊戲
     */
    const togglePause = useCallback(() => {
        setGameStatus(prev => prev === 'playing' ? 'paused' : 'playing');
    }, []);

    // 遊戲迴圈控制
    useEffect(() => {
        if (gameStatus === 'playing') {
            lastTimeRef.current = 0;
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        }

        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [gameStatus, gameLoop]);

    // 鍵盤事件
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameStatus !== 'playing' && gameStatus !== 'paused') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    startGame();
                }
                return;
            }

            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    e.preventDefault();
                    inputRef.current.left = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    e.preventDefault();
                    inputRef.current.right = true;
                    break;
                case 'Space':
                case 'ArrowUp':
                case 'KeyW':
                    e.preventDefault();
                    inputRef.current.jump = true;
                    break;
                case 'KeyP':
                case 'Escape':
                    e.preventDefault();
                    togglePause();
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    inputRef.current.left = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    inputRef.current.right = false;
                    break;
                case 'Space':
                case 'ArrowUp':
                case 'KeyW':
                    inputRef.current.jump = false;
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameStatus, startGame, togglePause]);

    // 初始渲染
    useEffect(() => {
        if (gameStatus === 'idle') {
            platformsRef.current = generateInitialPlatforms();
            playerRef.current = {
                x: 100,
                y: CONFIG.CANVAS_HEIGHT - CONFIG.TILE_SIZE * 2 - CONFIG.PLAYER_SIZE,
                vx: 0,
                vy: 0,
                isGrounded: true,
            };
            frameCountRef.current = 0;
            render();
        }
    }, [gameStatus, generateInitialPlatforms, render]);

    // Idle 動畫
    useEffect(() => {
        if (gameStatus === 'idle') {
            const idleLoop = () => {
                frameCountRef.current++;
                render();
                gameLoopRef.current = requestAnimationFrame(idleLoop);
            };
            gameLoopRef.current = requestAnimationFrame(idleLoop);

            return () => {
                if (gameLoopRef.current) {
                    cancelAnimationFrame(gameLoopRef.current);
                }
            };
        }
    }, [gameStatus, render]);

    /**
     * 手機按鈕事件處理
     * 使用 TouchEvent 直接處理，避免觸控問題
     */
    const handleTouchStart = (action: 'left' | 'right' | 'jump') => (e: React.TouchEvent) => {
        e.preventDefault();  // 防止觸控延遲和預設行為
        if (gameStatus !== 'playing') return;
        inputRef.current[action] = true;
    };

    const handleTouchEnd = (action: 'left' | 'right' | 'jump') => (e: React.TouchEvent) => {
        e.preventDefault();
        inputRef.current[action] = false;
    };

    const handleMouseDown = (action: 'left' | 'right' | 'jump') => () => {
        if (gameStatus !== 'playing') return;
        inputRef.current[action] = true;
    };

    const handleMouseUp = (action: 'left' | 'right' | 'jump') => () => {
        inputRef.current[action] = false;
    };

    return (
        <div className="GoForward">
            <div className="header">
                <h1 className="title">GoForward</h1>
                <div className="scores">
                    <span className="score">分數：{score}</span>
                    <span className="high-score">最高：{highScore}</span>
                </div>
            </div>

            <div className="canvas-container">
                <canvas
                    ref={canvasRef}
                    width={CONFIG.CANVAS_WIDTH}
                    height={CONFIG.CANVAS_HEIGHT}
                    className="game-canvas"
                />

                {gameStatus === 'idle' && (
                    <div className="overlay">
                        <div className="overlay-content">
                            <h2>準備好了嗎？</h2>
                            <p>不斷往前跑，避開障礙物！</p>
                            <button className="btn" onClick={startGame}>開始遊戲</button>
                        </div>
                    </div>
                )}

                {gameStatus === 'paused' && (
                    <div className="overlay">
                        <div className="overlay-content">
                            <h2>遊戲暫停</h2>
                            <button className="btn" onClick={togglePause}>繼續遊戲</button>
                        </div>
                    </div>
                )}

                {gameStatus === 'gameover' && (
                    <div className="overlay overlay--gameover">
                        <div className="overlay-content">
                            <h2>遊戲結束</h2>
                            <p className="final-score">分數：{score}</p>
                            {score >= highScore && score > 0 && (
                                <p className="new-record">新紀錄！</p>
                            )}
                            <button className="btn" onClick={startGame}>再玩一次</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mobile-controls">
                {/* 跳躍鍵在左邊（左手） */}
                <button
                    className="control-btn control-btn--jump"
                    onTouchStart={handleTouchStart('jump')}
                    onTouchEnd={handleTouchEnd('jump')}
                    onTouchCancel={handleTouchEnd('jump')}
                    onMouseDown={handleMouseDown('jump')}
                    onMouseUp={handleMouseUp('jump')}
                    onMouseLeave={handleMouseUp('jump')}
                >
                    跳躍
                </button>
                {/* 方向鍵在右邊（右手） */}
                <div className="direction-buttons">
                    <button
                        className="control-btn"
                        onTouchStart={handleTouchStart('left')}
                        onTouchEnd={handleTouchEnd('left')}
                        onTouchCancel={handleTouchEnd('left')}
                        onMouseDown={handleMouseDown('left')}
                        onMouseUp={handleMouseUp('left')}
                        onMouseLeave={handleMouseUp('left')}
                    >
                        ←
                    </button>
                    <button
                        className="control-btn"
                        onTouchStart={handleTouchStart('right')}
                        onTouchEnd={handleTouchEnd('right')}
                        onTouchCancel={handleTouchEnd('right')}
                        onMouseDown={handleMouseDown('right')}
                        onMouseUp={handleMouseUp('right')}
                        onMouseLeave={handleMouseUp('right')}
                    >
                        →
                    </button>
                </div>
            </div>

            <div className="instructions">
                <span>操作：← → 移動 | 空白鍵 跳躍 | P 暫停</span>
            </div>
        </div>
    );
}
