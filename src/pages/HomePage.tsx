import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import KMLogo from "@/assets/KM.svg";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto mt-10 text-center px-4">
      <img src={KMLogo} alt="KM Logo" className="mx-auto mb-6 w-28 h-auto" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 place-items-center">
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/order-form")}>
          Order Form
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/fast-order-form")}>
          Fast Order Form
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/order-list")}>
          Order List
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/order-file")}>
          Design Wise Order
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/party-file")}>
          Party Wise Order
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/part-order-file")}>
          Part Orders
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/bhiwandi-list")}>
          Bhiwandi List
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/party-dispatch-list")}>
          Party Dispatch List
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/dispatch-list")}>
          Dispatch List
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/create-challan")}>
          Create Challan
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/challan-list")}>
          Challan List
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/party-profiles")}>
          Party Profiles
        </Button>
        <Button className="w-32 h-32 text-lg p-4 break-words" onClick={() => navigate("/broker-transport")}>
          Master
        </Button>
      </div>
    </div>
  );
}
