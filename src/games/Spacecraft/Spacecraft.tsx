import { useEffect, useRef, useState, useCallback } from 'react';
import './_Spacecraft.scss';

// ============================================================================
// 類型定義
// ============================================================================

type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';
type PlanetType = 'normal' | 'small' | 'giant' | 'fast' | 'reverse' | 'moving';
type CelestialType = 'blackhole' | 'whitehole';

interface Vector2 {
    x: number;
    y: number;
}

interface Ship {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    isOrbiting: boolean;
    currentPlanet: number;
    trail: Vector2[];
}

interface Planet {
    x: number;
    y: number;
    radius: number;
    orbitRadius: number;
    type: PlanetType;
    orbitSpeed: number;
    direction: 1 | -1;
    color: string;
    visited: boolean;
    moveAxis?: 'x' | 'y';
    moveRange?: number;
    moveSpeed?: number;
    movePhase?: number;
    baseX?: number;
    baseY?: number;
}

interface Celestial {
    x: number;
    y: number;
    radius: number;
    type: CelestialType;
    strength: number;
    rotation: number;
}

interface Star {
    x: number;
    y: number;
    collected: boolean;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

interface BackgroundStar {
    x: number;
    y: number;
    size: number;
    brightness: number;
    parallax: number;
}

// ============================================================================
// 遊戲設定
// ============================================================================

const CONFIG = {
    // 畫布設定
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 600,
    FPS: 60,

    // 太空船設定
    SHIP_SIZE: 8,
    ORBIT_OFFSET: 25,
    BASE_ORBIT_SPEED: 0.035,
    LAUNCH_SPEED: 7,
    TRAIL_LENGTH: 25,

    // 星球設定
    MIN_PLANET_RADIUS: 20,
    MAX_PLANET_RADIUS: 50,
    MIN_PLANET_DISTANCE: 180,
    MAX_PLANET_DISTANCE: 300,

    // 引力設定
    GRAVITY_RANGE: 180,
    BLACKHOLE_STRENGTH: 0.15,
    WHITEHOLE_STRENGTH: 0.12,
    BLACKHOLE_KILL_RADIUS: 15,

    // 計分設定
    BASE_SCORE: 10,
    COMBO_MULTIPLIER: 0.5,
    STAR_SCORE: 5,
    COMBO_TIMEOUT: 2500,

    // 軌道捕獲
    CAPTURE_RADIUS: 35,
    MAX_ENTRY_ANGLE: Math.PI * 0.45,  // 最大入射角度（81度），超過則無法捕獲（穿過）

    // 失敗判定：與最近未訪問星球距離超過此值則失敗
    MAX_DISTANCE_FROM_TARGET: 800,

    // 背景
    BACKGROUND_STAR_COUNT: 80,

    // 顏色
    COLORS: {
        normal: ['#4da6ff', '#5cb85c', '#9b59b6', '#3498db'],
        small: ['#e74c3c', '#ff6b6b'],
        giant: ['#f39c12', '#e67e22'],
        fast: ['#00d4ff', '#00ff88'],
        reverse: ['#ff00ff', '#ff66b2'],
        moving: ['#ffff00', '#ffd700'],
    }
} as const;

// ============================================================================
// 工具函數
// ============================================================================

/**
 * 計算兩點之間的距離
 */
const distance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

/**
 * 隨機數產生器
 */
const random = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
};

/**
 * 隨機選擇陣列元素
 */
const randomChoice = <T,>(arr: readonly T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
};

/**
 * 根據分數決定星球類型
 */
const getPlanetType = (score: number): PlanetType => {
    const rand = Math.random();

    if (score > 20 && rand < 0.15) return 'moving';
    if (score > 15 && rand < 0.2) return 'reverse';
    if (score > 10 && rand < 0.25) return 'fast';
    if (score > 5 && rand < 0.3) return 'small';
    if (rand < 0.15) return 'giant';

    return 'normal';
};

// ============================================================================
// 主元件
// ============================================================================

/**
 * Spacecraft 太空船軌道跳躍遊戲
 * @see _mds/spec-v1.md 規格書
 */
