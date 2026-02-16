# 雪境營火 (Campfire) 規格書

> 版本：v2
> 建立日期：2025/01/29
> 狀態：📝 規劃中

---

## 修訂紀錄

| 版本 | 日期 | 修改內容 |
|------|------|----------|
| v1 | 2025/01/29 | 初版建立 - 純 JS + SCSS 網頁版 MVP |
| v2 | 2025/01/29 | 新增虛擬搖桿控制、角色移動系統、探索型地圖設計 |

### v2 主要變更

- ✅ 新增虛擬搖桿控制系統
- ✅ 角色一步一步走動的移動感
- ✅ 重新設計地圖，增加探索路線感
- ✅ 自動交互系統（靠近區域觸發）

---

## 遊戲概述

### 簡介

在雪地中生存的經營遊戲。玩家透過虛擬搖桿控制角色在雪地營區移動，必須採集木材維持營火燃燒，否則會凍死。在確保生存的同時，可以釣魚、烹飪、販售來賺取金幣，逐步升級裝備提升效率。

### 遊戲類型

2D 俯視角 / 生存經營 / 資源管理 / 探索

### 核心循環

```
🎮 搖桿移動探索
      ↓
🔥 維持營火（生存核心）
      ↓
🪓 採集木材 → 🎣 釣魚 → 🍳 烹飪 → 💰 販售 → 🔧 升級
```

### MVP 設計原則

此版本使用純 **JavaScript + SCSS** 實作：

- **DOM-based 渲染**：使用 HTML 元素 + CSS transform 移動
- **虛擬搖桿**：觸控/滑鼠拖曳控制方向
- **格子移動**：角色一步一步移動，有節奏感
- **自動交互**：靠近區域自動觸發採集

---

## 核心玩法

### 遊戲目標

1. **生存**：保持營火燃燒，維持體溫不歸零
2. **探索**：在雪地營區移動，前往各個功能區
3. **經營**：透過釣魚販售賺取金幣
4. **升級**：購買升級提升採集效率

### 操作方式

| 操作 | 動作 |
|------|------|
| 拖曳搖桿 | 控制角色移動方向 |
| 靠近樹木 | 自動開始砍樹 |
| 靠近冰湖 | 自動開始釣魚 |
| 靠近營火 | 自動添加木材/烹飪/取暖 |
| 靠近收銀台 | 自動販售熟魚 |
| 點擊升級按鈕 | 購買升級 |

### 虛擬搖桿設計

```
        ┌─────────────┐
        │      ↑      │
        │   ╭─────╮   │
        │ ← │  ●  │ → │  ● = 可拖曳的搖桿頭
        │   ╰─────╯   │
        │      ↓      │
        └─────────────┘
            搖桿底座
```

**搖桿規格**：
- 底座直徑：120px
- 搖桿頭直徑：50px
- 最大拖曳距離：35px（從中心）
- 支援 8 方向移動（上/下/左/右/四個對角）

**移動觸發**：
- 搖桿拖曳超過 15px 死區 → 開始移動
- 放開搖桿 → 角色停止
- 持續推動 → 角色持續一步一步走

### 角色移動系統

**一步一步走動感**：

```
移動節奏：每 300ms 走一步（約 3.3 步/秒）

走動動畫：
  [站立] → [抬腳] → [落地] → [站立] → ...
     0ms     100ms    200ms    300ms
```

**移動速度**：
- 基礎速度：每步 16px
- 升級保暖靴後：每步 24px（+50%）

**視覺回饋**：
- 走動時角色輕微上下彈跳
- 腳印痕跡（可選）
- 角色面向移動方向

### 遊戲規則

1. **營火機制**
   - 營火有燃料值（0-100），持續下降
   - 燃料歸零時營火熄滅（無法烹飪、無法取暖）
   - 每添加 1 木材 = +20 燃料
   - 營火燃燒時才能烹飪

2. **體溫機制**
   - 玩家有體溫值（0-100）
   - 靠近營火（距離 < 80px）：體溫回升
   - 遠離營火：體溫下降（距離越遠下降越快）
   - 體溫歸零 = 遊戲結束

