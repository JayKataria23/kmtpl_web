import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Delete } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>(""); // State for search query

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
    setCurrentParty((prev) => ({ ...prev, [name]: value || null }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setCurrentParty((prev) => ({
      ...prev,
      [name]: value === "null" ? null : parseInt(value),
    }));
  };

  const handleOpenModal = (party?: PartyProfile) => {
    setCurrentParty(
      party || {
        name: "",
        gstin: null,
        address: null,
        contact_number: null,
        broker_id: null,
        transport_id: null,
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
          .update(currentParty)
          .eq("id", currentParty.id)
      : supabase.from("party_profiles").insert(currentParty);

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

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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
      {/* Alphabet selector as on-screen keyboard */}
      <div className="flex flex-wrap justify-center mb-6">
        {alphabet.map((letter) => (
          <Button
            key={letter}
            onClick={() => setSearchQuery((x) => x + letter)} // Set search query to the clicked letter
            variant="outline"
            className="m-1"
          >
            {letter}
          </Button>
        ))}
        <Button
          key="space"
          onClick={() => setSearchQuery((x) => x + " ")} // Add space to search query
          variant="outline"
          className="m-1"
        >
          Space
        </Button>
        <Button
          key="clear"
          onClick={() => setSearchQuery("")} // Clear search query
          variant="outline"
          className="m-1"
        >
          Clear
        </Button>
        <Button
          key="backspace"
          onClick={() => setSearchQuery((prev) => prev.slice(0, -1))} // Remove last character from search query
          variant="outline"
          className="m-1"
        >
          <Delete />
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit" : "Create New"} Party Profile
            </DialogTitle>
            <DialogDescription>
              Enter the details for the party profile below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {["name", "gstin", "address", "contact_number"].map((field) => (
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
            ))}
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
                <Select
                  onValueChange={(value) =>
                    handleSelectChange(select.name, value)
                  }
                  value={
                    currentParty[
                      select.name as keyof PartyProfile
                    ]?.toString() || "null"
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={`Select a ${select.label.toLowerCase()}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">None</SelectItem>
                    {select.options.map((option) => (
                      <SelectItem key={option.id} value={option.id.toString()}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {["gstin", "address", "contact_number"].map((field) => (
                  <p key={field} className="text-sm text-gray-500">
                    {field.charAt(0).toUpperCase() + field.slice(1)}:{" "}
                    {party[field as keyof PartyProfile] || "N/A"}
                  </p>
                ))}
                <p className="text-sm text-gray-500">
                  Broker:{" "}
                  {brokers.find((b) => b.id === party.broker_id)?.name || "N/A"}
                </p>
                <p className="text-sm text-gray-500">
                  Transport:{" "}
                  {transportProfiles.find((t) => t.id === party.transport_id)
                    ?.name || "N/A"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Toaster />
    </div>
  );
}
