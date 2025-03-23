import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import KMLogo from "@/assets/KM.svg";

export default function HomePage() {
  const navigate = useNavigate();
  
  const menuItems = [
    { path: "/order-form", label: "Order Form" },
    { path: "/fast-order-form", label: "Fast Order Form" },
    { path: "/order-list", label: "Order List" },
    { path: "/order-file", label: "Design Wise Order" },
    { path: "/party-file", label: "Party Wise Order" },
    { path: "/part-order-file", label: "Part Orders" },
    { path: "/dyeing-book", label: "Dyeing Book" },
    { path: "/sales-register", label: "Sales Register" },
    { path: "/bhiwandi-list", label: "Bhiwandi List" },
    { path: "/party-dispatch-list", label: "Party Dispatch List" },
    { path: "/dispatch-list", label: "Dispatch List" },
    { path: "/create-challan", label: "Create Challan" },
    { path: "/challan-list", label: "Challan List" },
    { path: "/party-profiles", label: "Party Profiles" },
    { path: "/broker-transport", label: "Master" },
  ];

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex justify-center mb-6">
        <img src={KMLogo} alt="KM Logo" className="w-24 h-auto" />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {menuItems.map((item, index) => (
          <Button
            key={index}
            className="h-24 md:h-28 text-sm md:text-base font-medium flex items-center justify-center text-center p-2"
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
