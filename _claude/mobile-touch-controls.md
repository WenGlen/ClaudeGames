# 手機觸控操作功能參考文件

本文件記錄 ClaudeGames 專案中所有手機觸控操作的實作方式，供其他遊戲或專案直接參考移植。

---

## 一、虛擬搖桿（Analog Joystick）— Campfire 遊戲

支援 8 方向移動，適用於 RPG / 探索類遊戲。

### 1. Types

```typescript
type Direction = 'up' | 'down' | 'left' | 'right' |
    'up-left' | 'up-right' | 'down-left' | 'down-right' | null;
```

### 2. 設定常數

```typescript
const JOYSTICK_CONFIG = {
  JOYSTICK_BASE_SIZE: 180,      // 底座直徑 (px)
  JOYSTICK_HANDLE_SIZE: 75,     // 搖桿手把直徑 (px)
  JOYSTICK_DEAD_ZONE: 22,       // 死區距離，低於此值不觸發方向 (px)
  JOYSTICK_MAX_DISTANCE: 52,    // 手把最大移動距離 (px)
};
```

### 3. State & Refs

```typescript
const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
const [joystickActive, setJoystickActive] = useState(false);
const joystickRef = useRef<{ startX: number; startY: number } | null>(null);
const directionRef = useRef<Direction>(null);
```

### 4. 角度轉方向（8 方向）

```typescript
const getDirectionFromAngle = (angle: number): Direction => {
    if (angle >= 337.5 || angle < 22.5) return 'right';
    if (angle >= 22.5 && angle < 67.5) return 'up-right';
    if (angle >= 67.5 && angle < 112.5) return 'up';
    if (angle >= 112.5 && angle < 157.5) return 'up-left';
    if (angle >= 157.5 && angle < 202.5) return 'left';
    if (angle >= 202.5 && angle < 247.5) return 'down-left';
    if (angle >= 247.5 && angle < 292.5) return 'down';
    if (angle >= 292.5 && angle < 337.5) return 'down-right';
    return null;
};
```

### 5. 事件處理函式

```typescript
/** 觸控/滑鼠按下 — 初始化搖桿 */
const handleJoystickStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const touch = 'touches' in e ? e.touches[0] : e;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joystickRef.current = { startX: centerX, startY: centerY };
    setJoystickActive(true);

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), CONFIG.JOYSTICK_MAX_DISTANCE);
    const angle = Math.atan2(dy, dx);
    setJoystickPos({ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance });

    if (distance > CONFIG.JOYSTICK_DEAD_ZONE) {
        const degrees = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360;
        directionRef.current = getDirectionFromAngle(degrees);
        setIsMoving(true);
    }
}, []);

/** 觸控/滑鼠移動 — 持續追蹤手指位置 */
const handleJoystickMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickRef.current) return;
    e.preventDefault();
    const touch = 'touches' in e ? e.touches[0] : e;
    const dx = touch.clientX - joystickRef.current.startX;
    const dy = touch.clientY - joystickRef.current.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clampedDistance = Math.min(distance, CONFIG.JOYSTICK_MAX_DISTANCE);
    const angle = Math.atan2(dy, dx);
    setJoystickPos({ x: Math.cos(angle) * clampedDistance, y: Math.sin(angle) * clampedDistance });

    if (distance > CONFIG.JOYSTICK_DEAD_ZONE) {
        const degrees = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360;
        const newDirection = getDirectionFromAngle(degrees);
        directionRef.current = newDirection;
        setPlayerDirection(newDirection);
        setIsMoving(true);
    } else {
        directionRef.current = null;
        setIsMoving(false);
    }
}, []);

/** 觸控/滑鼠放開 — 重置搖桿 */
const handleJoystickEnd = useCallback(() => {
    joystickRef.current = null;
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    // 若鍵盤沒有按鍵，才停止移動（支援混合輸入）
    if (keysPressed.current.size === 0) {
        directionRef.current = null;
        setIsMoving(false);
    }
}, []);
```

### 6. JSX 組件

