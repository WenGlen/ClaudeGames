# 看色 規格書

> 建立日期：2026/01/21
> 狀態：📝 規劃中

---

## 遊戲概述

### 簡介
「看色」是一款考驗玩家色彩辨識能力的益智遊戲。遊戲會在題目區顯示一個目標顏色，玩家需要從作答區的多個相近色塊中找出與目標完全一致的顏色。隨著關卡推進，選項數量增加、顏色差異縮小，難度逐漸提升。

### 遊戲類型
益智、休閒、色彩辨識

---

## 核心玩法

### 遊戲目標
在限定時間或回合內，盡可能多地正確辨識出目標顏色，獲取最高分數。

### 操作方式

| 操作 | 動作 |
|------|------|
| 滑鼠點擊 | 選擇色塊 |
| 空白鍵 | 開始遊戲 / 重新開始 |
| P 鍵 | 暫停 / 繼續 |

### 遊戲規則

1. 每一關會顯示一個「目標顏色」作為題目
2. 作答區會出現多個色塊，其中只有一個與目標顏色完全相同
3. 其他色塊為「干擾色」，與目標顏色相近但不同
4. 選對：+10 分（可依關卡調整），進入下一關
5. 選錯：-5 分（可為負分），該關重新出題
6. 每關有時間限制（例如 5 秒），超時視為選錯

### 難度遞進機制

| 關卡 | 選項數量 | 顏色差異值（ΔE） | 時間限制 |
|------|----------|------------------|----------|
| 1-5 | 4 | 15-20 | 8 秒 |
| 6-10 | 6 | 10-15 | 6 秒 |
| 11-15 | 9 | 5-10 | 5 秒 |
| 16-20 | 12 | 3-5 | 4 秒 |
| 21+ | 16 | 1-3 | 3 秒 |

### 勝利/失敗條件
- **遊戲模式**：無限模式，持續挑戰直到玩家選擇結束
- **目標**：追求最高分數

---

## 遊戲狀態

```
[idle] --開始--> [playing] --暫停--> [paused]
                    |                   |
                    +-------------------+
                    |
                    v (玩家選擇結束)
               [gameover]
```

| 狀態 | 說明 |
|------|------|
| `idle` | 遊戲尚未開始，顯示開始畫面與遊戲說明 |
| `playing` | 遊戲進行中，顯示題目與選項 |
| `paused` | 遊戲暫停 |
| `gameover` | 遊戲結束，顯示最終分數與統計 |

---

## UI 設計

### 畫面配置

```
┌─────────────────────────────────────┐
│              看色                    │
│         關卡: 5   分數: 120          │
├─────────────────────────────────────┤
│                                     │
│         ┌───────────────┐           │
│         │               │           │
│         │   目標顏色     │  ← 題目區  │
│         │   (較大色塊)   │           │
│         │               │           │
│         └───────────────┘           │
│                                     │
│           ⏱️ 3.5 秒                  │  ← 倒數計時
│                                     │
├─────────────────────────────────────┤
│                                     │
│    ┌──┐  ┌──┐  ┌──┐  ┌──┐          │
│    │  │  │  │  │  │  │  │          │
│    └──┘  └──┘  └──┘  └──┘          │  ← 作答區
│    ┌──┐  ┌──┐  ┌──┐  ┌──┐          │    (多個色塊)
│    │  │  │  │  │  │  │  │          │
│    └──┘  └──┘  └──┘  └──┘          │
│                                     │
├─────────────────────────────────────┤
│  正確: 12  |  錯誤: 3  |  連續: 5   │  ← 統計資訊
└─────────────────────────────────────┘
```

### UI 元素清單

| 元素 | 說明 | 顯示時機 |
|------|------|----------|
| 標題 | 「看色」 | 永遠顯示 |
| 關卡數 | 當前關卡編號 | 遊戲中 |
| 分數 | 當前累計分數 | 遊戲中 |
| 目標色塊 | 題目區，較大的單一色塊 | 遊戲中 |
| 倒數計時 | 剩餘作答時間 | 遊戲中 |
| 選項色塊 | 作答區，多個可點擊色塊 | 遊戲中 |
| 統計資訊 | 正確/錯誤/連續次數 | 遊戲中 |
| 結果反饋 | 選擇後的正確/錯誤提示 | 選擇後短暫顯示 |

### 覆蓋層（Overlay）

| 狀態 | 顯示內容 |
|------|----------|
| `idle` | 遊戲說明、「開始遊戲」按鈕 |
| `paused` | 「遊戲暫停」、「繼續」按鈕 |
| `gameover` | 最終分數、統計數據、「重新開始」按鈕 |

---

## 技術規格

### 遊戲參數