export default function Spacecraft() {
    // ========================================================================
    // Refs
    // ========================================================================

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const shipRef = useRef<Ship>({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        angle: 0,
        isOrbiting: true,
        currentPlanet: 0,
        trail: []
    });

    const planetsRef = useRef<Planet[]>([]);
    const celestialsRef = useRef<Celestial[]>([]);
    const starsRef = useRef<Star[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const backgroundStarsRef = useRef<BackgroundStar[]>([]);
    const cameraRef = useRef<Vector2>({ x: 0, y: 0 });
    const comboTimerRef = useRef<number>(0);
    const targetCameraRef = useRef<Vector2>({ x: 0, y: 0 });

    // ========================================================================
    // States
    // ========================================================================

    const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('spacecraft-highscore');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [combo, setCombo] = useState(0);

    // ========================================================================
    // 初始化函數
    // ========================================================================

    /**
     * 生成背景星星
     */
    const generateBackgroundStars = useCallback(() => {
        const stars: BackgroundStar[] = [];
        for (let i = 0; i < CONFIG.BACKGROUND_STAR_COUNT; i++) {
            stars.push({
                x: random(-500, CONFIG.CANVAS_WIDTH + 500),
                y: random(-500, CONFIG.CANVAS_HEIGHT + 500),
                size: random(0.5, 2),
                brightness: random(0.3, 1),
                parallax: random(0.1, 0.4)
            });
        }
        backgroundStarsRef.current = stars;
    }, []);

    /**
     * 生成初始星球
     */
    const generateInitialPlanet = useCallback((): Planet => {
        const radius = random(35, 45);
        return {
            x: CONFIG.CANVAS_WIDTH / 2,
            y: CONFIG.CANVAS_HEIGHT / 2,
            radius,
            orbitRadius: radius + CONFIG.ORBIT_OFFSET,
            type: 'normal',
            orbitSpeed: CONFIG.BASE_ORBIT_SPEED,
            direction: 1,
            color: randomChoice(CONFIG.COLORS.normal),
            visited: true
        };
    }, []);

    /**
     * 生成新星球
     */
    const generateNextPlanet = useCallback((fromPlanet: Planet, currentScore: number): Planet => {
        const type = getPlanetType(currentScore);

        // 計算距離和角度
        const dist = random(CONFIG.MIN_PLANET_DISTANCE, CONFIG.MAX_PLANET_DISTANCE);
        const angle = random(0, Math.PI * 2);

        // 根據類型設定大小
        let radius: number;
        switch (type) {
            case 'small':
                radius = random(CONFIG.MIN_PLANET_RADIUS, CONFIG.MIN_PLANET_RADIUS + 10);
                break;
            case 'giant':
                radius = random(CONFIG.MAX_PLANET_RADIUS - 10, CONFIG.MAX_PLANET_RADIUS);
                break;
            default:
                radius = random(CONFIG.MIN_PLANET_RADIUS + 5, CONFIG.MAX_PLANET_RADIUS - 10);
        }

        // 根據類型設定旋轉速度
        let orbitSpeed = CONFIG.BASE_ORBIT_SPEED;
        if (type === 'fast') orbitSpeed *= 1.8;
        if (type === 'small') orbitSpeed *= 1.3;
        if (type === 'giant') orbitSpeed *= 0.7;

        const direction: 1 | -1 = type === 'reverse' ? -1 : 1;
        const colors = CONFIG.COLORS[type] || CONFIG.COLORS.normal;

        const planet: Planet = {
            x: fromPlanet.x + Math.cos(angle) * dist,
            y: fromPlanet.y + Math.sin(angle) * dist,
            radius,
            orbitRadius: radius + CONFIG.ORBIT_OFFSET,
            type,
            orbitSpeed,
            direction,
            color: randomChoice(colors),
            visited: false
        };

        // 移動星球特性
        if (type === 'moving') {
            planet.moveAxis = Math.random() > 0.5 ? 'x' : 'y';
            planet.moveRange = random(30, 60);
            planet.moveSpeed = random(0.01, 0.025);
            planet.movePhase = random(0, Math.PI * 2);
            planet.baseX = planet.x;
            planet.baseY = planet.y;
        }

        return planet;
    }, []);

    /**
     * 生成特殊天體（黑洞/白洞）
     */
    const generateCelestial = useCallback((nearPlanet: Planet): Celestial | null => {
        if (Math.random() > 0.3) return null;

        const type: CelestialType = Math.random() > 0.5 ? 'blackhole' : 'whitehole';
        const dist = random(80, 150);
        const angle = random(0, Math.PI * 2);

        return {
            x: nearPlanet.x + Math.cos(angle) * dist,
            y: nearPlanet.y + Math.sin(angle) * dist,
            radius: type === 'blackhole' ? random(15, 25) : random(12, 20),
            type,
            strength: type === 'blackhole' ? CONFIG.BLACKHOLE_STRENGTH : CONFIG.WHITEHOLE_STRENGTH,
            rotation: 0
        };
    }, []);

    /**
     * 生成收集星星
     */
    const generateStars = useCallback((fromPlanet: Planet, toPlanet: Planet): Star[] => {
        const stars: Star[] = [];
        const count = Math.floor(random(2, 6));  // 增加星星數量

        // 計算兩星球之間的距離
        const dx = toPlanet.x - fromPlanet.x;
        const dy = toPlanet.y - fromPlanet.y;
        const pathLength = Math.sqrt(dx * dx + dy * dy);

        // 計算垂直於路徑的方向（用於橫向散佈）
        const perpX = -dy / pathLength;
        const perpY = dx / pathLength;

        for (let i = 0; i < count; i++) {
            // 沿路徑分布（避開太靠近星球的位置）
            const t = random(0.25, 0.75);
            // 橫向偏移（沿垂直方向散佈）
            const spread = random(-60, 60);

            const baseX = fromPlanet.x + dx * t;
            const baseY = fromPlanet.y + dy * t;

            const starX = baseX + perpX * spread;
            const starY = baseY + perpY * spread;

            // 確保星星不會太靠近任何星球
            const distFromOrigin = distance(starX, starY, fromPlanet.x, fromPlanet.y);
            const distFromTarget = distance(starX, starY, toPlanet.x, toPlanet.y);
            const minSafeDistance = Math.max(fromPlanet.orbitRadius, toPlanet.orbitRadius) + 20;

            if (distFromOrigin > minSafeDistance && distFromTarget > minSafeDistance) {
                stars.push({
                    x: starX,
                    y: starY,
                    collected: false
                });
            }
        }

        return stars;
    }, []);

    /**
     * 生成粒子效果
     */
    const spawnParticles = useCallback((
        x: number,
        y: number,
        count: number,
        color: string,
        spread: number = 2
    ) => {
        for (let i = 0; i < count; i++) {
            particlesRef.current.push({
                x,
                y,
                vx: random(-spread, spread),
                vy: random(-spread, spread),
                life: random(20, 40),
                maxLife: 40,
                color,
                size: random(1, 3)
            });
        }
    }, []);

    // ========================================================================
    // 遊戲邏輯
    // ========================================================================

    /**
     * 發射太空船
     */
    const launchShip = useCallback(() => {
        const ship = shipRef.current;
        if (!ship.isOrbiting) return;

        const planet = planetsRef.current[ship.currentPlanet];
        if (!planet) return;

        // 計算切線方向
        const tangentAngle = ship.angle + (planet.direction * Math.PI / 2);

        ship.vx = Math.cos(tangentAngle) * CONFIG.LAUNCH_SPEED;
        ship.vy = Math.sin(tangentAngle) * CONFIG.LAUNCH_SPEED;
        ship.isOrbiting = false;

        // 發射粒子效果
        spawnParticles(ship.x, ship.y, 10, '#ffaa00', 3);
    }, [spawnParticles]);

    /**
     * 更新太空船位置
     */
    const updateShip = useCallback(() => {
        const ship = shipRef.current;
        const planets = planetsRef.current;

        if (ship.isOrbiting) {
            // 軌道旋轉
            const planet = planets[ship.currentPlanet];
            if (!planet) return;

            // 更新移動星球位置
            if (planet.type === 'moving' && planet.baseX !== undefined && planet.baseY !== undefined) {
                planet.movePhase = (planet.movePhase || 0) + (planet.moveSpeed || 0.02);
                if (planet.moveAxis === 'x') {
                    planet.x = planet.baseX + Math.sin(planet.movePhase) * (planet.moveRange || 40);
                } else {
                    planet.y = planet.baseY + Math.sin(planet.movePhase) * (planet.moveRange || 40);
                }
            }

            ship.angle += planet.orbitSpeed * planet.direction;
            ship.x = planet.x + Math.cos(ship.angle) * planet.orbitRadius;
            ship.y = planet.y + Math.sin(ship.angle) * planet.orbitRadius;

            // 在軌道上也能收集星星
            starsRef.current.forEach(star => {
                if (!star.collected && distance(ship.x, ship.y, star.x, star.y) < 20) {
                    star.collected = true;
                    setScore(s => s + CONFIG.STAR_SCORE);
                    spawnParticles(star.x, star.y, 8, '#ffd700', 2);
                }
            });
        } else {
            // 自由飛行
            // 應用引力
            celestialsRef.current.forEach(celestial => {
                const dist = distance(ship.x, ship.y, celestial.x, celestial.y);
                if (dist < CONFIG.GRAVITY_RANGE && dist > 0) {
                    const dx = celestial.x - ship.x;
                    const dy = celestial.y - ship.y;
                    const force = celestial.strength * (1 - dist / CONFIG.GRAVITY_RANGE);
                    const multiplier = celestial.type === 'whitehole' ? -1 : 1;

                    ship.vx += (dx / dist) * force * multiplier;
                    ship.vy += (dy / dist) * force * multiplier;
                }

                // 黑洞吞噬判定
                if (celestial.type === 'blackhole' && dist < CONFIG.BLACKHOLE_KILL_RADIUS) {
                    setGameStatus('gameover');
                    spawnParticles(ship.x, ship.y, 30, '#ff0000', 5);
                }
            });

            // 更新位置
            ship.x += ship.vx;
            ship.y += ship.vy;

            // 更新軌跡
            ship.trail.push({ x: ship.x, y: ship.y });
            if (ship.trail.length > CONFIG.TRAIL_LENGTH) {
                ship.trail.shift();
            }

            // 收集星星
            starsRef.current.forEach(star => {
                if (!star.collected && distance(ship.x, ship.y, star.x, star.y) < 15) {
                    star.collected = true;
                    setScore(s => s + CONFIG.STAR_SCORE);
                    spawnParticles(star.x, star.y, 8, '#ffd700', 2);
                }
            });

            // 檢查是否降落到新星球
            for (let i = 0; i < planets.length; i++) {
                if (i === ship.currentPlanet) continue;

                const planet = planets[i];
                const dist = distance(ship.x, ship.y, planet.x, planet.y);

                // 撞到星球表面
                if (dist < planet.radius) {
                    setGameStatus('gameover');
                    spawnParticles(ship.x, ship.y, 20, '#ff4444', 4);
                    return;
                }

                // 檢查是否在捕獲範圍內
                if (dist <= planet.orbitRadius + CONFIG.CAPTURE_RADIUS &&
                    dist >= planet.radius) {

                    // 計算入射角度
                    // 徑向方向（從星球指向太空船）
                    const radialX = (ship.x - planet.x) / dist;
                    const radialY = (ship.y - planet.y) / dist;

                    // 切線方向（垂直於徑向）
                    const tangentX = -radialY;
                    const tangentY = radialX;

                    // 太空船速度方向
                    const speed = Math.sqrt(ship.vx ** 2 + ship.vy ** 2);
                    if (speed > 0) {
                        const velX = ship.vx / speed;
                        const velY = ship.vy / speed;

                        // 計算速度與切線的夾角（取絕對值，因為順逆時針都可以）
                        const dotProduct = Math.abs(velX * tangentX + velY * tangentY);
                        const entryAngle = Math.acos(Math.min(1, dotProduct));

                        // 入射角度太大，無法捕獲，繼續飛行（穿過軌道）
                        if (entryAngle > CONFIG.MAX_ENTRY_ANGLE) {
                            continue;  // 跳過這顆星球，不捕獲
                        }
                    }

                    // 角度合適，降落成功
                    ship.isOrbiting = true;
                    ship.currentPlanet = i;
                    ship.angle = Math.atan2(ship.y - planet.y, ship.x - planet.x);
                    ship.trail = [];

                    if (!planet.visited) {
                        planet.visited = true;

                        // 計算分數
                        const comboBonus = Math.floor(CONFIG.BASE_SCORE * combo * CONFIG.COMBO_MULTIPLIER);
                        const earnedScore = CONFIG.BASE_SCORE + comboBonus;

                        setScore(s => s + earnedScore);
                        setCombo(c => c + 1);

                        // 重置連擊計時器
                        if (comboTimerRef.current) {
                            clearTimeout(comboTimerRef.current);
                        }
                        comboTimerRef.current = window.setTimeout(() => {
                            setCombo(0);
                        }, CONFIG.COMBO_TIMEOUT);

                        // 生成新星球
                        const newPlanet = generateNextPlanet(planet, score);
                        planetsRef.current.push(newPlanet);

                        // 生成特殊天體
                        if (score > 25) {
                            const celestial = generateCelestial(newPlanet);
                            if (celestial) {
                                celestialsRef.current.push(celestial);
                            }
                        }

                        // 生成星星
                        const newStars = generateStars(planet, newPlanet);
                        starsRef.current.push(...newStars);

                        // 降落粒子效果
                        spawnParticles(ship.x, ship.y, 15, planet.color, 3);
                    }
                    return;
                }
            }

            // 邊界檢測：檢查與最近未訪問星球的距離
            let minDistToTarget = Infinity;
            for (const planet of planets) {
                if (!planet.visited) {
                    const dist = distance(ship.x, ship.y, planet.x, planet.y);
                    if (dist < minDistToTarget) {
                        minDistToTarget = dist;
                    }
                }
            }

            // 如果離最近的目標星球太遠，遊戲結束
            if (minDistToTarget > CONFIG.MAX_DISTANCE_FROM_TARGET) {
                setGameStatus('gameover');
                spawnParticles(ship.x, ship.y, 15, '#ff4444', 3);
            }
        }
    }, [score, generateNextPlanet, generateCelestial, generateStars, spawnParticles]);

    /**
     * 更新攝影機位置
     */
    const updateCamera = useCallback(() => {
        const ship = shipRef.current;
        const camera = cameraRef.current;
        const target = targetCameraRef.current;

        // 目標位置：讓太空船保持在畫面中央偏左
        target.x = ship.x - CONFIG.CANVAS_WIDTH * 0.4;
        target.y = ship.y - CONFIG.CANVAS_HEIGHT * 0.5;

        // 平滑追蹤
        camera.x += (target.x - camera.x) * 0.08;
        camera.y += (target.y - camera.y) * 0.08;
    }, []);

    /**
     * 更新粒子
     */
    const updateParticles = useCallback(() => {
        particlesRef.current = particlesRef.current.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life--;
            return p.life > 0;
        });

        // 更新天體旋轉
        celestialsRef.current.forEach(c => {
            c.rotation += c.type === 'blackhole' ? 0.05 : -0.03;
        });
    }, []);

    // ========================================================================
    // 繪製函數
    // ========================================================================

    /**
     * 繪製遊戲畫面
     */
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const camera = cameraRef.current;
        const ship = shipRef.current;

        // 清除畫面
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // 繪製背景星星（視差）
        backgroundStarsRef.current.forEach(star => {
            const screenX = star.x - camera.x * star.parallax;
            const screenY = star.y - camera.y * star.parallax;

            // 環繞處理
            const wrappedX = ((screenX % CONFIG.CANVAS_WIDTH) + CONFIG.CANVAS_WIDTH) % CONFIG.CANVAS_WIDTH;
            const wrappedY = ((screenY % CONFIG.CANVAS_HEIGHT) + CONFIG.CANVAS_HEIGHT) % CONFIG.CANVAS_HEIGHT;

            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            ctx.beginPath();
            ctx.arc(wrappedX, wrappedY, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // 繪製特殊天體
        celestialsRef.current.forEach(celestial => {
            const screenX = celestial.x - camera.x;
            const screenY = celestial.y - camera.y;

            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(celestial.rotation);

            if (celestial.type === 'blackhole') {
                // 黑洞
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, celestial.radius * 2);
                gradient.addColorStop(0, '#000000');
                gradient.addColorStop(0.3, '#1a0033');
                gradient.addColorStop(0.6, '#330066');
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, celestial.radius * 2, 0, Math.PI * 2);
                ctx.fill();

                // 吸積盤
                ctx.strokeStyle = '#9933ff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(0, 0, celestial.radius * 1.5, celestial.radius * 0.5, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // 白洞
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, celestial.radius * 2);
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, '#ccffff');
                gradient.addColorStop(0.6, '#66ffff');
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, celestial.radius * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });

        // 繪製星球
        planetsRef.current.forEach((planet, index) => {
            const screenX = planet.x - camera.x;
            const screenY = planet.y - camera.y;

            // 跳過畫面外的星球
            if (screenX < -100 || screenX > CONFIG.CANVAS_WIDTH + 100 ||
                screenY < -100 || screenY > CONFIG.CANVAS_HEIGHT + 100) {
                return;
            }

            // 軌道線（所有星球都顯示）
            const isCurrentPlanet = index === ship.currentPlanet;
            const isNextTarget = !planet.visited && !isCurrentPlanet;

            // 捕獲範圍（淡色填充）- 只對未訪問的星球顯示
            if (isNextTarget) {
                ctx.fillStyle = 'rgba(100, 255, 100, 0.08)';
                ctx.beginPath();
                ctx.arc(screenX, screenY, planet.orbitRadius + CONFIG.CAPTURE_RADIUS, 0, Math.PI * 2);
                ctx.arc(screenX, screenY, planet.radius, 0, Math.PI * 2, true);
                ctx.fill();
            }

            // 軌道線
            if (isCurrentPlanet) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2;
            } else if (isNextTarget) {
                ctx.strokeStyle = 'rgba(100, 255, 100, 0.5)';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
            }
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(screenX, screenY, planet.orbitRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // 星球本體
            const gradient = ctx.createRadialGradient(
                screenX - planet.radius * 0.3,
                screenY - planet.radius * 0.3,
                0,
                screenX,
                screenY,
                planet.radius
            );
            gradient.addColorStop(0, planet.color);
            gradient.addColorStop(1, '#000');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, planet.radius, 0, Math.PI * 2);
            ctx.fill();

            // 星球類型指示
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';

            if (planet.type === 'fast') {
                ctx.fillText('⚡', screenX, screenY + 4);
            } else if (planet.type === 'reverse') {
                ctx.fillText('↺', screenX, screenY + 4);
            } else if (planet.type === 'moving') {
                ctx.fillText('↔', screenX, screenY + 4);
            }
        });

        // 繪製收集星星
        starsRef.current.forEach(star => {
            if (star.collected) return;

            const screenX = star.x - camera.x;
            const screenY = star.y - camera.y;

            ctx.fillStyle = '#ffd700';
            ctx.beginPath();

            // 五角星形狀
            const spikes = 5;
            const outerRadius = 8;
            const innerRadius = 4;

            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes - Math.PI / 2;
                const x = screenX + Math.cos(angle) * radius;
                const y = screenY + Math.sin(angle) * radius;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.closePath();
            ctx.fill();
        });

        // 繪製飛行軌跡
        if (ship.trail.length > 1) {
            ctx.lineCap = 'round';
            for (let i = 1; i < ship.trail.length; i++) {
                const alpha = i / ship.trail.length;
                ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.6})`;
                ctx.lineWidth = alpha * 3;
                ctx.beginPath();
                ctx.moveTo(ship.trail[i - 1].x - camera.x, ship.trail[i - 1].y - camera.y);
                ctx.lineTo(ship.trail[i].x - camera.x, ship.trail[i].y - camera.y);
                ctx.stroke();
            }
        }

        // 繪製太空船
        const shipScreenX = ship.x - camera.x;
        const shipScreenY = ship.y - camera.y;

        ctx.save();
        ctx.translate(shipScreenX, shipScreenY);

        // 計算太空船朝向
        let shipAngle: number;
        if (ship.isOrbiting) {
            const planet = planetsRef.current[ship.currentPlanet];
            shipAngle = ship.angle + (planet?.direction === 1 ? Math.PI / 2 : -Math.PI / 2);
        } else {
            shipAngle = Math.atan2(ship.vy, ship.vx);
        }
        ctx.rotate(shipAngle);

        // 太空船形狀
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(CONFIG.SHIP_SIZE, 0);
        ctx.lineTo(-CONFIG.SHIP_SIZE, -CONFIG.SHIP_SIZE * 0.6);
        ctx.lineTo(-CONFIG.SHIP_SIZE * 0.5, 0);
        ctx.lineTo(-CONFIG.SHIP_SIZE, CONFIG.SHIP_SIZE * 0.6);
        ctx.closePath();
        ctx.fill();

        // 引擎光
        if (!ship.isOrbiting) {
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(-CONFIG.SHIP_SIZE * 0.5, 0);
            ctx.lineTo(-CONFIG.SHIP_SIZE * 1.2, -CONFIG.SHIP_SIZE * 0.3);
            ctx.lineTo(-CONFIG.SHIP_SIZE * 1.5, 0);
            ctx.lineTo(-CONFIG.SHIP_SIZE * 1.2, CONFIG.SHIP_SIZE * 0.3);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();

        // 繪製粒子
        particlesRef.current.forEach(p => {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            ctx.beginPath();
            ctx.arc(p.x - camera.x, p.y - camera.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
    }, []);

    // ========================================================================
    // 遊戲迴圈
    // ========================================================================

    const gameLoop = useCallback((timestamp: number) => {
        const deltaTime = timestamp - lastTimeRef.current;

        if (deltaTime >= 1000 / CONFIG.FPS) {
            lastTimeRef.current = timestamp;

            if (gameStatus === 'playing') {
                updateShip();
                updateCamera();
                updateParticles();
            }

            render();
        }

        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }, [gameStatus, updateShip, updateCamera, updateParticles, render]);

    // ========================================================================
    // 遊戲控制
    // ========================================================================

    /**
     * 開始遊戲
     */
    const startGame = useCallback(() => {
        // 重置狀態
        const initialPlanet = generateInitialPlanet();
        planetsRef.current = [initialPlanet];
        celestialsRef.current = [];
        starsRef.current = [];
        particlesRef.current = [];

        // 生成第一個目標星球
        const nextPlanet = generateNextPlanet(initialPlanet, 0);
        planetsRef.current.push(nextPlanet);

        // 生成星星
        const stars = generateStars(initialPlanet, nextPlanet);
        starsRef.current = stars;

        // 重置太空船
        shipRef.current = {
            x: initialPlanet.x + initialPlanet.orbitRadius,
            y: initialPlanet.y,
            vx: 0,
            vy: 0,
            angle: 0,
            isOrbiting: true,
            currentPlanet: 0,
            trail: []
        };

        // 重置攝影機
        cameraRef.current = {
            x: initialPlanet.x - CONFIG.CANVAS_WIDTH * 0.4,
            y: initialPlanet.y - CONFIG.CANVAS_HEIGHT * 0.5
        };
        targetCameraRef.current = { ...cameraRef.current };

        // 生成背景
        generateBackgroundStars();

        // 重置分數
        setScore(0);
        setCombo(0);
        if (comboTimerRef.current) {
            clearTimeout(comboTimerRef.current);
        }

        setGameStatus('playing');
    }, [generateInitialPlanet, generateNextPlanet, generateStars, generateBackgroundStars]);

    /**
     * 暫停/繼續遊戲
     */
    const togglePause = useCallback(() => {
        if (gameStatus === 'playing') {
            setGameStatus('paused');
        } else if (gameStatus === 'paused') {
            setGameStatus('playing');
        }
    }, [gameStatus]);

    // ========================================================================
    // Effects
    // ========================================================================

    // 遊戲迴圈
    useEffect(() => {
        lastTimeRef.current = performance.now();
        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [gameLoop]);

    // 鍵盤事件
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameStatus === 'idle' || gameStatus === 'gameover') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    startGame();
                }
                return;
            }

            if (e.code === 'KeyP' || e.code === 'Escape') {
                e.preventDefault();
                togglePause();
                return;
            }

            if (gameStatus === 'playing' && e.code === 'Space') {
                e.preventDefault();
                launchShip();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameStatus, startGame, togglePause, launchShip]);

    // 更新最高分
    useEffect(() => {
        if (gameStatus === 'gameover' && score > highScore) {
            setHighScore(score);
            localStorage.setItem('spacecraft-highscore', score.toString());
        }
    }, [gameStatus, score, highScore]);

    // 初始背景
    useEffect(() => {
        generateBackgroundStars();
    }, [generateBackgroundStars]);

    // ========================================================================
    // 事件處理
    // ========================================================================

    const handleCanvasClick = () => {
        if (gameStatus === 'idle' || gameStatus === 'gameover') {
            startGame();
        } else if (gameStatus === 'playing') {
            launchShip();
        }
    };

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <div className="Spacecraft">
            <h1 className="title">Spacecraft</h1>

            <div className="game-container">
                {/* 分數顯示 */}
                <div className="score-panel">
                    <div className="score">
                        <span className="label">分數</span>
                        <span className="value">{score}</span>
                    </div>
                    {combo > 1 && (
                        <div className="combo">
                            <span className="value">x{combo}</span>
                        </div>
                    )}
                    <div className="high-score">
                        <span className="label">最高</span>
                        <span className="value">{highScore}</span>
                    </div>
                </div>

                {/* 遊戲畫布 */}
                <canvas
                    ref={canvasRef}
                    width={CONFIG.CANVAS_WIDTH}
                    height={CONFIG.CANVAS_HEIGHT}
                    className="game-canvas"
                    onClick={handleCanvasClick}
                />

                {/* 覆蓋層 */}
                {gameStatus === 'idle' && (
                    <div className="overlay overlay--idle">
                        <div className="overlay-content">
                            <h2>Spacecraft</h2>
                            <p>在星球間穿梭的軌道跳躍遊戲</p>
                            <div className="instructions">
                                <p>🚀 太空船會自動繞著星球旋轉</p>
                                <p>👆 點擊或按空白鍵發射</p>
                                <p>🎯 成功降落到下一個星球</p>
                                <p>⭐ 收集星星獲得額外分數</p>
                                <p>⚠️ 小心黑洞和白洞！</p>
                            </div>
                            <button className="start-btn" onClick={startGame}>
                                開始遊戲
                            </button>
                            <p className="hint">按 Space 或點擊開始</p>
                        </div>
                    </div>
                )}

                {gameStatus === 'paused' && (
                    <div className="overlay overlay--paused">
                        <div className="overlay-content">
                            <h2>遊戲暫停</h2>
                            <button className="start-btn" onClick={togglePause}>
                                繼續遊戲
                            </button>
                            <p className="hint">按 P 或 Esc 繼續</p>
                        </div>
                    </div>
                )}

                {gameStatus === 'gameover' && (
                    <div className="overlay overlay--gameover">
                        <div className="overlay-content">
                            <h2>遊戲結束</h2>
                            <div className="final-score">
                                <span className="label">最終分數</span>
                                <span className="value">{score}</span>
                            </div>
                            {score >= highScore && score > 0 && (
                                <p className="new-record">🎉 新紀錄！</p>
                            )}
                            <button className="start-btn" onClick={startGame}>
                                再玩一次
                            </button>
                            <p className="hint">按 Space 或點擊重新開始</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 操作說明 */}
            <div className="controls-hint">
                <span>空白鍵/點擊：發射</span>
                <span>P/Esc：暫停</span>
            </div>
        </div>
    );
}
