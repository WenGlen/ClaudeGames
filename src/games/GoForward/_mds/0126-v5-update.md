# GoForward 更新紀錄 v5 - 2025/01/26

## 更新內容

本次更新修正 v4 遺留的兩個核心問題：

---

### 1. 騙人平台必死 Bug（真正修正）

**問題描述**：當 fake 平台生成後，`lastPlatformEndRef` 會更新為 fake 平台的結尾。下一個可站立平台的位置是基於這個 fake 結尾計算的，導致：

```
lastStandable.endX = 300
fake 平台結束於 500
間隙 = 96
下一個可站立平台 currentX = 596
實際跳躍距離 = 596 - 300 = 296 > MAX_JUMP_DISTANCE(280) → 必死！
```

**修正方式**：

1. **fake 平台後強制可站立**：如果上一個平台是 fake，這次必須是可站立平台
2. **位置基於 lastStandable 計算**：fake 平台後的平台位置從 `lastStandable.endX` 計算，而不是 fake 的結尾

```typescript
const lastWasFake = lastPlatform?.type === 'fake';

// 如果上一個是 fake，位置要從 lastStandable 計算
let currentX: number;
if (lastWasFake) {
    currentX = lastStandable.endX + gapWidth;  // 確保可達
} else {
    currentX = lastPlatformEndRef.current + gapWidth;
}

// fake 後強制可站立
const mustBeStandable = lastWasFake || distFromLastStandable > CONFIG.MAX_JUMP_DISTANCE * 0.7;
```

**效果**：
- fake 平台後一定緊接著可站立平台
- 可站立平台的位置永遠基於最後一個可站立平台計算
- 玩家永遠不會遇到跳不過去的情況

---

### 2. 天花板位置修正（真正的天花板）

**問題描述**：原本天花板生成在「平台正上方」，如果平台位置較低，玩家可以直接站在天花板上，失去限制跳躍高度的意義。

**正確的天花板定義**：
- 天花板應該在「間隙上方」（兩個平台之間的空中）
- 用來限制玩家的跳躍高度，迫使玩家用較低的跳躍通過

**修正方式**：

```typescript
// 天花板覆蓋間隙區域
const gapStartX = lastStandable.endX;
const gapEndX = currentX;
const ceilingWidth = gapEndX - gapStartX + CONFIG.TILE_SIZE * 2;

// 天花板高度：取兩個平台中較高的那個，再往上約 1.5 個玩家高度
const higherPlatformY = Math.min(lastStandable.y, currentY);
const ceilingY = higherPlatformY - CONFIG.PLAYER_SIZE * 1.8;

// 確保天花板位置合理（能撞到但能通過）
if (ceilingY > CONFIG.TILE_SIZE * 2 && ceilingY < higherPlatformY - CONFIG.PLAYER_SIZE - 10) {
    // 生成天花板
}
```

**視覺效果**：天花板使用和一般平台相同的樣式，不需要特殊標示。

**效果**：
- 天花板位於間隙上方，玩家無法站在上面
- 天花板限制跳躍高度，玩家必須用較低的跳躍通過
- 增加遊戲挑戰性和策略性

---

### 3. 手機版體驗優化

**問題描述**：
1. 按鈕位置不符合人體工學（大部分人是右撇子，右手應該控制方向鍵）
2. 觸控響應有問題（放開沒放開、點擊沒點到）
3. 手機版視窗太窄，overlay 內容被壓縮

**修正方式**：

#### 按鈕位置對調
```jsx
// 修改前：方向鍵在左，跳躍在右
// 修改後：跳躍在左（左手），方向鍵在右（右手拇指）
<div className="mobile-controls">
    <button className="control-btn--jump">跳躍</button>  {/* 左邊 */}
    <div className="direction-buttons">← →</div>         {/* 右邊 */}
</div>
```

#### 觸控響應改善
```typescript
// 使用 curried function 並加入 preventDefault
const handleTouchStart = (action) => (e: React.TouchEvent) => {
    e.preventDefault();  // 防止觸控延遲
    inputRef.current[action] = true;
};

// 加入 onTouchCancel 處理觸控被中斷的情況
<button
    onTouchStart={handleTouchStart('left')}
    onTouchEnd={handleTouchEnd('left')}
    onTouchCancel={handleTouchEnd('left')}  // 新增
/>
```

#### 響應式設計優化
- 新增 `@media (max-width: 450px)` 針對小螢幕手機
- 縮小 overlay 內的字體和 padding
- 調整按鈕大小確保可點擊但不佔用太多空間

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `GoForward.tsx` | 修正 fake 平台、天花板位置、手機觸控事件處理、按鈕位置對調 |
| `_GoForward.scss` | 響應式設計優化、overlay 縮放、新增小螢幕斷點 |

---

## 邏輯對比

### 騙人平台處理

| 情境 | v4 | v5 |
|------|-----|-----|
| fake 後的平台位置 | 基於 fake 結尾 + 間隙 | 基於 lastStandable + 間隙 |
| fake 後的平台類型 | 可能又是 fake | 強制可站立 |
| 跳躍可達性 | 可能超出範圍 | 保證可達 |

### 天花板位置

| 項目 | v4 | v5 |
|------|-----|-----|
| X 位置 | 平台正上方 | 間隙上方（兩平台之間） |
| Y 位置 | 平台上方 2.2 格 | 較高平台上方 1.8 個玩家高度 |
| 玩家能否站上 | 可能可以 | 不可能（在空中） |
| 實際功能 | 可能無效 | 限制跳躍高度 |

---

## 測試建議

1. **騙人平台測試**：
   - 觀察 fake 平台後是否緊接著可站立平台
   - 確認從 fake 前的平台可以跳到 fake 後的平台
   - 連續遊玩驗證不會遇到必死情況

2. **天花板測試**：
   - 確認天花板出現在間隙上方（空中）
   - 確認跳太高會撞到天花板
   - 確認用較低跳躍可以通過

3. **手機版測試**：
   - 確認跳躍鍵在左邊、方向鍵在右邊
   - 測試快速連續點擊方向鍵，確認響應正常
   - 測試手指滑出按鈕範圍，確認會正確停止動作
   - 確認 overlay（開始畫面、結束畫面）不會被壓縮，按鈕可見可點擊
