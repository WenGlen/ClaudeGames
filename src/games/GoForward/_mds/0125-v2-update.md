# GoForward 更新紀錄 v2 - 2025/01/25

## 更新內容

本次更新改善視覺效果和遊戲體驗細節：

---

### 1. 主角加圓角

**修改原因**：讓主角更像史萊姆，視覺上更柔和

**修改方式**：使用 `ctx.roundRect()` 繪製圓角矩形

```typescript
// 圓角半徑為尺寸的 35%
const cornerRadius = Math.min(drawWidth, drawHeight) * 0.35;

ctx.beginPath();
ctx.roundRect(playerX, playerY, drawWidth, drawHeight, cornerRadius);
ctx.fill();

// 眼睛也加小圓角
const eyeRadius = Math.min(eyeWidth, eyeHeight) * 0.3;
ctx.roundRect(eyeX, eyeY, eyeWidth, eyeHeight, eyeRadius);
```

---

### 2. 騙人平台顏色更淡

**修改原因**：原本顏色（80%）與正常平台太接近，難以區分

**修改方式**：將顏色改得更淡（約 50% 感覺）

```typescript
// 修改前
ctx.fillStyle = '#3a4a66';  // 主體
ctx.fillStyle = '#4a5a76';  // 頂部

// 修改後
ctx.fillStyle = '#2a3a56';  // 主體（更暗更透）
ctx.fillStyle = '#354565';  // 頂部
```

---

### 3. 墜落平台計時邏輯

**確認結果**：邏輯已正確，踩上就開始計時

```typescript
// 玩家站在墜落平台上時
if (collision.platform.type === 'falling' && !collision.platform.isFalling) {
    collision.platform.standTime = (collision.platform.standTime || 0) + 1;
    // 達到 120 幀（2秒）後墜落
    if (collision.platform.standTime >= CONFIG.FALLING_PLATFORM_DELAY) {
        collision.platform.isFalling = true;
    }
}
```

---

### 4. 背景色塊視差效果

**修改原因**：干擾玩家的速度感，增加視覺趣味

**修改方式**：每個背景色塊有隨機的視差係數（0.1~0.9）

```typescript
interface BackgroundBlock {
    // ...
    parallax: number;  // 視差係數
}

// 生成時隨機視差
parallax: 0.1 + Math.random() * 0.8,

// 渲染時套用視差
const screenX = block.x - camera.x * block.parallax;
```

**效果**：
- parallax = 0.1 → 移動很慢（像遠處的雲）
- parallax = 0.5 → 移動中等
- parallax = 0.9 → 移動接近正常速度

不同速度的色塊交錯，造成速度錯覺，讓玩家更難判斷自己的真實速度。

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `GoForward.tsx` | 主角圓角、騙人平台顏色、背景視差 |

---

## 視覺變化摘要

| 元素 | 修改前 | 修改後 |
|------|--------|--------|
| 主角 | 方形 | 圓角矩形（35% 圓角） |
| 主角眼睛 | 方形 | 小圓角 |
| 騙人平台 | #3a4a66 | #2a3a56（更淡） |
| 背景色塊 | 固定速度 | 隨機視差（0.1~0.9） |
