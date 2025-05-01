import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui";
import AddPartOrder from "@/components/custom/AddPartOrder";
import {
  PartyCount,
  DesignDetail,
  SelectedDesignDetail,
} from "@/types/party-file";
import {
  fetchPartyCounts,
  fetchOrderDetails,
} from "@/utils/party-file/data-fetching";
import {
  addToDrawer,
  removeFromDrawer,
  addToDrawerBhiwandi,
  removeFromDrawerBhiwandi,
  handleDispatch,
  handleSendAllToBhiwandi,
} from "@/utils/party-file/drawer-utils";
import { PartyFileHeader } from "@/components/custom/PartyFileHeader";
import { DispatchDrawerContent } from "@/components/custom/DispatchDrawerContent";
import { PartyAccordion } from "@/components/custom/PartyAccordion";

function PartyFile() {
  const [partyCounts, setPartyCounts] = useState<PartyCount[]>([]);
  const [partyOrders, setPartyOrders] = useState<{
    [key: string]: DesignDetail[];
  }>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<
    SelectedDesignDetail[]
  >([]);
  const { toast } = useToast();
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [isAddPartOrderOpen, setIsAddPartOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DesignDetail | null>(null);
  const [isSendToBhiwandiOpen, setIsSendToBhiwandiOpen] = useState(false);
  const [selectedBhiwandiEntries, setSelectedBhiwandiEntries] = useState<
    SelectedDesignDetail[]
  >([]);

  useEffect(() => {
    const loadPartyCounts = async () => {
      const counts = await fetchPartyCounts();
      setPartyCounts(counts);
    };
    loadPartyCounts();
  }, []);

  const handleFetchOrderDetails = async (party: string) => {
    const orders = await fetchOrderDetails(party);
    setPartyOrders((prev) => ({ ...prev, [party]: orders }));
  };

  const handleAddToDrawer = (entry: DesignDetail, party_name: string) => {
    setSelectedEntries((prev) => addToDrawer(entry, party_name, prev));
  };

  const handleRemoveFromDrawer = (entry: DesignDetail) => {
    setSelectedEntries((prev) => removeFromDrawer(entry, prev));
  };

  const handleAddToDrawerBhiwandi = (
    entry: DesignDetail,
    party_name: string
  ) => {
    setSelectedBhiwandiEntries((prev) =>
      addToDrawerBhiwandi(entry, party_name, prev)
    );
  };

  const handleRemoveFromDrawerBhiwandi = (entry: DesignDetail) => {
    setSelectedBhiwandiEntries((prev) => removeFromDrawerBhiwandi(entry, prev));
  };

  const onDispatch = async () => {
    const result = await handleDispatch(selectedEntries);
    if (result.success) {
      setSelectedEntries([]);
      setIsDrawerOpen(false);
      const counts = await fetchPartyCounts();
      setPartyCounts(counts);
      setOpenAccordionItems([]);
      toast({
        title: "Success",
        description: "Entries dispatched successfully",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error sending entries to Dispatch. ${result.error}`,
      });
    }
  };

  const onSendToBhiwandi = async () => {
    const result = await handleSendAllToBhiwandi(selectedBhiwandiEntries);
    if (result.success) {
      const counts = await fetchPartyCounts();
      setPartyCounts(counts);
      setSelectedBhiwandiEntries([]);
      setIsSendToBhiwandiOpen(false);
      toast({
        title: "Success",
        description: `Successfully sent entries to Bhiwandi.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to send entries to Bhiwandi: ${result.error}`,
      });
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4 relative">
      <AddPartOrder
        open={isAddPartOrderOpen}
        onClose={() => setIsAddPartOrderOpen(false)}
        design_entry_id={selectedOrder?.design_entry_id.toString() || ""}
        design_name={selectedOrder?.design || ""}
        party_name={selectedOrder?.party_name || ""}
        price={selectedOrder?.price || 0}
      />
      <PartyFileHeader
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        isSendToBhiwandiOpen={isSendToBhiwandiOpen}
        setIsSendToBhiwandiOpen={setIsSendToBhiwandiOpen}
        selectedEntries={selectedEntries}
        selectedBhiwandiEntries={selectedBhiwandiEntries}
        onDispatch={onDispatch}
        onSendToBhiwandi={onSendToBhiwandi}
      >
        <DispatchDrawerContent
          selectedEntries={selectedEntries}
          setSelectedEntries={setSelectedEntries}
          setIsAddPartOrderOpen={setIsAddPartOrderOpen}
          setSelectedOrder={setSelectedOrder}
          handleRemoveFromDrawer={handleRemoveFromDrawer}
        />
      </PartyFileHeader>
      <PartyAccordion
        partyCounts={partyCounts}
        partyOrders={partyOrders}
        openAccordionItems={openAccordionItems}
        setOpenAccordionItems={setOpenAccordionItems}
        handleFetchOrderDetails={handleFetchOrderDetails}
        handleAddToDrawer={handleAddToDrawer}
        handleRemoveFromDrawer={handleRemoveFromDrawer}
        handleAddToDrawerBhiwandi={handleAddToDrawerBhiwandi}
        handleRemoveFromDrawerBhiwandi={handleRemoveFromDrawerBhiwandi}
        selectedEntries={selectedEntries}
        selectedBhiwandiEntries={selectedBhiwandiEntries}
        setIsAddPartOrderOpen={setIsAddPartOrderOpen}
        setSelectedOrder={setSelectedOrder}
        setPartyCounts={setPartyCounts}
      />
      <Toaster />
    </div>
  );
}

export default PartyFile;
