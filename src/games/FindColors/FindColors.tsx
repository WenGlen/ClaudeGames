import { useEffect, useRef, useState, useCallback } from 'react';
import './_FindColors.scss';

/** 遊戲狀態 */
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

/** RGB 顏色 */
interface RGB {
    r: number;
    g: number;
    b: number;
}

/** LAB 顏色 */
interface LAB {
    l: number;
    a: number;
    b: number;
}

/** 色塊選項 */
interface ColorOption {
    id: number;
    color: RGB;
    isTarget: boolean;
}

/** 遊戲設定 */
const CONFIG = {
    // 題目區設定
    TARGET_SIZE: 100,

    // 選項設定
    OPTION_SIZE_MAX: 80,
    OPTION_SIZE_MIN: 32,
    OPTION_GAP: 8,

    // 選項數量遞進（每 5 關增加一排一列：2x2 → 3x3 → 4x4...）
    INITIAL_GRID_SIZE: 2,
    GRID_INCREMENT_INTERVAL: 5,

    // 難度設定（Delta E 範圍，原值 x3）
    DELTA_E_RANGES: [
        { maxLevel: 5, min: 45, max: 60 },
        { maxLevel: 10, min: 30, max: 45 },
        { maxLevel: 15, min: 15, max: 30 },
        { maxLevel: 20, min: 9, max: 15 },
        { maxLevel: Infinity, min: 3, max: 9 },
    ],

    // 時間設定
    INITIAL_TIME: 10,
    WRONG_PENALTY: 5,
    BASE_TIME_REWARD: 5,
    REWARD_INCREMENT_INTERVAL: 5,
} as const;

/**
 * RGB 轉 XYZ 色彩空間
 */
const rgbToXyz = (rgb: RGB): { x: number; y: number; z: number } => {
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    r *= 100;
    g *= 100;
    b *= 100;

    return {
        x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
        y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
        z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
    };
};

/**
 * XYZ 轉 LAB 色彩空間
 */
const xyzToLab = (xyz: { x: number; y: number; z: number }): LAB => {
    // D65 白點
    const refX = 95.047;
    const refY = 100.000;
    const refZ = 108.883;

    let x = xyz.x / refX;
    let y = xyz.y / refY;
    let z = xyz.z / refZ;

    x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

    return {
        l: (116 * y) - 16,
        a: 500 * (x - y),
        b: 200 * (y - z),
    };
};

/**
 * RGB 轉 LAB
 */
const rgbToLab = (rgb: RGB): LAB => {
    return xyzToLab(rgbToXyz(rgb));
};

/**
 * 計算兩個 LAB 顏色的 Delta E (CIE76)
 */
const deltaE = (lab1: LAB, lab2: LAB): number => {
    return Math.sqrt(
        Math.pow(lab1.l - lab2.l, 2) +
        Math.pow(lab1.a - lab2.a, 2) +
        Math.pow(lab1.b - lab2.b, 2)
    );
};

/**
 * 生成目標顏色
 */
const generateTargetColor = (): RGB => {
    return {
        r: Math.floor(Math.random() * 195) + 30,
        g: Math.floor(Math.random() * 195) + 30,
        b: Math.floor(Math.random() * 195) + 30,
    };
};

/**
 * 生成干擾色
 * @param target - 目標顏色
 * @param targetDeltaE - 目標色差值範圍
 */
const generateDistractorColor = (target: RGB, minDeltaE: number, maxDeltaE: number): RGB => {
    const targetLab = rgbToLab(target);
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
        // 隨機偏移
        const offset = {
            r: Math.floor(Math.random() * 60) - 30,
            g: Math.floor(Math.random() * 60) - 30,
            b: Math.floor(Math.random() * 60) - 30,
        };

        const newColor: RGB = {
            r: Math.max(0, Math.min(255, target.r + offset.r)),
            g: Math.max(0, Math.min(255, target.g + offset.g)),
            b: Math.max(0, Math.min(255, target.b + offset.b)),
        };

        const newLab = rgbToLab(newColor);
        const diff = deltaE(targetLab, newLab);

        if (diff >= minDeltaE && diff <= maxDeltaE) {
            return newColor;
        }

        attempts++;
    }

    // 如果找不到合適的顏色，返回一個稍微不同的顏色
    return {
        r: Math.max(0, Math.min(255, target.r + (Math.random() > 0.5 ? minDeltaE : -minDeltaE))),
        g: Math.max(0, Math.min(255, target.g + (Math.random() > 0.5 ? minDeltaE : -minDeltaE))),
        b: Math.max(0, Math.min(255, target.b + (Math.random() > 0.5 ? minDeltaE : -minDeltaE))),
    };
};

/**
 * 計算選項數量（2x2 → 3x3 → 4x4...）
 */
const getOptionCount = (level: number): number => {
    const tier = Math.floor((level - 1) / CONFIG.GRID_INCREMENT_INTERVAL);
    const gridSize = CONFIG.INITIAL_GRID_SIZE + tier;
    return gridSize * gridSize;
};

