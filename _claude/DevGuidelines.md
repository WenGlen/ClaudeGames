# ClaudeGames 開發指南

本文件為 ClaudeGames 專案的開發規範，所有遊戲開發皆須遵循此指南。

---

## 目錄

1. [開發前規劃](#開發前規劃)
2. [專案結構](#專案結構)
3. [資料夾命名規範](#資料夾命名規範)
4. [檔案命名規範](#檔案命名規範)
5. [CSS/SCSS 規範](#cssscss-規範)
6. [元件開發規範](#元件開發規範)
7. [修改紀錄規範](#修改紀錄規範)
8. [程式碼風格](#程式碼風格)

---

## 開發前規劃

當使用者提到「先寫規格書」或「先規劃」時，**不要直接開始寫程式碼**，而是先完成以下步驟：

### 觸發條件

以下關鍵字出現時，進入規劃模式：
- 「先寫規格書」
- 「先規劃」
- 「先設計」
- 「spec」
- 「規格」

### 規劃模式流程

1. **建立資料夾結構**（僅建立空殼）
   ```
   src/games/[GameName]/
   ├── [GameName].tsx      # 空元件，僅 export default
   ├── _[GameName].scss    # 空樣式，僅最外層 class
   └── _mds/
       └── spec-v1.md      # 規格書 v1
   ```

2. **撰寫規格書** `_mds/spec-v1.md`

3. **等待使用者確認**後才開始實作

4. **如需修改規格**，建立新版本 `spec-v2.md`、`spec-v3.md`...

### 規格書版本管理

| 檔名 | 用途 |
|------|------|
| `spec-v1.md` | 初版規格書 |
| `spec-v2.md` | 第一次修訂 |
| `spec-v3.md` | 第二次修訂 |
| ... | 依此類推 |

**版本更新原則**：
- 每次規格有重大修改時，建立新版本
- 舊版本保留不刪除，作為歷史紀錄
- 新版本頂部需註明與前版的差異摘要

### 規格書模板 `spec-v1.md`

```markdown
# [遊戲名稱] 規格書

> 版本：v1
> 建立日期：YYYY/MM/DD
> 狀態：📝 規劃中 | ✅ 已確認 | 🚧 開發中 | ✅ 已完成

---

## 修訂紀錄

| 版本 | 日期 | 修改內容 |
|------|------|----------|
| v1 | YYYY/MM/DD | 初版建立 |

<!--
v2 以後的版本在此區塊新增：
| v2 | YYYY/MM/DD | [修改摘要] |
| v3 | YYYY/MM/DD | [修改摘要] |
-->

---

## 遊戲概述

### 簡介
[一段話描述這個遊戲是什麼、怎麼玩]

### 遊戲類型
[例：益智、動作、策略、休閒]

---

## 核心玩法

### 遊戲目標
[玩家要達成什麼目標]

### 操作方式

| 按鍵 | 動作 |
|------|------|
| ... | ... |

### 遊戲規則
1. [規則 1]
2. [規則 2]
3. [規則 3]

### 勝利/失敗條件
- **勝利**：[條件]
- **失敗**：[條件]

---

## 遊戲狀態

```
[idle] --開始--> [playing] --暫停--> [paused]
                    |                   |
                    v                   v
               [gameover] <----繼續----+
```

| 狀態 | 說明 |
|------|------|
| `idle` | 遊戲尚未開始，顯示開始畫面 |
| `playing` | 遊戲進行中 |
| `paused` | 遊戲暫停 |
| `gameover` | 遊戲結束，顯示結算畫面 |

---

## UI 設計

### 畫面配置

```
┌─────────────────────────────┐
│         [遊戲標題]           │
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │    [遊戲主畫面]      │   │
│   │                     │   │
│   └─────────────────────┘   │
│                             │
│      [分數/狀態資訊]         │
│      [操作說明]             │
└─────────────────────────────┘
```

### UI 元素清單

| 元素 | 說明 | 顯示時機 |
|------|------|----------|
| 標題 | 遊戲名稱 | 永遠顯示 |
| 遊戲畫布 | 主要遊戲區域 | 永遠顯示 |
| 分數 | 當前得分 | 遊戲中 |
| ... | ... | ... |

### 覆蓋層（Overlay）

| 狀態 | 顯示內容 |
|------|----------|
| `idle` | 開始提示、開始按鈕 |
| `paused` | 暫停提示、繼續按鈕 |
| `gameover` | 結束標題、最終分數、重玩按鈕 |

---

## 技術規格

### 遊戲參數

```typescript
const CONFIG = {
    // 畫布設定
    CANVAS_WIDTH: 400,
    CANVAS_HEIGHT: 400,

    // 遊戲設定
    // ...
} as const;
```

### 資料結構

```typescript
// 定義遊戲中使用的主要型別

type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

interface [Entity] {
    // ...
}
```

### State 清單

| State | 類型 | 說明 |
|-------|------|------|
| `gameStatus` | `GameStatus` | 遊戲狀態 |
| `score` | `number` | 當前分數 |
| ... | ... | ... |

### Ref 清單

| Ref | 類型 | 用途 |
|-----|------|------|
| `canvasRef` | `HTMLCanvasElement` | 畫布元素 |
| `gameLoopRef` | `number` | 遊戲迴圈 ID |
| ... | ... | ... |

---

## 功能清單

### MVP（最小可行產品）

- [ ] 基本遊戲迴圈
- [ ] 玩家操作
- [ ] 碰撞檢測
- [ ] 分數系統
- [ ] 遊戲結束判定

### 進階功能（可選）

- [ ] 音效
- [ ] 動畫效果
- [ ] 排行榜
- [ ] 難度選擇

---

## 開發順序

1. **階段一：基礎建設**
   - 建立元件框架
   - 設定 Canvas
   - 實作遊戲狀態切換

2. **階段二：核心玩法**
   - [核心功能 1]
   - [核心功能 2]
   - [核心功能 3]

3. **階段三：完善體驗**
   - UI 美化
   - 操作說明
   - 細節調整

---

## 參考資料

- [相關連結或參考遊戲]
```

### 空元件模板

規劃階段的 `[GameName].tsx`：

```tsx
import './_[GameName].scss';

/**
 * [遊戲名稱]
 * @see _mds/spec.md 規格書
 */
export default function [GameName]() {
    return (
        <div className="[GameName]">
            <h1>[遊戲名稱]</h1>
            <p>開發中...</p>
        </div>
    );
}
```

### 空樣式模板

規劃階段的 `_[GameName].scss`：

```scss
.[GameName] {
    // 待實作
}
```

---

## 專案結構

每個遊戲都位於 `src/games/` 下的獨立資料夾中：

```
src/games/
└── [GameName]/
    ├── [GameName].tsx      # 主元件
    ├── _[GameName].scss    # 樣式檔
    ├── _mds/               # 修改紀錄資料夾
    │   ├── spec-v1.md      # 規格書（如有規劃階段）
    │   ├── MMDD-v0-dev.md  # 初次開發完成紀錄
    │   ├── MMDD-v1-debug.md
    │   └── MMDD-v2-update.md
    └── components/         # 子元件（如有需要）
        ├── ComponentA.tsx
        └── ComponentB.tsx
```

### 範例：Snake 遊戲

```
src/games/
└── Snake/
    ├── Snake.tsx           # 主元件
    ├── _Snake.scss         # 樣式檔
    ├── _mds/               # 修改紀錄
    │   ├── 0121-v0-dev.md  # 初次開發完成
    │   ├── 0121-v1-debug.md
    │   ├── 0121-v2-debug.md
    │   └── 0121-v3-update.md
    └── components/         # 子元件（如需要）
        └── ScoreBoard.tsx
```

---

## 資料夾命名規範

| 類型 | 命名方式 | 範例 |
|------|----------|------|
| 遊戲資料夾 | PascalCase | `Snake/`, `Tetris/`, `FlappyBird/` |
| 子元件資料夾 | 小寫 | `components/` |
| 修改紀錄資料夾 | 底線開頭小寫 | `_mds/` |

### 說明

- **遊戲資料夾**：使用 PascalCase，與主元件名稱一致
- **底線開頭資料夾**：表示非程式碼資源（如 `_mds/`），IDE 通常會將其排序在最上方

---

## 檔案命名規範

### 元件檔案

| 類型 | 命名方式 | 範例 |
|------|----------|------|
| 主元件 | `[GameName].tsx` | `Snake.tsx` |
| 子元件 | `[ComponentName].tsx` | `ScoreBoard.tsx` |
| 樣式檔 | `_[GameName].scss` | `_Snake.scss` |

### 修改紀錄檔案

格式：`MMDD-v[version]-[type].md`

**版本編號規則**：
- `v0`：初次開發完成的紀錄
- `v1` 以後：後續的修改紀錄，依序遞增

| 版本 | 類型 | 用途 | 範例 |
|------|------|------|------|
| v0 | `dev` | 初次開發完成紀錄 | `0121-v0-dev.md` |
| v1+ | `debug` | Bug 修復紀錄 | `0121-v1-debug.md` |
| v1+ | `update` | 功能更新紀錄 | `0121-v2-update.md` |
| v1+ | `refactor` | 重構紀錄 | `0121-v3-refactor.md` |
| v1+ | `feature` | 新功能紀錄 | `0121-v4-feature.md` |

**範例時間軸**：
```
0121-v0-dev.md      # 初次開發完成
0121-v1-debug.md    # 第一次修改：修復 bug
0121-v2-debug.md    # 第二次修改：修復另一個 bug
0121-v3-update.md   # 第三次修改：功能更新
```

---

## CSS/SCSS 規範

### 基本原則

1. **所有樣式都包在最外層 class 中**：避免樣式污染
2. **使用巢狀選擇器**：不使用 BEM 前綴命名
3. **樣式檔以底線開頭**：表示為 partial 檔案
4. **背景預設為深色**：<body>已預設為#1b1b32，後續以深色模式開發，且無需設定最底下的背景色。

### 結構範例

```scss
// _Snake.scss
.Snake {
    // 容器樣式
    display: flex;
    flex-direction: column;

    // 子元素使用巢狀選擇器（不加前綴）
    .title {
        font-size: 2rem;
        color: #4ecca3;
    }

    .scoreboard {
        display: flex;
        gap: 2rem;
    }

    .score {
        padding: 0.75rem;

        // 修飾符使用 &--modifier
        &--high {
            border-color: gold;
        }
    }

    .button {
        // 狀態使用 & 連接
        &:hover {
            transform: translateY(-2px);
        }

        &:active {
            transform: translateY(0);
        }
    }
}
```

### 命名規則

| 類型 | 命名方式 | 範例 |
|------|----------|------|
| 容器 | 小寫 kebab-case | `.game-area`, `.scoreboard` |
| 元素 | 小寫 kebab-case | `.score-label`, `.score-value` |
| 修飾符 | `--` 連接 | `.score--high`, `.overlay--gameover` |
| 狀態 | 偽類或 class | `:hover`, `:active`, `.is-active` |

### 禁止事項

```scss
// ❌ 不要這樣做：使用 BEM 前綴
.Snake__title { }
.Snake__score { }
.Snake__score--high { }

// ✅ 正確做法：巢狀選擇器
.Snake {
    .title { }
    .score {
        &--high { }
    }
}
```


---

## 元件開發規範

### 主元件結構

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import './_[GameName].scss';

/** 類型定義 */
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

/** 遊戲設定 */
const CONFIG = {
    // 常數設定
} as const;

/**
 * [遊戲名稱]主元件
 */
export default function [GameName]() {
    // 1. Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 2. States
    const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
    const [score, setScore] = useState(0);

    // 3. Computed values
    const gridCount = CONFIG.CANVAS_WIDTH / CONFIG.GRID_SIZE;

    // 4. Callbacks / Handlers
    const startGame = useCallback(() => { }, []);
    const resetGame = useCallback(() => { }, []);

    // 5. Effects
    useEffect(() => { }, []);

    // 6. Render
    return (
        <div className="[GameName]">
            {/* UI 結構 */}
        </div>
    );
}
```

### JSDoc 註解規範

所有 function 和重要邏輯都應加上 JSDoc 註解：

```tsx
/**
 * 產生隨機食物位置
 * @param currentSnake - 當前蛇的位置陣列
 * @returns 新的食物座標
 */
const generateFood = useCallback((currentSnake: Point[]): Point => {
    // ...
}, []);
```

### 介面語言

- **所有使用者介面文字使用中文**
- 程式碼中的變數、函數名稱使用英文

```tsx
// UI 文字：中文
<h1 className="title">貪食蛇</h1>
<span className="score-label">分數</span>
<button className="button">開始遊戲</button>

// 程式碼：英文
const [score, setScore] = useState(0);
const startGame = useCallback(() => { }, []);
```

---

## 修改紀錄規範

### 檔案位置

所有修改紀錄放在遊戲資料夾下的 `_mds/` 資料夾中。

### 紀錄流程

```
開發完成 → 寫 v0-dev.md → 修復 bug → 寫 v1-debug.md → 功能更新 → 寫 v2-update.md → ...
```

### Dev 紀錄模板（v0）

初次開發完成時撰寫，檔名：`MMDD-v0-dev.md`

```markdown
# [GameName] 開發紀錄 v0 - YYYY/MM/DD

## 遊戲簡介

[簡述遊戲玩法]

---

## 功能清單

- [x] 功能 1
- [x] 功能 2
- [x] 功能 3

---

## 技術實作重點

### 1. [技術重點 1]

[說明實作方式]

### 2. [技術重點 2]

[說明實作方式]

---

## 檔案結構

| 檔案 | 說明 |
|------|------|
| `[GameName].tsx` | 主元件 |
| `_[GameName].scss` | 樣式檔 |

---

## 已知問題 / 待優化

- [ ] [待處理項目 1]
- [ ] [待處理項目 2]
```

### Debug 紀錄模板（v1+）

Bug 修復時撰寫，檔名：`MMDD-v[N]-debug.md`

```markdown
# [GameName] Debug 紀錄 v[N] - YYYY/MM/DD

## Bug 描述
[簡述問題現象]

## 問題根因分析

### 原始程式碼問題
[列出有問題的程式碼片段]

### 問題說明
1. [原因 1]
2. [原因 2]
3. [原因 3]

## 解決方案

### 修改策略
1. [策略 1]
2. [策略 2]

### 修改後的程式碼
[列出修改後的程式碼片段]

## 修改重點

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| ... | ... | ... |

## 學到的教訓
1. [教訓 1]
2. [教訓 2]
```

### Update 紀錄模板（v1+）

功能更新時撰寫，檔名：`MMDD-v[N]-update.md`

```markdown
# [GameName] 更新紀錄 v[N] - YYYY/MM/DD

## 更新內容

本次更新包含以下修改：

### 1. [更新項目 1]

**修改原因**：[說明為什麼要改]

**修改方式**：[說明怎麼改]

**範例**：
[程式碼範例]

---

### 2. [更新項目 2]

...

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `[GameName].tsx` | [修改說明] |
| `_[GameName].scss` | [修改說明] |

---

## UI 變更預覽

[ASCII 或文字描述 UI 變更]
```

---

## 程式碼風格

### TypeScript

- 使用 `type` 定義類型（而非 `interface`，除非需要擴展）
- 常數使用 `as const` 確保類型安全
- 優先使用 `useCallback` 包裝函數避免不必要的重新渲染

### React

- 使用函數元件和 Hooks
- State 更新使用 functional updater 確保取得最新值
- 頻繁更新的遊戲狀態同時使用 `ref` 和 `state` 追蹤

```tsx
// 同時使用 ref 和 state
const snakeRef = useRef<Point[]>([{ x: 5, y: 5 }]);
const [snake, setSnake] = useState<Point[]>([{ x: 5, y: 5 }]);

// 更新時同步
snakeRef.current = newSnake;
setSnake(newSnake);
```

### 遊戲迴圈最佳實踐

```tsx
// 使用 ref 追蹤遊戲狀態，避免閉包問題
const gameLoop = useCallback(() => {
    const currentState = stateRef.current;  // 從 ref 讀取
    // ... 遊戲邏輯 ...
    stateRef.current = newState;  // 更新 ref
    setState(newState);           // 更新 state（觸發重繪）
}, [/* 最小化依賴 */]);

// 遊戲迴圈控制
useEffect(() => {
    if (gameStatus === 'playing') {
        gameLoopRef.current = setInterval(gameLoop, speed);
    }
    return () => {
        if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
        }
    };
}, [gameStatus, speed, gameLoop]);
```

---

## 快速檢查清單

開發新遊戲時，確認以下項目：

- [ ] 資料夾結構正確（`[GameName]/`, `_mds/`, `components/`）
- [ ] 檔案命名正確（`[GameName].tsx`, `_[GameName].scss`）
- [ ] 樣式使用巢狀選擇器，無 BEM 前綴
- [ ] 所有 UI 文字使用中文
- [ ] 函數有 JSDoc 註解
- [ ] 遊戲狀態使用 ref + state 雙重追蹤
- [ ] 修改紀錄放在 `_mds/` 並遵循命名規範
