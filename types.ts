// Shape stored in Firestore `clinics/{id}`. Mirrors the patient app's
// `types/dashboard.ts` Clinic interface — keep the field names in sync
// or the patient app's `adaptDashClinicToApp` will drop them.
export interface ClinicDoc {
  id: string;
  name: string;
  nameEn?: string;
  nameKr?: string;
  address: string;
  addressText: string;
  addressDetail?: string;
  region?: string;
  district?: string;
  geo?: { lat: number; lng: number };
  category: string;
  hours: string;
  isOpen: boolean;
  availableSlots: number;
  waitTime: number;
  rating: number;
  services: { name: string; price: number }[];
  doctors: {
    id: string;
    name: string;
    nameKr: string;
    specialty: string;
    experience: number;
    education: string;
    languages: string[];
  }[];
  phone: string;
  englishAvailable: boolean;
  isActive: boolean;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicFormInput {
  nameKr: string;
  nameEn?: string;
  address: string;
  addressDetail?: string;
  region?: string;
  district?: string;
  geo?: { lat: number; lng: number };
  category: string;
  phone?: string;
  hours?: string;
  englishAvailable: boolean;
}
