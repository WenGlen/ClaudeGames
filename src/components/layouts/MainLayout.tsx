
import { Outlet, Link , useLocation} from "react-router-dom";
interface MainLayoutProps {
    headerNavItems: { label: string; path: string }[];
}


export default function MainLayout({ 

    headerNavItems 


}: MainLayoutProps) {   
    
    const location = useLocation();

    return (
        <div className="h-screen w-screen flex flex-col" >

            <div className="w-full
                            bg-panel text-center flex-row-between-center
                            px-3 py-2 sm:px-12" >
                <Link to="/" >
                    <img src={`${import.meta.env.BASE_URL}ClaudeGame_logo.png`} alt="ClaudeGame Logo"
                         className="h-8 w-auto sm:h-10"/>
                </Link>
                <div className="flex-row-center gap-2 text-sm sm:gap-6 sm:text-lg" >
                {headerNavItems.map((item) => (
                    <Link key={item.path} to={item.path} >
                        <div className={`bg-btn px-2 py-1 rounded hover:bg-btn-hover sm:px-4 ${location.pathname === item.path ? "bg-primary text-white hover:bg-primary" : "" }`} >
                            {item.label}
                        </div>
                    </Link>
                ))}
                </div>
            </div>
            
            <div className="flex-1 flex overflow-auto" /*撐滿容器*/ >
                <div className="mx-auto my-auto" >
                    <Outlet />
                </div>
            </div>

            <div className="w-full bg-panel flex-row-between-center shrink-0
                            px-4 py-2 text-center text-sub text-xs sm:px-12 sm:text-sm" >
                <div>v 1.3</div>
                <div>dev by Glen use Claude</div>
            </div>

        </div>
    )
}