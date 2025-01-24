import { Label } from "../ui";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Party {
  id: number;
  name: string;
}

interface Broker {
  id: number;
  name: string;
}

interface Transport {
  id: number;
  name: string;
}

interface OrderDetailsSectionProps {
  orderNo: string;
  orderDate: Date;
  partyOptions: Party[];
  selectedBillTo: number | null;
  selectedShipTo: number | null;
  brokerOptions: Broker[];
  selectedBroker: number | null;
  transportOptions: Transport[];
  selectedTransport: number | null;
  setOrderNo: React.Dispatch<React.SetStateAction<string>>;
  setOrderDate: React.Dispatch<React.SetStateAction<Date>>;
  setSelectedBillTo: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedShipTo: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedBroker: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedTransport: React.Dispatch<React.SetStateAction<number | null>>;
}

function OrderDetailsSection({
  orderNo,
  orderDate,
  setOrderDate,
  partyOptions,
  selectedBillTo,
  setSelectedBillTo,
  selectedShipTo,
  setSelectedShipTo,
  brokerOptions,
  selectedBroker,
  setSelectedBroker,
  transportOptions,
  selectedTransport,
  setSelectedTransport,
}: OrderDetailsSectionProps) {
  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 bg-gray-100 shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Order Details</h1>

      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="orderNo" className="block mb-2 text-sm font-medium">
              Order No.
            </Label>
            <Input
              id="orderNo"
              value={orderNo}
              readOnly
              className="w-full h-12 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <Label
              htmlFor="orderDate"
              className="block mb-2 text-sm font-medium"
            >
              Order Date
            </Label>
            <Input
              type="date"
              id="orderDate"
              value={orderDate.toISOString().split("T")[0]}
              onChange={(e) => setOrderDate(new Date(e.target.value))}
              className="w-full h-12 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="block mb-2 text-sm font-medium">Bill To</Label>
            <Select
              value={selectedBillTo?.toString() || undefined}
              onValueChange={(value) =>
                setSelectedBillTo(value ? parseInt(value) : null)
              }
            >
              <SelectTrigger className="h-12 border border-gray-300 rounded-md">
                <SelectValue placeholder="Select Bill To Party" />
              </SelectTrigger>
              <SelectContent>
                {partyOptions.map((party) => (
                  <SelectItem key={party.id} value={party.id.toString()}>
                    {party.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block mb-2 text-sm font-medium">Ship To</Label>
            <Select
              value={selectedShipTo?.toString() || undefined}
              onValueChange={(value) =>
                setSelectedShipTo(value ? parseInt(value) : null)
              }
            >
              <SelectTrigger className="h-12 border border-gray-300 rounded-md">
                <SelectValue placeholder="Select Ship To Party" />
              </SelectTrigger>
              <SelectContent>
                {partyOptions.map((party) => (
                  <SelectItem key={party.id} value={party.id.toString()}>
                    {party.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block mb-2 text-sm font-medium">Broker</Label>
            <Select
              value={selectedBroker?.toString() || undefined}
              onValueChange={(value) =>
                setSelectedBroker(value ? parseInt(value) : null)
              }
            >
              <SelectTrigger className="h-12 border border-gray-300 rounded-md">
                <SelectValue placeholder="Select Broker" />
              </SelectTrigger>
              <SelectContent>
                {brokerOptions.map((broker) => (
                  <SelectItem key={broker.id} value={broker.id.toString()}>
                    {broker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block mb-2 text-sm font-medium">Transport</Label>
            <Select
              value={selectedTransport?.toString() || undefined}
              onValueChange={(value) =>
                setSelectedTransport(value ? parseInt(value) : null)
              }
            >
              <SelectTrigger className="h-12 border border-gray-300 rounded-md">
                <SelectValue placeholder="Select Transport" />
              </SelectTrigger>
              <SelectContent>
                {transportOptions.map((transport) => (
                  <SelectItem
                    key={transport.id}
                    value={transport.id.toString()}
                  >
                    {transport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsSection;
