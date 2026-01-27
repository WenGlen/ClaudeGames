
import { Link } from "react-router-dom";

interface HomePageProps {
    headerNavItems: { label: string; path: string }[];
    abandonedItems: { label: string; path: string }[];
}


export default function HomePage({
    headerNavItems,
    abandonedItems,
}: HomePageProps) {

    return (
        <div className="HomePage">
            <h2>覺得不錯的遊戲</h2>
            {
                headerNavItems.map((item, index) => (
                    <Link to={item.path} key={index} >
                        <button>{item.label}</button>
                    </Link>
                ))
            }
            
            <h2>不想繼續開發的遊戲</h2>
            {
                abandonedItems.map((item, index) => (
                    <Link to={item.path} key={index} >
                        <button>{item.label}</button>
                    </Link>
                ))
            }


        </div>
    )
}