import { DesignDetail, SelectedDesignDetail } from "@/types/party-file";
import supabase from "@/utils/supabase";

export const addToDrawer = (
  entry: DesignDetail,
  party_name: string,
  selectedEntries: SelectedDesignDetail[]
): SelectedDesignDetail[] => {
  const lastEntryDate =
    selectedEntries.length > 0
      ? selectedEntries[selectedEntries.length - 1].date
      : new Date().toISOString().split("T")[0];

  return [...selectedEntries, { ...entry, date: lastEntryDate, party_name }];
};

export const removeFromDrawer = (
  entry: DesignDetail,
  selectedEntries: SelectedDesignDetail[]
): SelectedDesignDetail[] => {
  return selectedEntries.filter(
    (e) => e.design_entry_id !== entry.design_entry_id
  );
};

export const addToDrawerBhiwandi = (
  entry: DesignDetail,
  party_name: string,
  selectedBhiwandiEntries: SelectedDesignDetail[]
): SelectedDesignDetail[] => {
  const lastEntryDate =
    selectedBhiwandiEntries.length > 0
      ? selectedBhiwandiEntries[selectedBhiwandiEntries.length - 1].date
      : new Date().toISOString().split("T")[0];

  return [
    ...selectedBhiwandiEntries,
    { ...entry, date: lastEntryDate, party_name },
  ];
};

export const removeFromDrawerBhiwandi = (
  entry: DesignDetail,
  selectedBhiwandiEntries: SelectedDesignDetail[]
): SelectedDesignDetail[] => {
  return selectedBhiwandiEntries.filter(
    (e) => e.design_entry_id !== entry.design_entry_id
  );
};

export const handleDispatch = async (
  selectedEntries: SelectedDesignDetail[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updates = selectedEntries.map((entry) => ({
      id: entry.design_entry_id,
      dispatch_date: entry.date,
    }));

    const { error } = await supabase.rpc(
      "update_design_entries_dispatch_date",
      {
        dispatch_info: updates,
      }
    );

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const handleSendAllToBhiwandi = async (
  selectedBhiwandiEntries: SelectedDesignDetail[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (selectedBhiwandiEntries.length === 0) {
      return { success: false, error: "No entries to send to Bhiwandi" };
    }

    const today = new Date(
      new Date().getTime() + 5.5 * 60 * 60 * 1000
    ).toISOString();
    const idsToUpdate = selectedBhiwandiEntries.map(
      (entry) => entry.design_entry_id
    );

    const { error } = await supabase
      .from("design_entries")
      .update({ bhiwandi_date: today })
      .in("id", idsToUpdate);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