3. **自動交互系統**
   - 進入區域範圍內自動開始動作
   - 離開區域範圍自動停止
   - 優先級：取暖 > 烹飪 > 採集

4. **資源採集**
   - 靠近樹木：每 1 秒獲得 1 木材
   - 靠近冰湖：每 1.5 秒獲得 1 生魚
   - 背包滿時無法繼續採集

5. **烹飪機制**
   - 靠近營火時，自動將生魚放入烹飪
   - 每條魚需要 3 秒烹飪
   - 營火必須燃燒中才能烹飪
   - 熟魚自動進入背包

6. **交易機制**
   - 靠近收銀台自動販售熟魚
   - 每條熟魚 = 10 金幣

### 勝利/失敗條件

- **失敗**：體溫歸零（凍死）
- **目標**：累積金幣、購買升級、生存越久越好

---

## 地圖設計

### 設計理念

地圖要有「路線感」和「探索感」：
- 各區域有一定距離，需要移動前往
- 路線設計讓玩家需要規劃移動順序
- 離營火越遠越危險（體溫下降快）

### 地圖佈局

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│    🌲🌲🌲                                    🧊🧊🧊   │
│    🌲🌲🌲🌲        ══════════════════       🧊🧊🧊🧊  │
│     🌲🌲🌲       ║                  ║        🧊🧊🧊   │
│      [森林]     ║    ┌────────┐    ║        [冰湖]    │
│        🌲      ║    │   🔥   │    ║          🧊      │
│         ║      ║    │  營火  │    ║          ║       │
│         ║      ║    │        │    ║          ║       │
│         ╚══════╝    │  🍳    │    ╚══════════╝       │
│                     │  爐子  │                        │
│                     └────────┘                        │
│                          ║                            │
│                          ║                            │
│                     ┌────────┐                        │
│                     │   🛒   │                        │
│                     │ 收銀台 │                        │
│                     └────────┘                        │
│                          ║                            │
│                     ┌────────┐                        │
│                     │   🔧   │                        │
│                     │ 升級站 │                        │
│                     └────────┘                        │
│                                                        │
└────────────────────────────────────────────────────────┘

═══ 雪地小徑（移動路線）
 ║  連接路徑
```

### 區域定義

| 區域 | 位置 | 功能 | 交互範圍 |
|------|------|------|----------|
| 營火區 | 地圖中央偏上 | 取暖、添柴、烹飪 | 80px |
| 森林區 | 左上方 | 砍樹獲得木材 | 60px |
| 冰湖區 | 右上方 | 釣魚獲得生魚 | 60px |
| 收銀台 | 中央偏下 | 販售熟魚 | 50px |
| 升級站 | 最下方 | 購買升級 | 50px |

### 距離設計（像素）

```
營火 ←─── 150px ───→ 森林
營火 ←─── 150px ───→ 冰湖
營火 ←─── 100px ───→ 收銀台
收銀台 ←─ 80px ───→ 升級站
```

### 體溫與距離關係

| 距離營火 | 體溫變化 | 狀態描述 |
|----------|----------|----------|
| 0-80px | +4/秒 | 溫暖區域 ☀️ |
| 80-150px | -2/秒 | 微寒 ❄️ |
| 150-250px | -4/秒 | 寒冷 ❄️❄️ |
| 250px+ | -6/秒 | 極寒 ❄️❄️❄️ |

### 地圖格子系統

```
地圖尺寸：400 x 500 px（可視區域）
格子大小：16 x 16 px
格子數量：25 x 31 = 775 格

