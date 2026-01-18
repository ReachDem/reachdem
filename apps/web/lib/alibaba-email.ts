import Dm20151123, * as $Dm20151123 from '@alicloud/dm20151123';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';

const ACCESS_KEY_ID = process.env.ALIBABA_ACCESS_KEY_ID 
const ACCESS_KEY_SECRET = process.env.ALIBABA_ACCESS_KEY_SECRET
const REGION = process.env.ALIBABA_REGION || 'eu-central-1';

export interface SendEmailParams {
  accountName: string; // L'adresse email d'envoi (doit être vérifiée dans Alibaba Cloud)
  fromAlias: string; // Nom d'affichage de l'expéditeur
  addressType: number; // 0 pour email aléatoire, 1 pour email batch
  replyToAddress: boolean; // true pour utiliser l'adresse de réponse
  toAddress: string; // Adresse email du destinataire
  subject: string; // Sujet de l'email
  htmlBody?: string; // Corps HTML de l'email
  textBody?: string; // Corps texte de l'email (fallback)
}

/**
 * Créer un client Alibaba Cloud DM
 */
function createClient(): Dm20151123 {
  const config = new $OpenApi.Config({
    accessKeyId: ACCESS_KEY_ID,
    accessKeySecret: ACCESS_KEY_SECRET,
  });
  
  // Endpoint pour Direct Mail avec région eu-central-1
  config.endpoint = `dm.${REGION}.aliyuncs.com`;
  
  return new Dm20151123(config);
}

/**
 * Envoyer un email via Alibaba Cloud Direct Mail
 */
export async function sendEmail(params: SendEmailParams) {
  const client = createClient();
  
  const singleSendMailRequest = new $Dm20151123.SingleSendMailRequest({
    accountName: params.accountName,
    fromAlias: params.fromAlias,
    addressType: params.addressType,
    replyToAddress: params.replyToAddress,
    toAddress: params.toAddress,
    subject: params.subject,
    htmlBody: params.htmlBody,
    textBody: params.textBody,
  });
  
  const runtime = new $Util.RuntimeOptions({});
  
  try {
    const resp = await client.singleSendMailWithOptions(singleSendMailRequest, runtime);
    return {
      success: true,
      data: resp,
    };
  } catch (error: any) {
    console.error('Alibaba Cloud Email Error:', error.message);
    console.error('Recommendation:', error.data?.Recommend);
    
    return {
      success: false,
      error: error.message,
      recommendation: error.data?.Recommend,
      rawError: error,
    };
  }
}

/**
 * Envoyer un email de test simple
 */
export async function sendTestEmail(to: string, accountName: string) {
  return sendEmail({
    accountName, // Ex: noreply@votredomaine.com
    fromAlias: 'Test Alibaba Cloud',
    addressType: 1,
    replyToAddress: true,
    toAddress: to,
    subject: 'Test Email from Alibaba Cloud DM',
    htmlBody: `
      <html>
        <body>
          <h1>Hello from Alibaba Cloud!</h1>
          <p>This is a test email sent via Alibaba Cloud Direct Mail API.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </body>
      </html>
    `,
    textBody: 'Hello from Alibaba Cloud! This is a test email sent via Alibaba Cloud Direct Mail API.',
  });
}

// Alibaba DM: Create a domain
export async function alibabaCreateDomain(domain: string) {
  console.log(`[ALIBABA] alibabaCreateDomain - Creating domain: ${domain}`);
  const client = createClient();
  const req = new $Dm20151123.CreateDomainRequest({
    domainName: domain,
  });
  const runtime = new $Util.RuntimeOptions({});
  try {
    console.log(`[ALIBABA] alibabaCreateDomain - Calling Alibaba API...`);
    const resp = await client.createDomainWithOptions(req, runtime);
    console.log(`[ALIBABA] alibabaCreateDomain - SUCCESS:`, resp);
    return { success: true, data: resp };
  } catch (error: any) {
    console.error(`[ALIBABA] alibabaCreateDomain - ERROR:`, error.message);
    console.error(`[ALIBABA] alibabaCreateDomain - Recommendation:`, error.data?.Recommend);
    return {
      success: false,
      error: error.message,
      recommendation: error.data?.Recommend,
      rawError: error,
    };
  }
}

// Alibaba DM: Check domain (verification status)
export async function alibabaCheckDomain(domain: string) {
  console.log(`[ALIBABA] alibabaCheckDomain - Checking domain: ${domain}`);
  const client = createClient();
  const req = new $Dm20151123.CheckDomainRequest({
    domainName: domain,
  });
  const runtime = new $Util.RuntimeOptions({});
  try {
    console.log(`[ALIBABA] alibabaCheckDomain - Calling Alibaba API...`);
    const resp = await client.checkDomainWithOptions(req, runtime);
    console.log(`[ALIBABA] alibabaCheckDomain - SUCCESS:`, resp);
    return { success: true, data: resp };
  } catch (error: any) {
    console.error(`[ALIBABA] alibabaCheckDomain - ERROR:`, error.message);
    console.error(`[ALIBABA] alibabaCheckDomain - Recommendation:`, error.data?.Recommend);
    return {
      success: false,
      error: error.message,
      recommendation: error.data?.Recommend,
      rawError: error,
    };
  }
}

