import { describe, expect, it } from "vitest";
import { getContactImportLimit } from "@/lib/utils/contact-import";
import {
  getSampleData,
  getVcfRichPayload,
  isValidContactFile,
  parseContactFile,
  parseVcfText,
} from "@/lib/utils/parse-contacts-file";

describe("contact import limits", () => {
  it("returns the expected limit for each plan", () => {
    expect(getContactImportLimit("free")).toBe(100);
    expect(getContactImportLimit("basic")).toBe(1000);
    expect(getContactImportLimit("growth")).toBe(5000);
    expect(getContactImportLimit("pro")).toBe(10000);
    expect(getContactImportLimit("custom")).toBe(10000);
  });

  it("normalizes known plan aliases", () => {
    expect(getContactImportLimit("starter")).toBe(1000);
    expect(getContactImportLimit("scale")).toBe(10000);
    expect(getContactImportLimit("experimental")).toBe(1000);
  });
});

describe("VCF contact parsing", () => {
  it("parses rich VCF contacts and preserves structured metadata", () => {
    const rows = parseVcfText(`BEGIN:VCARD
VERSION:3.0
FN:Jane Doe
N:Doe;Jane;;;
EMAIL;TYPE=WORK;PREF=1:jane@work.test
EMAIL;TYPE=HOME:jane@home.test
TEL;TYPE=HOME:+237600000001
TEL;TYPE=CELL;PREF=1:+237600000002
ORG:ReachDem;Sales
TITLE:Growth Lead
ROLE:Outbound
NOTE:Top prospect
NICKNAME:JD
BDAY:1990-04-02
URL:https://reachdem.test/jane
CATEGORIES:vip,newsletter
ADR;TYPE=WORK:;;42 Market Street;Douala;LT;00237;Cameroon
END:VCARD`);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Jane Doe",
      email: "jane@work.test",
      phone: "+237600000002",
      enterprise: "ReachDem / Sales",
      work: "Growth Lead",
      address: "42 Market Street, Douala, LT, 00237, Cameroon",
    });

    const richPayload = getVcfRichPayload(rows[0]!);
    expect(richPayload).not.toBeNull();
    expect(richPayload?.vcfPhones).toEqual([
      {
        value: "+237600000001",
        types: ["home"],
        isPreferred: false,
      },
      {
        value: "+237600000002",
        types: ["cell", "pref"],
        isPreferred: true,
      },
    ]);
    expect(richPayload?.vcfEmails?.[1]).toEqual({
      value: "jane@home.test",
      types: ["home"],
      isPreferred: false,
    });
    expect(richPayload?.vcfUrls).toEqual(["https://reachdem.test/jane"]);
    expect(richPayload?.vcfCategories).toEqual(["vip", "newsletter"]);
    expect(richPayload?.vcfOrganization).toEqual({
      value: "ReachDem / Sales",
      parts: ["ReachDem", "Sales"],
    });
  });

  it("falls back to the structured name and handles folded lines", async () => {
    const file = new File(
      [
        `BEGIN:VCARD
VERSION:3.0
N:Doe;John;;Mr.;
TEL;TYPE=WORK:+237699999999
NOTE:Line one
 continuation
END:VCARD`,
      ],
      "contacts.vcf",
      { type: "text/vcard" }
    );

    const parsed = await parseContactFile(file);

    expect(parsed.columns).toEqual(["name", "phone"]);
    expect(parsed.totalRows).toBe(1);
    expect(parsed.rows[0]?.name).toBe("Mr. John Doe");
    expect(getVcfRichPayload(parsed.rows[0]!)?.vcfNote).toBe(
      "Line onecontinuation"
    );
  });

  it("ignores hidden VCF payload keys when sampling preview data", () => {
    const sample = getSampleData([
      { __vcfRichPayload: '{"vcfPhones":[]}' },
      { name: "Jane", __vcfRichPayload: '{"vcfPhones":[]}' },
    ]);

    expect(sample).toHaveLength(1);
    expect(sample[0]?.name).toBe("Jane");
  });
});

describe("file validation", () => {
  it("accepts VCF files", () => {
    const file = new File(["BEGIN:VCARD\nEND:VCARD"], "contacts.vcf", {
      type: "text/vcard",
    });

    expect(isValidContactFile(file)).toEqual({ valid: true });
  });
});
