import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto mt-10 text-center">
      <h1 className="text-3xl font-bold mb-8">
        Welcome to the Order Management System
      </h1>
      <div className="space-y-4">
        <Button className="w-64" onClick={() => navigate("/order-form")}>
          Go to Order Form
        </Button>
        <br />
        <Button className="w-64" onClick={() => navigate("/order-file")}>
          Go to Order File Page
        </Button>
      </div>
    </div>
  );
}
