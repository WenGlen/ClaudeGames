# GoForward 更新紀錄 v1 - 2025/01/25

## 更新內容

本次更新包含大量遊戲體驗改進和新機制：

---

### 1. 平台改薄

**修改原因**：原本平台太厚（64px），視覺上過於笨重

**修改方式**：將 `PLATFORM_HEIGHT` 從 `TILE_SIZE * 2` 改為 `12px`（約原本的 1/5）

```typescript
// 修改前
height: CONFIG.TILE_SIZE * 2  // 64px

// 修改後
PLATFORM_HEIGHT: 12,          // 12px
```

---

### 2. 提高最大速度

**修改原因**：增加遊戲刺激感和難度

**修改方式**：
- `MAX_SPEED_X` 從 6 提高到 9

---

### 3. 高速慣性更明顯

**修改原因**：讓高速回頭時有更明顯的滑行感

**修改方式**：新增高速摩擦力機制

```typescript
HIGH_SPEED_THRESHOLD: 5,      // 高速閾值
FRICTION: 0.85,               // 一般摩擦力
FRICTION_HIGH_SPEED: 0.92,    // 高速時摩擦力更小（更滑）

// 摩擦力計算
const friction = isHighSpeed ? FRICTION_HIGH_SPEED : FRICTION;
player.vx *= friction;
```

---

### 4. 主角動態效果

**修改原因**：增加視覺回饋，讓主角更有生命力

**修改方式**：
1. **史萊姆效果**：idle 時主角會微微變瘦高再回來，週期性呼吸感
2. **速度壓扁**：高速移動時主角會變扁，強化速度感

```typescript
SLIME_CYCLE: 60,              // 史萊姆動畫週期（幀數）
SLIME_AMPLITUDE: 0.08,        // 史萊姆變形幅度
SPEED_SQUASH: 0.15,           // 高速時壓扁幅度

// 變形計算
const slimeScale = Math.sin(phase * Math.PI * 2) * SLIME_AMPLITUDE;
const speedSquash = speedRatio * SPEED_SQUASH;
const scaleX = 1 + speedSquash + slimeScale;
const scaleY = 1 - speedSquash - slimeScale;
```

---

### 5. 背景淡色塊

**修改原因**：讓背景不會太單調，增加視覺層次

**修改方式**：隨機生成半透明色塊作為背景裝飾

```typescript
interface BackgroundBlock {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    alpha: number;  // 0.15 ~ 0.35
}

BG_BLOCK_COLORS: ['#2d2d5a', '#3a3a6a', '#252550', '#1f1f45']
```

---

### 6. 尖刺改白色

**修改原因**：白色在深色背景上更醒目

**修改方式**：`OBSTACLE_COLOR` 從 `#e74c3c` 改為 `#ffffff`

---

### 7. 騙人平台 (Fake Platform)

**修改原因**：增加遊戲變化和陷阱機制

**特性**：
- 外觀顏色較淡（`#3a4a66`），暗示不可踩踏
- 高度落差大（比正常平台高或低 4+ 格）
- 玩家無法站上去，會直接穿過

```typescript
FAKE_PLATFORM_CHANCE: 0.08,
FAKE_PLATFORM_HEIGHT_DIFF: 4,

// 碰撞檢測跳過騙人平台
if (platform.type === 'fake') continue;
```

---

### 8. 限制平台 / 隧道 (Ceiling Platform)

**修改原因**：增加空間限制挑戰，限制跳躍高度

**特性**：
- 在一般平台上方生成天花板
- 形成隧道效果，玩家只能低跳通過
- 撞到天花板會停止上升

```typescript
TUNNEL_CHANCE: 0.08,

// 天花板碰撞
if (platform.type === 'ceiling' && player.vy < 0) {
    if (playerTop <= platBottom) {
        player.vy = 0;
        player.y = platBottom;
    }
}
```

---

### 9. 墜落平台 (Falling Platform)

**修改原因**：增加時間壓力和緊張感

**特性**：
- 黃色外觀（`#f1c40f`），清楚識別
- 玩家站上後開始計時
- 站超過 2 秒後開始墜落
- 即將墜落時會閃爍警告

```typescript
FALLING_PLATFORM_DELAY: 120,  // 2秒
FALLING_PLATFORM_COLOR: '#f1c40f',

// 墜落邏輯
if (standTime >= FALLING_PLATFORM_DELAY) {
    platform.isFalling = true;
}
if (platform.isFalling) {
    platform.fallSpeed += 0.3;
    platform.y += platform.fallSpeed;
}
```

---

### 10. 難度曲線調整

**修改原因**：讓特殊平台隨距離增加出現更頻繁

**修改方式**：所有特殊機制的出現機率都會隨 `difficultyFactor` 增加

| 機制 | 基礎機率 | 難度加成 |
|------|----------|----------|
| 騙人平台 | 8% | +10% |
| 墜落平台 | 10% | +15% |
| 隧道 | 8% | +8% |
| 尖刺 | 12% | +12% |

```typescript
const difficultyFactor = Math.min(1, distance / 5000);

// 範例：騙人平台機率
CONFIG.FAKE_PLATFORM_CHANCE + difficultyFactor * 0.1
```

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `GoForward.tsx` | 新增平台類型、背景色塊、主角動態、難度曲線 |

---

## 新增類型定義

```typescript
type PlatformType = 'normal' | 'fake' | 'falling' | 'ceiling';

interface Platform {
    type: PlatformType;
    isFalling?: boolean;
    standTime?: number;
    fallSpeed?: number;
}

interface BackgroundBlock {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    alpha: number;
}
```

---

## 視覺變化摘要

| 元素 | 變化 |
|------|------|
| 平台 | 更薄（12px） |
| 尖刺 | 紅色 → 白色 |
| 騙人平台 | 顏色較淡 |
| 墜落平台 | 黃色 + 閃爍警告 |
| 天花板 | 深色 + 底部暗邊 |
| 主角 | 呼吸動態 + 速度壓扁 |
| 背景 | 隨機淡色塊 |
