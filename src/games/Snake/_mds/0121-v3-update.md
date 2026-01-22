# Snake Game 更新記錄 - 2024/01/21

## 更新內容

本次更新包含三項主要修改：

### 1. 移除 class 前綴 `Snake__`

**修改原因**：最外層已使用 `.Snake` 包裹，內部 class 不需要再加前綴即可避免樣式污染。

**修改方式**：
- 將 BEM 命名法（`Snake__title`）改為巢狀結構（`.Snake .title`）
- TSX 中的 className 移除 `Snake__` 前綴
- SCSS 使用巢狀選擇器

**範例**：

```tsx
// 修改前
<h1 className="Snake__title">Snake Game</h1>
<div className="Snake__scoreboard">
    <div className="Snake__score">
        <span className="Snake__score-label">Score</span>
    </div>
</div>

// 修改後
<h1 className="title">貪食蛇</h1>
<div className="scoreboard">
    <div className="score">
        <span className="score-label">分數</span>
    </div>
</div>
```

```scss
// 修改前
.Snake {
    &__title { ... }
    &__scoreboard { ... }
    &__score { ... }
    &__score-label { ... }
}

// 修改後
.Snake {
    .title { ... }
    .scoreboard { ... }
    .score { ... }
    .score-label { ... }
}
```

---

### 2. 中文化所有介面文字

| 位置 | 修改前 | 修改後 |
|------|--------|--------|
| 標題 | Snake Game | 貪食蛇 |
| 分數標籤 | Score | 分數 |
| 最高分標籤 | High Score | 最高分 |
| 開始提示 | Press Space or Enter to Start | 按空白鍵或 Enter 開始 |
| 開始按鈕 | Start Game | 開始遊戲 |
| 暫停提示 | Paused | 暫停中 |
| 繼續按鈕 | Resume | 繼續遊戲 |
| 結束標題 | Game Over! | 遊戲結束！ |
| 最終分數 | Final Score: | 最終分數： |
| 重玩按鈕 | Play Again | 再玩一次 |
| 操作說明標題 | Controls | 操作方式 |
| 按鍵分隔 | or | 或 |
| 暫停提示 | Space to pause | 按空白鍵暫停 |

---

### 3. 新增計時器功能

**功能說明**：
- 顯示遊戲進行時間（格式：mm:ss）
- 遊戲開始時從 00:00 開始計時
- 暫停時計時器暫停
- 遊戲結束時顯示最終遊戲時間
- 重新開始時重置計時器

**實作方式**：

```tsx
// 新增 state 和 ref
const timerRef = useRef<number | null>(null);
const [elapsedTime, setElapsedTime] = useState(0);

// 格式化時間函數
const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 重置時清零
const resetGame = useCallback(() => {
    // ...
    setElapsedTime(0);
}, []);

// 計時器 effect
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
```

**新增樣式**：

```scss
.timer {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1rem;
}

.timer-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #888;
}

.timer-value {
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    color: #64b5f6;
}

.overlay-time {
    margin: 0 0 1.5rem;
    font-size: 1rem;
    color: #64b5f6;
}
```

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `Snake.tsx` | 移除 class 前綴、中文化、新增計時器邏輯 |
| `_Snake.scss` | 改用巢狀選擇器、新增計時器樣式 |

---

## UI 變更預覽

```
┌─────────────────────────────┐
│         貪食蛇              │
│                             │
│        遊戲時間             │
│         00:45               │
│                             │
│   ┌───────┐  ┌───────┐     │
│   │ 分數  │  │最高分 │     │
│   │  120  │  │  350  │     │
│   └───────┘  └───────┘     │
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │    [遊戲畫面]       │   │
│   │                     │   │
│   └─────────────────────┘   │
│                             │
│        操作方式             │
│    [W]        [↑]          │
│  [A][S][D] 或 [←][↓][→]    │
│       按空白鍵暫停          │
└─────────────────────────────┘
```
