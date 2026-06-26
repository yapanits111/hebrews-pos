// ============================================================
//  CONFIGURATION  —  THIS IS THE ONLY FILE YOU NEED TO EDIT
// ============================================================

// 1) From Supabase: Dashboard > Project Settings > API
//    Copy the "Project URL" and the "anon public" key.
export const SUPABASE_URL = "https://whkqoggbukioclsvbdjb.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoa3FvZ2didWtpb2Nsc3ZiZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTE3ODQsImV4cCI6MjA5NzQyNzc4NH0.2cnNf8RgLjQCVSFO6OvTy2WsXLdEwNCsQohB0Eabh0c";

// 2) Shop information (shown on the receipt)
export const SHOP = {
  name:    "HEBREWS 11:1",
  tagline: "Brewed with faith. Serve with love.",
  verse:   "The assurance of all things hoped for",
  address: "Libmanan, Camarines Sur",
  contact: "0950 121 3896",
  email:   "hewbrews111230@gmail.com",
  footer:  "Salamat sa pagbili! God bless po :)",
};

// 3) Receipt printer size: "58mm" or "80mm"
export const RECEIPT_WIDTH = "58mm";
