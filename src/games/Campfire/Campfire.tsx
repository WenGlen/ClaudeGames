import { useEffect, useRef, useState, useCallback } from 'react';
import './_Campfire.scss';

// ==================== 類型定義 ====================

type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

type Direction = 'up' | 'down' | 'left' | 'right' |
    'up-left' | 'up-right' | 'down-left' | 'down-right' | null;

type Zone = 'none' | 'campfire' | 'tree' | 'lake' | 'cashier'
    | 'storageDeposit' | 'storagePickup'
    | 'foodStoragePickup'
    | 'upgradePoint' | 'acceleratorPoint';

type UpgradeKey = 'axe' | 'rod' | 'boots' | 'backpack' | 'fireplace';

interface Position {
    x: number;
    y: number;
}

interface Resources {
    wood: number;
    rawFish: number;
    cookedFish: number;
    gold: number;
}

interface Upgrades {
    axe: number;
    rod: number;
    boots: number;
    backpack: number;
    fireplace: number;
}

interface TreeData {
    id: string;
    x: number;
    y: number;
    remainingHarvests: number;
}

interface ZoneDetection {
    zone: Zone;
    treeId: string | null;
    upgradeType: UpgradeKey | 'accelerator' | null;
}

interface UpgradeLevelDef {
    icon: string;
    name: string;
    descs: string[];
    effects: number[];
    prices: number[];
    pos: Position;
}

// ==================== 遊戲設定 ====================

const CONFIG = {
    // 地圖設定
    MAP_WIDTH: 800,
    MAP_HEIGHT: 450,
    VIEWPORT_WIDTH: 400,
    VIEWPORT_HEIGHT: 450,

    // 角色設定
    PLAYER_SIZE: 32,
    MOVE_SPEED: 2,

    // 搖桿設定
    JOYSTICK_BASE_SIZE: 180,
    JOYSTICK_HANDLE_SIZE: 75,
    JOYSTICK_DEAD_ZONE: 22,
    JOYSTICK_MAX_DISTANCE: 52,

    // 時間設定（毫秒）
    GAME_TICK: 100,
    CHOP_INTERVAL: 1000,
    FISH_INTERVAL: 1500,
    COOK_TIME: 3000,

    // 交互範圍
    CAMPFIRE_RANGE: 70,
    TREE_RANGE: 25,
    LAKE_RANGE: 50,
    CASHIER_RANGE: 45,
    STORAGE_RANGE: 20,
    UPGRADE_POINT_RANGE: 25,

    // 樹木設定
    TREE_HARVESTS: 10,
    TREE_MIN_SPACING: 50,

    // 儲木場設定（雙圓圈）
    STORAGE_CAPACITY: 20,
    POS_STORAGE: { x: 400, y: 90 },
    POS_STORAGE_DEPOSIT: { x: 380, y: 90 },
    POS_STORAGE_PICKUP: { x: 420, y: 90 },

    // 食物置物區設定（單圓圈取出）
    POS_FOOD_STORAGE: { x: 400, y: 245 },
    POS_FOOD_STORAGE_PICKUP: { x: 420, y: 245 },

    // 營火設定
    FIRE_MAX: 100,
    FIRE_CAPACITY: 110,
    FIRE_DECAY: 2,
    FIRE_ADD_WOOD: 20,

    // 體溫設定
    TEMP_MAX: 100,
    TEMP_WARM_RANGE: 70,
    TEMP_RECOVER: 4,
    TEMP_DECAY_NEAR: 2,
    TEMP_DECAY_MID: 4,
    TEMP_DECAY_FAR: 6,

    // 背包基礎
    BACKPACK_DEFAULT: 10,

    // 經濟設定
    FISH_SELL_PRICE: 10,
    GROWTH_ACCELERATOR_COST: 50,

    // 區域座標（中心點）
    POS_CAMPFIRE: { x: 400, y: 160 },
    POS_LAKE: { x: 550, y: 80 },
    POS_CASHIER: { x: 490, y: 250 },
    POS_PLAYER_START: { x: 400, y: 210 },
} as const;

/** 升級等級定義（含位置、效果、價格） */
const UPGRADE_LEVELS: Record<UpgradeKey, UpgradeLevelDef> = {
    axe: {
        icon: '🪓', name: '斧頭',
        descs: ['砍樹速度 +25%', '砍樹速度 +50%', '砍樹速度 +75%'],
        effects: [0.75, 0.50, 0.35],
        prices: [50, 100, 200],
        pos: { x: 220, y: 310 },
    },
    rod: {
        icon: '🎣', name: '釣竿',
        descs: ['釣魚速度 +25%', '釣魚速度 +50%', '釣魚速度 +75%'],
        effects: [0.75, 0.50, 0.35],
        prices: [75, 150, 300],
        pos: { x: 280, y: 310 },
    },
    boots: {
        icon: '🥾', name: '靴子',
        descs: ['移動速度 +25%', '移動速度 +50%', '移動速度 +75%'],
        effects: [2.5, 3.0, 3.5],
        prices: [100, 200, 400],
        pos: { x: 340, y: 310 },
    },
    backpack: {
        icon: '🎒', name: '背包',
        descs: ['背包容量 → 13', '背包容量 → 16', '背包容量 → 20'],
        effects: [13, 16, 20],
        prices: [125, 250, 500],
        pos: { x: 220, y: 370 },
    },
    fireplace: {
        icon: '🔥', name: '營火',
        descs: ['取暖範圍 → 88', '取暖範圍 → 105', '取暖範圍 → 122'],
        effects: [88, 105, 122],
        prices: [150, 300, 600],
        pos: { x: 280, y: 370 },
    },
};

