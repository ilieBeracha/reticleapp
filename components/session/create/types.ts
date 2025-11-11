import { DayPeriod } from "@/services/sessionService";

export interface SessionFormData {
  name: string;
  rangeLocation: string;
  dayPeriod: DayPeriod;
  isSquad: boolean;
  comments: string;
  organizationId: string | null;
}

export interface StepProps {
  formData: SessionFormData;
  updateFormData: (data: Partial<SessionFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

