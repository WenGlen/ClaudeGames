
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
                            px-12 py-2" >
                <Link to="/" >
                    <img src="public/ClaudeGame_logo.png" alt="ClaudeGame Logo" 
                         className="h-10 w-auto"/>
                </Link>
                <div className="flex-row-center gap-6 text-lg" >
                {headerNavItems.map((item) => (
                    <Link key={item.path} to={item.path} >
                        <div className={`bg-btn px-4 py-1 rounded hover:bg-btn-hover ${location.pathname === item.path ? "bg-primary text-white hover:bg-primary" : "" }`} >
                            {item.label}
                        </div>
                    </Link>
                ))}
                </div>
            </div>
            
            <div className="flex-1 flex" /*撐滿容器*/ >
                <div className="mx-auto my-auto" >
                    <Outlet />
                </div>
            </div>

            <div className="h-8 w-full bg-panel flex-row-between-center
                            px-12 py-2 text-center text-sub" >
                <div>v 1.1</div>
                <div>dev by Glen use Claude</div>
            </div>

        </div>
    )
}