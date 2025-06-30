import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Toaster } from "@/components/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X, Printer } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface DesignCount {
  design: string;
  count: number;
  part: boolean;
}

interface OrderDetail {
  partyName: string;
  shades: { [key: string]: string }[];
  order_remark: string;
  id: number;
  price: number;
  part: boolean;
  entry_remark: string;
  order_date: string;
  order_no: number;
  design: string;
  program?: string;
}

function DesignReports() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  const [designOrders, setDesignOrders] = useState<{
    [key: string]: OrderDetail[];
  }>({});
  const [selectedEntries, setSelectedEntries] = useState<OrderDetail[]>([]);
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [editedShades, setEditedShades] = useState<{ [key: string]: string }[]>([]);
  const [newShadeName, setNewShadeName] = useState("");
  const [newShadeValue, setNewShadeValue] = useState("");
  const { toast } = useToast();
  const [customPrefix, setCustomPrefix] = useState("");
  const [totalShades, setTotalShades] = useState<number | null>(null);
  const [isSavingTotalShades, setIsSavingTotalShades] = useState(false);
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [programEditOrder, setProgramEditOrder] = useState<OrderDetail | null>(null);
  const [programInput, setProgramInput] = useState("");
  const [lastProgramInput, setLastProgramInput] = useState("");
  const [showProgramView, setShowProgramView] = useState(false);
  const [programExtras, setProgramExtras] = useState<{ [design: string]: { [shade: string]: number } }>({});
  const [programTableTitle, setProgramTableTitle] = useState("");
  const [programEntryNo, setProgramEntryNo] = useState("");
  const [programLotNo, setProgramLotNo] = useState("");

  useEffect(() => {
    fetchDesignCounts();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const optionsDate: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
    };

    const formattedDateGB = date.toLocaleDateString("en-GB", optionsDate);
    return `${formattedDateGB}`;
  };

  const fetchDesignCounts = async () => {
    try {
      const { data, error } = await supabase.rpc("get_design_entry_count");

      if (error) throw error;
      const formattedData: DesignCount[] = data.map(
        (item: { design: string; count: bigint; part: bigint }) => ({
          design: item.design,
          count: Number(item.count),
          part: Boolean(Number(item.part) > 0),
        })
      );
      formattedData.sort((a, b) => {
        const nameA = a.design.toLowerCase();
        const nameB = b.design.toLowerCase();

        const isANumeric = !isNaN(Number(nameA));
        const isBNumeric = !isNaN(Number(nameB));

        if (isANumeric && isBNumeric) {
          return Number(nameA) - Number(nameB);
        }
        if (isANumeric) return 1;
        if (isBNumeric) return -1;

        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      setDesignCounts(formattedData);
    } catch (error) {
      console.error("Error fetching design counts:", error);
    }
  };

  const fetchOrderDetails = async (design: string) => {
    try {
      const { data, error } = await supabase.rpc("get_orders_by_design", {
        design_input: design,
      });

      if (error) throw error;

      const orderDetails: OrderDetail[] = data.map(
        (entry: {
          id: number;
          party_name: string;
          shades: [];
          order_remark: string | null;
          price: number;
          part: boolean;
          entry_remark: string | null;
          order_date: string;
          order_no: number;
          program?: string;
        }) => ({
          partyName: entry.party_name,
          shades: entry.shades,
          order_remark: entry.order_remark,
          id: entry.id,
          price: entry.price,
          part: entry.part,
          entry_remark: entry.entry_remark,
          order_date: entry.order_date,
          order_no: entry.order_no,
          design: design,
          program: entry.program || "",
        })
      );

      setDesignOrders((prev) => ({ ...prev, [design]: orderDetails }));
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  const filteredDesignCounts = () => {
    if (filter === "all") {
      return designCounts.sort((a, b) => a.design.localeCompare(b.design));
    } else if (filter === "regular") {
      return designCounts
        .filter(
          (item) =>
            !(
              item.design.includes("-") && /^\d{4}$/.test(item.design.slice(-4))
            ) &&
            !(
              item.design.includes("-") && /^\d{3}$/.test(item.design.slice(-3))
            ) &&
            isNaN(Number(item.design))
        )
        .sort((a, b) => a.design.localeCompare(b.design));
    } else if (filter === "Design No.") {
      return designCounts
        .filter((item) => !isNaN(Number(item.design)))
        .sort((a, b) => Number(a.design) - Number(b.design));
    } else if (filter === "digital") {
      return designCounts
        .filter((item) => item.design.includes("D-") || item.design.includes("DDBY-"))
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB;
        });
    } else if (filter === "prefix") {
      return designCounts
        .filter((item) => item.design.startsWith(customPrefix))
        .sort((a, b) => a.design.localeCompare(b.design));
    } else {
      return designCounts
        .filter(
          (item) =>
            (item.design.includes("-") &&
              /^\d{4}$/.test(item.design.slice(-4))) ||
            (item.design.includes("-") && /^\d{3}$/.test(item.design.slice(-3)))
        )
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB;
        });
    }
  };

  const handleEditShades = async (order: OrderDetail) => {
    setSelectedOrder(order);
    setEditedShades([...order.shades]);
    setIsEditDialogOpen(true);
    // Fetch total_shades from designs table
    const { data, error } = await supabase
      .from("designs")
      .select("total_shades")
      .eq("title", order.design)
      .single();
    if (!error && data && typeof data.total_shades === 'number') {
      setTotalShades(data.total_shades);
    } else {
      setTotalShades(null);
    }
  };

  const handleSaveShades = async () => {
    if (!selectedOrder) return;

    try {
      const { error } = await supabase
        .from("design_entries")
        .update({ shades: editedShades })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Update local state
      setDesignOrders((prev) => ({
        ...prev,
        [selectedOrder.design]: prev[selectedOrder.design].map((order) =>
          order.id === selectedOrder.id
            ? { ...order, shades: editedShades }
            : order
        ),
      }));

      toast({
        title: "Success",
        description: "Shades updated successfully",
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating shades:", error);
      toast({
        title: "Error",
        description: "Failed to update shades",
        variant: "destructive",
      });
    }
  };

  const handleAddShade = () => {
    if (newShadeName && newShadeValue) {
      setEditedShades([...editedShades, { [newShadeName]: newShadeValue }]);
      setNewShadeName("");
      setNewShadeValue("");
    }
  };

  const handleRemoveShade = (index: number) => {
    setEditedShades(editedShades.filter((_, i) => i !== index));
  };

  const handleUpdateShade = (index: number, value: string) => {
    const shadeName = Object.keys(editedShades[index])[0];
    const newShades = [...editedShades];
    newShades[index] = { [shadeName]: value };
    setEditedShades(newShades);
  };

  const handleAddFifty = (index: number) => {
    const shadeName = Object.keys(editedShades[index])[0];
    const currentValue = parseFloat(editedShades[index][shadeName]) || 0;
    const newValue = (currentValue + 50).toString();
    handleUpdateShade(index, newValue);
  };

  const handleSelectEntry = (order: OrderDetail) => {
    setSelectedEntries(prev => [...prev, order]);
  };

  const handleRemoveEntry = (orderId: number) => {
    setSelectedEntries(prev => prev.filter(entry => entry.id !== orderId));
  };

  const isEntrySelected = (orderId: number) => {
    return selectedEntries.some(entry => entry.id === orderId);
  };

  const generateReport = () => {
    // Get all unique shade names
    const allShades = new Set<string>();
    selectedEntries.forEach(entry => {
      entry.shades.forEach(shade => {
        const shadeName = Object.keys(shade)[0];
        if (shade[shadeName] !== "") {
          allShades.add(shadeName);
        }
      });
    });
    
    // Check if all entries are from the same design
    const uniqueDesigns = new Set(selectedEntries.map(entry => entry.design));
    const isSingleDesign = uniqueDesigns.size === 1;
    const designName = isSingleDesign ? Array.from(uniqueDesigns)[0] : null;

    // Sort shade names numerically
    const shadeNames = Array.from(allShades).sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''));
      const numB = parseInt(b.replace(/[^0-9]/g, ''));
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      return a.localeCompare(b);
    });

    // Find the range of numeric shades
    const numericShades = shadeNames.filter(name => !isNaN(parseInt(name.replace(/[^0-9]/g, ''))));
    const minShade = Math.min(...numericShades.map(name => parseInt(name.replace(/[^0-9]/g, ''))));
    const maxShade = Math.max(...numericShades.map(name => parseInt(name.replace(/[^0-9]/g, ''))));

    // Create complete sequence of shades
    const completeShadeSequence: string[] = [];
    for (let i = minShade; i <= maxShade; i++) {
      const shadeName = shadeNames.find(name => parseInt(name.replace(/[^0-9]/g, '')) === i);
      if (shadeName) {
        completeShadeSequence.push(shadeName);
      } else {
        completeShadeSequence.push(`Shade ${i}`);
      }
    }
    // Add non-numeric shades at the end
    const nonNumericShades = shadeNames.filter(name => isNaN(parseInt(name.replace(/[^0-9]/g, ''))));
    completeShadeSequence.push(...nonNumericShades);

    // Precompute totals for all selected entries (for all sections)
    // 1. For each shade, sum across all selected entries
    const totalPerShade: { [shade: string]: number } = {};
    completeShadeSequence.forEach(shadeName => {
      let total = 0;
      selectedEntries.forEach(entry => {
        const shade = entry.shades.find(s => Object.keys(s)[0] === shadeName);
        total += shade ? parseFloat(shade[shadeName]) || 0 : 0;
      });
      totalPerShade[shadeName] = total;
    });
    // 2. For each entry, sum all its shades
    const totalPerEntry: { [entryId: number]: number } = {};
    selectedEntries.forEach(entry => {
      totalPerEntry[entry.id] = entry.shades.reduce((sum, shade) => {
        const value = parseFloat(Object.values(shade)[0]) || 0;
        return sum + value;
      }, 0);
    });
    // 3. Grand total (sum of all values for all selected entries)
    const grandTotal = selectedEntries.reduce((sum, entry) => {
      return sum + entry.shades.reduce((entrySum, shade) => {
        return entrySum + (parseFloat(Object.values(shade)[0]) || 0);
      }, 0);
    }, 0);

    // Function to create a table section
    const createTableSection = (entries: OrderDetail[], startIndex: number, endIndex: number, isLastSection: boolean) => {
      const sectionEntries = entries.slice(startIndex, endIndex);
      return `
        <table style="page-break-inside: avoid;">
          <thead>
            <tr>
              <th class="shade-column">Shade</th>
              ${sectionEntries.map(entry => `
                <th>${entry.partyName}${!isSingleDesign ? ` (${entry.design})` : ''}</th>
              `).join('')}
              ${isLastSection ? `
                <th>Total</th>
                <th class="empty-column"></th>
                <th class="empty-column"></th>
                <th class="empty-column"></th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
            ${completeShadeSequence.map(shadeName => {
              const isMissingShade = shadeName.startsWith('Shade ');
              const rowData = sectionEntries.map(entry => {
                const shade = entry.shades.find(s => Object.keys(s)[0] === shadeName);
                return shade ? parseFloat(shade[shadeName]) || 0 : 0;
              });
              // Total for this shade across ALL selected entries
              const total = totalPerShade[shadeName];
              return `
                <tr class="${isMissingShade ? 'empty-row' : ''}">
                  <td class="shade-column">${shadeName}</td>
                  ${rowData.map(value => `
                    <td>${isMissingShade ? '-' : value.toFixed(2)}</td>
                  `).join('')}
                  ${isLastSection ? `
                    <td>${isMissingShade ? '-' : total.toFixed(2)}</td>
                    <td class="empty-column"></td>
                    <td class="empty-column"></td>
                    <td class="empty-column"></td>
                  ` : ''}
                </tr>
              `;
            }).join('')}
            ${isLastSection ? `
              <tr class="total-row">
                <td class="shade-column">Total</td>
                ${sectionEntries.map(entry => {
                  const total = totalPerEntry[entry.id];
                  return `<td>${total.toFixed(2)}</td>`;
                }).join('')}
                <td>${grandTotal.toFixed(2)}</td>
                <td class="empty-column"></td>
                <td class="empty-column"></td>
                <td class="empty-column"></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      `;
    };

    // Calculate number of columns per table
    const columnsPerTable = 17; // 1 shade column + 9 party columns + 1 total + 3 empty columns
    const totalColumns = selectedEntries.length + 1; // +5 for shade, total, and 3 empty columns
    const needsSplit = totalColumns > columnsPerTable;

    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shade-wise Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 3px;
              text-align: center;
              font-size: 11px;
            }
            th {
              background-color: #f5f5f5;
              font-weight: 600;
            }
            .party-name {
              font-weight: bold;
              text-align: left;
            }
            .total-row {
              font-weight: bold;
              background-color: #f5f5f5;
            }
            .shade-column {
              text-align: left;
              font-weight: 500;
              width: 100px;
            }
            .empty-row {
              background-color: #fafafa;
            }
            .empty-row td {
              color: #999;
            }
            .empty-column {
              background-color: #fafafa;
              width: 40px;
            }
            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
            }
            h2 {
              font-size: 16px;
              margin: 0;
            }
            .date-info {
              font-size: 12px;
              color: #666;
            }
            .table-section {
              page-break-after: auto;
            }
            .table-section:last-child {
              page-break-after: avoid;
            }
            button {
              font-size: 12px;
              padding: 6px 12px;
            }
            @media print {
              body {
                margin: 0;
                padding: 15px;
              }
              .no-print {
                display: none;
              }
              table {
                margin-top: 15px;
              }
              .table-section {
                page-break-after: auto;
              }
              .table-section:last-child {
                page-break-after: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()">Print Report</button>
          </div>
          <div class="report-header">
            <h2>Shade-wise Report${isSingleDesign ? ` - ${designName}` : ''}</h2>
            <div class="date-info">Date: ${new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</div>
          </div>
          ${needsSplit ? (
            Array.from({ length: Math.ceil(selectedEntries.length / (columnsPerTable - 5)) }, (_, i) => {
              const startIndex = i * (columnsPerTable - 5);
              const endIndex = Math.min(startIndex + (columnsPerTable - 5), selectedEntries.length);
              const isLastSection = i === Math.ceil(selectedEntries.length / (columnsPerTable - 5)) - 1;
              return `
                <div class="table-section">
                  ${createTableSection(selectedEntries, startIndex, endIndex, isLastSection)}
                </div>
              `;
            }).join('')
          ) : (
            createTableSection(selectedEntries, 0, selectedEntries.length, true)
          )}
        </body>
      </html>
    `;

    // Open new window with the report
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(htmlContent);
      reportWindow.document.close();
    }
  };

  const areAllEntriesSelectedForDesign = (design: string) => {
    const orders = designOrders[design] || [];
    if (!orders.length) return false;
    return orders.every(order => selectedEntries.some(e => e.id === order.id));
  };

  const handleSelectAllForDesign = async (design: string) => {
    let orders = designOrders[design];
    if (!orders) {
      // Fetch and use the result directly
      try {
        const { data, error } = await supabase.rpc("get_orders_by_design", {
          design_input: design,
        });
        if (error) throw error;
        orders = data.map((entry: any) => ({
          partyName: entry.party_name,
          shades: entry.shades,
          order_remark: entry.order_remark,
          id: entry.id,
          price: entry.price,
          part: entry.part,
          entry_remark: entry.entry_remark,
          order_date: entry.order_date,
          order_no: entry.order_no,
          design: design,
        }));
        setDesignOrders((prev) => ({ ...prev, [design]: orders }));
      } catch (err) {
        console.error("Error fetching order details for select all:", err);
        return;
      }
    }
    const allSelected = areAllEntriesSelectedForDesign(design);
    if (allSelected) {
      setSelectedEntries(prev => prev.filter(entry => entry.design !== design));
    } else {
      setSelectedEntries(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const toAdd = (orders || []).filter(order => !existingIds.has(order.id));
        return [...prev, ...toAdd];
      });
    }
  };

  // Swipe right detection handler
  const handleTouchStart = (e: React.TouchEvent) => {
    (e.target as HTMLElement).setAttribute('data-touchstart-x', String(e.touches[0].clientX));
  };
  const handleTouchEnd = (e: React.TouchEvent, order: OrderDetail) => {
    const startX = Number((e.target as HTMLElement).getAttribute('data-touchstart-x'));
    const endX = e.changedTouches[0].clientX;
    if (endX - startX > 60) { // right swipe
      setProgramEditOrder(order);
      // Prefill with order.program if present, else lastProgramInput
      setProgramInput(order.program && order.program !== "" ? order.program : lastProgramInput);
      setIsProgramDialogOpen(true);
    }
  };

  // --- Generate Program Function ---
  const generateProgram = () => {
    // Group selected entries by design
    const designMap: { [design: string]: OrderDetail[] } = {};
    selectedEntries.forEach(entry => {
      if (!designMap[entry.design]) designMap[entry.design] = [];
      designMap[entry.design].push(entry);
    });
    // Prepare rows
    const rows = Object.entries(designMap).map(([design, entries]) => {
      // Taka: sum all meters (all shades) for that design, divide by 100
      let totalMeters = 0;
      const shadeTotals: { [shade: string]: number } = {};
      entries.forEach(entry => {
        entry.shades.forEach(shade => {
          const shadeName = Object.keys(shade)[0];
          const value = parseFloat(shade[shadeName]) || 0;
          totalMeters += value;
          shadeTotals[shadeName] = (shadeTotals[shadeName] || 0) + value;
        });
      });
      // Add extras to totals
      const extras = programExtras[design] || {};
      let totalMetersWithExtras = totalMeters;
      Object.entries(extras).forEach(([shade, extra]) => {
        if (!shadeTotals[shade]) shadeTotals[shade] = 0;
        shadeTotals[shade] += extra;
        totalMetersWithExtras += extra;
      });
      const taka = (totalMetersWithExtras / 100).toFixed(2);
      // Order: shade wise total (with extras), only if total > 0
      const orderStr = Object.entries(shadeTotals)
        .filter(([, val]) => val > 0)
        .map(([shade, val]) => `${shade}/${val} `)
        .join(", ");
      // Party: all party names, comma separated, unique
      let partyNames = Array.from(new Set(entries.map(e => e.partyName))).join(", ");
      // Only append (extra) if any extra > 0
      const hasExtra = Object.values(extras).some(val => val > 0);
      if (hasExtra) partyNames += " (extra)";
      return { taka, design, orderStr, partyNames };
    });
    // Calculate total taka
    const totalTaka = rows.reduce((sum, row) => sum + parseFloat(row.taka), 0).toFixed(2);
    // Generate HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Program Table</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: 600; }
            h2 { font-size: 18px; margin: 0 0 10px 0; }
            .no-print { margin-bottom: 10px; }
            .total-taka-row { font-size: 1.5em; font-weight: bold; margin-top: 24px; text-align: center; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()">Print Program</button>
            <button style="margin-left:10px;" onclick="printWithoutParty()">Print Program Without Party</button>
          </div>
          <div style="text-align:center; margin-bottom: 10px;">
            <div style="font-size:1.3em; font-weight:bold;">${programTableTitle || "Program Table"}</div>
          </div>
          <div id="program-table-container">
            <table id="program-table">
              <thead>
                <tr>
                  <th>Taka</th>
                  <th>Design</th>
                  <th>Order</th>
                  <th class="party-col">Party</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `
                  <tr>
                    <td>${row.taka}</td>
                    <td>${row.design}</td>
                    <td>${row.orderStr}</td>
                    <td class="party-col">${row.partyNames}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <script>
            function printWithoutParty() {
              // Hide party column
              var partyHeaders = document.querySelectorAll('.party-col');
              partyHeaders.forEach(function(el) { el.style.display = 'none'; });
              // Hide header
              var ths = document.querySelectorAll('th.party-col');
              ths.forEach(function(el) { el.style.display = 'none'; });
              window.print();
              // Restore after print
              setTimeout(function() {
                partyHeaders.forEach(function(el) { el.style.display = ''; });
                ths.forEach(function(el) { el.style.display = ''; });
              }, 500);
            }
          </script>
          <div class="total-taka-row">Total Taka: ${totalTaka}</div>
          ${(programEntryNo || programLotNo) ? `<div class="total-taka-row" style="margin-top: 10px;">
            ${programEntryNo ? `Entry No.: ${programEntryNo}` : ""}
            ${programLotNo ? `&nbsp;&nbsp;Lot No.: ${programLotNo}` : ""}
          </div>` : ""}
        </body>
      </html>
    `;
    // Open new window
    const programWindow = window.open('', '_blank');
    if (programWindow) {
      programWindow.document.write(htmlContent);
      programWindow.document.close();
    }
  };

  return (
    <div className="container mx-auto mt-4 p-2 sm:p-4 relative">
      <div className="sticky top-0 bg-white z-10 p-2 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
          <Button 
            onClick={() => navigate("/")} 
            className="w-full sm:w-auto"
          >
            Back to Home
          </Button>
          <ToggleGroup
            variant="outline"
            type="single"
            value={filter}
            onValueChange={(value) => {
              setFilter(value);
              setOpenAccordionItems([]);
            }}
            className="w-full sm:w-auto flex-wrap justify-start"
          >
            <ToggleGroupItem value="all" aria-label="Show all">
              ALL
            </ToggleGroupItem>
            <ToggleGroupItem value="regular" aria-label="Show regular">
              Regular
            </ToggleGroupItem>
            <ToggleGroupItem value="print" aria-label="Show print">
              Print
            </ToggleGroupItem>
            <ToggleGroupItem value="digital" aria-label="Show digital">
              Digital
            </ToggleGroupItem>
            <ToggleGroupItem value="Design No." aria-label="Show Design No.">
              Design No.
            </ToggleGroupItem>
            <ToggleGroupItem value="prefix" aria-label="Show prefix">
              Prefix
            </ToggleGroupItem>
          </ToggleGroup>
          {filter === "prefix" && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="Enter prefix..."
                value={customPrefix}
                onChange={e => setCustomPrefix(e.target.value)}
                className="w-48"
              />
              <span className="text-sm text-gray-500">Filtering designs starting with: <b>{customPrefix || "(none)"}</b></span>
            </div>
          )}
          <Sheet open={isReportDrawerOpen} onOpenChange={setIsReportDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                Selected Entries
                {selectedEntries.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {selectedEntries.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Selected Entries</SheetTitle>
              </SheetHeader>
              <div className="flex justify-center mb-4">
                <ToggleGroup
                  type="single"
                  value={showProgramView ? "program" : "entry"}
                  onValueChange={val => setShowProgramView(val === "program")}
                  className="bg-gray-100 rounded-lg p-1"
                >
                  <ToggleGroupItem value="entry" aria-label="Entry List" className="px-4 py-2">
                    Entry List
                  </ToggleGroupItem>
                  <ToggleGroupItem value="program" aria-label="Program View" className="px-4 py-2">
                    Program View
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              {selectedEntries.length > 0 && !showProgramView && (
                <Button
                  onClick={generateReport}
                  className="w-full mt-4"
                  variant="default"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              )}
              {selectedEntries.length > 0 && showProgramView && (
                <>
                  <div className="mb-4 flex flex-col gap-2">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-sm"
                      placeholder="Table Title"
                      value={programTableTitle}
                      onChange={e => setProgramTableTitle(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="border rounded px-2 py-1 text-sm flex-1"
                        placeholder="Entry No."
                        value={programEntryNo}
                        onChange={e => setProgramEntryNo(e.target.value)}
                      />
                      <input
                        type="text"
                        className="border rounded px-2 py-1 text-sm flex-1"
                        placeholder="Lot No."
                        value={programLotNo}
                        onChange={e => setProgramLotNo(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={generateProgram}
                    className="w-full mb-4"
                    variant="secondary"
                  >
                    Generate Program
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!programEntryNo) return;
                      try {
                        const ids = selectedEntries.map(e => e.id);
                        const { error } = await supabase
                          .from("design_entries")
                          .update({ program: programEntryNo })
                          .in("id", ids);
                        if (error) throw error;
                        // Update local state
                        setDesignOrders(prev => {
                          const updated = { ...prev };
                          Object.keys(updated).forEach(design => {
                            updated[design] = updated[design].map(order =>
                              ids.includes(order.id) ? { ...order, program: programEntryNo } : order
                            );
                          });
                          return updated;
                        });
                        // Also update selectedEntries
                        setSelectedEntries(prev => prev.map(e => ({ ...e, program: programEntryNo })));
                        toast({ title: "Success", description: "Entry number applied to all selected entries." });
                      } catch (err) {
                        toast({ title: "Error", description: "Failed to update entry numbers.", variant: "destructive" });
                      }
                    }}
                    className="w-full mb-4"
                    variant="outline"
                    disabled={!programEntryNo || selectedEntries.length === 0}
                  >
                    Give Entry Number
                  </Button>
                </>
              )}
              <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {selectedEntries.length === 0 ? (
                  <p className="text-center text-gray-500">No entries selected</p>
                ) : showProgramView ? (
                  // Program View tables for each design
                  Object.entries(selectedEntries.reduce((acc, entry) => {
                    if (!acc[entry.design]) acc[entry.design] = [];
                    acc[entry.design].push(entry);
                    return acc;
                  }, {} as { [design: string]: OrderDetail[] })).map(([design, entries]) => {
                    // Compute shade totals for this design
                    const shadeTotals: { [shade: string]: number } = {};
                    entries.forEach(entry => {
                      entry.shades.forEach(shade => {
                        const shadeName = Object.keys(shade)[0];
                        const value = parseFloat(shade[shadeName]) || 0;
                        shadeTotals[shadeName] = (shadeTotals[shadeName] || 0) + value;
                      });
                    });
                    // Only shades with total > 0
                    const filteredShades = Object.entries(shadeTotals).filter(([, val]) => val > 0);
                    const total = filteredShades.reduce((sum, [, val]) => sum + val, 0);
                    // Party names (unique, comma separated)
                    const partyNames = Array.from(new Set(entries.map(e => e.partyName))).join(", ");
                    // Get extras for this design
                    const extras = programExtras[design] || {};
                    return (
                      <div key={design} className="mb-6">
                        <h4 className="font-semibold mb-2">Design: {design}</h4>
                        <div className="mb-2 text-xs text-gray-600">
                          <span className="font-medium">Parties:</span> {partyNames}
                        </div>
                        <table className="w-full border text-xs">
                          <thead>
                            <tr>
                              <th className="border px-2 py-1 text-left">Shade</th>
                              <th className="border px-2 py-1 text-right">Total (m)</th>
                              <th className="border px-2 py-1 text-right">+ Extra</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredShades.map(([shade, val]) => (
                              <tr key={shade}>
                                <td className="border px-2 py-1">{shade}</td>
                                <td className="border px-2 py-1 text-right">{val}</td>
                                <td className="border px-2 py-1 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-16 px-1 py-0.5 border rounded text-right"
                                    value={extras[shade] ?? ""}
                                    onChange={e => {
                                      const v = e.target.value === "" ? 0 : Number(e.target.value);
                                      setProgramExtras(prev => ({
                                        ...prev,
                                        [design]: {
                                          ...(prev[design] || {}),
                                          [shade]: v
                                        }
                                      }));
                                    }}
                                    placeholder="0"
                                  />
                                </td>
                              </tr>
                            ))}
                            <tr className="font-bold">
                              <td className="border px-2 py-1">Total</td>
                              <td className="border px-2 py-1 text-right">{total}</td>
                              <td className="border px-2 py-1"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                ) : (
                  selectedEntries.map((entry) => (
                    <div key={entry.id} className="p-4 border rounded-lg relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleRemoveEntry(entry.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <h3 className="font-medium">{entry.partyName}</h3>
                      <p className="text-sm text-gray-600">Design: {entry.design}</p>
                      <p className="text-sm text-gray-600">Order No: {entry.order_no}</p>
                      <div className="mt-2">
                        <h4 className="text-sm font-medium">Shades:</h4>
                        <div className="space-y-1">
                          {entry.shades.map((shade, idx) => {
                            const shadeName = Object.keys(shade)[0];
                            const shadeValue = shade[shadeName];
                            if (shadeValue === "") return null;
                            return (
                              <div key={idx} className="text-sm">
                                <span className="font-medium">{shadeName}:</span> {shadeValue}m
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Accordion
        type="multiple"
        className="w-full"
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
      >
        {filteredDesignCounts().map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <div className="flex items-center justify-between w-full">
              <AccordionTrigger
                className="text-lg flex items-center w-full hover:bg-gray-50"
                onClick={() => fetchOrderDetails(item.design)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-left font-medium">{item.design}</span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {item.count} orders
                  </span>
                </div>
              </AccordionTrigger>
              <Button
                size="sm"
                variant={areAllEntriesSelectedForDesign(item.design) ? "destructive" : "outline"}
                className="ml-2 whitespace-nowrap"
                onClick={async (e) => {
                  e.stopPropagation();
                  await handleSelectAllForDesign(item.design);
                }}
              >
                {areAllEntriesSelectedForDesign(item.design) ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <AccordionContent>
              {designOrders[item.design] ? (
                <div className="overflow-x-auto">
                  <div className="min-w-full divide-y divide-gray-200">
                    {designOrders[item.design]
                      .sort((a, b) => Number(b.part) - Number(a.part))
                      .map((order, orderIndex) => (
                        <div
                          key={order.id}
                          className={`p-4 ${
                            orderIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                          onTouchStart={e => handleTouchStart(e)}
                          onTouchEnd={e => handleTouchEnd(e, order)}
                        >
                          <div className="flex sm:flex-row gap-4">
                            <div className="flex-1 min-w-0 flex flex-row gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className={`text-base font-medium ${
                                    order.part ? "text-red-500" : ""
                                  }`}>
                                    {order.partyName}
                                  </h3>
                                  {order.part && (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                      Part
                                    </span>
                                  )}
                                </div>
                                
                                <div className="space-y-1 text-sm text-gray-600">
                                  {order.order_remark && (
                                    <p className="break-all">
                                      <span className="font-medium">Order Remark:</span> {order.order_remark}
                                    </p>
                                  )}
                                  <p>
                                    <span className="font-medium">Price:</span> ₹{order.price}
                                  </p>
                                  <p>
                                    <span className="font-medium">Date:</span> {formatDate(order.order_date)}
                                  </p>
                                  {order.order_no && (
                                    <p>
                                      <span className="font-medium">Order No:</span> {order.order_no}
                                    </p>
                                  )}
                                  {order.entry_remark && (
                                    <p>
                                      <span className="font-medium">Entry Remark:</span> {order.entry_remark}
                                    </p>
                                  )}
                                  {order.program && (
                                    <p className="text-blue-600">
                                      Program Entry No.:{order.program}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-row gap-2 sm:w-48">
                                <div className="bg-gray-50 p-2 rounded-lg">
                                  <h4 className="text-sm font-medium mb-2">Shades</h4>
                                  <div className="space-y-1">
                                    {order.shades &&
                                      order.shades.map((shade, idx) => {
                                        const shadeName = Object.keys(shade)[0];
                                        const shadeValue = shade[shadeName];
                                        if (shadeValue == "") return null;
                                        return (
                                          <div key={idx} className="text-sm">
                                            <span className="font-medium">{shadeName}:</span> {shadeValue}m
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              onClick={() => handleEditShades(order)}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              Edit Shades
                            </Button>
                            {isEntrySelected(order.id) ? (
                              <Button
                                onClick={() => handleRemoveEntry(order.id)}
                                variant="destructive"
                                className="flex-1"
                              >
                                Remove from Report
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleSelectEntry(order)}
                                variant="outline"
                                className="flex-1"
                              >
                                Add to Report
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Loading order details...
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Shades</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="text-sm text-blue-700 font-medium bg-blue-50 rounded p-2 flex items-center gap-2">
                Total Shades for this design:
                <input
                  type="number"
                  min={0}
                  value={totalShades ?? 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotalShades(parseInt(e.target.value, 10) || 0)}
                  className="ml-2 w-16 border border-blue-300 rounded px-2 py-1 text-blue-900 bg-white"
                  style={{ fontWeight: 600 }}
                />
                <Button
                  size="sm"
                  className="ml-2"
                  disabled={isSavingTotalShades || !selectedOrder}
                  onClick={async () => {
                    if (!selectedOrder) return;
                    setIsSavingTotalShades(true);
                    const { error } = await supabase
                      .from("designs")
                      .update({ total_shades: totalShades ?? 0 })
                      .eq("title", selectedOrder.design);
                    setIsSavingTotalShades(false);
                    if (!error) {
                      toast({ title: "Success", description: "Total shades updated." });
                    } else {
                      toast({ title: "Error", description: "Failed to update total shades.", variant: "destructive" });
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {editedShades.map((shade, index) => {
                const shadeName = Object.keys(shade)[0];
                const isAllColours = shadeName === 'All Colours';
                return (
                  <div key={index} className="flex flex-col gap-1 bg-gray-50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium min-w-[80px]">{shadeName}</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={shade[shadeName]}
                          onChange={(e) => handleUpdateShade(index, e.target.value)}
                          className="w-24"
                        />
                        <Button
                          onClick={() => handleAddFifty(index)}
                          size="sm"
                          variant="outline"
                          className="px-2"
                        >
                          +50
                        </Button>
                      </div>
                      <span className="text-sm text-gray-500">m</span>
                      <Button
                        onClick={() => handleRemoveShade(index)}
                        variant="destructive"
                        size="sm"
                        className="ml-auto"
                      >
                        Remove
                      </Button>
                    </div>
                    {isAllColours && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full mt-2"
                        onClick={() => {
                          if (!totalShades || totalShades < 1) return;
                          const allColoursValue = shade[shadeName];
                          if (!allColoursValue || isNaN(Number(allColoursValue))) return;
                          setEditedShades(prev => {
                            // Remove existing numeric shades 1..totalShades
                            const filtered = prev.filter(s => {
                              const n = Number(Object.keys(s)[0]);
                              return isNaN(n) || n < 1 || n > totalShades;
                            });
                            // Add/replace numeric shades 1..totalShades with the value
                            const newShades = [...filtered];
                            for (let i = 1; i <= totalShades; i++) {
                              newShades.push({ [i.toString()]: allColoursValue });
                            }
                            // Set All Colours to blank
                            return newShades.map(s =>
                              Object.keys(s)[0] === 'All Colours' ? { 'All Colours': '' } : s
                            );
                          });
                        }}
                      >
                        Apply to All
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Add New Shade</h4>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Shade name"
                  value={newShadeName}
                  onChange={(e) => setNewShadeName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Value"
                  value={newShadeValue}
                  onChange={(e) => setNewShadeValue(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">m</span>
                <Button 
                  onClick={handleAddShade}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  Add Shade
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveShades}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isProgramDialogOpen} onOpenChange={setIsProgramDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program Entry No.</DialogTitle>
            <DialogDescription>
              Enter or update the program entry number for this design entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter program entry no."
              value={programInput}
              onChange={e => setProgramInput(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsProgramDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!programEditOrder) return;
                  const { error } = await supabase
                    .from("design_entries")
                    .update({ program: programInput })
                    .eq("id", programEditOrder.id);
                  if (!error) {
                    setDesignOrders(prev => ({
                      ...prev,
                      [programEditOrder.design]: prev[programEditOrder.design].map(order =>
                        order.id === programEditOrder.id ? { ...order, program: programInput } : order
                      ),
                    }));
                    toast({ title: "Success", description: "Program updated." });
                    setIsProgramDialogOpen(false);
                    // Save last used program input
                    setLastProgramInput(programInput);
                  } else {
                    toast({ title: "Error", description: "Failed to update program.", variant: "destructive" });
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}

export default DesignReports; 