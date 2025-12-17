
export const SUPERVISOR_QR_ID = "SUP_ADMIN_999";
export const SUPERVISOR_NAME = "Supervisor";
export const LOGOUT_QR_ID = "OPERATOR_LOGOUT";
export const LOCATION_QR_PREFIX = "LOC:";
export const LOW_STOCK_THRESHOLD = 5;
export const ADMIN_PIN = "1234"; // Security PIN for Admin Access

export const TEAM_QR: Record<string, string> = {
  "MOLEX_OPR_1": "Nagendra",
  "MOLEX_OPR_2": "Prakash",
  "MOLEX_OPR_3": "Anil",
  "MOLEX_OPR_4": "Shivu",
  "MOLEX_OPR_5": "Rakshita",
  "MOLEX_OPR_6": "Siddu",
  "MOLEX_OPR_7": "Narayan",
  "MOLEX_OPR_8": "Anil.V",
  "MOLEX_OPR_9": "Abinandan"
};

// Seed data matching the provided photos (Rack TC6, Rows E, F, G, H)
export const INITIAL_PARTS_SEED = [
  {
    id: "CONN-001",
    name: "Micro-Fit 3.0 Connector",
    quantity: 150,
    location: { rack: "TC6", row: "E", bin: "3" }
  },
  {
    id: "CONN-002",
    name: "Micro-Fit 3.0 Housing",
    quantity: 0,
    location: { rack: "TC6", row: "E", bin: "4" }
  },
  {
    id: "TERM-045",
    name: "Crimp Terminal Female (Red)",
    quantity: 5000,
    location: { rack: "TC6", row: "F", bin: "2" }
  },
  {
    id: "HSG-220",
    name: "Receptacle Housing 4-Pin",
    quantity: 4, 
    location: { rack: "TC6", row: "F", bin: "3" }
  },
  {
    id: "WHR-001",
    name: "White Header 2mm",
    quantity: 300, 
    location: { rack: "TC6", row: "H", bin: "1" }
  },
  {
    id: "WHR-002",
    name: "White Header 4mm",
    quantity: 12, 
    location: { rack: "TC6", row: "H", bin: "2" }
  },
  {
    id: "OLD-001",
    name: "Legacy Connector",
    quantity: 50,
    location: { rack: "A1", row: "2", bin: "10" }
  }
];