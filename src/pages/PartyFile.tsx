import { useState, useEffect, useCallback, useTransition, lazy, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui";
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

const AddPartOrder = lazy(() => import("@/components/custom/AddPartOrder"));
const PartyFileHeader = lazy(() =>
  import("@/components/custom/PartyFileHeader").then((m) => ({ default: m.PartyFileHeader }))
);
const DispatchDrawerContent = lazy(() =>
  import("@/components/custom/DispatchDrawerContent").then((m) => ({ default: m.DispatchDrawerContent }))
);
const PartyAccordion = lazy(() =>
  import("@/components/custom/PartyAccordion").then((m) => ({ default: m.PartyAccordion }))
);

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
  const [, startTransition] = useTransition();

  useEffect(() => {
    const loadPartyCounts = async () => {
      const counts = await fetchPartyCounts();
      startTransition(() => setPartyCounts(counts));
    };
    loadPartyCounts();
  }, [startTransition]);

  const handleFetchOrderDetails = useCallback(async (party: string) => {
    const orders = await fetchOrderDetails(party);
    startTransition(() => {
      setPartyOrders((prev) => ({ ...prev, [party]: orders }));
    });
  }, [startTransition]);

  const refreshPartiesOrders = useCallback(async (parties: string[]) => {
    if (parties.length === 0) return;
    const uniqueParties = Array.from(new Set(parties));
    const fetched = await Promise.all(
      uniqueParties.map(async (party) => ({ party, orders: await fetchOrderDetails(party) }))
    );
    startTransition(() => {
      setPartyOrders((prev) => {
        const updated = { ...prev };
        for (const { party, orders } of fetched) {
          updated[party] = orders;
        }
        return updated;
      });
    });
  }, [startTransition]);

  const handleAddToDrawer = useCallback(
    (entry: DesignDetail, party_name: string) => {
      setSelectedEntries((prev) => addToDrawer(entry, party_name, prev));
    },
    []
  );

  const handleRemoveFromDrawer = useCallback((entry: DesignDetail) => {
    setSelectedEntries((prev) => removeFromDrawer(entry, prev));
  }, []);

  const handleAddToDrawerBhiwandi = useCallback(
    (entry: DesignDetail, party_name: string) => {
      setSelectedBhiwandiEntries((prev) =>
        addToDrawerBhiwandi(entry, party_name, prev)
      );
    },
    []
  );

  const handleRemoveFromDrawerBhiwandi = useCallback((entry: DesignDetail) => {
    setSelectedBhiwandiEntries((prev) => removeFromDrawerBhiwandi(entry, prev));
  }, []);

  const onDispatch = useCallback(async () => {
    const result = await handleDispatch(selectedEntries);
    if (result.success) {
      const affectedParties = selectedEntries.map((e) => e.party_name);
      startTransition(() => {
        setSelectedEntries([]);
        setIsDrawerOpen(false);
        setOpenAccordionItems([]);
      });
      const counts = await fetchPartyCounts();
      startTransition(() => setPartyCounts(counts));
      await refreshPartiesOrders(affectedParties);
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
  }, [selectedEntries, toast, startTransition, refreshPartiesOrders]);

  const onSendToBhiwandi = useCallback(async () => {
    const result = await handleSendAllToBhiwandi(selectedBhiwandiEntries);
    if (result.success) {
      const affectedParties = selectedBhiwandiEntries.map((e) => e.party_name);
      const counts = await fetchPartyCounts();
      startTransition(() => {
        setPartyCounts(counts);
        setSelectedBhiwandiEntries([]);
        setIsSendToBhiwandiOpen(false);
      });
      await refreshPartiesOrders(affectedParties);
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
  }, [selectedBhiwandiEntries, toast, startTransition, refreshPartiesOrders]);

  return (
    <div className="container mx-auto mt-10 p-4 relative">
      <Suspense fallback={null}>
        <AddPartOrder
          open={isAddPartOrderOpen}
          onClose={() => setIsAddPartOrderOpen(false)}
          design_entry_id={selectedOrder?.design_entry_id.toString() || ""}
          design_name={selectedOrder?.design || ""}
          party_name={selectedOrder?.party_name || ""}
          price={selectedOrder?.price || 0}
        />
      </Suspense>
      <Suspense fallback={null}>
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
          <Suspense fallback={null}>
            <DispatchDrawerContent
              selectedEntries={selectedEntries}
              setSelectedEntries={setSelectedEntries}
              setIsAddPartOrderOpen={setIsAddPartOrderOpen}
              setSelectedOrder={setSelectedOrder}
              handleRemoveFromDrawer={handleRemoveFromDrawer}
            />
          </Suspense>
        </PartyFileHeader>
      </Suspense>
      <Suspense fallback={null}>
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
          refreshPartyOrders={refreshPartiesOrders}
        />
      </Suspense>
      <Toaster />
    </div>
  );
}

export default PartyFile;
