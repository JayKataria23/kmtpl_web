export interface PartyCount {
  party_name: string;
  design_entry_count: number;
}

export interface DesignDetail {
  order_date: string;
  design: string;
  shades: { [key: string]: string }[];
  totalMeters: number;
  remark: string;
  canceled: boolean;
  bhiwandi_date: string;
  price: number;
  design_entry_id: number;
  party_name: string;
  order_no: number;
}

export interface SelectedDesignDetail extends DesignDetail {
  date: string;
}
