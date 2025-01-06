import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import supabase from "@/utils/supabase";

interface PartyProfile {
  id?: number;
  name: string;
  gstin: string | null;
  address: string | null;
  contact_number: string | null;
  broker_id: number | null;
  transport_id: number | null;
  pincode: string | null;
}

interface Broker {
  id: number;
  name: string;
}

interface TransportProfile {
  id: number;
  name: string;
}

export default function PartyProfilePage() {
  const [parties, setParties] = useState<PartyProfile[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [transportProfiles, setTransportProfiles] = useState<
    TransportProfile[]
  >([]);
  const [currentParty, setCurrentParty] = useState<PartyProfile>({
    name: "",
    gstin: null,
    address: null,
    contact_number: null,
    broker_id: null,
    transport_id: null,
    pincode: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>(""); // State for search query
  const [selectedBroker, setSelectedBroker] = useState<string>(""); // New state for selected broker text
  const [selectedTransport, setSelectedTransport] = useState<string>(""); // New state for selected transport text

  const fetchData = useCallback(async () => {
    const [partiesData, brokersData, transportData] = await Promise.all([
      supabase.from("party_profiles").select("*").order("name"),
      supabase.from("brokers").select("*").order("name"),
      supabase.from("transport_profiles").select("*").order("name"),
    ]);

    if (partiesData.data) setParties(partiesData.data);
    if (brokersData.data) setBrokers(brokersData.data);
    if (transportData.data) setTransportProfiles(transportData.data);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentParty((prev) => ({
      ...prev,
      [name]: value ? value : null,
    })); // Convert to uppercase
  };

  const handleOpenModal = (party?: PartyProfile) => {
    if (party) {
      setSelectedBroker(
        brokers.find((b) => b.id === party.broker_id)?.name || ""
      );
      setSelectedTransport(
        transportProfiles.find((t) => t.id === party.transport_id)?.name || ""
      );
    }
    setCurrentParty(
      party || {
        name: "",
        gstin: null,
        address: null,
        contact_number: null,
        broker_id: null,
        transport_id: null,
        pincode: null,
      }
    );
    setIsEditing(!!party);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const operation = isEditing
      ? supabase
          .from("party_profiles")
          .update({
            ...currentParty,
            name: currentParty.name.toUpperCase(),
            broker_id:
              brokers.find((b) => b.name === selectedBroker)?.id || null,
            transport_id:
              transportProfiles.find((t) => t.name === selectedTransport)?.id ||
              null,
          }) // Convert name to uppercase
          .eq("id", currentParty.id)
      : supabase.from("party_profiles").insert({
          ...currentParty,
          name: currentParty.name.toUpperCase(),
          broker_id: brokers.find((b) => b.name === selectedBroker)?.id || null,
          transport_id:
            transportProfiles.find((t) => t.name === selectedTransport)?.id ||
            null,
        }); // Convert name to uppercase

    const { error } = await operation;
    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${
          isEditing ? "update" : "create"
        } party profile`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Party profile ${
          isEditing ? "updated" : "created"
        } successfully`,
      });
      fetchData();
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: number) => {
    // Check if there are any orders associated with the party profile
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders") // Assuming you have an "orders" table
      .select("*")
      .or(`bill_to_id.eq.${id},ship_to_id.eq.${id}`); // Check for matching bill_to or ship_to

    if (ordersError) {
      toast({
        title: "Error",
        description: "Failed to check orders",
        variant: "destructive",
      });
      return;
    }

    if (ordersData && ordersData.length > 0) {
      toast({
        title: "Error",
        description:
          "Cannot delete party profile as it is associated with existing orders.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("party_profiles")
      .delete()
      .eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete party profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Party profile deleted successfully",
      });
      fetchData();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredParties = useMemo(() => {
    return parties.filter(
      (party) =>
        party.name
          .replace(/[.,?!]/g, "")
          .toLowerCase()
          .startsWith(searchQuery.toLowerCase()) // Filter by search query only
    );
  }, [parties, searchQuery]);

  return (
    <div className="container mx-auto mt-10 p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Party Profiles</h1>
      <div className="flex justify-center space-x-4 mb-8">
        <Button onClick={() => handleOpenModal()}>Create New</Button>
        <Button onClick={() => navigate("/")} variant="outline">
          Back to Home
        </Button>
      </div>
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search parties..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit" : "Create New"} Party Profile
            </DialogTitle>
            <DialogDescription>
              Enter the details for the party profile below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {["name", "gstin", "address", "contact_number", "pincode"].map(
              (field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </Label>
                  <Input
                    id={field}
                    name={field}
                    value={currentParty[field as keyof PartyProfile] || ""}
                    onChange={handleInputChange}
                    required={field === "name"}
                  />
                </div>
              )
            )}
            {[
              { name: "broker_id", options: brokers, label: "Broker" },
              {
                name: "transport_id",
                options: transportProfiles,
                label: "Transport",
              },
            ].map((select) => (
              <div key={select.name} className="space-y-2">
                <Label htmlFor={select.name}>{select.label}</Label>
                <Input
                  id={select.name}
                  value={
                    select.name === "broker_id"
                      ? selectedBroker
                      : selectedTransport
                  } // Use selectedBroker for broker input and selectedTransport for transport input
                  onChange={(e) => {
                    const value = e.target.value;
                    if (select.name === "broker_id") {
                      setSelectedBroker(value); // Update selected broker text
                    } else if (select.name === "transport_id") {
                      setSelectedTransport(value); // Update selected transport text
                    }
                  }}
                  list={`${select.name}-options`}
                />
                <datalist id={`${select.name}-options`}>
                  {select.options.map((option) => (
                    <option key={option.id} value={option.name} />
                  ))}
                </datalist>
              </div>
            ))}
            <Button type="submit" className="w-full">
              {isEditing ? "Update" : "Create"} Party Profile
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Existing Party Profiles</h2>
        {filteredParties.map((party) => (
          <Card key={party.id}>
            <CardContent className="pt-6 flex flex-col h-full">
              <div className="flex-grow">
                <h3 className="text-lg font-semibold mb-2">{party.name}</h3>
                {["gstin", "address", "contact_number", "pincode"].map(
                  (field) => (
                    <p key={field} className="text-sm text-gray-500">
                      {field.charAt(0).toUpperCase() + field.slice(1)}:{" "}
                      {party[field as keyof PartyProfile] || "N/A"}
                    </p>
                  )
                )}
                <p className="text-sm text-gray-500">
                  Broker:{" "}
                  {brokers.find((b) => b.id === party.broker_id)?.name || "N/A"}
                </p>
                <p className="text-sm text-gray-500">
                  Transport:{" "}
                  {transportProfiles.find((t) => t.id === party.transport_id)
                    ?.name || "N/A"}
                </p>
                {party.contact_number && (
                  <h4 className="text-sm text-gray-500">
                    Contact: {party.contact_number}
                  </h4>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <Button
                  onClick={() => handleOpenModal(party)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(party.id!)}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  Delete
                </Button>
                <Button
                  onClick={() => {
                    const printContent = `
                      <style>
                        @media print {
                          @page {
                            size: 220mm 110mm; /* Set the size for DL envelope in landscape mode */
                            margin-left: 110mm; /* Remove default margins */
                            margin-right: 20mm;
                          }
                          body {
                            margin: 0; /* Remove body margin */
                          }
                          
                        }
                      </style>
                      <div style="text-align: left; width: 220mm; height: 110mm; padding: 10mm; box-sizing: border-box;">
                        <p style="line-height:80%; font-size: 24px; font-weight:bold">${
                          party.name
                        }</p>
                        <p style="line-height:150%; font-size: 18px;">${
                          party.address
                        }</p>
                        ${
                          party.contact_number
                            ? `<p style="line-height:150%; font-size: 18px;">Contact: ${party.contact_number}</p>`
                            : ""
                        }
                      </div>
                    `;
                    const printWindow = window.open("", "");
                    printWindow?.document.write(printContent);
                    printWindow?.document.close();
                    printWindow?.focus();
                    printWindow?.print();
                    printWindow?.close();
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Toaster />
    </div>
  );
}
