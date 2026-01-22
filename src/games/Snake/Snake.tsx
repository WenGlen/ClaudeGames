import { useEffect, useRef, useState, useCallback } from 'react';
import './_Snake.scss';

/** 方向類型 */
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** 座標點 */
interface Point {
    x: number;
    y: number;
}

/** 遊戲狀態 */
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

/** 遊戲設定 */
const CONFIG = {
    GRID_SIZE: 20,
    CANVAS_WIDTH: 400,
    CANVAS_HEIGHT: 400,
    INITIAL_SPEED: 150,
    SPEED_INCREMENT: 5,
    MIN_SPEED: 50,
} as const;

/**
 * 格式化時間為 mm:ss
 */
const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * 貪食蛇遊戲主元件
 */
export default function Snake() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const directionRef = useRef<Direction>('RIGHT');
    const nextDirectionRef = useRef<Direction>('RIGHT');
    const foodRef = useRef<Point>({ x: 10, y: 10 });
    const snakeRef = useRef<Point[]>([{ x: 5, y: 5 }]);

    const [snake, setSnake] = useState<Point[]>([{ x: 5, y: 5 }]);
    const [food, setFood] = useState<Point>({ x: 10, y: 10 });
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('snake-high-score');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
    const [speed, setSpeed] = useState<number>(CONFIG.INITIAL_SPEED);
    const [elapsedTime, setElapsedTime] = useState(0);

    const gridCount = CONFIG.CANVAS_WIDTH / CONFIG.GRID_SIZE;

    /**
     * 產生隨機食物位置
     */
    const generateFood = useCallback((currentSnake: Point[]): Point => {
        let newFood: Point;
        do {
            newFood = {
                x: Math.floor(Math.random() * gridCount),
                y: Math.floor(Math.random() * gridCount),
            };
        } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    }, [gridCount]);

    /**
     * 重置遊戲狀態
     */
    const resetGame = useCallback(() => {
        const initialSnake = [{ x: 5, y: 5 }];
        const newFood = generateFood(initialSnake);
        snakeRef.current = initialSnake;
        foodRef.current = newFood;
        setSnake(initialSnake);
        setFood(newFood);
        setScore(0);
        setSpeed(CONFIG.INITIAL_SPEED);
        setElapsedTime(0);
        directionRef.current = 'RIGHT';
        nextDirectionRef.current = 'RIGHT';
    }, [generateFood]);

    /**
     * 開始遊戲
     */
    const startGame = useCallback(() => {
        resetGame();
        setGameStatus('playing');
    }, [resetGame]);

    /**
     * 暫停/繼續遊戲
     */
    const togglePause = useCallback(() => {
        setGameStatus(prev => (prev === 'playing' ? 'paused' : 'playing'));
    }, []);

    /**
     * 繪製遊戲畫面
     */
    const draw = useCallback((ctx: CanvasRenderingContext2D, currentSnake: Point[], currentFood: Point) => {
        // 清除畫布
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // 繪製格線
        ctx.strokeStyle = '#252540';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= gridCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CONFIG.GRID_SIZE, 0);
            ctx.lineTo(i * CONFIG.GRID_SIZE, CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * CONFIG.GRID_SIZE);
            ctx.lineTo(CONFIG.CANVAS_WIDTH, i * CONFIG.GRID_SIZE);
            ctx.stroke();
        }

        // 繪製食物
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(
            currentFood.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
            currentFood.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
            CONFIG.GRID_SIZE / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // 繪製蛇
        currentSnake.forEach((segment, index) => {
            const isHead = index === 0;
            ctx.fillStyle = isHead ? '#4ecca3' : '#36b390';
            ctx.fillRect(
                segment.x * CONFIG.GRID_SIZE + 1,
                segment.y * CONFIG.GRID_SIZE + 1,
                CONFIG.GRID_SIZE - 2,
                CONFIG.GRID_SIZE - 2
            );

            // 蛇頭眼睛
            if (isHead) {
                ctx.fillStyle = '#1a1a2e';
                const eyeSize = 3;
                const eyeOffset = 5;
                ctx.fillRect(
                    segment.x * CONFIG.GRID_SIZE + eyeOffset,
                    segment.y * CONFIG.GRID_SIZE + eyeOffset,
                    eyeSize,
                    eyeSize
                );
                ctx.fillRect(
                    segment.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE - eyeOffset - eyeSize,
                    segment.y * CONFIG.GRID_SIZE + eyeOffset,
                    eyeSize,
                    eyeSize
                );
            }
        });
    }, [gridCount]);

    /**
     * 遊戲主迴圈 - 使用 ref 來避免閉包問題
     */
    const gameLoop = useCallback(() => {
        const prevSnake = snakeRef.current;
        directionRef.current = nextDirectionRef.current;
        const head = { ...prevSnake[0] };

        // 根據方向移動蛇頭
        switch (directionRef.current) {
            case 'UP':
                head.y -= 1;
                break;
            case 'DOWN':
                head.y += 1;
                break;
            case 'LEFT':
                head.x -= 1;
                break;
            case 'RIGHT':
                head.x += 1;
                break;
        }

        // 檢查撞牆
        if (head.x < 0 || head.x >= gridCount || head.y < 0 || head.y >= gridCount) {
            setGameStatus('gameover');
            return;
        }

        // 檢查撞到自己
        if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
            setGameStatus('gameover');
            return;
        }

        // 檢查是否吃到食物
        const currentFood = foodRef.current;
        const ateFood = head.x === currentFood.x && head.y === currentFood.y;

        let newSnake: Point[];

        if (ateFood) {
            // 吃到食物：蛇變長（保留所有身體）
            newSnake = [head, ...prevSnake];

            // 產生新食物並更新
            const newFood = generateFood(newSnake);
            foodRef.current = newFood;
            setFood(newFood);

            // 加分
            setScore(prev => {
                const newScore = prev + 10;
                setHighScore(currentHigh => {
                    if (newScore > currentHigh) {
                        localStorage.setItem('snake-high-score', newScore.toString());
                        return newScore;
                    }
                    return currentHigh;
                });
                return newScore;
            });

            // 加速
            setSpeed(prev => Math.max(CONFIG.MIN_SPEED, prev - CONFIG.SPEED_INCREMENT));
        } else {
            // 沒吃到食物：移除尾巴保持長度
            newSnake = [head, ...prevSnake.slice(0, -1)];
        }

        // 更新 ref 和 state
        snakeRef.current = newSnake;
        setSnake(newSnake);
    }, [gridCount, generateFood]);

    /**
     * 處理鍵盤輸入
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameStatus !== 'playing' && gameStatus !== 'paused') {
                if (e.key === ' ' || e.key === 'Enter') {
                    startGame();
                }
                return;
            }

            if (e.key === ' ' || e.key === 'Escape') {
                togglePause();
                return;
            }

            if (gameStatus !== 'playing') return;

            const currentDir = directionRef.current;
            let newDirection: Direction | null = null;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (currentDir !== 'DOWN') newDirection = 'UP';
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (currentDir !== 'UP') newDirection = 'DOWN';
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (currentDir !== 'RIGHT') newDirection = 'LEFT';
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (currentDir !== 'LEFT') newDirection = 'RIGHT';
                    break;
            }

            if (newDirection) {
                e.preventDefault();
                nextDirectionRef.current = newDirection;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameStatus, startGame, togglePause]);

    /**
     * 遊戲迴圈控制
     */
    useEffect(() => {
        if (gameStatus === 'playing') {
            gameLoopRef.current = window.setInterval(gameLoop, speed);
        }

        return () => {
            if (gameLoopRef.current) {
                clearInterval(gameLoopRef.current);
                gameLoopRef.current = null;
            }
        };
    }, [gameStatus, speed, gameLoop]);

    /**
     * 計時器控制
     */
    useEffect(() => {
        if (gameStatus === 'playing') {
            timerRef.current = window.setInterval(() => {
                setElapsedTime(prev => prev + 1);
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
     * 繪製畫面
     */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        draw(ctx, snake, food);
    }, [snake, food, draw]);

    return (
        <div className="Snake">
            <h1 className="title">貪食蛇</h1>

            <div className="timer">
                <span className="timer-label">遊戲時間</span>
                <span className="timer-value">{formatTime(elapsedTime)}</span>
            </div>

            <div className="scoreboard">
                <div className="score">
                    <span className="score-label">分數</span>
                    <span className="score-value">{score}</span>
                </div>
                <div className="score score--high">
                    <span className="score-label">最高分</span>
                    <span className="score-value">{highScore}</span>
                </div>
            </div>

            <div className="game-area">
                <canvas
                    ref={canvasRef}
                    width={CONFIG.CANVAS_WIDTH}
                    height={CONFIG.CANVAS_HEIGHT}
                    className="canvas"
                />

                {gameStatus === 'idle' && (
                    <div className="overlay">
                        <p className="overlay-text">按空白鍵或 Enter 開始</p>
                        <button className="button" onClick={startGame}>
                            開始遊戲
                        </button>
                    </div>
                )}

                {gameStatus === 'paused' && (
                    <div className="overlay">
                        <p className="overlay-text">暫停中</p>
                        <button className="button" onClick={togglePause}>
                            繼續遊戲
                        </button>
                    </div>
                )}

                {gameStatus === 'gameover' && (
                    <div className="overlay overlay--gameover">
                        <p className="overlay-title">遊戲結束！</p>
                        <p className="overlay-score">最終分數：{score}</p>
                        <p className="overlay-time">遊戲時間：{formatTime(elapsedTime)}</p>
                        <button className="button" onClick={startGame}>
                            再玩一次
                        </button>
                    </div>
                )}
            </div>

            <div className="controls">
                <p className="controls-title">操作方式</p>

                <div className="controls-container">

                    <div>
                        <div className="controls-grid">
                            <span className="key">W</span>
                        </div>
                        <div className="controls-grid">
                            <span className="key">A</span>
                            <span className="key">S</span>
                            <span className="key">D</span>
                        </div>
                    </div>

                    <div className="key-separator">或</div>

                    <div>
                        <div className="controls-grid">
                            <span className="key">↑</span>
                        </div>
                        <div className="controls-grid">
                            <span className="key">←</span>
                            <span className="key">↓</span>
                            <span className="key">→</span>
                        </div>
                    </div>

                </div>

                <p className="controls-hint">按空白鍵暫停</p>
            </div>
        </div>
    );
}
