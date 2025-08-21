import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import KMLogo from "@/assets/KM.svg";

export default function HomePage() {
  const navigate = useNavigate();

  // Regrouped menu items as per user specification
  const sections = [
    {
      title: "Orders",
      items: [
        { path: "/order-form", label: "Order Form" },
        { path: "/fast-order-form", label: "Fast Order Form" },
        { path: "/order-list", label: "Order List" },
        { path: "/part-order-file", label: "Part Orders" },
      ],
    },
    {
      title: "Design & Party Files",
      items: [
        { path: "/order-file", label: "Design Wise Order" },
        { path: "/party-file", label: "Party Wise Order" },
        { path: "/bhiwandi-list", label: "Bhiwandi List" },
        { path: "/bhiwandi-designs", label: "Bhiwandi Designs" },
      ],
    },
    {
      title: "Challan",
      items: [
        { path: "/challan-list", label: "Challan List" },
        { path: "/create-challan", label: "Create Challan" },
        { path: "/transport-challan-upload", label: "Transport Challan Upload" },
      ],
    },
    {
      title: "Reports",
      items: [
        { path: "/party-reports", label: "Party Reports" },
        { path: "/design-reports", label: "Design Reports" },
        { path: "/outstanding", label: "Outstanding" },
      ],
    },
    {
      title: "Masters",
      items: [
        { path: "/broker-transport", label: "Master" },
        { path: "/party-profiles", label: "Party Profiles" },
      ],
    },
    {
      title: "Dispatch",
      items: [
        { path: "/dispatch-list", label: "Dispatch List" },
        { path: "/party-dispatch-list", label: "Party Dispatch List" },
      ],
    },
  ];

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex justify-center mb-8">
        <img src={KMLogo} alt="KM Logo" className="w-24 h-auto" />
      </div>
      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">{section.title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {section.items.map((item) => (
                <Button
                  key={item.path}
                  className="h-20 md:h-24 text-sm md:text-base font-medium flex items-center justify-center text-center p-2"
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
