# FindColors 更新紀錄 v1 - 2026/01/22

## 更新內容

本次更新包含以下修改：

### 1. 調整 Delta E 色差值（三倍）

**修改原因**：初始難度太高，玩家難以辨識

**修改方式**：將所有 Delta E 範圍值調整為原本的三倍

| 關卡 | 修改前 | 修改後 |
|------|--------|--------|
| 1-5 | 15-20 | 45-60 |
| 6-10 | 10-15 | 30-45 |
| 11-15 | 5-10 | 15-30 |
| 16-20 | 3-5 | 9-15 |
| 21+ | 1-3 | 3-9 |

---

### 2. 調整選項數量遞進規則

**修改原因**：改為正方形排列，更直覺

**修改方式**：每 5 關增加一排一列

| 關卡 | 修改前 | 修改後 |
|------|--------|--------|
| 1-5 | 4 | 4 (2×2) |
| 6-10 | 6 | 9 (3×3) |
| 11-15 | 8 | 16 (4×4) |
| 16-20 | 10 | 25 (5×5) |
| ... | +2 | +1排+1列 |

```typescript
// 新的計算方式
const getOptionCount = (level: number): number => {
    const tier = Math.floor((level - 1) / CONFIG.GRID_INCREMENT_INTERVAL);
    const gridSize = CONFIG.INITIAL_GRID_SIZE + tier;
    return gridSize * gridSize;
};
```

---

### 3. 調整時間獎勵機制

**修改原因**：配合新的難度曲線

**修改方式**：每 5 關獎勵增加 5 秒

| 關卡 | 修改前 | 修改後 |
|------|--------|--------|
| 1-5 | +10秒 | +5秒 |
| 6-10 | +10秒 | +10秒 |
| 11-15 | +20秒 | +15秒 |
| 16-20 | +20秒 | +20秒 |
| ... | 每10關+10秒 | 每5關+5秒 |

---

### 4. 移除色塊邊框

**修改原因**：邊框會影響顏色判斷

**修改方式**：
- 移除選項色塊的 `border`
- 移除目標色塊的 `border` 和 `box-shadow`
- 縮小圓角以減少干擾

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `FindColors.tsx` | 更新 CONFIG 設定、修改 getOptionCount 函數 |
| `_FindColors.scss` | 移除 .color-option 和 .target-color 的邊框樣式 |

---

## 參數對照表

| 參數 | 修改前 | 修改後 |
|------|--------|--------|
| `INITIAL_OPTIONS` | 4 | (移除) |
| `OPTIONS_INCREMENT` | 2 | (移除) |
| `OPTIONS_INCREMENT_INTERVAL` | 5 | (移除) |
| `INITIAL_GRID_SIZE` | (無) | 2 |
| `GRID_INCREMENT_INTERVAL` | (無) | 5 |
| `BASE_TIME_REWARD` | 10 | 5 |
| `REWARD_INCREMENT_INTERVAL` | 10 | 5 |
