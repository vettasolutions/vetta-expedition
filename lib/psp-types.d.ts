// Types for Poverty Stoplight Platform

// Console output types
export interface PspConsoleOutputContent {
  type: 'text' | 'image';
  value: string;
}

export interface PspConsoleOutput {
  id: string;
  status: 'in_progress' | 'loading_packages' | 'completed' | 'failed';
  contents: Array<PspConsoleOutputContent>;
}

// Global window object extension
declare global {
  interface Window {
    pspConsoleOutputs: Array<PspConsoleOutput>;
  }
}

// Event types
interface PspConsoleUpdateEvent extends CustomEvent {
  detail: {
    consoleId: string;
  };
}

// Family data types
export interface FamilyDetail {
  familyId: number;
  familyCode: string;
  achievedDate: number | string;
}

export interface TrackIndicatorResponse {
  count: number;
  details: FamilyDetail[];
}

export interface CountryData {
  countryCode: string;
  value: number;
}

export interface CountryDataFormatted {
  country: string;
  value: number;
  unit: string;
}