```tsx
<div
    className={`joystick ${joystickActive ? 'active' : ''}`}
    onMouseDown={handleJoystickStart}
    onMouseMove={handleJoystickMove}
    onMouseUp={handleJoystickEnd}
    onMouseLeave={handleJoystickEnd}
    onTouchStart={handleJoystickStart}
    onTouchMove={handleJoystickMove}
    onTouchEnd={handleJoystickEnd}
>
    <div className="base">
        <div
            className="handle"
            style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
        />
    </div>
</div>
```

### 7. SCSS 樣式

```scss
.joystick {
    position: fixed;
    bottom: 40px;
    right: 40px;
    touch-action: none; // 關鍵！防止瀏覽器預設手勢

    .base {
        width: 180px;
        height: 180px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 4px solid rgba(255, 255, 255, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: border-color 0.2s;

        .handle {
            width: 75px;
            height: 75px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.4);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            transition: background 0.2s;
        }
    }

    &.active {
        .base {
            border-color: rgba(255, 255, 255, 0.5);
        }
        .handle {
            background: rgba(255, 255, 255, 0.6);
        }
    }
}
```

---

## 二、觸控按鈕（Touch Buttons）— GoForward 遊戲

適用於平台跳躍類遊戲，提供左右移動 + 跳躍按鈕。

### 1. 事件處理

```typescript
const handleTouchStart = (action: 'left' | 'right' | 'jump') => (e: React.TouchEvent) => {
    e.preventDefault();
    if (gameStatus !== 'playing') return;
    inputRef.current[action] = true;
};

const handleTouchEnd = (action: 'left' | 'right' | 'jump') => (e: React.TouchEvent) => {
    e.preventDefault();
    inputRef.current[action] = false;
};
```

### 2. CSS 關鍵屬性

```css
touch-action: manipulation; /* 優化觸控回應速度，允許平移和縮放但禁用雙擊 */
```

---

## 三、技術要點摘要

| 技術項目 | 說明 |
|---------|------|
| Touch vs Mouse 判斷 | `'touches' in e ? e.touches[0] : e` |
| 防止瀏覽器預設行為 | `e.preventDefault()` |
| 防止捲動/縮放干擾 | CSS `touch-action: none`（搖桿）或 `manipulation`（按鈕） |
| 距離限制 | `Math.min(distance, MAX_DISTANCE)` |
| 角度計算 | `Math.atan2(dy, dx)` 轉換為 0-360 度 |
| 死區處理 | 距離 < 閾值時不觸發方向輸入 |
| 混合輸入 | 搖桿與鍵盤可同時使用，放開搖桿時檢查鍵盤狀態 |

---

## 四、移植 Checklist

在其他專案使用時，請確認以下項目：

- [ ] 定義 `Direction` type
- [ ] 設定搖桿常數（死區、最大距離等）
- [ ] 加入 state (`joystickPos`, `joystickActive`) 和 refs (`joystickRef`, `directionRef`)
- [ ] 實作 `getDirectionFromAngle` 函式
- [ ] 實作三個事件處理函式（start / move / end）
- [ ] 加入 JSX 組件，綁定 `onTouch*` 和 `onMouse*` 事件
- [ ] 加入 SCSS 樣式，確保 `touch-action: none`
- [ ] 在 game loop 中使用 `directionRef.current` 驅動角色移動
- [ ] 若需要混合輸入，處理鍵盤與搖桿的狀態同步

---

## 五、可抽取為共用 Hook 的建議

目前觸控邏輯都寫在各遊戲組件內，未來可抽取為：

```typescript
/** useJoystick hook 建議介面 */
function useJoystick(config?: {
  deadZone?: number;
  maxDistance?: number;
}): {
  direction: Direction;
  isActive: boolean;
  position: { x: number; y: number };
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
};
```

這樣在任何遊戲中只需：

```tsx
const { direction, isActive, position, handlers } = useJoystick();

return (
  <div className="joystick" {...handlers}>
    <div className="base">
      <div className="handle" style={{ transform: `translate(${position.x}px, ${position.y}px)` }} />
    </div>
  </div>
);
```