/** 生長加速劑位置 */
const POS_ACCELERATOR = { x: 340, y: 370 };

/** 所有升級點的 key 陣列 */
const UPGRADE_KEYS: UpgradeKey[] = ['axe', 'rod', 'boots', 'backpack', 'fireplace'];

/** 初始樹木位置 */
const INITIAL_TREES: Omit<TreeData, 'id'>[] = [
    { x: 250, y: 80, remainingHarvests: 10 },
    { x: 290, y: 150, remainingHarvests: 10 },
    { x: 260, y: 220, remainingHarvests: 10 },
    { x: 60, y: 60, remainingHarvests: 10 },
    { x: 120, y: 130, remainingHarvests: 10 },
    { x: 70, y: 200, remainingHarvests: 10 },
    { x: 150, y: 270, remainingHarvests: 10 },
    { x: 180, y: 80, remainingHarvests: 10 },
    { x: 100, y: 340, remainingHarvests: 10 },
];

// ==================== 工具函數 ====================

const getDistance = (p1: Position, p2: Position): number =>
    Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

const getDirectionFromAngle = (angle: number): Direction => {
    if (angle >= 337.5 || angle < 22.5) return 'right';
    if (angle >= 22.5 && angle < 67.5) return 'up-right';
    if (angle >= 67.5 && angle < 112.5) return 'up';
    if (angle >= 112.5 && angle < 157.5) return 'up-left';
    if (angle >= 157.5 && angle < 202.5) return 'left';
    if (angle >= 202.5 && angle < 247.5) return 'down-left';
    if (angle >= 247.5 && angle < 292.5) return 'down';
    if (angle >= 292.5 && angle < 337.5) return 'down-right';
    return null;
};

const getMoveDelta = (direction: Direction): Position => {
    const diag = 0.707;
    switch (direction) {
        case 'up': return { x: 0, y: -1 };
        case 'down': return { x: 0, y: 1 };
        case 'left': return { x: -1, y: 0 };
        case 'right': return { x: 1, y: 0 };
        case 'up-left': return { x: -diag, y: -diag };
        case 'up-right': return { x: diag, y: -diag };
        case 'down-left': return { x: -diag, y: diag };
        case 'down-right': return { x: diag, y: diag };
        default: return { x: 0, y: 0 };
    }
};

const calculateCameraX = (playerX: number): number => {
    const halfViewport = CONFIG.VIEWPORT_WIDTH / 2;
    return Math.max(0, Math.min(CONFIG.MAP_WIDTH - CONFIG.VIEWPORT_WIDTH, playerX - halfViewport));
};

const findValidTreePosition = (existingTrees: TreeData[]): Position | null => {
    const MAX_ATTEMPTS = 50;
    const X_MIN = 50, X_MAX = 300;
    const Y_MIN = 40, Y_MAX = 400;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const x = X_MIN + Math.random() * (X_MAX - X_MIN);
        const y = Y_MIN + Math.random() * (Y_MAX - Y_MIN);
        const candidate = { x, y };
        if (existingTrees.some(t => getDistance(candidate, t) < CONFIG.TREE_MIN_SPACING)) continue;
        if (getDistance(candidate, CONFIG.POS_CAMPFIRE) < 80) continue;
        if (getDistance(candidate, CONFIG.POS_STORAGE) < 60) continue;
        return candidate;
    }
    return null;
};

/** 取得升級效果值 */
const getUpgradeEffect = (key: UpgradeKey, level: number): number => {
    if (level <= 0) {
        // 未升級時的基礎值
        if (key === 'boots') return CONFIG.MOVE_SPEED;
        if (key === 'backpack') return CONFIG.BACKPACK_DEFAULT;
        if (key === 'fireplace') return CONFIG.TEMP_WARM_RANGE;
        return 1.0; // axe / rod: interval multiplier = 1
    }
    return UPGRADE_LEVELS[key].effects[level - 1];
};

// ==================== 主元件 ====================