/**
 * 計算過關獎勵時間
 */
const getTimeReward = (level: number): number => {
    const tier = Math.floor((level - 1) / CONFIG.REWARD_INCREMENT_INTERVAL) + 1;
    return tier * CONFIG.BASE_TIME_REWARD;
};

/**
 * 取得當前關卡的 Delta E 範圍
 */
const getDeltaERange = (level: number): { min: number; max: number } => {
    for (const range of CONFIG.DELTA_E_RANGES) {
        if (level <= range.maxLevel) {
            return { min: range.min, max: range.max };
        }
    }
    return { min: 1, max: 3 };
};

/**
 * RGB 轉 CSS 顏色字串
 */
const rgbToCss = (rgb: RGB): string => {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
};

/**
 * 洗牌演算法
 */
const shuffleArray = <T,>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

/**
 * 看色遊戲主元件
 * @see _mds/spec-v3.md 規格書
 */
export default function FindColors() {
    // Refs
    const timerRef = useRef<number | null>(null);
    const timeLeftRef = useRef<number>(CONFIG.INITIAL_TIME);
    const answerAreaRef = useRef<HTMLDivElement>(null);

    // States
    const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
    const [level, setLevel] = useState(1);
    const [timeLeft, setTimeLeft] = useState(CONFIG.INITIAL_TIME);
    const [targetColor, setTargetColor] = useState<RGB>({ r: 128, g: 128, b: 128 });
    const [options, setOptions] = useState<ColorOption[]>([]);
    const [optionSize, setOptionSize] = useState(CONFIG.OPTION_SIZE_MAX);
    const [showPenalty, setShowPenalty] = useState(false);
    const [wrongOptionId, setWrongOptionId] = useState<number | null>(null);
    const [highestLevel, setHighestLevel] = useState(() => {
        const saved = localStorage.getItem('findcolors-highest-level');
        return saved ? parseInt(saved, 10) : 0;
    });

    /**
     * 計算最佳色塊尺寸
     */
    const calculateOptionSize = useCallback((optionCount: number): number => {
        if (!answerAreaRef.current) return CONFIG.OPTION_SIZE_MAX;

        const containerWidth = answerAreaRef.current.clientWidth - 32; // padding
        const containerHeight = answerAreaRef.current.clientHeight - 32;

        const cols = Math.ceil(Math.sqrt(optionCount));
        const rows = Math.ceil(optionCount / cols);

        const maxByWidth = (containerWidth - (cols + 1) * CONFIG.OPTION_GAP) / cols;
        const maxByHeight = (containerHeight - (rows + 1) * CONFIG.OPTION_GAP) / rows;

        const size = Math.min(maxByWidth, maxByHeight);
        return Math.max(CONFIG.OPTION_SIZE_MIN, Math.min(CONFIG.OPTION_SIZE_MAX, Math.floor(size)));
    }, []);

    /**
     * 生成關卡選項
     */
    const generateLevel = useCallback((currentLevel: number) => {
        const target = generateTargetColor();
        const optionCount = getOptionCount(currentLevel);
        const { min, max } = getDeltaERange(currentLevel);

        const newOptions: ColorOption[] = [
            { id: 0, color: target, isTarget: true },
        ];

        for (let i = 1; i < optionCount; i++) {
            newOptions.push({
                id: i,
                color: generateDistractorColor(target, min, max),
                isTarget: false,
            });
        }

        const shuffled = shuffleArray(newOptions);
        const size = calculateOptionSize(optionCount);

        setTargetColor(target);
        setOptions(shuffled);
        setOptionSize(size);
        setWrongOptionId(null);
    }, [calculateOptionSize]);

    /**
     * 開始遊戲
     */
    const startGame = useCallback(() => {
        setLevel(1);
        setTimeLeft(CONFIG.INITIAL_TIME);
        timeLeftRef.current = CONFIG.INITIAL_TIME;
        setShowPenalty(false);
        setWrongOptionId(null);
        generateLevel(1);
        setGameStatus('playing');
    }, [generateLevel]);

    /**
     * 暫停/繼續遊戲
     */
    const togglePause = useCallback(() => {
        setGameStatus(prev => (prev === 'playing' ? 'paused' : 'playing'));
    }, []);

    /**
     * 處理選項點擊
     */
    const handleOptionClick = useCallback((option: ColorOption) => {
        if (gameStatus !== 'playing') return;

        if (option.isTarget) {
            // 答對：獲得時間獎勵，進入下一關
            const reward = getTimeReward(level);
            const newTime = timeLeftRef.current + reward;
            timeLeftRef.current = newTime;
            setTimeLeft(newTime);

            const newLevel = level + 1;
            setLevel(newLevel);

            // 更新最高關卡紀錄
            if (newLevel > highestLevel) {
                setHighestLevel(newLevel);
                localStorage.setItem('findcolors-highest-level', newLevel.toString());
            }

            generateLevel(newLevel);
        } else {
            // 答錯：扣 5 秒
            const newTime = Math.max(0, timeLeftRef.current - CONFIG.WRONG_PENALTY);
            timeLeftRef.current = newTime;
            setTimeLeft(newTime);
            setShowPenalty(true);
            setWrongOptionId(option.id);

            // 短暫顯示扣時提示
            setTimeout(() => {
                setShowPenalty(false);
                setWrongOptionId(null);
            }, 500);

            // 如果時間歸零
            if (newTime <= 0) {
                setGameStatus('gameover');
            }
        }
    }, [gameStatus, level, highestLevel, generateLevel]);

    /**
     * 處理鍵盤輸入
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameStatus === 'idle' || gameStatus === 'gameover') {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    startGame();
                }
                return;
            }

            if (e.key === ' ' || e.key === 'Escape' || e.key.toLowerCase() === 'p') {
                e.preventDefault();
                togglePause();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameStatus, startGame, togglePause]);

    /**
     * 計時器控制
     */
    useEffect(() => {
        if (gameStatus === 'playing') {
            timerRef.current = window.setInterval(() => {
                const newTime = timeLeftRef.current - 1;
                timeLeftRef.current = newTime;
                setTimeLeft(newTime);

                if (newTime <= 0) {
                    setGameStatus('gameover');
                }
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [gameStatus]);

    /**
     * 視窗大小變化時重新計算色塊尺寸
     */
    useEffect(() => {
        const handleResize = () => {
            if (gameStatus === 'playing') {
                const size = calculateOptionSize(options.length);
                setOptionSize(size);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [gameStatus, options.length, calculateOptionSize]);

    // 計算排列
    const cols = Math.ceil(Math.sqrt(options.length));

    return (
        <div className="FindColors">
            <h1 className="title">看色</h1>

            <div className="status-bar">
                <div className="status-item">
                    <span className="status-label">關卡</span>
                    <span className="status-value">{level}</span>
                </div>
                <div className={`status-item status-item--time ${showPenalty ? 'is-penalty' : ''}`}>
                    <span className="status-label">剩餘時間</span>
                    <span className="status-value">{timeLeft}</span>
                    {showPenalty && <span className="penalty-text">-5</span>}
                </div>
                <div className="status-item status-item--high">
                    <span className="status-label">最高關卡</span>
                    <span className="status-value">{highestLevel}</span>
                </div>
            </div>

            <div className="game-container">
                <div
                    className="answer-area"
                    ref={answerAreaRef}
                    style={{
                        gridTemplateColumns: `repeat(${cols}, ${optionSize}px)`,
                        gap: `${CONFIG.OPTION_GAP}px`,
                    }}
                >
                    {options.map((option) => (
                        <button
                            key={option.id}
                            className={`color-option ${wrongOptionId === option.id ? 'is-wrong' : ''}`}
                            style={{
                                width: optionSize,
                                height: optionSize,
                                backgroundColor: rgbToCss(option.color),
                            }}
                            onClick={() => handleOptionClick(option)}
                            disabled={gameStatus !== 'playing'}
                        />
                    ))}
                </div>

                <div className="target-area">
                    <div
                        className="target-color"
                        style={{
                            width: CONFIG.TARGET_SIZE,
                            height: CONFIG.TARGET_SIZE,
                            backgroundColor: rgbToCss(targetColor),
                        }}
                    />
                </div>

                {gameStatus === 'idle' && (
                    <div className="overlay">
                        <p className="overlay-title">看色</p>
                        <p className="overlay-text">從上方找出與下方目標顏色相同的色塊</p>
                        <div className="overlay-rules">
                            <p>答對：獲得時間獎勵</p>
                            <p>答錯：扣 5 秒</p>
                            <p>時間歸零則遊戲結束</p>
                        </div>
                        <button className="button" onClick={startGame}>
                            開始遊戲
                        </button>
                        <p className="overlay-hint">按空白鍵或 Enter 開始</p>
                    </div>
                )}

                {gameStatus === 'paused' && (
                    <div className="overlay">
                        <p className="overlay-title">暫停中</p>
                        <button className="button" onClick={togglePause}>
                            繼續遊戲
                        </button>
                        <p className="overlay-hint">按空白鍵或 P 繼續</p>
                    </div>
                )}

                {gameStatus === 'gameover' && (
                    <div className="overlay overlay--gameover">
                        <p className="overlay-title">時間到！</p>
                        <p className="overlay-score">最終關卡：{level}</p>
                        {level > highestLevel - 1 && level > 1 && (
                            <p className="overlay-record">新紀錄！</p>
                        )}
                        <button className="button" onClick={startGame}>
                            再玩一次
                        </button>
                        <p className="overlay-hint">按空白鍵或 Enter 重新開始</p>
                    </div>
                )}
            </div>

            <div className="controls">
                <p className="controls-title">操作方式</p>
                <p className="controls-text">點擊色塊選擇答案</p>
                <p className="controls-hint">按空白鍵或 P 暫停</p>
            </div>
        </div>
    );
}
