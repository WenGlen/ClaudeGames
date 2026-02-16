
import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from './components/layouts/MainLayout'
import HomePage from './pages/HomePage';
import Snake from './games/Snake/Snake';
import FindColors from './games/FindColors/FindColors';
import GoForward from "./games/GoForward/GoForward";
import Campfire from "./games/Campfire/Campfire";
import Spacecraft from "./games/Spacecraft/Spacecraft";




function App() {

  const headerNavItems = [
      { label: "貪食蛇", path: "/snake", game: Snake },
      { label: "看色", path: "/find-colors", game: FindColors },
      { label: "向前走", path: "/go-forward", game: GoForward },
      { label: "營火", path: "/campfire", game: Campfire},
  ];
  const abandonedItems = [
      { label: "軌道飛船", path: "/spacecraft", game: Spacecraft },
  ];


  return (
    <Routes>
      <Route element={<MainLayout headerNavItems={headerNavItems}  />}>

        <Route path="/" element={<HomePage headerNavItems={headerNavItems} abandonedItems={abandonedItems}/>} />

        {headerNavItems.map((item) => (
          <Route 
            key={item.path} 
            path={item.path} 
            element={
              <>
                { item.game ? <item.game /> :  <> {item.label} page content </>}
              </>
            } 
          />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
