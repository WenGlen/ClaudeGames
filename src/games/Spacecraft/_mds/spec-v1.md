# Spacecraft 規格書

> 版本：v1
> 建立日期：2026/01/26
> 狀態：🚧 開發中

---

## 修訂紀錄

| 版本 | 日期 | 修改內容 |
|------|------|----------|
| v1 | 2026/01/26 | 初版建立 |

---

## 遊戲概述

### 簡介

Spacecraft 是一款單鍵操作的軌道跳躍遊戲。玩家控制一艘小型太空船，在宇宙中的各個星球間穿梭。太空船會自動繞著當前星球旋轉，玩家只需在正確時機點擊，太空船便會沿切線方向飛出，目標是成功降落到下一個星球的軌道上。

### 遊戲類型

休閒 / 動作 / 技巧

---

## 核心玩法

### 遊戲目標

在星球間不斷跳躍，收集盡可能多的分數。成功降落在越多星球上，分數越高。

### 操作方式

| 按鍵 | 動作 |
|------|------|
| 滑鼠點擊 / 空白鍵 | 發射太空船（沿當前軌道切線方向） |
| P / Escape | 暫停遊戲 |
| Enter / Space | 開始 / 重新開始遊戲 |

### 遊戲規則

1. 太空船會自動繞著當前星球的軌道旋轉
2. 點擊時，太空船沿切線方向飛出
3. 飛行過程中會受到鄰近天體的引力影響
4. 成功進入下一個星球的軌道範圍即為降落成功
5. 每次成功降落獲得基礎分數
6. 連續快速降落可獲得連擊加成
7. 飛行途中可收集星星獲得額外分數

### 勝利/失敗條件

- **目標**：獲得最高分數（無盡模式）
- **失敗**：太空船飛出畫面邊界 / 撞上障礙物 / 被黑洞吞噬

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

## 天體系統

### 星球類型

| 類型 | 外觀 | 特性 | 出現時機 |
|------|------|------|----------|
| 普通星球 | 藍/綠色圓形 | 標準軌道旋轉 | 一開始 |
| 小型星球 | 較小圓形 | 軌道範圍小，較難降落 | 分數 > 5 |
| 巨型星球 | 較大圓形 | 軌道範圍大，旋轉較慢 | 隨機 |
| 高速星球 | 帶閃電標記 | 旋轉速度快 | 分數 > 10 |
| 逆轉星球 | 帶逆時針標記 | 反向旋轉 | 分數 > 15 |
| 移動星球 | 帶軌跡線 | 會上下或左右移動 | 分數 > 20 |

### 特殊天體

| 類型 | 外觀 | 特性 | 出現時機 |
|------|------|------|----------|
| 黑洞 | 黑色漩渦 | 強力吸引，靠太近會被吞噬 | 分數 > 25 |
| 白洞 | 白色漩渦 | 強力排斥，改變飛行軌跡 | 分數 > 25 |
| 星星 | 金色小星 | 收集獲得額外分數 | 隨機生成 |

---

## UI 設計

### 畫面配置

```
┌─────────────────────────────────┐
│  分數: 42      連擊: x3         │
│  最高分: 128                    │
├─────────────────────────────────┤
│                                 │
│         ☆                      │
│    ╭───────╮      ╭───╮        │
│    │  🌍  │  ◀──  │ 🚀│        │
│    ╰───────╯      ╰───╯        │
│                        ╭─────╮  │
│                        │ 🌑 │  │
│                        ╰─────╯  │
│                                 │
├─────────────────────────────────┤
│  [空白鍵/點擊] 發射             │
└─────────────────────────────────┘
```

### UI 元素清單

| 元素 | 說明 | 顯示時機 |
|------|------|----------|
| 分數 | 當前得分 | 遊戲中 |
| 連擊 | 連續降落加成 | 連擊 > 1 時 |
| 最高分 | 歷史最高分 | 永遠顯示 |
| 遊戲畫布 | 主要遊戲區域 | 永遠顯示 |
| 操作提示 | 按鍵說明 | idle / playing |

### 覆蓋層（Overlay）

| 狀態 | 顯示內容 |
|------|----------|
| `idle` | 遊戲標題、開始提示、操作說明 |
| `paused` | 暫停標題、繼續按鈕 |
| `gameover` | 結束標題、最終分數、最高分、重玩按鈕 |

---

## 技術規格

### 遊戲參數

```typescript
const CONFIG = {
    // 畫布設定
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 600,
    FPS: 60,

    // 太空船設定
    SHIP_SIZE: 10,
    ORBIT_OFFSET: 20,        // 軌道距離星球表面的距離
    BASE_ORBIT_SPEED: 0.03,  // 基礎軌道角速度 (rad/frame)
    LAUNCH_SPEED: 8,         // 發射初速度

    // 星球設定
    MIN_PLANET_RADIUS: 25,
    MAX_PLANET_RADIUS: 60,
    MIN_PLANET_DISTANCE: 150,
    MAX_PLANET_DISTANCE: 300,

    // 引力設定
    GRAVITY_RANGE: 150,      // 引力影響範圍
    GRAVITY_STRENGTH: 0.5,   // 引力強度
    BLACKHOLE_STRENGTH: 2.0, // 黑洞引力強度
    WHITEHOLE_STRENGTH: 1.5, // 白洞斥力強度

    // 計分設定
    BASE_SCORE: 10,
    COMBO_MULTIPLIER: 1.5,
    STAR_SCORE: 5,
    COMBO_TIMEOUT: 2000,     // 連擊超時 (ms)

    // 軌道捕獲
    CAPTURE_RADIUS: 30,      // 進入此範圍算降落成功
} as const;
```

