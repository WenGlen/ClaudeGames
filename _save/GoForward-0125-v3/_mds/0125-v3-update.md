# GoForward 更新紀錄 v3 - 2025/01/25

## 更新內容

本次更新修正兩個重要的遊戲邏輯問題：

---

### 1. 避免連續騙人平台導致必死

**問題描述**：如果連續生成騙人平台，玩家會因為沒有可站立的平台而必定墜落死亡。

**修改方式**：在生成平台時檢查前一個平台類型，如果是騙人平台則強制生成正常平台。

```typescript
// 檢查前一個平台是否為騙人平台
const lastPlatformType = lastPlatform?.type;
const canBeFake = lastPlatformType !== 'fake' && lastPlatformType !== 'ceiling';

// 只有前一個不是騙人平台時，才可能生成騙人平台
if (canBeFake && typeRoll < CONFIG.FAKE_PLATFORM_CHANCE + difficultyFactor * 0.1) {
    platformType = 'fake';
}
```

**效果**：騙人平台前後一定有可站立的平台，玩家不會陷入必死局面。

---

### 2. 墜落平台計時邏輯修正

**問題描述**：原本的邏輯是「玩家持續站著才計時」，應該改成「踩上就觸發，不管有沒有繼續站著都會在 2 秒後墜落」。

**修改方式**：

#### 新增 `triggered` 屬性
```typescript
interface Platform {
    // ...
    triggered?: boolean;   // 墜落平台是否已被觸發
    standTime?: number;    // 觸發後的計時
}
```

#### 踩上即觸發
```typescript
// updatePlayer 中
if (collision.platform.type === 'falling' && !collision.platform.triggered) {
    collision.platform.triggered = true;  // 標記已觸發
}
```

#### 持續計時直到墜落
```typescript
// updateFallingPlatforms 中
if (platform.triggered && !platform.isFalling) {
    platform.standTime = (platform.standTime || 0) + 1;
    if (platform.standTime >= CONFIG.FALLING_PLATFORM_DELAY) {
        platform.isFalling = true;
    }
}
```

#### 閃爍效果改進
```typescript
// 被觸發後就開始閃爍，頻率隨時間加快
if (platform.triggered && !platform.isFalling) {
    const progress = (platform.standTime || 0) / CONFIG.FALLING_PLATFORM_DELAY;
    const flashSpeed = Math.max(2, 8 - Math.floor(progress * 6));
    if (Math.floor(frame / flashSpeed) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(screenX, platform.y, platform.width, platform.height);
    }
}
```

**效果**：
- 踩上墜落平台後立即開始閃爍
- 閃爍頻率隨時間加快（越接近墜落閃越快）
- 2 秒後平台墜落，不管玩家是否還在上面

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `GoForward.tsx` | Platform 介面、平台生成邏輯、墜落平台計時邏輯、閃爍效果 |

---

## 邏輯對比

### 騙人平台生成

| 狀況 | 修改前 | 修改後 |
|------|--------|--------|
| 前一個是正常平台 | 可生成騙人平台 | 可生成騙人平台 |
| 前一個是騙人平台 | 可生成騙人平台 | **強制正常平台** |

### 墜落平台計時

| 狀況 | 修改前 | 修改後 |
|------|--------|--------|
| 踩上瞬間 | 無動作 | 觸發計時 + 閃爍 |
| 持續站著 | 累加計時 | 持續計時 |
| 跳開後 | 停止計時 | **繼續計時** |
| 2秒後 | 墜落（如果還站著） | **無條件墜落** |
