import { useEffect, useState } from "react"; // Import useEffect and useState
import { Button } from "@/components/ui/button"; // Import Button
import { useNavigate } from "react-router-dom"; // Import useNavigate
import supabase from "@/utils/supabase";

interface BhiwandiEntry {
  bhiwandi_date: string; // Date from the database
  count: number; // Count of entries for that date
}

// Utility function to format the date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = date.toLocaleDateString('en-US', options);
  
  // Add ordinal suffix to the day
  const day = date.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  
  return formattedDate.replace(day.toString(), day + suffix);
};

const BhiwandiList = () => {
  const [bhiwandiEntries, setBhiwandiEntries] = useState<BhiwandiEntry[]>([]); // State to hold Bhiwandi entries
  const navigate = useNavigate(); // Initialize navigate

  useEffect(() => {
    fetchBhiwandiEntries(); // Fetch Bhiwandi entries on component mount
  }, []);

  const fetchBhiwandiEntries = async () => {
    try {
      const { data, error } = await supabase.rpc("get_bhiwandi_date_counts"); // Call the new function

      if (error) throw error;

      const formattedData: BhiwandiEntry[] = data.map((item: { bhiwandi_date: string, count: number }) => ({
        bhiwandi_date: formatDate(item.bhiwandi_date), // Format the date
        count: item.count,
      }));

      setBhiwandiEntries(formattedData); // Set the fetched data to state
    } catch (error) {
      console.error("Error fetching Bhiwandi entries:", error);
    }
  };

  return (
    <div className="container mx-auto mt-10 text-center">
      <h1 className="text-2xl font-bold">Bhiwandi List</h1>
      <Button onClick={() => navigate("/")} className="mt-4">
        Back to Home
      </Button>

      <div className="mt-6">
        {bhiwandiEntries.map((entry, index) => (
          <div key={index} className="mb-4 p-4 border rounded">
            <span className="text-lg font-semibold">{entry.bhiwandi_date}</span>
            <span className="text-sm text-gray-500 ml-2">Count: {entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BhiwandiList;