### 資料結構

```typescript
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

type PlanetType = 'normal' | 'small' | 'giant' | 'fast' | 'reverse' | 'moving';
type CelestialType = 'planet' | 'blackhole' | 'whitehole' | 'star';

interface Vector2 {
    x: number;
    y: number;
}

interface Ship {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;           // 當前軌道角度
    isOrbiting: boolean;     // 是否在軌道上
    currentPlanet: number;   // 當前星球 index
    trail: Vector2[];        // 飛行軌跡
}

interface Planet {
    x: number;
    y: number;
    radius: number;
    orbitRadius: number;     // 軌道半徑 = radius + ORBIT_OFFSET
    type: PlanetType;
    orbitSpeed: number;      // 軌道旋轉速度
    direction: 1 | -1;       // 1=順時針, -1=逆時針
    color: string;
    // 移動星球專用
    moveAxis?: 'x' | 'y';
    moveRange?: number;
    moveSpeed?: number;
    moveOffset?: number;
}

interface Celestial {
    x: number;
    y: number;
    radius: number;
    type: CelestialType;
    strength: number;        // 引力/斥力強度
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
```

### State 清單

| State | 類型 | 說明 |
|-------|------|------|
| `gameStatus` | `GameStatus` | 遊戲狀態 |
| `score` | `number` | 當前分數 |
| `highScore` | `number` | 最高分數 |
| `combo` | `number` | 連擊數 |

### Ref 清單

| Ref | 類型 | 用途 |
|-----|------|------|
| `canvasRef` | `HTMLCanvasElement` | 畫布元素 |
| `gameLoopRef` | `number` | 遊戲迴圈 ID |
| `shipRef` | `Ship` | 太空船狀態 |
| `planetsRef` | `Planet[]` | 所有星球 |
| `celestialsRef` | `Celestial[]` | 特殊天體 |
| `starsRef` | `Star[]` | 收集星星 |
| `particlesRef` | `Particle[]` | 粒子效果 |
| `cameraRef` | `Vector2` | 鏡頭位置 |
| `comboTimerRef` | `number` | 連擊計時器 |
| `lastTimeRef` | `number` | 上一幀時間 |

---

## 視覺效果

### 飛行軌跡

- 太空船飛行時留下漸變軌跡
- 軌跡長度約 20 點
- 顏色從白色漸變到透明

### 粒子效果

| 事件 | 效果 |
|------|------|
| 發射 | 從星球表面噴出推進粒子 |
| 降落成功 | 環形擴散粒子 |
| 收集星星 | 金色閃爍粒子 |
| 被黑洞吸引 | 螺旋粒子 |

### 背景

- 深色太空背景 (#0a0a1a)
- 隨機分布的背景星星（視差滾動）

---

## 功能清單

### MVP（最小可行產品）

- [ ] 基本遊戲迴圈
- [ ] 太空船軌道旋轉
- [ ] 切線發射機制
- [ ] 星球生成
- [ ] 軌道捕獲判定
- [ ] 基礎計分
- [ ] 遊戲結束判定
- [ ] 基本 UI

### 進階功能

- [ ] 連擊系統
- [ ] 多種星球類型
- [ ] 黑洞/白洞
- [ ] 收集星星
- [ ] 飛行軌跡
- [ ] 粒子效果
- [ ] 難度遞增
- [ ] 移動星球
- [ ] 背景星空

---

## 開發順序

1. **階段一：基礎建設**
   - 建立元件框架
   - 設定 Canvas
   - 實作遊戲狀態切換
   - 繪製基本形狀

2. **階段二：核心玩法**
   - 太空船軌道旋轉
   - 切線發射計算
   - 星球生成系統
   - 軌道捕獲判定
   - 邊界檢測

3. **階段三：計分系統**
   - 基礎計分
   - 連擊系統
   - 收集星星
   - 最高分記錄

4. **階段四：特殊天體**
   - 多種星球類型
   - 黑洞/白洞引力
   - 難度遞增

5. **階段五：視覺效果**
   - 飛行軌跡
   - 粒子系統
   - 背景星空
   - UI 美化

---

## 物理公式

### 切線方向計算

```
切線角度 = 軌道角度 + π/2 (順時針) 或 - π/2 (逆時針)
vx = cos(切線角度) * 發射速度
vy = sin(切線角度) * 發射速度
```

### 引力計算

```
方向向量 = (天體位置 - 太空船位置).normalize()
距離 = (天體位置 - 太空船位置).length()
引力 = 方向向量 * 引力強度 * (1 / 距離²)
```

### 軌道捕獲判定

```
距離 = (星球中心 - 太空船位置).length()
如果 距離 <= 軌道半徑 + 捕獲範圍
且 距離 >= 星球半徑
則 捕獲成功
```