角色尺寸：32 x 32 px（佔 2x2 格）
```

---

## UI 設計

### 整體畫面配置

```
┌─────────────────────────────────────────────────┐
│  ❤️ ████████░░  🔥 ██████░░░░  💰 150          │ ← 狀態列
├─────────────────────────────────────────────────┤
│                                                 │
│                                                 │
│                  [遊戲地圖]                      │
│                                                 │
│              🧍 ← 角色在地圖移動                 │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  🪵 ×5   🐟 ×3   🍳 ×2           ┌───────┐      │ ← 物品欄 + 搖桿
│                                  │   ●   │      │
│  [行動狀態: 砍樹中...]            │       │      │
│                                  └───────┘      │
│                                   [搖桿]        │
└─────────────────────────────────────────────────┘
```

### 狀態列設計

```
┌─────────────────────────────────────────────────┐
│  ❤️ ████████░░ 80%   🔥 ██████░░░░ 60%   💰 150 │
└─────────────────────────────────────────────────┘
     體溫條              燃料條            金幣
```

- 體溫條：綠色 → 黃色 → 紅色（隨數值變化）
- 燃料條：橙色 → 紅色
- 低於 30% 時閃爍警告

### 物品欄設計

```
┌─────────────────────────────────────────┐
│  🪵 木材: 5/10   🐟 生魚: 3   🍳 熟魚: 2  │
└─────────────────────────────────────────┘
         ↑
    顯示背包容量
```

### 虛擬搖桿 UI

```scss
.joystick {
    position: fixed;
    bottom: 40px;
    right: 40px;

    .base {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        border: 3px solid rgba(255, 255, 255, 0.3);
    }

    .handle {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        // 可拖曳，用 transform 控制位置
    }
}
```

### 行動指示器

當角色進入互動區域時，顯示當前動作：

```
┌─────────────────────┐
│  🪓 砍樹中...        │  ← 森林區
│  ████████░░ 80%    │  ← 下一個木材的進度
└─────────────────────┘

┌─────────────────────┐
│  🎣 釣魚中...        │  ← 冰湖區
│  ██████░░░░ 60%    │
└─────────────────────┘

┌─────────────────────┐
│  🔥 取暖中 +4/秒     │  ← 營火區
│  🍳 烹飪: 2條 (67%) │
└─────────────────────┘
```

### 升級介面

點擊升級站區域時彈出：

```
┌─────────────────────────────────────┐
│            🔧 升級商店              │
├─────────────────────────────────────┤
│                                     │
│  🪓 鋼鐵斧頭        $100            │
│  砍樹速度 +50%      [購買]          │
│                                     │
│  🎣 高級釣竿        $150            │
│  釣魚速度 +50%      [購買]          │
│                                     │
│  🥾 保暖靴子        $200            │
│  移動速度 +50%      [購買]          │
│  體溫下降減少 50%                   │
│                                     │
│  🎒 大背包          $250            │
│  背包容量 10 → 20   [購買]          │
│                                     │
├─────────────────────────────────────┤
│              [關閉]                 │
└─────────────────────────────────────┘
```

### 覆蓋層（Overlay）

| 狀態 | 顯示內容 |
|------|----------|
| `idle` | 遊戲標題、玩法說明、開始按鈕 |
| `paused` | 「遊戲暫停」、繼續/重新開始按鈕 |
| `gameover` | 「你凍死了❄️」、存活時間、賺取金幣、重新開始 |

---

## 技術規格

### 遊戲參數

```typescript
const CONFIG = {
    // 地圖設定
    MAP_WIDTH: 400,
    MAP_HEIGHT: 500,
    TILE_SIZE: 16,

    // 角色設定
    PLAYER_SIZE: 32,
    STEP_DISTANCE: 16,        // 每步移動距離
    STEP_INTERVAL: 300,       // 每步間隔（ms）
    STEP_INTERVAL_FAST: 200,  // 升級後每步間隔

    // 搖桿設定
    JOYSTICK_BASE_SIZE: 120,
    JOYSTICK_HANDLE_SIZE: 50,
    JOYSTICK_DEAD_ZONE: 15,   // 死區半徑
    JOYSTICK_MAX_DISTANCE: 35,

    // 時間設定（毫秒）
    GAME_TICK: 100,           // 遊戲主循環間隔
    CHOP_INTERVAL: 1000,      // 砍樹間隔
    FISH_INTERVAL: 1500,      // 釣魚間隔
    COOK_TIME: 3000,          // 烹飪時間

    // 交互範圍
    CAMPFIRE_RANGE: 80,
    FOREST_RANGE: 60,
    LAKE_RANGE: 60,
    SHOP_RANGE: 50,

    // 營火設定
    FIRE_MAX: 100,
    FIRE_DECAY: 2,            // 每秒燃料下降
    FIRE_ADD_WOOD: 20,

    // 體溫設定
    TEMP_MAX: 100,
    TEMP_WARM_RANGE: 80,      // 溫暖範圍
    TEMP_RECOVER: 4,          // 溫暖區每秒回升
    TEMP_DECAY_NEAR: 2,       // 80-150px 每秒下降
    TEMP_DECAY_MID: 4,        // 150-250px 每秒下降
    TEMP_DECAY_FAR: 6,        // 250px+ 每秒下降

    // 背包設定
    BACKPACK_DEFAULT: 10,
    BACKPACK_UPGRADED: 20,

    // 經濟設定
    FISH_SELL_PRICE: 10,

    // 升級
    UPGRADE_AXE: 100,
    UPGRADE_ROD: 150,
    UPGRADE_BOOTS: 200,
    UPGRADE_BACKPACK: 250,

    // 區域座標（中心點）
    POS_CAMPFIRE: { x: 200, y: 150 },
    POS_FOREST: { x: 60, y: 80 },
    POS_LAKE: { x: 340, y: 80 },
    POS_CASHIER: { x: 200, y: 300 },
    POS_UPGRADE: { x: 200, y: 420 },
    POS_PLAYER_START: { x: 200, y: 200 },
} as const;
```

### 資料結構

```typescript
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

