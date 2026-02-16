# Campfire 更新紀錄 v3 - 2026/01/31

## 更新內容

本次更新包含五項改動：三階段升級資料模型、個別升級點、置物區雙圓圈、金錢顯示、CSS 放大重構。

---

### Phase 3 — 三階段升級（資料模型最大改動）

**修改原因**：原版升級為布林值（有/無），缺乏漸進感和成長曲線。

**修改方式**：每項升級改為 0-3 等級，各等級有獨立效果和價格。

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| 升級類型 | `boolean` | `number` (0-3) |
| 資料結構 | `Upgrades { axe: boolean }` | `Upgrades { axe: number }` |
| 效果定義 | 單一值 | `effects: number[]`（每級不同） |
| 價格定義 | 單一值 | `prices: number[]`（每級遞增） |

- 新增 `UpgradeLevelDef` 介面：`icon`, `name`, `descs[]`, `effects[]`, `prices[]`, `pos`
- 新增 `UPGRADE_LEVELS: Record<UpgradeKey, UpgradeLevelDef>` 配置表
- `getUpgradeEffect(key, level)` 統一取得升級效果值
- 未升級時回傳基礎值（如 boots → `MOVE_SPEED`，backpack → `BACKPACK_DEFAULT`）

#### 各升級等級定義

| 升級 | Lv1 | Lv2 | Lv3 | 價格 |
|------|-----|-----|-----|------|
| 🪓 斧頭 | 速度 ×0.75 | ×0.50 | ×0.35 | $50 / $100 / $200 |
| 🎣 釣竿 | 速度 ×0.75 | ×0.50 | ×0.35 | $75 / $150 / $300 |
| 🥾 靴子 | 速度 2.5 | 3.0 | 3.5 | $100 / $200 / $400 |
| 🎒 背包 | 容量 13 | 16 | 20 | $125 / $250 / $500 |
| 🔥 營火 | 範圍 88 | 105 | 122 | $150 / $300 / $600 |

---

### Phase 4 — 個別升級點（依賴 Phase 3 的新資料模型）

**修改原因**：原版升級站為單一位置，缺乏地圖探索感。

**修改方式**：每項升級在地圖上有獨立位置，玩家走到指定點才能查看和購買。

| 升級 | 位置 |
|------|------|
| 🪓 斧頭 | (220, 310) |
| 🎣 釣竿 | (280, 310) |
| 🥾 靴子 | (340, 310) |
| 🎒 背包 | (220, 370) |
| 🔥 營火 | (280, 370) |
| 🌱 生長加速劑 | (340, 370) |

- Zone 類型新增 `'upgradePoint' | 'acceleratorPoint'`
- `ZoneDetection` 新增 `upgradeType` 欄位，記錄靠近哪個升級
- 地圖上每個升級點顯示 emoji + 星星等級 `★★☆`
- 靠近時彈出升級卡片 `.upgrade-card`，顯示名稱、效果、價格和購買按鈕
- 滿級顯示「已滿級」

---

### Phase 2 — 置物區雙圓圈（獨立改動）

**修改原因**：儲木場原版設計為方框左右進出，操作不夠直覺。

**修改方式**：改為雙圓圈設計，左圓存入、右圓取出，各有獨立 SVG 範圍圈。

#### 木柴儲木場

| 項目 | 值 |
|------|-----|
| 存入圓（左） | (380, 90)，範圍 20px |
| 取出圓（右） | (420, 90)，範圍 20px |
| 容量 | 20 |

#### 食物置物區

| 項目 | 值 |
|------|-----|
| 取出圓（右） | (420, 245)，範圍 20px |
| 存入方式 | 烹飪完成自動放入 |

- Zone 類型新增 `'storageDeposit' | 'storagePickup' | 'foodStoragePickup'`
- 每個圓圈有獨立的 SVG 範圍圓指示（棕色 / 橘色虛線）
- 圓圈內顯示 📥📤 emoji + 存入/取出 label
- 中央顯示庫存數量 `🪵 N/20` 或 `🍳 N`

