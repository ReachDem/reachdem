import { describe, expect, it } from "vitest";
import { personalizeTemplate } from "./message-personalization";

describe("personalizeTemplate", () => {
  const contact = {
    name: "Stephane Kamwa",
    email: "stephane@example.com",
    phoneE164: "+237699875974",
    enterprise: "ReachDem",
    customFields: {
      city: "Douala",
    },
  };

  it("replaces common contact variables", () => {
    expect(personalizeTemplate("Bonjour {{contact.name}}", contact)).toBe(
      "Bonjour Stephane Kamwa"
    );

    expect(personalizeTemplate("Salut {{contact.firstName}}", contact)).toBe(
      "Salut Stephane"
    );

    expect(
      personalizeTemplate("Entreprise: {{contact.company}}", contact)
    ).toBe("Entreprise: ReachDem");
  });

  it("supports legacy aliases and custom fields", () => {
    expect(personalizeTemplate("Hi {{firstName}}", contact)).toBe(
      "Hi Stephane"
    );

    expect(personalizeTemplate("Ville: {{contact.city}}", contact)).toBe(
      "Ville: Douala"
    );
  });

  it("escapes HTML replacements in html mode", () => {
    expect(
      personalizeTemplate(
        "<p>{{contact.name}}</p>",
        {
          ...contact,
          name: "Stephane <b>Kamwa</b>",
        },
        { html: true }
      )
    ).toBe("<p>Stephane &lt;b&gt;Kamwa&lt;/b&gt;</p>");
  });

  it("leaves unknown variables untouched", () => {
    expect(personalizeTemplate("{{contact.unknown}}", contact)).toBe(
      "{{contact.unknown}}"
    );
  });
});