export default function Campfire() {
    // ===== 遊戲狀態 =====
    const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
    const [playerPos, setPlayerPos] = useState<Position>(CONFIG.POS_PLAYER_START);
    const [playerDirection, setPlayerDirection] = useState<Direction>('down');
    const [isMoving, setIsMoving] = useState(false);

    // ===== 生存狀態 =====
    const [temperature, setTemperature] = useState<number>(CONFIG.TEMP_MAX);
    const [fireFuel, setFireFuel] = useState<number>(CONFIG.FIRE_MAX);

    // ===== 資源狀態 =====
    const [resources, setResources] = useState<Resources>({ wood: 3, rawFish: 0, cookedFish: 0, gold: 0 });

    // ===== 升級狀態（0-3） =====
    const [upgrades, setUpgrades] = useState<Upgrades>({ axe: 0, rod: 0, boots: 0, backpack: 0, fireplace: 0 });

    // ===== 樹木狀態 =====
    const [trees, setTrees] = useState<TreeData[]>([]);
    const [activeTreeId, setActiveTreeId] = useState<string | null>(null);

    // ===== 儲存狀態 =====
    const [woodStorage, setWoodStorage] = useState(0);
    const [cookedFishStorage, setCookedFishStorage] = useState(0);

    // ===== 鏡頭狀態 =====
    const [cameraX, setCameraX] = useState(0);

    // ===== UI 狀態 =====
    const [currentZone, setCurrentZone] = useState<Zone>('none');
    const [showUpgradeUI, setShowUpgradeUI] = useState(false);
    const [activeUpgradeType, setActiveUpgradeType] = useState<UpgradeKey | 'accelerator' | null>(null);
    const [survivalTime, setSurvivalTime] = useState(0);
    const [gatherProgress, setGatherProgress] = useState(0);
    const [cookingCount, setCookingCount] = useState(0);
    const [cookingProgress, setCookingProgress] = useState(0);

    // ===== 搖桿狀態 =====
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const [joystickActive, setJoystickActive] = useState(false);

    // ===== Refs =====
    const gameLoopRef = useRef<number | null>(null);
    const gatherLoopRef = useRef<number | null>(null);
    const joystickRef = useRef<{ startX: number; startY: number } | null>(null);
    const directionRef = useRef<Direction>(null);
    const keysPressed = useRef<Set<string>>(new Set());

    const stateRef = useRef<{
        playerPos: Position;
        temperature: number;
        fireFuel: number;
        resources: Resources;
        upgrades: Upgrades;
        currentZone: Zone;
        activeTreeId: string | null;
        trees: TreeData[];
        woodStorage: number;
        cookedFishStorage: number;
        cameraX: number;
        cookingCount: number;
        cookingProgress: number;
        survivalTime: number;
    }>({
        playerPos: { ...CONFIG.POS_PLAYER_START },
        temperature: CONFIG.TEMP_MAX,
        fireFuel: CONFIG.FIRE_MAX,
        resources: { wood: 3, rawFish: 0, cookedFish: 0, gold: 0 },
        upgrades: { axe: 0, rod: 0, boots: 0, backpack: 0, fireplace: 0 },
        currentZone: 'none',
        activeTreeId: null,
        trees: [],
        woodStorage: 0,
        cookedFishStorage: 0,
        cameraX: 0,
        cookingCount: 0,
        cookingProgress: 0,
        survivalTime: 0,
    });

    // ===== 衍生值 =====
    const backpackCapacity = getUpgradeEffect('backpack', upgrades.backpack);
    const currentLoad = resources.wood + resources.rawFish + resources.cookedFish;
    const warmRange = getUpgradeEffect('fireplace', upgrades.fireplace);

    // ==================== 遊戲邏輯 ====================

    const detectZone = useCallback((pos: Position): ZoneDetection => {
        const none: ZoneDetection = { zone: 'none', treeId: null, upgradeType: null };

        // 營火
        if (getDistance(pos, CONFIG.POS_CAMPFIRE) <= CONFIG.CAMPFIRE_RANGE) {
            return { zone: 'campfire', treeId: null, upgradeType: null };
        }

        // 儲木場存入（左圓）
        if (getDistance(pos, CONFIG.POS_STORAGE_DEPOSIT) <= CONFIG.STORAGE_RANGE) {
            return { zone: 'storageDeposit', treeId: null, upgradeType: null };
        }
        // 儲木場取出（右圓）
        if (getDistance(pos, CONFIG.POS_STORAGE_PICKUP) <= CONFIG.STORAGE_RANGE) {
            return { zone: 'storagePickup', treeId: null, upgradeType: null };
        }

        // 食物置物區取出（右圓）
        if (getDistance(pos, CONFIG.POS_FOOD_STORAGE_PICKUP) <= CONFIG.STORAGE_RANGE) {
            return { zone: 'foodStoragePickup', treeId: null, upgradeType: null };
        }

        // 冰湖
        if (getDistance(pos, CONFIG.POS_LAKE) <= CONFIG.LAKE_RANGE) {
            return { zone: 'lake', treeId: null, upgradeType: null };
        }

        // 收銀台
        if (getDistance(pos, CONFIG.POS_CASHIER) <= CONFIG.CASHIER_RANGE) {
            return { zone: 'cashier', treeId: null, upgradeType: null };
        }

        // 升級點（5 個）
        for (const key of UPGRADE_KEYS) {
            if (getDistance(pos, UPGRADE_LEVELS[key].pos) <= CONFIG.UPGRADE_POINT_RANGE) {
                return { zone: 'upgradePoint', treeId: null, upgradeType: key };
            }
        }

        // 生長加速劑點
        if (getDistance(pos, POS_ACCELERATOR) <= CONFIG.UPGRADE_POINT_RANGE) {
            return { zone: 'acceleratorPoint', treeId: null, upgradeType: 'accelerator' };
        }

        // 個別樹木
        const currentTrees = stateRef.current.trees;
        for (const tree of currentTrees) {
            if (tree.remainingHarvests > 0 && getDistance(pos, tree) <= CONFIG.TREE_RANGE) {
                return { zone: 'tree', treeId: tree.id, upgradeType: null };
            }
        }

        return none;
    }, []);

    const calculateTempChange = useCallback((pos: Position, fuel: number): number => {
        const distToCampfire = getDistance(pos, CONFIG.POS_CAMPFIRE);
        const range = getUpgradeEffect('fireplace', stateRef.current.upgrades.fireplace);

        if (fuel <= 0) {
            if (distToCampfire < 150) return -CONFIG.TEMP_DECAY_NEAR;
            if (distToCampfire < 250) return -CONFIG.TEMP_DECAY_MID;
            return -CONFIG.TEMP_DECAY_FAR;
        }

        if (distToCampfire <= range) {
            return CONFIG.TEMP_RECOVER;
        }

        if (distToCampfire < 150) return -CONFIG.TEMP_DECAY_NEAR;
        if (distToCampfire < 250) return -CONFIG.TEMP_DECAY_MID;
        return -CONFIG.TEMP_DECAY_FAR;
    }, []);

    const startGame = useCallback(() => {
        const initialTrees = INITIAL_TREES.map((t, i) => ({ ...t, id: `tree-${i}` }));
        const initCameraX = calculateCameraX(CONFIG.POS_PLAYER_START.x);

        setGameStatus('playing');
        setPlayerPos(CONFIG.POS_PLAYER_START);
        setPlayerDirection('down');
        setTemperature(CONFIG.TEMP_MAX);
        setFireFuel(CONFIG.FIRE_MAX);
        setResources({ wood: 3, rawFish: 0, cookedFish: 0, gold: 0 });
        setUpgrades({ axe: 0, rod: 0, boots: 0, backpack: 0, fireplace: 0 });
        setSurvivalTime(0);
        setCookingCount(0);
        setCookingProgress(0);
        setGatherProgress(0);
        setCurrentZone('none');
        setTrees(initialTrees);
        setActiveTreeId(null);
        setWoodStorage(0);
        setCookedFishStorage(0);
        setCameraX(initCameraX);
        setShowUpgradeUI(false);
        setActiveUpgradeType(null);

        stateRef.current = {
            playerPos: { ...CONFIG.POS_PLAYER_START },
            temperature: CONFIG.TEMP_MAX,
            fireFuel: CONFIG.FIRE_MAX,
            resources: { wood: 3, rawFish: 0, cookedFish: 0, gold: 0 },
            upgrades: { axe: 0, rod: 0, boots: 0, backpack: 0, fireplace: 0 },
            currentZone: 'none',
            activeTreeId: null,
            trees: initialTrees,
            woodStorage: 0,
            cookedFishStorage: 0,
            cameraX: initCameraX,
            cookingCount: 0,
            cookingProgress: 0,
            survivalTime: 0,
        };
    }, []);

    const gameOver = useCallback(() => {
        setGameStatus('gameover');
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (gatherLoopRef.current) clearInterval(gatherLoopRef.current);
    }, []);

    // ==================== 搖桿控制 ====================

    const handleJoystickStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        const touch = 'touches' in e ? e.touches[0] : e;
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        joystickRef.current = { startX: centerX, startY: centerY };
        setJoystickActive(true);

        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const distance = Math.min(Math.sqrt(dx * dx + dy * dy), CONFIG.JOYSTICK_MAX_DISTANCE);
        const angle = Math.atan2(dy, dx);
        setJoystickPos({ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance });

        if (distance > CONFIG.JOYSTICK_DEAD_ZONE) {
            const degrees = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360;
            directionRef.current = getDirectionFromAngle(degrees);
            setIsMoving(true);
        }
    }, []);

    const handleJoystickMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (!joystickRef.current) return;
        e.preventDefault();
        const touch = 'touches' in e ? e.touches[0] : e;
        const dx = touch.clientX - joystickRef.current.startX;
        const dy = touch.clientY - joystickRef.current.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const clampedDistance = Math.min(distance, CONFIG.JOYSTICK_MAX_DISTANCE);
        const angle = Math.atan2(dy, dx);
        setJoystickPos({ x: Math.cos(angle) * clampedDistance, y: Math.sin(angle) * clampedDistance });

        if (distance > CONFIG.JOYSTICK_DEAD_ZONE) {
            const degrees = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360;
            const newDirection = getDirectionFromAngle(degrees);
            directionRef.current = newDirection;
            setPlayerDirection(newDirection);
            setIsMoving(true);
        } else {
            directionRef.current = null;
            setIsMoving(false);
        }
    }, []);

    const handleJoystickEnd = useCallback(() => {
        joystickRef.current = null;
        setJoystickActive(false);
        setJoystickPos({ x: 0, y: 0 });
        if (keysPressed.current.size === 0) {
            directionRef.current = null;
            setIsMoving(false);
        }
    }, []);

    const getDirectionFromKeys = useCallback((): Direction => {
        const keys = keysPressed.current;
        const up = keys.has('ArrowUp') || keys.has('w') || keys.has('W');
        const down = keys.has('ArrowDown') || keys.has('s') || keys.has('S');
        const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
        const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
        if (up && left) return 'up-left';
        if (up && right) return 'up-right';
        if (down && left) return 'down-left';
        if (down && right) return 'down-right';
        if (up) return 'up';
        if (down) return 'down';
        if (left) return 'left';
        if (right) return 'right';
        return null;
    }, []);

    // ==================== Effects ====================

    /** 鍵盤控制 */
    useEffect(() => {
        if (gameStatus !== 'playing') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
                e.preventDefault();
                keysPressed.current.add(e.key);
                const dir = getDirectionFromKeys();
                if (dir) { directionRef.current = dir; setPlayerDirection(dir); setIsMoving(true); }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key);
            const dir = getDirectionFromKeys();
            if (dir) { directionRef.current = dir; setPlayerDirection(dir); }
            else if (!joystickActive) { directionRef.current = null; setIsMoving(false); }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); keysPressed.current.clear(); };
    }, [gameStatus, getDirectionFromKeys, joystickActive]);

    /** 移動循環（16ms ≈ 60fps） */
    useEffect(() => {
        if (gameStatus !== 'playing') return;
        const moveInterval = window.setInterval(() => {
            if (!directionRef.current) return;
            const speed = getUpgradeEffect('boots', stateRef.current.upgrades.boots);
            const delta = getMoveDelta(directionRef.current);
            const currentPos = stateRef.current.playerPos;
            const halfSize = CONFIG.PLAYER_SIZE / 2;
            let newX = Math.max(halfSize, Math.min(CONFIG.MAP_WIDTH - halfSize, currentPos.x + delta.x * speed));
            let newY = Math.max(halfSize, Math.min(CONFIG.MAP_HEIGHT - halfSize, currentPos.y + delta.y * speed));
            const newPos = { x: newX, y: newY };
            stateRef.current.playerPos = newPos;
            setPlayerPos(newPos);

            const newCameraX = calculateCameraX(newX);
            stateRef.current.cameraX = newCameraX;
            setCameraX(newCameraX);

            const detection = detectZone(newPos);
            const prevZone = stateRef.current.currentZone;
            const prevTreeId = stateRef.current.activeTreeId;
            stateRef.current.currentZone = detection.zone;
            stateRef.current.activeTreeId = detection.treeId;
            setCurrentZone(detection.zone);
            setActiveTreeId(detection.treeId);

            if (detection.zone !== prevZone || detection.treeId !== prevTreeId) {
                setGatherProgress(0);
                if (detection.zone === 'upgradePoint' || detection.zone === 'acceleratorPoint') {
                    setActiveUpgradeType(detection.upgradeType);
                    setShowUpgradeUI(true);
                } else if (prevZone === 'upgradePoint' || prevZone === 'acceleratorPoint') {
                    setShowUpgradeUI(false);
                    setActiveUpgradeType(null);
                }
            }
        }, 16);
        return () => clearInterval(moveInterval);
    }, [gameStatus, detectZone]);

    /** 主遊戲循環 */
    useEffect(() => {
        if (gameStatus !== 'playing') return;
        gameLoopRef.current = window.setInterval(() => {
            const state = stateRef.current;

            state.survivalTime += 0.1;
            setSurvivalTime(state.survivalTime);

            const newFuel = Math.max(0, state.fireFuel - (CONFIG.FIRE_DECAY * 0.1));
            state.fireFuel = newFuel;
            setFireFuel(newFuel);

            const tempChange = calculateTempChange(state.playerPos, newFuel);
            const newTemp = Math.max(0, Math.min(CONFIG.TEMP_MAX, state.temperature + tempChange * 0.1));
            state.temperature = newTemp;
            setTemperature(newTemp);

            const zone = state.currentZone;

            // 營火：添柴 + 烹飪
            if (zone === 'campfire') {
                if (state.fireFuel < CONFIG.FIRE_MAX && state.resources.wood > 0) {
                    state.resources.wood -= 1;
                    state.fireFuel = Math.min(CONFIG.FIRE_CAPACITY, state.fireFuel + CONFIG.FIRE_ADD_WOOD);
                    setResources({ ...state.resources });
                    setFireFuel(state.fireFuel);
                }
                if (state.resources.rawFish > 0 && state.cookingCount < 3 && state.fireFuel > 0) {
                    const fishToAdd = Math.min(state.resources.rawFish, 3 - state.cookingCount);
                    state.resources.rawFish -= fishToAdd;
                    state.cookingCount += fishToAdd;
                    setResources({ ...state.resources });
                    setCookingCount(state.cookingCount);
                }
            }

            // 收銀台
            if (zone === 'cashier' && state.resources.cookedFish > 0) {
                state.resources.gold += state.resources.cookedFish * CONFIG.FISH_SELL_PRICE;
                state.resources.cookedFish = 0;
                setResources({ ...state.resources });
            }

            // 儲木場存入
            if (zone === 'storageDeposit' && state.resources.wood > 0) {
                const space = CONFIG.STORAGE_CAPACITY - state.woodStorage;
                const toDeposit = Math.min(state.resources.wood, space);
                if (toDeposit > 0) {
                    state.resources.wood -= toDeposit;
                    state.woodStorage += toDeposit;
                    setResources({ ...state.resources });
                    setWoodStorage(state.woodStorage);
                }
            }

            // 儲木場取出
            if (zone === 'storagePickup' && state.woodStorage > 0) {
                const cap = getUpgradeEffect('backpack', state.upgrades.backpack);
                const load = state.resources.wood + state.resources.rawFish + state.resources.cookedFish;
                const toPickup = Math.min(state.woodStorage, cap - load);
                if (toPickup > 0) {
                    state.woodStorage -= toPickup;
                    state.resources.wood += toPickup;
                    setResources({ ...state.resources });
                    setWoodStorage(state.woodStorage);
                }
            }

            // 食物置物區取出
            if (zone === 'foodStoragePickup' && state.cookedFishStorage > 0) {
                const cap = getUpgradeEffect('backpack', state.upgrades.backpack);
                const load = state.resources.wood + state.resources.rawFish + state.resources.cookedFish;
                const toPickup = Math.min(state.cookedFishStorage, cap - load);
                if (toPickup > 0) {
                    state.cookedFishStorage -= toPickup;
                    state.resources.cookedFish += toPickup;
                    setResources({ ...state.resources });
                    setCookedFishStorage(state.cookedFishStorage);
                }
            }

            // 烹飪
            if (state.cookingCount > 0 && state.fireFuel > 0) {
                state.cookingProgress += (CONFIG.GAME_TICK / CONFIG.COOK_TIME) * 100;
                if (state.cookingProgress >= 100) {
                    state.cookingProgress = 0;
                    state.cookingCount -= 1;
                    state.cookedFishStorage += 1;
                    setCookingCount(state.cookingCount);
                    setCookedFishStorage(state.cookedFishStorage);
                }
                setCookingProgress(state.cookingProgress);
            }

            if (newTemp <= 0) gameOver();
        }, CONFIG.GAME_TICK);
        return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
    }, [gameStatus, calculateTempChange, gameOver]);

    /** 採集循環 */
    useEffect(() => {
        if (gameStatus !== 'playing') return;
        if (currentZone !== 'tree' && currentZone !== 'lake') {
            if (gatherLoopRef.current) { clearInterval(gatherLoopRef.current); gatherLoopRef.current = null; }
            setGatherProgress(0);
            return;
        }

        const isTree = currentZone === 'tree';
        const baseInterval = isTree ? CONFIG.CHOP_INTERVAL : CONFIG.FISH_INTERVAL;
        const upgradeKey: UpgradeKey = isTree ? 'axe' : 'rod';
        const multiplier = getUpgradeEffect(upgradeKey, stateRef.current.upgrades[upgradeKey]);
        const interval = baseInterval * multiplier;

        let progress = 0;
        const tickInterval = 100;
        const progressPerTick = (tickInterval / interval) * 100;

        gatherLoopRef.current = window.setInterval(() => {
            progress += progressPerTick;
            setGatherProgress(Math.min(100, progress));

            if (progress >= 100) {
                progress = 0;
                const state = stateRef.current;
                const cap = getUpgradeEffect('backpack', state.upgrades.backpack);
                const load = state.resources.wood + state.resources.rawFish + state.resources.cookedFish;
                if (load < cap) {
                    if (isTree && state.activeTreeId) {
                        const treeIdx = state.trees.findIndex(t => t.id === state.activeTreeId);
                        if (treeIdx !== -1 && state.trees[treeIdx].remainingHarvests > 0) {
                            state.resources.wood += 1;
                            state.trees[treeIdx].remainingHarvests -= 1;
                            if (state.trees[treeIdx].remainingHarvests <= 0) {
                                state.trees.splice(treeIdx, 1);
                                setTrees([...state.trees]);
                                state.activeTreeId = null;
                                state.currentZone = 'none';
                                setCurrentZone('none');
                                setActiveTreeId(null);
                            } else {
                                setTrees([...state.trees]);
                            }
                            setResources({ ...state.resources });
                        }
                    } else if (!isTree) {
                        state.resources.rawFish += 1;
                        setResources({ ...state.resources });
                    }
                }
            }
        }, tickInterval);

        return () => { if (gatherLoopRef.current) { clearInterval(gatherLoopRef.current); gatherLoopRef.current = null; } };
    }, [gameStatus, currentZone, activeTreeId]);

    // ==================== 升級系統 ====================

    const buyUpgradeLevel = useCallback((type: UpgradeKey) => {
        const state = stateRef.current;
        const currentLevel = state.upgrades[type];
        if (currentLevel >= 3) return;
        const price = UPGRADE_LEVELS[type].prices[currentLevel];
        if (state.resources.gold < price) return;
        state.resources.gold -= price;
        state.upgrades[type] = currentLevel + 1;
        setResources({ ...state.resources });
        setUpgrades({ ...state.upgrades });
    }, []);

    const buyGrowthAccelerator = useCallback(() => {
        const state = stateRef.current;
        if (state.resources.gold < CONFIG.GROWTH_ACCELERATOR_COST) return;
        const newPos = findValidTreePosition(state.trees);
        if (!newPos) return;
        state.resources.gold -= CONFIG.GROWTH_ACCELERATOR_COST;
        const newTree: TreeData = { id: `tree-${Date.now()}`, x: newPos.x, y: newPos.y, remainingHarvests: CONFIG.TREE_HARVESTS };
        state.trees.push(newTree);
        setTrees([...state.trees]);
        setResources({ ...state.resources });
    }, []);

    // ==================== 渲染 ====================

    const getTempClass = () => {
        if (temperature > 60) return '';
        if (temperature > 30) return 'cold';
        return 'freezing';
    };

    /** 升級星星顯示 */
    const renderStars = (level: number) => '★'.repeat(level) + '☆'.repeat(3 - level);

    return (
        <div className="Campfire">
            <h1 className="title">雪境營火</h1>

            {/* 遊戲地圖 */}
            <div className={`game-map ${getTempClass()}`}>
                <div className="world" style={{ transform: `scale(1.5) translateX(${-cameraX}px)` }}>

                    {/* 儲木場（雙圓圈） */}
                    <div className="storage-zone" style={{ left: CONFIG.POS_STORAGE.x, top: CONFIG.POS_STORAGE.y }}>
                        <div className="storage-circle left" style={{ left: -20 }}>
                            <span className="emoji">📥</span>
                            <span className="label">存入</span>
                        </div>
                        <div className="storage-count">🪵 {woodStorage}/{CONFIG.STORAGE_CAPACITY}</div>
                        <div className="storage-circle right" style={{ left: 20 }}>
                            <span className="emoji">📤</span>
                            <span className="label">取出</span>
                        </div>
                    </div>

                    {/* 個別樹木 */}
                    {trees.map(tree => (
                        <div
                            key={tree.id}
                            className={`tree ${activeTreeId === tree.id ? 'active' : ''}`}
                            style={{ left: tree.x, top: tree.y }}
                        >
                            <span className="emoji">🌲</span>
                            <div className="harvests-bar">
                                <div className="fill" style={{ width: `${(tree.remainingHarvests / CONFIG.TREE_HARVESTS) * 100}%` }} />
                            </div>
                        </div>
                    ))}

                    {/* 冰湖 */}
                    <div className="zone lake" style={{ left: CONFIG.POS_LAKE.x, top: CONFIG.POS_LAKE.y }}>
                        <span className="emoji">🧊</span>
                        <span className="label">冰湖</span>
                    </div>

                    {/* 營火 */}
                    <div className={`zone campfire ${fireFuel <= 0 ? 'extinguished' : ''}`}
                        style={{ left: CONFIG.POS_CAMPFIRE.x, top: CONFIG.POS_CAMPFIRE.y }}>
                        <span className="emoji flame">🔥</span>
                        <span className="label">營火</span>
                        <div className={`inline-bar fuel ${fireFuel < 30 ? 'low' : ''}`}>
                            <div className="fill" style={{ width: `${Math.min(fireFuel, CONFIG.FIRE_MAX)}%` }} />
                        </div>
                        {cookingCount > 0 && (
                            <div className="cooking-indicator">🍳 ×{cookingCount}</div>
                        )}
                    </div>

                    {/* 食物置物區（右圓取出） */}
                    <div className="storage-zone food" style={{ left: CONFIG.POS_FOOD_STORAGE.x, top: CONFIG.POS_FOOD_STORAGE.y }}>
                        <div className="storage-count">🍳 {cookedFishStorage}</div>
                        <div className="storage-circle right" style={{ left: 20 }}>
                            <span className="emoji">📤</span>
                            <span className="label">取出</span>
                        </div>
                    </div>

                    {/* 收銀台 */}
                    <div className="zone cashier" style={{ left: CONFIG.POS_CASHIER.x, top: CONFIG.POS_CASHIER.y }}>
                        <span className="emoji">🛒</span>
                        <span className="label">收銀台</span>
                    </div>

                    {/* 升級點（5+1） */}
                    {UPGRADE_KEYS.map(key => (
                        <div key={key} className="upgrade-point" style={{ left: UPGRADE_LEVELS[key].pos.x, top: UPGRADE_LEVELS[key].pos.y }}>
                            <span className="emoji">{UPGRADE_LEVELS[key].icon}</span>
                            <span className="level">{renderStars(upgrades[key])}</span>
                        </div>
                    ))}
                    <div className="upgrade-point accelerator" style={{ left: POS_ACCELERATOR.x, top: POS_ACCELERATOR.y }}>
                        <span className="emoji">🌱</span>
                        <span className="level">消耗品</span>
                    </div>

                    {/* SVG 範圍 + 路徑 */}
                    <svg className="paths" viewBox="0 0 800 450">
                        <circle cx={CONFIG.POS_CAMPFIRE.x} cy={CONFIG.POS_CAMPFIRE.y} r={warmRange} className="range-circle warm" />
                        <circle cx={CONFIG.POS_LAKE.x} cy={CONFIG.POS_LAKE.y} r={CONFIG.LAKE_RANGE} className="range-circle lake" />
                        <circle cx={CONFIG.POS_CAMPFIRE.x} cy={CONFIG.POS_CAMPFIRE.y} r={CONFIG.CAMPFIRE_RANGE} className="range-circle campfire" />
                        <circle cx={CONFIG.POS_CASHIER.x} cy={CONFIG.POS_CASHIER.y} r={CONFIG.CASHIER_RANGE} className="range-circle cashier" />
                        {/* 儲木場雙圈 */}
                        <circle cx={CONFIG.POS_STORAGE_DEPOSIT.x} cy={CONFIG.POS_STORAGE_DEPOSIT.y} r={CONFIG.STORAGE_RANGE} className="range-circle storage" />
                        <circle cx={CONFIG.POS_STORAGE_PICKUP.x} cy={CONFIG.POS_STORAGE_PICKUP.y} r={CONFIG.STORAGE_RANGE} className="range-circle storage" />
                        {/* 食物置物區圈 */}
                        <circle cx={CONFIG.POS_FOOD_STORAGE_PICKUP.x} cy={CONFIG.POS_FOOD_STORAGE_PICKUP.y} r={CONFIG.STORAGE_RANGE} className="range-circle food-storage" />
                        {/* 升級點範圍 */}
                        {UPGRADE_KEYS.map(key => (
                            <circle key={`range-${key}`} cx={UPGRADE_LEVELS[key].pos.x} cy={UPGRADE_LEVELS[key].pos.y} r={CONFIG.UPGRADE_POINT_RANGE} className="range-circle upgrade" />
                        ))}
                        <circle cx={POS_ACCELERATOR.x} cy={POS_ACCELERATOR.y} r={CONFIG.UPGRADE_POINT_RANGE} className="range-circle upgrade" />
                        {/* 樹木範圍 */}
                        {trees.map(tree => (
                            <circle key={`range-${tree.id}`} cx={tree.x} cy={tree.y} r={CONFIG.TREE_RANGE} className="range-circle tree" />
                        ))}
                        {/* 路徑 */}
                        <path d={`M ${CONFIG.POS_LAKE.x} ${CONFIG.POS_LAKE.y} L ${CONFIG.POS_CAMPFIRE.x} ${CONFIG.POS_CAMPFIRE.y}`} className="path-line" />
                        <path d={`M ${CONFIG.POS_CAMPFIRE.x} ${CONFIG.POS_CAMPFIRE.y} L ${CONFIG.POS_CASHIER.x} ${CONFIG.POS_CASHIER.y}`} className="path-line" />
                        <path d={`M ${CONFIG.POS_CAMPFIRE.x} ${CONFIG.POS_CAMPFIRE.y} L ${CONFIG.POS_STORAGE.x} ${CONFIG.POS_STORAGE.y}`} className="path-line" />
                        <path d={`M ${CONFIG.POS_CAMPFIRE.x} ${CONFIG.POS_CAMPFIRE.y} L ${CONFIG.POS_FOOD_STORAGE.x} ${CONFIG.POS_FOOD_STORAGE.y}`} className="path-line" />
                    </svg>

                    {/* 玩家 */}
                    {gameStatus === 'playing' && (
                        <div
                            className={`player ${isMoving ? 'walking' : ''} facing-${playerDirection || 'down'}`}
                            style={{ left: playerPos.x, top: playerPos.y }}
                        >
                            <div className={`inline-bar temp ${temperature < 30 ? 'low' : ''}`}>
                                <div className="fill" style={{ width: `${temperature}%` }} />
                            </div>
                            <span className="player-emoji">🧍</span>
                            {currentLoad > 0 && (
                                <div className="carried-items">
                                    {resources.wood > 0 && <span>{'🪵'.repeat(resources.wood)}</span>}
                                    {resources.rawFish > 0 && <span>{'🐟'.repeat(resources.rawFish)}</span>}
                                    {resources.cookedFish > 0 && <span>{'🍳'.repeat(resources.cookedFish)}</span>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 下方欄位：物品欄 + 金幣 */}
            {gameStatus === 'playing' && (
                <div className="bottom-bar">
                    <div className="inventory">
                        <div className="item"><span className="emoji">🪵</span><span className="count">{resources.wood}</span></div>
                        <div className="item"><span className="emoji">🐟</span><span className="count">{resources.rawFish}</span></div>
                        <div className="item"><span className="emoji">🍳</span><span className="count">{resources.cookedFish}</span></div>
                        <div className="capacity">背包: {currentLoad}/{backpackCapacity}</div>
                    </div>
                    <div className="gold-display">
                        <span className="icon">💰</span>
                        <span className="value">{resources.gold}</span>
                    </div>
                </div>
            )}

            {/* 行動指示 */}
            {gameStatus === 'playing' && (currentZone === 'tree' || currentZone === 'lake' || currentZone === 'campfire') && (
                <div className="action-indicator">
                    {currentZone === 'tree' && (
                        <><span>🪓 砍樹中...</span><div className="progress-bar"><div className="fill" style={{ width: `${gatherProgress}%` }} /></div></>
                    )}
                    {currentZone === 'lake' && (
                        <><span>🎣 釣魚中...</span><div className="progress-bar"><div className="fill" style={{ width: `${gatherProgress}%` }} /></div></>
                    )}
                    {currentZone === 'campfire' && (
                        <>
                            <span>🔥 取暖中 {fireFuel > 0 ? '+4/秒' : '(熄滅)'}</span>
                            {cookingCount > 0 && (
                                <div className="cooking-status">
                                    <span>🍳 烹飪: {cookingCount}條</span>
                                    <div className="progress-bar"><div className="fill" style={{ width: `${cookingProgress}%` }} /></div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 搖桿 */}
            {gameStatus === 'playing' && (
                <div
                    className={`joystick ${joystickActive ? 'active' : ''}`}
                    onMouseDown={handleJoystickStart}
                    onMouseMove={handleJoystickMove}
                    onMouseUp={handleJoystickEnd}
                    onMouseLeave={handleJoystickEnd}
                    onTouchStart={handleJoystickStart}
                    onTouchMove={handleJoystickMove}
                    onTouchEnd={handleJoystickEnd}
                >
                    <div className="base">
                        <div className="handle" style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }} />
                    </div>
                </div>
            )}

            {/* 升級卡片 */}
            {showUpgradeUI && gameStatus === 'playing' && activeUpgradeType && (
                <div className="upgrade-card">
                    {activeUpgradeType !== 'accelerator' ? (() => {
                        const def = UPGRADE_LEVELS[activeUpgradeType];
                        const level = upgrades[activeUpgradeType];
                        const maxed = level >= 3;
                        return (
                            <>
                                <div className="card-header">
                                    <span className="card-icon">{def.icon}</span>
                                    <span className="card-name">{def.name}</span>
                                    <span className="card-stars">{renderStars(level)}</span>
                                </div>
                                {maxed ? (
                                    <div className="card-maxed">已滿級</div>
                                ) : (
                                    <>
                                        <div className="card-desc">下一階: {def.descs[level]}</div>
                                        <button
                                            className="card-buy"
                                            onClick={() => buyUpgradeLevel(activeUpgradeType)}
                                            disabled={resources.gold < def.prices[level]}
                                        >
                                            ${def.prices[level]}
                                        </button>
                                    </>
                                )}
                            </>
                        );
                    })() : (
                        <>
                            <div className="card-header">
                                <span className="card-icon">🌱</span>
                                <span className="card-name">生長加速劑</span>
                            </div>
                            <div className="card-desc">在隨機位置長出一棵新樹</div>
                            <button
                                className="card-buy"
                                onClick={buyGrowthAccelerator}
                                disabled={resources.gold < CONFIG.GROWTH_ACCELERATOR_COST}
                            >
                                ${CONFIG.GROWTH_ACCELERATOR_COST}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* 開始畫面 */}
            {gameStatus === 'idle' && (
                <div className="overlay">
                    <div className="panel">
                        <h2>❄️ 雪境營火 ❄️</h2>
                        <div className="instructions">
                            <p>在雪地中生存！</p>
                            <p>🔥 維持營火燃燒，否則會凍死</p>
                            <p>🪓 砍樹獲得木材當燃料</p>
                            <p>🎣 釣魚、烹飪、販售賺金幣</p>
                            <p>🔧 購買升級提升效率</p>
                            <p>🪵 儲木場可暫存木柴</p>
                        </div>
                        <button className="start-btn" onClick={startGame}>開始遊戲</button>
                    </div>
                </div>
            )}

            {/* 遊戲結束 */}
            {gameStatus === 'gameover' && (
                <div className="overlay gameover">
                    <div className="panel">
                        <h2>❄️ 你凍死了 ❄️</h2>
                        <div className="stats">
                            <p>存活時間: {Math.floor(survivalTime)} 秒</p>
                            <p>賺取金幣: {resources.gold}</p>
                        </div>
                        <button className="start-btn" onClick={startGame}>重新開始</button>
                    </div>
                </div>
            )}
        </div>
    );
}