---

### Phase 5 — 金錢顯示（小改動）

**修改原因**：金幣數量混在物品欄中不夠醒目。

**修改方式**：底部欄位拆分為物品欄 + 金幣顯示兩個區塊。

| 項目 | 說明 |
|------|------|
| `.inventory` | 木柴、生魚、熟魚 + 背包容量 |
| `.gold-display` | 💰 icon + 金幣數值（獨立區塊，金色文字） |

- 金幣數值右對齊，最小寬度保證顯示穩定
- 背景半透明黑色，與物品欄視覺一致但分開

---

### Phase 1 — CSS 放大重構（zoom:2 → 個別 1.5x）

**修改原因**：原版使用 `zoom: 2` 全域放大，造成畫面太大且部分元素跑版。

**修改方式**：移除 `zoom: 2`，改為地圖內使用 `scale(1.5)` + 外部 UI 個別放大。

#### 地圖縮放策略

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| 縮放方式 | `.Campfire { zoom: 2 }` | 移除 zoom，改用 `scale(1.5)` |
| 視口尺寸 | 400×450（zoom 後 800×900） | 600×675（原生尺寸） |
| 世界容器 | 800×450 + translateX | 800×450 + `scale(1.5) translateX()` |
| transform-origin | 未設定 | `top left` |

- `.world` 的 inline style 從 `translateX(${-cameraX}px)` 改為 `scale(1.5) translateX(${-cameraX}px)`
- CSS transform 右到左執行：先 translateX（原座標空間），再 scale 放大
- 視覺偏移 = cameraX × 1.5，鏡頭數學不需修改（max cameraX = 400，視覺 600 = 1200-600）
- 地圖內所有元素（zone、tree、player、SVG）由 scale 統一放大，無需逐一修改

#### 外部 UI 個別放大（~1.5x）

| 元素 | 主要變更 |
|------|----------|
| `.title` | font-size 1.5→2.25rem |
| `.bottom-bar` | max-width 400→600px |
| `.inventory` | padding、font-size、gap 各 ×1.5 |
| `.gold-display` | padding、font-size、gap 各 ×1.5 |
| `.action-indicator` | font-size 0.85→1.3rem，bar 120→180px |
| `.joystick .base` | 120→180px，handle 50→75px |
| `.upgrade-card` | min-width 160→240px，font-size 各 ×1.5 |
| `.overlay .panel` | padding 2→3rem，max-width 320→480px |

#### 搖桿配置調整

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| `JOYSTICK_BASE_SIZE` | 120 | 180 |
| `JOYSTICK_HANDLE_SIZE` | 50 | 75 |
| `JOYSTICK_DEAD_ZONE` | 15 | 22 |
| `JOYSTICK_MAX_DISTANCE` | 35 | 52 |

---

## 區域佈局圖

```
                  🪵 儲木場（雙圓）
                📥(380,90)  📤(420,90)

  🌲🌲🌲          🔥 營火          🧊 冰湖
 (左側樹群)      (400,160)        (550,80)

                  🍳 食物置物區
                  📤(420,245)

  🪓(220,310)  🎣(280,310)  🥾(340,310)     🛒 收銀台
  🎒(220,370)  🔥(280,370)  🌱(340,370)     (490,250)

                  🧍 玩家起始
                  (400,210)
```

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `Campfire.tsx` | 三階段升級資料模型、`UpgradeLevelDef`、個別升級點座標/偵測/UI、雙圓圈 Zone 類型、金幣分離顯示、`scale(1.5)` 世界容器、搖桿配置調整 |
| `_Campfire.scss` | 移除 `zoom: 2`、game-map 600×675、world `transform-origin: top left`、所有外部 UI 元素尺寸 ×1.5（inventory/gold/joystick/upgrade-card/overlay/action-indicator） |
