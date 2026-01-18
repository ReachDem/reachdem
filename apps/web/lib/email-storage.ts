import { promises as fs } from 'fs';
import path from 'path';

export interface EmailRecord {
  id: string;
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  fromAlias: string;
  accountName: string;
  addressType: number;
  replyToAddress: boolean;
  sentAt: Date;
  status: 'sent' | 'failed' | 'pending';
  deliveryStatus?: 'delivered' | 'bounced' | 'complained' | 'pending';
  alibabaResponse?: any;
  error?: string;
  updatedAt: Date;
}

const STORAGE_FILE = path.join(process.cwd(), 'emails-log.json');

// Initialiser le fichier s'il n'existe pas
async function initStorage(): Promise<void> {
  try {
    await fs.access(STORAGE_FILE);
  } catch {
    await fs.writeFile(STORAGE_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

// Lire tous les emails
export async function getAllEmails(): Promise<EmailRecord[]> {
  await initStorage();
  const data = await fs.readFile(STORAGE_FILE, 'utf-8');
  return JSON.parse(data);
}

// Ajouter un nouvel email
export async function addEmail(email: Omit<EmailRecord, 'id' | 'sentAt' | 'updatedAt'>): Promise<EmailRecord> {
  const emails = await getAllEmails();
  const newEmail: EmailRecord = {
    ...email,
    id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sentAt: new Date(),
    updatedAt: new Date(),
  };
  emails.unshift(newEmail); // Ajouter au début
  await fs.writeFile(STORAGE_FILE, JSON.stringify(emails, null, 2), 'utf-8');
  return newEmail;
}

// Mettre à jour le statut de délivrabilité
export async function updateEmailDeliveryStatus(
  emailId: string,
  deliveryStatus: EmailRecord['deliveryStatus'],
  additionalData?: Partial<EmailRecord>
): Promise<EmailRecord | null> {
  const emails = await getAllEmails();
  const index = emails.findIndex(e => e.id === emailId);
  
  if (index === -1) return null;
  
  emails[index] = {
    ...emails[index],
    deliveryStatus,
    updatedAt: new Date(),
    ...additionalData,
  };
  
  await fs.writeFile(STORAGE_FILE, JSON.stringify(emails, null, 2), 'utf-8');
  return emails[index];
}

// Obtenir les statistiques
export async function getEmailStats(): Promise<{
  total: number;
  sent: number;
  failed: number;
  delivered: number;
  bounced: number;
  complained: number;
  pending: number;
}> {
  const emails = await getAllEmails();
  
  return {
    total: emails.length,
    sent: emails.filter(e => e.status === 'sent').length,
    failed: emails.filter(e => e.status === 'failed').length,
    delivered: emails.filter(e => e.deliveryStatus === 'delivered').length,
    bounced: emails.filter(e => e.deliveryStatus === 'bounced').length,
    complained: emails.filter(e => e.deliveryStatus === 'complained').length,
    pending: emails.filter(e => e.deliveryStatus === 'pending' || !e.deliveryStatus).length,
  };
}
