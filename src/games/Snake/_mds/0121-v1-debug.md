# Snake Game Debug 記錄 - 2024/01/21

## Bug 描述
點擊開始遊戲後約一秒，蛇就消失了。

## 問題根因分析

### 原始程式碼問題
在 `gameLoop` 函數中，原本的邏輯如下：

```tsx
const gameLoop = useCallback(() => {
    setSnake(prevSnake => {
        // ... 移動邏輯 ...

        const newSnake = [head, ...prevSnake];

        // 問題點：在 setSnake 的 updater 中巢狀呼叫 setFood
        setFood(prevFood => {
            if (head.x === prevFood.x && head.y === prevFood.y) {
                // 吃到食物的處理...
                return generateFood(newSnake);
            }
            newSnake.pop();  // ❌ 這裡修改了要返回的 newSnake
            return prevFood;
        });

        return newSnake;  // 返回被 pop() 修改過的陣列
    });
}, [...]);
```

### 問題說明
1. **閉包陷阱**：`setFood` 的回呼函數中對 `newSnake` 執行 `pop()`
2. **執行順序**：React 的 state updater 可能不會立即執行，但 `newSnake.pop()` 會在閉包中被調用
3. **結果**：當蛇只有一個節點時，`pop()` 會將陣列變成空陣列 `[]`，導致蛇消失

## 解決方案

### 修改策略
1. 新增 `foodRef` 來同步追蹤食物位置，避免在 state updater 中巢狀呼叫其他 setter
2. 將吃食物與不吃食物的邏輯分開處理，不再使用 `pop()` 修改原陣列

### 修改後的程式碼

```tsx
// 新增 foodRef
const foodRef = useRef<Point>({ x: 10, y: 10 });

// 重置時同步更新 foodRef
const resetGame = useCallback(() => {
    const initialSnake = [{ x: 5, y: 5 }];
    const newFood = generateFood(initialSnake);
    setSnake(initialSnake);
    setFood(newFood);
    foodRef.current = newFood;  // 同步更新
    // ...
}, [generateFood]);

// 修改後的 gameLoop
const gameLoop = useCallback(() => {
    setSnake(prevSnake => {
        // ... 移動邏輯 ...

        // 使用 ref 同步取得食物位置
        const currentFood = foodRef.current;
        const ateFood = head.x === currentFood.x && head.y === currentFood.y;

        if (ateFood) {
            // 吃到食物：蛇變長（不移除尾巴）
            const newSnake = [head, ...prevSnake];

            // 產生新食物並同步更新 ref 和 state
            const newFood = generateFood(newSnake);
            foodRef.current = newFood;
            setFood(newFood);

            // 加分、加速...
            return newSnake;
        } else {
            // 沒吃到食物：使用 slice 建立新陣列，不修改原陣列
            const newSnake = [head, ...prevSnake.slice(0, -1)];
            return newSnake;
        }
    });
}, [...]);
```

## 修改重點

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| 食物位置追蹤 | 僅使用 state | state + ref 雙重追蹤 |
| 移除尾巴方式 | `newSnake.pop()` 修改原陣列 | `prevSnake.slice(0, -1)` 建立新陣列 |
| 巢狀 setter | 在 `setSnake` 中呼叫 `setFood` | 分離邏輯，獨立處理 |

## 學到的教訓
1. **避免在 state updater 中修改閉包引用的變數**
2. **使用 ref 來同步追蹤需要立即讀取的狀態**
3. **使用不可變操作（如 `slice`）而非可變操作（如 `pop`）**
