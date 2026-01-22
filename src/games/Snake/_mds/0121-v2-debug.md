# Snake Game Debug 記錄 v2 - 2024/01/21

## Bug 描述
吃到蘋果後蛇不會變長，分數有增加但身體長度維持不變。

## 問題根因分析

### 原始程式碼問題
在 v1 修復後，`gameLoop` 使用 `setSnake` 的 functional updater：

```tsx
const gameLoop = useCallback(() => {
    setSnake(prevSnake => {
        // ... 遊戲邏輯 ...

        if (ateFood) {
            const newSnake = [head, ...prevSnake];
            // 在 setSnake 的 updater 中呼叫其他 setState
            setFood(newFood);
            setScore(...);
            setSpeed(...);
            return newSnake;
        }
        // ...
    });
}, [gridCount, generateFood, highScore]);  // ❌ highScore 在依賴中
```

### 問題說明

1. **依賴陣列包含 `highScore`**：每次分數更新可能導致 `highScore` 改變，進而使 `gameLoop` 被重新建立

2. **遊戲迴圈 effect 重新執行**：
   ```tsx
   useEffect(() => {
       if (gameStatus === 'playing') {
           gameLoopRef.current = window.setInterval(gameLoop, speed);
       }
       return () => { clearInterval(...) };
   }, [gameStatus, speed, gameLoop]);  // gameLoop 改變會觸發清理和重建
   ```

3. **State updater 中的副作用**：在 `setSnake` 的 updater 函數中呼叫其他 `setState`，可能導致 React 的 batching 機制產生預期外的行為

4. **閉包陷阱**：`setSnake(prevSnake => ...)` 中的 `prevSnake` 是正確的，但當 `gameLoop` 被重建時，新舊 interval 可能短暫重疊，造成狀態不一致

## 解決方案

### 修改策略
1. 新增 `snakeRef` 來同步追蹤蛇的狀態
2. 將 `gameLoop` 改為直接讀取 ref，而非依賴 state updater
3. 移除 `highScore` 從依賴陣列，使用 functional updater 處理

### 修改後的程式碼

```tsx
// 新增 snakeRef
const snakeRef = useRef<Point[]>([{ x: 5, y: 5 }]);

// 重置時同步更新 snakeRef
const resetGame = useCallback(() => {
    const initialSnake = [{ x: 5, y: 5 }];
    const newFood = generateFood(initialSnake);
    snakeRef.current = initialSnake;  // 同步更新
    foodRef.current = newFood;
    setSnake(initialSnake);
    setFood(newFood);
    // ...
}, [generateFood]);

// 修改後的 gameLoop - 使用 ref 避免閉包問題
const gameLoop = useCallback(() => {
    // 直接從 ref 讀取當前蛇的狀態
    const prevSnake = snakeRef.current;

    // ... 移動和碰撞檢測邏輯 ...

    let newSnake: Point[];

    if (ateFood) {
        // 吃到食物：蛇變長
        newSnake = [head, ...prevSnake];

        // 更新食物
        const newFood = generateFood(newSnake);
        foodRef.current = newFood;
        setFood(newFood);

        // 加分 - 使用巢狀 functional updater 處理 highScore
        setScore(prev => {
            const newScore = prev + 10;
            setHighScore(currentHigh => {
                if (newScore > currentHigh) {
                    localStorage.setItem('snake-high-score', newScore.toString());
                    return newScore;
                }
                return currentHigh;
            });
            return newScore;
        });

        setSpeed(prev => Math.max(CONFIG.MIN_SPEED, prev - CONFIG.SPEED_INCREMENT));
    } else {
        // 沒吃到食物：移除尾巴
        newSnake = [head, ...prevSnake.slice(0, -1)];
    }

    // 同時更新 ref 和 state
    snakeRef.current = newSnake;
    setSnake(newSnake);
}, [gridCount, generateFood]);  // ✅ 移除 highScore 依賴
```

## 修改重點

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| 蛇狀態追蹤 | 僅使用 state | state + ref 雙重追蹤 |
| gameLoop 讀取蛇 | `setSnake(prevSnake => ...)` | 直接讀取 `snakeRef.current` |
| 依賴陣列 | 包含 `highScore` | 移除 `highScore` |
| highScore 更新 | 閉包中直接比較 | 使用 functional updater |

## 學到的教訓

1. **使用 ref 追蹤頻繁更新的遊戲狀態**：避免因 state 變化導致 callback 重建
2. **減少 useCallback 的依賴**：依賴越少，callback 越穩定
3. **避免在 state updater 中做複雜的副作用**：應該將邏輯移到 updater 外部
4. **使用 functional updater 處理相依的 state 更新**：確保取得最新值
