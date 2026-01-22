# 看色 規格書

> 版本：v3
> 建立日期：2026/01/21
> 狀態：📝 規劃中

---

## 修訂紀錄

| 版本 | 日期 | 修改內容 |
|------|------|----------|
| v1 | 2026/01/21 | 初版建立 |
| v2 | 2026/01/21 | 改用時間倒數機制、答錯扣時不換題、過關獎勵依關卡區間遞增、作答區與題目區位置對調、移除統計資訊 |
| v3 | 2026/01/21 | 選項數量無上限改為每 N 關 +M 塊、動態縮小色塊、「時間」改「剩餘時間」、限制畫面範圍 80vh×100vw |

---

## 遊戲概述

### 簡介
「看色」是一款考驗玩家色彩辨識能力的益智遊戲。遊戲會在題目區顯示一個目標顏色，玩家需要從作答區的多個相近色塊中找出與目標完全一致的顏色。隨著關卡推進，選項數量增加、顏色差異縮小，難度逐漸提升。

### 遊戲類型
益智、休閒、色彩辨識

---

## 核心玩法

### 遊戲目標
在時間歸零前，盡可能通過更多關卡。每過一關可獲得額外時間，挑戰更高關卡。

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
4. **選對**：獲得時間獎勵，進入下一關
5. **選錯**：扣 5 秒，不換題，可繼續作答
6. **時間歸零**：遊戲結束

### 時間機制

- **初始時間**：10 秒
- **每秒扣 1 分**（剩餘時間 = 分數）
- **過關獎勵時間**：依關卡區間遞增

| 關卡區間 | 過關獎勵 |
|----------|----------|
| 1-10 | +10 秒 |
| 11-20 | +20 秒 |
| 21-30 | +30 秒 |
| 31-40 | +40 秒 |
| ... | 每 10 關 +10 秒 |

### 難度遞進機制

#### 選項數量（無上限）

每 5 關增加 2 個選項：

| 關卡 | 選項數量 | 計算方式 |
|------|----------|----------|
| 1-5 | 4 | 初始值 |
| 6-10 | 6 | 4 + 2 |
| 11-15 | 8 | 4 + 4 |
| 16-20 | 10 | 4 + 6 |
| 21-25 | 12 | 4 + 8 |
| ... | ... | 4 + (tier × 2) |

```typescript
const getOptionCount = (level: number): number => {
    const tier = Math.floor((level - 1) / 5);
    return CONFIG.INITIAL_OPTIONS + tier * CONFIG.OPTIONS_INCREMENT;
};
```

#### 顏色差異值（ΔE）

| 關卡 | 顏色差異值（ΔE） |
|------|------------------|
| 1-5 | 15-20 |
| 6-10 | 10-15 |
| 11-15 | 5-10 |
| 16-20 | 3-5 |
| 21+ | 1-3 |

### 勝利/失敗條件
- **失敗**：剩餘時間歸零
- **目標**：挑戰最高關卡數

---

## 遊戲狀態

```
[idle] --開始--> [playing] --暫停--> [paused]
                    |                   |
                    +-------------------+
                    |
                    v (時間歸零)
               [gameover]
```

| 狀態 | 說明 |
|------|------|
| `idle` | 遊戲尚未開始，顯示開始畫面與遊戲說明 |
| `playing` | 遊戲進行中，顯示題目與選項 |
| `paused` | 遊戲暫停 |
| `gameover` | 遊戲結束，顯示最終關卡數 |

---

## UI 設計

### 畫面限制

**重要**：整個遊戲畫面必須限制在瀏覽器可視範圍內，避免滾動：

```scss
.FindColors {
    width: 100vw;
    max-width: 100vw;
    height: 80vh;
    max-height: 80vh;
    overflow: hidden;
}
```

### 畫面配置

