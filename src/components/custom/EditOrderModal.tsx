import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, Input, Label } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";
import InputWithAutocomplete from "@/components/custom/InputWithAutocomplete";
import { format, isValid, parseISO } from "date-fns";

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  onOrderUpdated: () => void;
}

interface OrderDetails {
  order_no: string;
  date: string;
  bill_to_id: number | null;
  ship_to_id: number | null;
  broker_id: number | null;
  transport_id: number | null;
  remark: string;
}

interface Option {
  id: number;
  name: string;
}

export function EditOrderModal({
  isOpen,
  onClose,
  orderId,
  onOrderUpdated,
}: EditOrderModalProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    order_no: "",
    date: "",
    bill_to_id: null,
    ship_to_id: null,
    broker_id: null,
    transport_id: null,
    remark: "",
  });
  const [partyOptions, setPartyOptions] = useState<Option[]>([]);
  const [brokerOptions, setBrokerOptions] = useState<Option[]>([]);
  const [transportOptions, setTransportOptions] = useState<Option[]>([]);
  const { toast } = useToast();

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          bill_to:bill_to_id(id, name),
          ship_to:ship_to_id(id, name),
          broker:broker_id(id, name),
          transport:transport_id(id, name)
        `
        )
        .eq("id", orderId)
        .single();

      if (error) throw error;

      setOrderDetails({
        ...data,
        bill_to_id: data.bill_to?.id || null,
        ship_to_id: data.ship_to?.id || null,
        broker_id: data.broker?.id || null,
        transport_id: data.transport?.id || null,
      });
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive",
      });
    }
  }, [orderId, toast]);

  const fetchOptions = useCallback(async () => {
    try {
      const [partiesResponse, brokersResponse, transportsResponse] =
        await Promise.all([
          supabase.from("party_profiles").select("id, name"),
          supabase.from("brokers").select("id, name"),
          supabase.from("transport_profiles").select("id, name"),
        ]);

      setPartyOptions(partiesResponse.data || []);
      setBrokerOptions(brokersResponse.data || []);
      setTransportOptions(transportsResponse.data || []);
    } catch (error) {
      console.error("Error fetching options:", error);
      toast({
        title: "Error",
        description: "Failed to fetch options",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
      fetchOptions();
    }
  }, [isOpen, orderId, fetchOrderDetails, fetchOptions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOrderDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (value: string) => {
    setOrderDetails((prev) => ({ ...prev, date: value }));
  };

  const handleSelectChange = (field: keyof OrderDetails, value: string) => {
    const option = getOptionsForField(field).find(
      (opt) => opt.name.toLowerCase() === value.toLowerCase()
    );
    if (option) {
      setOrderDetails((prev) => ({ ...prev, [field]: option.id }));
    }
  };

  const getOptionsForField = (field: keyof OrderDetails): Option[] => {
    switch (field) {
      case "broker_id":
        return brokerOptions;
      case "transport_id":
        return transportOptions;
      case "bill_to_id":
      case "ship_to_id":
        return partyOptions;
      default:
        return [];
    }
  };

  const getSelectedValue = (field: keyof OrderDetails): string => {
    const options = getOptionsForField(field);
    return options.find((opt) => opt.id === orderDetails[field])?.name || "";
  };

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          date: orderDetails.date,
          bill_to_id: orderDetails.bill_to_id,
          ship_to_id: orderDetails.ship_to_id,
          broker_id: orderDetails.broker_id,
          transport_id: orderDetails.transport_id,
          remark: orderDetails.remark,
        })
        .eq("id", orderId);

      if (error) throw error;

      toast({ title: "Success", description: "Order updated successfully" });
      onOrderUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, "yyyy-MM-dd") : "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Order #{orderDetails.order_no}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={formatDate(orderDetails.date)}
              onChange={(e) => handleDateChange(e.target.value)}
              className="col-span-3"
            />
          </div>
          {(
            ["bill_to_id", "ship_to_id", "broker_id", "transport_id"] as const
          ).map((field) => (
            <div key={field} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={field} className="text-right">
                {field
                  .replace("_id", "")
                  .replace("_", " ")
                  .charAt(0)
                  .toUpperCase() +
                  field.replace("_id", "").replace("_", " ").slice(1)}
              </Label>
              <InputWithAutocomplete
                label={field}
                id={field}
                value={getSelectedValue(field)}
                onChange={(value) => handleSelectChange(field, value)}
                options={getOptionsForField(field)}
                placeholder={`Select ${field
                  .replace("_id", "")
                  .replace("_", " ")}`}
                className="col-span-3"
              />
            </div>
          ))}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="remark" className="text-right">
              Remark
            </Label>
            <Input
              id="remark"
              name="remark"
              value={orderDetails.remark || ""}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
