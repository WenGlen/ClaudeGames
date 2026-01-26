# FindColors 更新紀錄 v2 - 2026/01/22

## 更新內容

### 1. 修正干擾色重複問題

**問題描述**：前幾關干擾色之間太相似（例如出現兩個黃綠色），導致答案過於明顯。

**解決方案**：生成干擾色時，檢查與已有干擾色的色差，確保彼此間有足夠差異。

**新增參數**：

| 參數 | 值 | 說明 |
|------|-----|------|
| `MIN_DISTRACTOR_DIFF_EARLY` | 25 | 1-10 關干擾色間的最小色差 |
| `MIN_DISTRACTOR_DIFF_LATE` | 0 | 11+ 關允許重複 |
| `DISTRACTOR_DIFF_THRESHOLD` | 10 | 從第幾關開始允許重複 |

**修改邏輯**：

```typescript
const generateDistractorColor = (
    target: RGB,
    existingColors: RGB[],  // 新增：已生成的干擾色
    minDeltaE: number,
    maxDeltaE: number,
    minDistractorDiff: number  // 新增：干擾色間最小差異
): RGB => {
    // 生成顏色時，除了檢查與目標的色差
    // 還要檢查與已有干擾色的色差
    for (const existingLab of existingLabs) {
        if (deltaE(newLab, existingLab) < minDistractorDiff) {
            tooSimilar = true;
            break;
        }
    }
};
```

---

### 2. 修正手機版 hover 效果暴露答案

**問題描述**：在觸控設備上，點擊色塊會觸發 hover 狀態並「黏住」，導致提前暴露答案。

**解決方案**：使用 `@media (hover: hover)` 限制 hover 效果只在支援 hover 的設備（桌面）上生效。

**修改內容**：

```scss
.color-option {
    -webkit-tap-highlight-color: transparent;

    // 只在支援 hover 的設備上顯示效果
    @media (hover: hover) {
        &:hover {
            transform: scale(1.05);
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
        }

        &:active {
            transform: scale(0.95);
        }
    }
}
```

---

## 修改檔案清單

| 檔案 | 修改內容 |
|------|----------|
| `FindColors.tsx` | 新增干擾色差異參數、修改 generateDistractorColor 函數、修改 generateLevel 函數 |
| `_FindColors.scss` | 使用 @media (hover: hover) 包裹 hover/active 樣式 |