```
┌─────────────────────────────────────┐  ─┐
│              看色                    │   │
│       關卡: 5   剩餘時間: 45         │   │
├─────────────────────────────────────┤   │
│                                     │   │
│    ┌──┐  ┌──┐  ┌──┐  ┌──┐          │   │
│    │  │  │  │  │  │  │  │          │   │  80vh
│    └──┘  └──┘  └──┘  └──┘          │   │
│    ┌──┐  ┌──┐  ┌──┐  ┌──┐          │   │
│    │  │  │  │  │  │  │  │          │   │
│    └──┘  └──┘  └──┘  └──┘          │   │
│                                     │   │
├─────────────────────────────────────┤   │
│         ┌───────────────┐           │   │
│         │   目標顏色     │           │   │
│         └───────────────┘           │   │
└─────────────────────────────────────┘  ─┘
|<────────────── 100vw ──────────────>|
```

### 動態色塊尺寸

當選項數量增加時，自動縮小色塊以適應畫面：

```typescript
const CONFIG = {
    // 作答區可用空間（預估）
    ANSWER_AREA_WIDTH: '90vw',       // 作答區寬度
    ANSWER_AREA_HEIGHT: '50vh',      // 作答區高度

    // 色塊尺寸範圍
    OPTION_SIZE_MAX: 80,             // 最大色塊尺寸 (px)
    OPTION_SIZE_MIN: 32,             // 最小色塊尺寸 (px)
    OPTION_GAP: 8,                   // 色塊間距 (px)
} as const;

/**
 * 計算最佳色塊尺寸
 * @param optionCount - 選項數量
 * @param containerWidth - 容器寬度 (px)
 * @param containerHeight - 容器高度 (px)
 * @returns 色塊尺寸 (px)
 */
const calculateOptionSize = (
    optionCount: number,
    containerWidth: number,
    containerHeight: number
): number => {
    // 計算最佳列數（盡量接近正方形排列）
    const cols = Math.ceil(Math.sqrt(optionCount));
    const rows = Math.ceil(optionCount / cols);

    // 根據容器尺寸計算可用的色塊大小
    const maxByWidth = (containerWidth - (cols + 1) * CONFIG.OPTION_GAP) / cols;
    const maxByHeight = (containerHeight - (rows + 1) * CONFIG.OPTION_GAP) / rows;

    // 取較小值，並限制在範圍內
    const size = Math.min(maxByWidth, maxByHeight);
    return Math.max(CONFIG.OPTION_SIZE_MIN, Math.min(CONFIG.OPTION_SIZE_MAX, size));
};
```

### UI 元素清單

| 元素 | 說明 | 顯示時機 |
|------|------|----------|
| 標題 | 「看色」 | 永遠顯示 |
| 關卡數 | 當前關卡編號 | 遊戲中 |
| 剩餘時間 | 剩餘秒數（= 分數） | 遊戲中 |
| 選項色塊 | 作答區，多個可點擊色塊（動態尺寸） | 遊戲中 |
| 目標色塊 | 題目區，較大的單一色塊 | 遊戲中 |
| 扣時提示 | 答錯時的視覺提示（不遮擋作答） | 答錯後短暫顯示 |

### 答錯提示設計

答錯時需要有視覺提示，但**不影響繼續作答**：
- 剩餘時間數字短暫變紅 + 抖動動畫
- 顯示「-5」的飄浮文字動畫
- 畫面邊緣短暫紅色閃爍
- 錯誤的選項短暫標記（如紅色邊框）

### 覆蓋層（Overlay）

| 狀態 | 顯示內容 |
|------|----------|
| `idle` | 遊戲說明、「開始遊戲」按鈕 |
| `paused` | 「遊戲暫停」、「繼續」按鈕 |
| `gameover` | 「時間到！」、最終關卡數、「重新開始」按鈕 |

---

## 技術規格

### 遊戲參數