```typescript
const CONFIG = {
    // 題目區設定
    TARGET_SIZE: 120,              // 目標色塊大小 (px)

    // 選項設定
    OPTION_SIZE: 60,               // 選項色塊大小 (px)
    OPTION_GAP: 12,                // 色塊間距 (px)

    // 難度設定
    INITIAL_OPTIONS: 4,            // 初始選項數量
    MAX_OPTIONS: 16,               // 最大選項數量
    INITIAL_DELTA_E: 20,           // 初始顏色差異值
    MIN_DELTA_E: 1,                // 最小顏色差異值

    // 時間設定
    INITIAL_TIME: 8,               // 初始作答時間 (秒)
    MIN_TIME: 3,                   // 最短作答時間 (秒)

    // 分數設定
    CORRECT_SCORE: 10,             // 答對基礎分
    WRONG_PENALTY: 5,              // 答錯扣分
    COMBO_BONUS: 2,                // 連續答對加成 (每次 +2)
    TIME_BONUS_THRESHOLD: 0.5,     // 時間獎勵閾值 (剩餘時間 > 50%)
    TIME_BONUS: 5,                 // 時間獎勵分數
} as const;
```

### 資料結構

```typescript
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

/** RGB 顏色 */
interface RGB {
    r: number;  // 0-255
    g: number;  // 0-255
    b: number;  // 0-255
}

/** LAB 顏色 (用於計算色差) */
interface LAB {
    l: number;  // 0-100
    a: number;  // -128 to 127
    b: number;  // -128 to 127
}

/** 色塊選項 */
interface ColorOption {
    id: number;
    color: RGB;
    isTarget: boolean;
}

/** 關卡設定 */
interface LevelConfig {
    optionCount: number;    // 選項數量
    deltaE: number;         // 顏色差異值
    timeLimit: number;      // 時間限制
}

/** 遊戲統計 */
interface GameStats {
    correctCount: number;   // 正確次數
    wrongCount: number;     // 錯誤次數
    currentCombo: number;   // 當前連續正確
    maxCombo: number;       // 最高連續正確
}
```

### State 清單

| State | 類型 | 說明 |
|-------|------|------|
| `gameStatus` | `GameStatus` | 遊戲狀態 |
| `level` | `number` | 當前關卡 |
| `score` | `number` | 當前分數 |
| `targetColor` | `RGB` | 目標顏色 |
| `options` | `ColorOption[]` | 當前選項列表 |
| `timeLeft` | `number` | 剩餘時間 (秒) |
| `stats` | `GameStats` | 遊戲統計 |
| `feedback` | `'correct' \| 'wrong' \| null` | 結果反饋狀態 |

### Ref 清單

| Ref | 類型 | 用途 |
|-----|------|------|
| `timerRef` | `number` | 倒數計時器 ID |
| `statsRef` | `GameStats` | 統計資料即時參考 |

---

## 顏色生成演算法

### 目標顏色生成
隨機生成一個 RGB 顏色，確保不會太暗或太亮：

```typescript
/**
 * 生成目標顏色
 * 避免太暗 (< 30) 或太亮 (> 225) 的顏色
 */
const generateTargetColor = (): RGB => {
    return {
        r: Math.floor(Math.random() * 195) + 30,
        g: Math.floor(Math.random() * 195) + 30,
        b: Math.floor(Math.random() * 195) + 30,
    };
};
```

### 干擾色生成
使用 CIE76 Delta E 公式計算色差，確保干擾色與目標色的差異在指定範圍內：

```typescript
/**
 * RGB 轉 LAB 色彩空間
 */
const rgbToLab = (rgb: RGB): LAB => {
    // 1. RGB 轉 XYZ
    // 2. XYZ 轉 LAB
    // (詳細實作)
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
 * 生成干擾色
 * @param target - 目標顏色
 * @param targetDeltaE - 目標色差值
 */
const generateDistractorColor = (target: RGB, targetDeltaE: number): RGB => {
    // 在目標顏色附近隨機偏移，確保 deltaE 在目標範圍內
};
```

---

## 功能清單

### MVP（最小可行產品）

- [ ] 遊戲狀態管理（idle/playing/paused/gameover）
- [ ] 目標顏色顯示
- [ ] 選項色塊生成與排列
- [ ] 點擊選擇判斷
- [ ] 分數計算（正確得分、錯誤扣分）
- [ ] 關卡遞進（選項增加、色差減少）
- [ ] 倒數計時功能
- [ ] 基本 UI 與回饋動畫

### 進階功能（可選）

- [ ] 音效（正確/錯誤/時間警告）
- [ ] 連擊獎勵視覺效果
- [ ] 本地最高分紀錄（localStorage）
- [ ] 色盲友善模式
- [ ] 難度選擇（簡單/普通/困難）
- [ ] 分享成績功能

---

## 開發順序

### 階段一：基礎建設
1. 建立元件框架與遊戲狀態管理
2. 實作顏色生成演算法（RGB/LAB 轉換、Delta E 計算）
3. 基本 UI 布局（題目區、作答區）

### 階段二：核心玩法
1. 目標顏色與選項生成
2. 點擊判斷與分數計算
3. 倒數計時機制
4. 關卡難度遞進

### 階段三：完善體驗
1. 結果反饋動畫（正確/錯誤）
2. 統計資訊顯示
3. Overlay 畫面（開始/暫停/結束）
4. UI 美化與細節調整

---

## 參考資料

- [Delta E (CIE76) 色差公式](https://en.wikipedia.org/wiki/Color_difference#CIE76)
- [RGB to LAB 轉換](http://www.easyrgb.com/en/math.php)
- 類似遊戲參考：Kuku Kube、Color Blind Test
