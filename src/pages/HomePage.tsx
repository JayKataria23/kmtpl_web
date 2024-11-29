import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import KMLogo from "@/assets/KM.svg";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto mt-10 text-center">
      <img src={KMLogo} alt="KM Logo" className="mx-auto mb-8 w-36 h-auto" />

      <div className="space-y-6">
        <Button
          className="w-64 text-lg h-12"
          onClick={() => navigate("/order-form")}
        >
          Order Form
        </Button>
        <br />
        <Button
          className="w-64 text-lg h-12"
          onClick={() => navigate("/order-list")}
        >
          Order List
        </Button>
        <br />
        <Button
          className="w-64 text-lg h-12"
          onClick={() => navigate("/order-file")}
        >
          Design Wise Order
        </Button>
        <br />
        <Button
          className="w-64 text-lg h-12"
          onClick={() => navigate("/party-file")}
        >
          Party Wise Order
        </Button>
        <br />
        <Button
          className="w-64 text-lg h-12"
          onClick={() => navigate("/bhiwandi-list")}
        >
          Bhiwandi List
        </Button>
        <br />
        <Button
          className="w-64 text-lg h-12"
          onClick={() => navigate("/dispatch-list")}
        >
          Dispatch List
        </Button>
        <br />
        <Button
          className="w-64 text-lg h-12"
          onClick={() => navigate("/create-challan")}
        >
          Create Challan
        </Button>
        <br />
        <Button
          className="w-64 text-lg h-12"
          onClick={() => navigate("/challan-list")}
        >
          Challan List
        </Button>
        <br />
        <Button
          className="w-64 text-lg h-12"
          onClick={() => navigate("/party-profiles")}
        >
          Party Profiles
        </Button>
        <br />
        <Button
          className="w-64 text-lg h-12"
          onClick={() => navigate("/broker-transport")}
        >
          Master
        </Button>

        <br />
      </div>
    </div>
  );
}