// Alibaba DM: Query domain details
export async function alibabaQueryDomain(domain: string) {
  console.log(`[ALIBABA] alibabaQueryDomain - Querying domain: ${domain}`);
  const client = createClient();
  const req = new $Dm20151123.QueryDomainByParamRequest({
    domainName: domain,
    pageNo: 1,
    pageSize: 1,
  });
  const runtime = new $Util.RuntimeOptions({});
  try {
    console.log(`[ALIBABA] alibabaQueryDomain - Calling Alibaba API...`);
    const resp = await client.queryDomainByParamWithOptions(req, runtime);
    console.log(`[ALIBABA] alibabaQueryDomain - SUCCESS:`, resp);
    return { success: true, data: resp };
  } catch (error: any) {
    console.error(`[ALIBABA] alibabaQueryDomain - ERROR:`, error.message);
    console.error(`[ALIBABA] alibabaQueryDomain - Recommendation:`, error.data?.Recommend);
    return {
      success: false,
      error: error.message,
      recommendation: error.data?.Recommend,
      rawError: error,
    };
  }
}

// Alibaba DM: Get DKIM public key and hostname for a domain
export async function alibabaGetDkimRecord(domain: string, dkimRsaLength: number = 2048) {
  console.log(`[ALIBABA] alibabaGetDkimRecord - Fetching DKIM for: ${domain}`);
  const client = createClient();
  const req = new $Dm20151123.ChangeDomainDkimRecordRequest({
    domain,
    dkimRsaLength,
  });
  const runtime = new $Util.RuntimeOptions({});
  try {
    console.log(`[ALIBABA] alibabaGetDkimRecord - Calling Alibaba API...`);
    const resp = await client.changeDomainDkimRecordWithOptions(req, runtime);
    console.log(`[ALIBABA] alibabaGetDkimRecord - SUCCESS:`, resp);
    return { success: true, data: resp };
  } catch (error: any) {
    console.error(`[ALIBABA] alibabaGetDkimRecord - ERROR:`, error.message);
    console.error(`[ALIBABA] alibabaGetDkimRecord - Recommendation:`, error.data?.Recommend);
    return {
      success: false,
      error: error.message,
      recommendation: error.data?.Recommend,
      rawError: error,
    };
  }
}

// Alibaba DM: Describe domain configuration by domainId
export async function alibabaDescribeDomain(domainId: number, requireRealTimeDnsRecords: boolean = true) {
  console.log(`[ALIBABA] alibabaDescribeDomain - Describing domainId: ${domainId}`);
  const client = createClient();
  const req = new $Dm20151123.DescDomainRequest({
    domainId,
    requireRealTimeDnsRecords,
  });
  const runtime = new $Util.RuntimeOptions({});
  try {
    console.log(`[ALIBABA] alibabaDescribeDomain - Calling Alibaba API...`);
    const resp = await client.descDomainWithOptions(req, runtime);
    console.log(`[ALIBABA] alibabaDescribeDomain - SUCCESS:`, resp);
    return { success: true, data: resp };
  } catch (error: any) {
    console.error(`[ALIBABA] alibabaDescribeDomain - ERROR:`, error.message);
    console.error(`[ALIBABA] alibabaDescribeDomain - Recommendation:`, error.data?.Recommend);
    return {
      success: false,
      error: error.message,
      recommendation: error.data?.Recommend,
      rawError: error,
    };
  }
}

// Parse auth status from DescDomain response (0=verified, 1=not verified)
// Note: Alibaba SDK has inconsistent types - some are strings, some are numbers
export function parseDomainAuthStatus(descBody: any): { allVerified: boolean; details: { spf: number; mx: number; dkim: number; dmarc: number; cname: number } } {
  // Convert to number, handling both string and number types
  const spf = Number(descBody?.spfAuthStatus ?? 1);
  const mx = Number(descBody?.mxAuthStatus ?? 1);
  const dkim = Number(descBody?.dkimAuthStatus ?? 1);
  const dmarc = Number(descBody?.dmarcAuthStatus ?? 1);
  const cname = Number(descBody?.cnameAuthStatus ?? 1);
  
  const allVerified = spf === 0 && mx === 0 && dkim === 0 && dmarc === 0;
  
  console.log(`[ALIBABA] parseDomainAuthStatus - Raw values:`, {
    spfAuthStatus: descBody?.spfAuthStatus,
    mxAuthStatus: descBody?.mxAuthStatus,
    dkimAuthStatus: descBody?.dkimAuthStatus,
    dmarcAuthStatus: descBody?.dmarcAuthStatus,
    cnameAuthStatus: descBody?.cnameAuthStatus,
  });
  console.log(`[ALIBABA] parseDomainAuthStatus - Parsed: SPF=${spf}, MX=${mx}, DKIM=${dkim}, DMARC=${dmarc}, CNAME=${cname}, allVerified=${allVerified}`);
  
  return { allVerified, details: { spf, mx, dkim, dmarc, cname } };
}