```typescript
const CONFIG = {
    // 畫面限制
    GAME_WIDTH: '100vw',
    GAME_HEIGHT: '80vh',

    // 題目區設定
    TARGET_SIZE: 100,              // 目標色塊大小 (px)

    // 選項設定
    OPTION_SIZE_MAX: 80,           // 最大色塊尺寸 (px)
    OPTION_SIZE_MIN: 32,           // 最小色塊尺寸 (px)
    OPTION_GAP: 8,                 // 色塊間距 (px)

    // 選項數量遞進
    INITIAL_OPTIONS: 4,            // 初始選項數量
    OPTIONS_INCREMENT: 2,          // 每次增加數量
    OPTIONS_INCREMENT_INTERVAL: 5, // 每 N 關增加一次

    // 難度設定
    INITIAL_DELTA_E: 20,           // 初始顏色差異值
    MIN_DELTA_E: 1,                // 最小顏色差異值

    // 時間設定
    INITIAL_TIME: 10,              // 初始時間 (秒)
    WRONG_PENALTY: 5,              // 答錯扣時 (秒)
    BASE_TIME_REWARD: 10,          // 基礎過關獎勵 (秒)
    REWARD_INCREMENT_INTERVAL: 10, // 獎勵遞增間隔 (每 N 關)
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
    timeReward: number;     // 過關獎勵時間
    optionSize: number;     // 色塊尺寸
}
```

### State 清單

| State | 類型 | 說明 |
|-------|------|------|
| `gameStatus` | `GameStatus` | 遊戲狀態 |
| `level` | `number` | 當前關卡 |
| `timeLeft` | `number` | 剩餘時間（= 分數） |
| `targetColor` | `RGB` | 目標顏色 |
| `options` | `ColorOption[]` | 當前選項列表 |
| `optionSize` | `number` | 當前色塊尺寸 |
| `showPenalty` | `boolean` | 是否顯示扣時提示 |

### Ref 清單

| Ref | 類型 | 用途 |
|-----|------|------|
| `timerRef` | `number` | 倒數計時器 ID |
| `timeLeftRef` | `number` | 時間即時參考（避免閉包問題） |
| `answerAreaRef` | `HTMLDivElement` | 作答區元素（計算尺寸用） |

---

## 顏色生成演算法

### 目標顏色生成

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

### 關卡設定計算

```typescript
/**
 * 計算選項數量
 */
const getOptionCount = (level: number): number => {
    const tier = Math.floor((level - 1) / CONFIG.OPTIONS_INCREMENT_INTERVAL);
    return CONFIG.INITIAL_OPTIONS + tier * CONFIG.OPTIONS_INCREMENT;
};

/**
 * 計算過關獎勵時間
 */
const getTimeReward = (level: number): number => {
    const tier = Math.floor((level - 1) / CONFIG.REWARD_INCREMENT_INTERVAL) + 1;
    return tier * CONFIG.BASE_TIME_REWARD;
};
```

---

## 功能清單

### MVP（最小可行產品）

- [ ] 遊戲狀態管理（idle/playing/paused/gameover）
- [ ] 畫面尺寸限制（80vh × 100vw）
- [ ] 目標顏色顯示
- [ ] 選項色塊生成與動態尺寸計算
- [ ] 點擊選擇判斷
- [ ] 時間倒數機制（每秒 -1）
- [ ] 過關獎勵時間計算
- [ ] 答錯扣時（-5 秒）+ 視覺提示
- [ ] 關卡遞進（選項增加、色差減少）
- [ ] 基本 UI 與回饋動畫

### 進階功能（可選）

- [ ] 音效（正確/錯誤/時間警告）
- [ ] 本地最高關卡紀錄（localStorage）
- [ ] 色盲友善模式
- [ ] 難度選擇（簡單/普通/困難）
- [ ] 分享成績功能

---

## 開發順序

### 階段一：基礎建設
1. 建立元件框架與遊戲狀態管理
2. 設定畫面尺寸限制（80vh × 100vw）
3. 實作顏色生成演算法（RGB/LAB 轉換、Delta E 計算）
4. 基本 UI 布局（作答區在上、題目區在下）

### 階段二：核心玩法
1. 目標顏色與選項生成
2. 動態色塊尺寸計算
3. 點擊判斷與時間獎勵/扣時
4. 時間倒數機制
5. 關卡難度遞進

### 階段三：完善體驗
1. 答錯視覺提示（不影響作答）
2. Overlay 畫面（開始/暫停/結束）
3. UI 美化與細節調整

---

## 參考資料

- [Delta E (CIE76) 色差公式](https://en.wikipedia.org/wiki/Color_difference#CIE76)
- [RGB to LAB 轉換](http://www.easyrgb.com/en/math.php)
- 類似遊戲參考：Kuku Kube、Color Blind Test
