import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { SelectedDesignDetail } from "@/types/party-file";

interface PartyFileHeaderProps {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  isSendToBhiwandiOpen: boolean;
  setIsSendToBhiwandiOpen: (open: boolean) => void;
  selectedEntries: SelectedDesignDetail[];
  selectedBhiwandiEntries: SelectedDesignDetail[];
  onDispatch: () => void;
  onSendToBhiwandi: () => void;
  children: React.ReactNode;
}

export function PartyFileHeader({
  isDrawerOpen,
  setIsDrawerOpen,
  isSendToBhiwandiOpen,
  setIsSendToBhiwandiOpen,
  selectedEntries,
  selectedBhiwandiEntries,
  onDispatch,
  onSendToBhiwandi,
  children,
}: PartyFileHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 bg-white z-10 p-4 border-b-2">
      <Button onClick={() => navigate("/")}>Home</Button>
      <Drawer
        open={isDrawerOpen}
        onOpenChange={() => {
          setIsDrawerOpen(!isDrawerOpen);
        }}
      >
        <DrawerTrigger asChild>
          <Button className="mx-4">Dispatch</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Selected Entries</DrawerTitle>
            <DrawerDescription>
              Entries added to Dispatch list
            </DrawerDescription>
          </DrawerHeader>
          {children}
          <DrawerFooter>
            <Button
              onClick={onDispatch}
              className="mr-2"
              disabled={selectedEntries.length === 0}
            >
              Dispatch
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Drawer
        open={isSendToBhiwandiOpen}
        onOpenChange={setIsSendToBhiwandiOpen}
      >
        <DrawerTrigger asChild>
          <Button className="">Bhiwandi</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Send All Entries to Bhiwandi</DrawerTitle>
            <DrawerDescription>
              {selectedBhiwandiEntries.length > 0
                ? selectedBhiwandiEntries.map((entry, index) => (
                    <div key={index}>
                      {entry.party_name}: {entry.design}
                    </div>
                  ))
                : "No entries selected."}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button onClick={onSendToBhiwandi} className="mr-2">
              Confirm
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
