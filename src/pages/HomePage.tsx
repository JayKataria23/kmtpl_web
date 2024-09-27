import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import KMLogo from "@/assets/KM.svg";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto mt-10 text-center">
      <img src={KMLogo} alt="KM Logo" className="mx-auto mb-8 w-48 h-auto" />
      
      <div className="space-y-4">
        <Button className="w-64 text-lg" onClick={() => navigate("/order-form")}>
          Order Form
        </Button>
        <br />
        <Button className="w-64 text-lg" onClick={() => navigate("/order-file")}>
          Order File
        </Button>
      </div>
    </div>
  );
}
