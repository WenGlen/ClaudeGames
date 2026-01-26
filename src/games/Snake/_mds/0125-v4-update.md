# Snake 更新紀錄 v4 - 2025/01/25

## 更新內容

本次更新新增手機版觸控操作支援：

### 1. 新增觸控方向控制按鈕

**修改原因**：讓手機使用者可以透過觸控操作遊戲，不需依賴外接鍵盤。

**修改方式**：
- 新增 `handleDirectionChange` 函數處理方向變更
- 新增觸控按鈕區塊，包含上、下、左、右四個方向按鈕
- 新增暫停/繼續按鈕

**範例**：

```tsx
/**
 * 處理方向變更（供觸控按鈕使用）
 */
const handleDirectionChange = useCallback((newDirection: Direction) => {
    if (gameStatus !== 'playing') return;
    const currentDir = directionRef.current;

    // 防止反向移動
    const isValid =
        (newDirection === 'UP' && currentDir !== 'DOWN') ||
        (newDirection === 'DOWN' && currentDir !== 'UP') ||
        (newDirection === 'LEFT' && currentDir !== 'RIGHT') ||
        (newDirection === 'RIGHT' && currentDir !== 'LEFT');

    if (isValid) {
        nextDirectionRef.current = newDirection;
    }
}, [gameStatus]);
```

---

### 2. 響應式設計

**修改原因**：區分桌面版和手機版的操作介面。

**修改方式**：
- 桌面版（> 768px）：顯示鍵盤方向鍵說明，隱藏觸控按鈕
- 手機版（≤ 768px）：顯示觸控方向按鈕，隱藏鍵盤說明
- 移除 WASD 操作說明，簡化介面

```scss
.controls--desktop {
    @media (max-width: 768px) {
        display: none;
    }
}

.touch-controls {
    display: none;

    @media (max-width: 768px) {
        display: flex;
    }
}
```

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `Snake.tsx` | 新增 `handleDirectionChange` 函數、觸控按鈕 UI |
| `_Snake.scss` | 新增觸控按鈕樣式、響應式隱藏/顯示規則 |

---

## UI 變更預覽

### 桌面版（> 768px）

```
┌─────────────────────────────┐
│         貪食蛇              │
│        遊戲時間             │
│         00:45               │
│   ┌───────┐  ┌───────┐     │
│   │ 分數  │  │最高分 │     │
│   └───────┘  └───────┘     │
│   ┌─────────────────────┐   │
│   │    [遊戲畫面]        │   │
│   └─────────────────────┘   │
│        操作方式             │
│          [↑]               │
│       [←][↓][→]            │
│       按空白鍵暫停          │
└─────────────────────────────┘
```

### 手機版（≤ 768px）

```
┌─────────────────────────────┐
│         貪食蛇              │
│        遊戲時間             │
│         00:45               │
│   ┌───────┐  ┌───────┐     │
│   │ 分數  │  │最高分 │     │
│   └───────┘  └───────┘     │
│   ┌─────────────────────┐   │
│   │    [遊戲畫面]        │   │
│   └─────────────────────┘   │
│                             │
│          [▲]               │
│       [◀][▼][▶]            │
│         [暫停]              │
└─────────────────────────────┘
```
