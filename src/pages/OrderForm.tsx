import { useState } from "react";
import { Eye, Printer, Save, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

const designs = ["Design A", "Design B", "Design C", "Design D", "Design E"];

export default function OrderForm() {
  const [date, setDate] = useState(new Date("2024-09-18"));
  const [selectedDesign, setSelectedDesign] = useState("");
  const [shades, setShades] = useState<Record<string, string[]>>({});
  const [savedDesigns, setSavedDesigns] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleDateChange = (amount: number, unit: "day" | "month" | "year") => {
    const newDate = new Date(date);
    if (unit === "day") newDate.setDate(newDate.getDate() + amount);
    if (unit === "month") newDate.setMonth(newDate.getMonth() + amount);
    if (unit === "year") newDate.setFullYear(newDate.getFullYear() + amount);
    setDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleDesignSelect = (design: string) => {
    setSelectedDesign(design);
    if (!shades[design]) {
      setShades((prev) => ({ ...prev, [design]: Array(50).fill("") }));
    }
  };

  const handleShadeChange = (index: number, value: string) => {
    setShades((prev) => ({
      ...prev,
      [selectedDesign]: prev[selectedDesign].map((shade, i) =>
        i === index ? value : shade
      ),
    }));
  };

  const handleShadeToggle = (index: number) => {
    setShades((prev) => ({
      ...prev,
      [selectedDesign]: prev[selectedDesign].map((shade, i) => {
        if (i === index) {
          if (shade === "50") return "100";
          if (shade === "100") return "";
          return "50";
        }
        return shade;
      }),
    }));
  };

  const handleSaveDesign = () => {
    if (selectedDesign && shades[selectedDesign]) {
      setSavedDesigns((prev) =>
        prev.includes(selectedDesign) ? prev : [...prev, selectedDesign]
      );
      toast({
        title: "Design Saved",
        description: `${selectedDesign} has been saved successfully.`,
      });
      setIsDialogOpen(false);
    }
  };

  const handleEditDesign = (design: string) => {
    setSelectedDesign(design);
    setIsDialogOpen(true);
  };

  const handleDeleteDesign = (design: string) => {
    setSavedDesigns((prev) => prev.filter((d) => d !== design));
    setShades((prev) => {
      const { [design]: deletedDesign, ...rest } = prev;
      return rest;
    });
    toast({
      title: "Design Deleted",
      description: `${design} has been deleted.`,
    });
  };

  const handlePreview = () => {
    console.log("Preview clicked");
  };

  const handlePrint = () => {
    console.log("Print clicked");
  };

  const handleSave = () => {
    console.log("Save clicked");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white">
      <h1 className="text-2xl font-bold mb-6">General Details</h1>

      <div className="space-y-4">
        <div>
          <Label htmlFor="orderNo">Order No.</Label>
          <Input id="orderNo" defaultValue="1" />
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDateChange(-1, "day")}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-center flex-1" id="date">
              {formatDate(date)}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDateChange(1, "day")}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {["Broker", "Transport", "To", "Delivery"].map((field) => (
          <div key={field}>
            <Label htmlFor={field.toLowerCase()}>{field}</Label>
            <Select>
              <SelectTrigger id={field.toLowerCase()}>
                <SelectValue placeholder={`Select ${field}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
                <SelectItem value="option3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}

        <div>
          <Label>Designs</Label>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" onClick={() => setSelectedDesign("")}>
                Add Design
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedDesign ? `Edit ${selectedDesign}` : "Add Design"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="design" className="text-right">
                    Design
                  </Label>
                  <Select
                    value={selectedDesign}
                    onValueChange={handleDesignSelect}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a design" />
                    </SelectTrigger>
                    <SelectContent>
                      {designs.map((design) => (
                        <SelectItem key={design} value={design}>
                          {design}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedDesign && (
                  <>
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      <div className="grid gap-4">
                        {Array.from({ length: 50 }, (_, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-5 items-center gap-2"
                          >
                            <Label
                              htmlFor={`shade-${i}`}
                              className="text-right col-span-1"
                            >
                              Shade {i + 1}
                            </Label>
                            <Input
                              id={`shade-${i}`}
                              value={shades[selectedDesign]?.[i] || ""}
                              onChange={(e) =>
                                handleShadeChange(i, e.target.value)
                              }
                              className="col-span-3"
                            />
                            <Button
                              onClick={() => handleShadeToggle(i)}
                              variant="outline"
                              size="sm"
                              className="col-span-1"
                            >
                              {shades[selectedDesign]?.[i] || "50/100"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Button onClick={handleSaveDesign} className="mt-4">
                      Save Design
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {savedDesigns.length > 0 && (
          <div>
            <Label>Saved Designs</Label>
            <div className="mt-2 space-y-2">
              {savedDesigns.map((design, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-100 rounded"
                >
                  <span>{design}</span>
                  <div className="space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditDesign(design)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDesign(design)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="remark">Remark</Label>
          <Input id="remark" />
        </div>

        <div className="flex justify-between pt-4">
          <Button onClick={handlePreview} className="flex items-center">
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button onClick={handlePrint} className="flex items-center">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button onClick={handleSave} className="flex items-center">
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