type Direction = 'up' | 'down' | 'left' | 'right' |
                 'up-left' | 'up-right' | 'down-left' | 'down-right' | null;

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
    axe: boolean;
    rod: boolean;
    boots: boolean;
    backpack: boolean;
}

interface PlayerState {
    position: Position;
    direction: Direction;
    isMoving: boolean;
    isWalking: boolean;      // 走動動畫狀態
    walkFrame: number;       // 0 或 1，用於走動動畫
}

interface CampfireState {
    fuel: number;            // 0-100
    isLit: boolean;          // 是否燃燒中
    cookingFish: number;     // 烹飪中的魚數量
    cookingProgress: number; // 當前這條魚的進度 0-100
}

interface GameState {
    status: GameStatus;
    player: PlayerState;
    campfire: CampfireState;
    temperature: number;
    resources: Resources;
    upgrades: Upgrades;
    survivalTime: number;
    currentZone: 'none' | 'campfire' | 'forest' | 'lake' | 'cashier' | 'upgrade';
}

interface JoystickState {
    isActive: boolean;
    angle: number;           // 0-360 度
    distance: number;        // 0 到 MAX_DISTANCE
    direction: Direction;
}
```

### State 清單

| State | 類型 | 說明 |
|-------|------|------|
| `gameStatus` | `GameStatus` | 遊戲狀態 |
| `playerPos` | `Position` | 角色位置 |
| `playerDirection` | `Direction` | 角色面向方向 |
| `isMoving` | `boolean` | 是否正在移動 |
| `temperature` | `number` | 玩家體溫 |
| `fireFuel` | `number` | 營火燃料 |
| `resources` | `Resources` | 資源數量 |
| `upgrades` | `Upgrades` | 升級狀態 |
| `currentZone` | `string` | 當前所在區域 |
| `cookingQueue` | `number` | 烹飪中的魚 |
| `showUpgradeUI` | `boolean` | 是否顯示升級介面 |

### Ref 清單

| Ref | 類型 | 用途 |
|-----|------|------|
| `gameLoopRef` | `number` | 主遊戲循環計時器 |
| `moveLoopRef` | `number` | 移動步伐計時器 |
| `gatheringRef` | `number` | 採集計時器 |
| `cookingRef` | `number` | 烹飪計時器 |
| `joystickRef` | `JoystickState` | 搖桿狀態 |
| `stateRef` | `GameState` | 即時遊戲狀態 |

---

## 虛擬搖桿實作

### 搖桿事件處理

```typescript
// 觸控/滑鼠事件
const handleJoystickStart = (e: TouchEvent | MouseEvent) => {
    // 記錄起始位置
};

