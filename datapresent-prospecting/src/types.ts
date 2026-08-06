/** Statut de vie d'un prospect dans le pipeline. */
export type ProspectStatus =
  | "discovered"
  | "enriched"
  | "analyzed"
  | "qualified"
  | "rejected"
  | "email_generated"
  | "sent"
  | "replied"
  | "bounced"
  | "complained"
  | "unsubscribed";

export interface Prospect {
  id: string;
  company: string;
  domain: string;
  website?: string;
  country?: string;
  language?: "fr" | "en";
  sector?: string;
  source: string;
  status: ProspectStatus;
  score?: number;
  fit?: boolean;
  needs?: string[];
  suggestedAngle?: string;
  decisionMaker?: string;
  contactEmail?: string;
  emailSource?: string;
  websiteContent?: string;
  subject?: string;
  emailBody?: string;
  followupCount: number;
  sentAt?: string;
  nextFollowupAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface EmailRecord {
  id: string;
  prospectId: string;
  to: string;
  subject: string;
  body: string;
  type: "initial" | "followup1" | "followup2";
  sentAt: string;
  messageId?: string;
}

export interface Campaign {
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataStore {
  prospects: Prospect[];
  emails: EmailRecord[];
  campaigns: Campaign[];
}

export interface IcpConfig {
  company: string;
  offer: string;
  markets: Array<{
    language: "fr" | "en";
    countries: string[];
    searchQueries: string[];
  }>;
  sectors: string[];
  companySize: { min: number; max: number };
  roles: string[];
  excludedKeywords: string[];
  batchSize: number;
}
