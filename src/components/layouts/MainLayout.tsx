
import { Outlet } from "react-router-dom";
interface MainLayoutProps {
    headerNavItems: { label: string; path: string }[];
}


export default function MainLayout({ 

    headerNavItems 

}: MainLayoutProps) {   
    
    return (
        <div className="h-screen w-screen flex flex-col" >

            <div className="w-full 
                            bg-panel text-center flex-row-between-center
                            px-4 py-2" >
                <a href="/" >
                    Logo
                </a>
                <div className="flex-row-center gap-4" >
                {headerNavItems.map((item) => (
                    <a key={item.path} href={item.path} >
                        {item.label}
                    </a>
                ))}
                </div>
            </div>
            
            <div className="flex-1 flex" /*撐滿容器*/ >
                <div className="mx-auto my-auto" >
                    <Outlet />
                </div>
            </div>

            <div className="h-8 w-full bg-panel text-center" >
                footer
            </div>

        </div>
    )
}