const handleJoystickMove = (e: TouchEvent | MouseEvent) => {
    // 計算拖曳距離和角度
    // 限制在最大距離內
    // 計算方向（8 方向）
};

const handleJoystickEnd = () => {
    // 重置搖桿位置
    // 停止移動
};
```

### 方向計算

```typescript
const getDirection = (angle: number): Direction => {
    // 將 360 度分成 8 個區段（每個 45 度）
    // 0° = 右, 90° = 上, 180° = 左, 270° = 下

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
```

### 移動執行

```typescript
const movePlayer = (direction: Direction) => {
    const step = CONFIG.STEP_DISTANCE;
    let dx = 0, dy = 0;

    switch (direction) {
        case 'up': dy = -step; break;
        case 'down': dy = step; break;
        case 'left': dx = -step; break;
        case 'right': dx = step; break;
        case 'up-left': dx = -step * 0.7; dy = -step * 0.7; break;
        // ... 其他方向
    }

    // 邊界檢查
    // 更新位置
    // 觸發走動動畫
};
```

---

## 視覺與動畫

### 角色走動動畫

```scss
.player {
    width: 32px;
    height: 32px;
    transition: transform 0.1s ease-out;

    &.walking {
        animation: walk-bounce 0.3s infinite;
    }

    &.facing-left {
        transform: scaleX(-1);
    }
}

@keyframes walk-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
}
```

### 營火動畫

```scss
.campfire {
    .flame {
        animation: flicker 0.5s infinite alternate;
    }

    &.extinguished .flame {
        opacity: 0.3;
        animation: none;
    }
}

@keyframes flicker {
    0% { transform: scale(1) rotate(-2deg); opacity: 1; }
    100% { transform: scale(1.1) rotate(2deg); opacity: 0.8; }
}
```

### 低體溫效果

```scss
.game-map {
    &.cold {
        // 畫面邊緣藍色漸層
        box-shadow: inset 0 0 100px rgba(100, 180, 255, 0.5);
    }

    &.freezing {
        box-shadow: inset 0 0 150px rgba(100, 180, 255, 0.8);
        animation: shiver 0.1s infinite;
    }
}

@keyframes shiver {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(2px); }
}
```

---

## 功能清單

### MVP（最小可行產品）

- [ ] 虛擬搖桿控制
- [ ] 角色移動系統（一步一步走動）
- [ ] 地圖與區域碰撞
- [ ] 體溫系統
- [ ] 營火系統
- [ ] 森林區採集
- [ ] 冰湖區採集
- [ ] 烹飪系統
- [ ] 交易系統
- [ ] 升級系統
- [ ] 存檔系統

### 進階功能（可選）

- [ ] 角色外觀
- [ ] 腳印效果
- [ ] 暴風雪事件
- [ ] 稀有金魚
- [ ] 音效

---

## 開發順序

### 階段一：基礎框架

1. 建立元件框架與 SCSS 結構
2. 實作地圖渲染
3. 實作虛擬搖桿

### 階段二：角色移動

1. 角色顯示與定位
2. 搖桿控制方向
3. 一步一步走動邏輯
4. 地圖邊界限制

### 階段三：核心生存

1. 營火系統
2. 體溫系統（距離計算）
3. 區域偵測

### 階段四：資源系統

1. 自動採集（木材/魚）
2. 自動烹飪
3. 自動販售
4. 背包容量

### 階段五：升級與存檔

1. 升級介面
2. 升級效果
3. localStorage 存檔

### 階段六：完善體驗

1. 動畫美化
2. 視覺回饋
3. 遊戲平衡

---

## 存檔結構

```typescript
interface SaveData {
    version: number;
    resources: Resources;
    upgrades: Upgrades;
    totalGoldEarned: number;
    bestSurvivalTime: number;
    playCount: number;
}
```

存檔 Key：`campfire_save_v1`
