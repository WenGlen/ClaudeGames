# GoForward 更新紀錄 v4 - 2025/01/25

## 更新內容

本次更新修正騙人平台邏輯並提高天花板出現機率：

---

### 1. 騙人平台邏輯重新設計

**問題描述**：原本的邏輯是「前一個不能是騙人平台」，但這不正確。正確邏輯應該是「在跳躍可達範圍內必須有可站立的平台」。

**修改方式**：

#### 新增跳躍距離計算

```typescript
// CONFIG 新增
MAX_JUMP_DISTANCE: 280,    // 最大跳躍水平距離
MAX_JUMP_HEIGHT: 140,      // 最大跳躍高度

// 新增可達性檢查函數
const isReachable = (fromX, fromY, toX, toY) => {
    const horizontalDist = toX - fromX;
    const verticalDist = fromY - toY;  // 正值表示目標更高

    // 水平距離超過最大跳躍距離
    if (horizontalDist > MAX_JUMP_DISTANCE) return false;

    // 目標太高（超過最大跳躍高度）
    if (verticalDist > MAX_JUMP_HEIGHT) return false;

    // 考慮高度差對水平距離的影響
    const effectiveMaxDist = MAX_JUMP_DISTANCE - Math.max(0, verticalDist) * 0.5;
    return horizontalDist <= effectiveMaxDist;
};
```

#### 追蹤最後可站立平台

```typescript
// 新增 ref
const lastStandableRef = useRef<{ x: number; endX: number; y: number }>({ x: 0, endX: 0, y: 0 });

// 每次生成可站立平台時更新
if (platformType !== 'fake' && platformType !== 'ceiling') {
    lastStandableRef.current = { x: currentX, endX: currentX + platformWidth, y: currentY };
}
```

#### 強制生成可站立平台

```typescript
// 檢查距離最後可站立平台的距離
const distFromLastStandable = currentX - lastStandable.endX;

// 如果距離太遠，強制生成可站立平台
const mustBeStandable = distFromLastStandable > CONFIG.MAX_JUMP_DISTANCE * 0.7;

if (!mustBeStandable) {
    // 可以生成騙人平台或墜落平台
} else {
    // 強制生成 normal 或 falling 平台
}
```

**效果**：
- 可以有連續多個騙人平台
- 但在跳躍可達範圍內一定會有可站立的平台
- 考慮高度差對跳躍距離的影響

---

### 2. 天花板機制改進

**問題描述**：天花板（隧道）出現機率太低，玩家測試中幾乎沒碰到。

**修改方式**：

```typescript
// 修改前
if (platformType === 'normal' && Math.random() < CONFIG.TUNNEL_CHANCE + difficultyFactor * 0.08) {
    const ceilingY = currentY - CONFIG.TILE_SIZE * 2.5;
    if (ceilingY > CONFIG.TILE_SIZE * 2) {  // 條件嚴格

// 修改後
if (platformType === 'normal' && Math.random() < CONFIG.TUNNEL_CHANCE * 2 + difficultyFactor * 0.12) {
    const ceilingY = currentY - CONFIG.TILE_SIZE * 2.2;  // 天花板稍微低一點
    if (ceilingY > CONFIG.TILE_SIZE) {  // 放寬條件
```

**變更對比**：

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| 基礎機率 | 8% | 16% |
| 難度加成 | +8% | +12% |
| 天花板距離 | 2.5 格 | 2.2 格 |
| 最低高度限制 | 64px | 32px |

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `GoForward.tsx` | 新增跳躍距離參數、isReachable 函數、lastStandableRef、修改平台生成邏輯、提高天花板機率 |

---

## 新邏輯說明

### 跳躍可達性計算

```
跳躍距離 = 最大速度 × 滯空時間
        = 9 × 43 ≈ 387 像素（理論值）

保守估計 = 280 像素（考慮加速時間）

高度影響：目標越高，可跳躍的水平距離越短
effectiveMaxDist = 280 - max(0, heightDiff) × 0.5
```

### 平台生成流程

```
1. 計算新平台位置
2. 計算距離最後可站立平台的距離
3. if (距離 > 跳躍距離的 70%) {
      強制生成可站立平台
   } else {
      可以隨機生成騙人平台
   }
4. 如果是可站立平台，更新 lastStandableRef
5. 檢查天花板生成條件
```
