# GoForward 更新紀錄 v5 - 2025/01/26

## 更新內容

本次更新修正 v4 遺留的兩個問題：

---

### 1. 騙人平台必死 Bug 根本修正

**問題描述**：v4 的修改雖然追蹤了 `lastStandable`，但 `currentY` 的計算基準仍然使用 `lastPlatform.y`（最後一個平台），導致：
- 如果最後一個平台是 `fake`（高度差很大），下一個可站立平台會基於錯誤的高度計算
- 如果最後一個平台是 `ceiling`（在畫面高處），同樣會導致高度計算錯誤

**根本原因**：

```typescript
// v4 的問題代碼
const lastPlatform = platforms[platforms.length - 1];
let currentY = lastPlatform ? lastPlatform.y : ...;  // ❌ 可能是 fake/ceiling
```

**修正方式**：使用 `lastStandable.y` 作為高度計算基準

```typescript
// v5 修正後
const lastStandable = lastStandableRef.current;
let baseY = lastStandable.y;  // ✅ 永遠是可站立平台的高度

// 可站立平台的高度變化基於 baseY
let proposedY = Math.max(
    CONFIG.TILE_SIZE * 4,
    Math.min(CONFIG.CANVAS_HEIGHT - CONFIG.TILE_SIZE * 3, baseY + heightChange * CONFIG.TILE_SIZE)
);

// 騙人平台的高度也基於 baseY
if (platformType === 'fake') {
    currentY = Math.max(CONFIG.TILE_SIZE * 2, baseY - fakeDiff * CONFIG.TILE_SIZE);
}
```

**效果**：
- 所有可站立平台的高度都基於「最後一個可站立平台」計算
- fake 和 ceiling 平台不會影響後續平台的高度基準
- 確保玩家永遠可以從一個可站立平台跳到下一個

---

### 2. 天花板視覺效果增強

**問題描述**：天花板顏色 `#3d4f6f` 與一般平台 `#45567d` 太接近，加上背景色塊干擾，玩家很難注意到天花板的存在。

**修正方式**：

```typescript
// 修改前
ctx.fillStyle = CONFIG.CEILING_COLOR;  // #3d4f6f
ctx.fillRect(...);
ctx.fillStyle = '#2d3f5f';  // 底部暗邊
ctx.fillRect(...);

// 修改後
ctx.fillStyle = '#1a2a40';  // 更深的藍色
ctx.fillRect(...);
// 底部警示條紋（黃黑相間）
const stripeWidth = 8;
for (let i = 0; i < platform.width; i += stripeWidth * 2) {
    ctx.fillStyle = '#c9a227';  // 警示黃
    ctx.fillRect(screenX + i, platform.y + platform.height - 4, stripeWidth, 4);
}
```

**效果**：
- 天花板使用更深的藍色，與背景和一般平台形成明顯對比
- 底部加入黃色警示條紋，視覺上更醒目
- 玩家可以清楚看到隧道區域，提前準備低跳

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `GoForward.tsx` | 修正 `generateMorePlatforms` 中的 `currentY` 基準、增強天花板渲染效果 |

---

## 邏輯對比

### 平台高度計算基準

| 情境 | v4 | v5 |
|------|-----|-----|
| 前一個是 normal | ✅ 正確 | ✅ 正確 |
| 前一個是 fake | ❌ 基於 fake 的怪異高度 | ✅ 基於 lastStandable |
| 前一個是 ceiling | ❌ 基於 ceiling 的高位置 | ✅ 基於 lastStandable |
| 前一個是 falling | ✅ 正確 | ✅ 正確 |

### 天花板視覺

| 項目 | v4 | v5 |
|------|-----|-----|
| 主體顏色 | #3d4f6f（與平台接近） | #1a2a40（深藍，對比明顯） |
| 邊緣標示 | 底部暗邊 | 黃色警示條紋 |
| 可見度 | 低 | 高 |

---

## 測試建議

1. **騙人平台測試**：
   - 觀察連續 fake 平台後是否有可達的可站立平台
   - 確認 fake 平台的高度變化不會影響後續平台

2. **天花板測試**：
   - 確認天花板的黃色條紋清楚可見
   - 確認在隧道區域跳躍時會撞到天花板
