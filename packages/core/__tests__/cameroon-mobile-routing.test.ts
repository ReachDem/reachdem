import { describe, expect, it } from "vitest";
import {
  getCameroonProviderRoute,
  isMTN,
  isOrange,
  isValidMobileCM,
  normalizeNumber,
} from "../src/utils/cameroon-mobile-routing";

describe("cameroon-mobile-routing", () => {
  it("normalizes Cameroon phone numbers", () => {
    expect(normalizeNumber("+237 677-123-456")).toBe("677123456");
  });

  it("validates Cameroon mobile numbers", () => {
    expect(isValidMobileCM("+237677123456")).toBe(true);
    expect(isValidMobileCM("+237233123456")).toBe(false);
  });

  it("detects MTN numbers", () => {
    expect(isMTN("+237677123456")).toBe(true);
    expect(isMTN("+237650123456")).toBe(true);
    expect(isMTN("+237699123456")).toBe(false);
  });

  it("detects Orange numbers", () => {
    expect(isOrange("+237699123456")).toBe(true);
    expect(isOrange("+237655123456")).toBe(true);
    expect(isOrange("+237677123456")).toBe(false);
  });

  it("routes MTN numbers to lmt then mboaSms with the expected senders", () => {
    const route = getCameroonProviderRoute({
      to: "+237677123456",
      from: "AnySender",
      text: "hello",
    });

    expect(route).toEqual([
      {
        provider: "lmt",
        payload: {
          to: "+237677123456",
          from: "ReachDem",
          text: "hello",
        },
      },
      {
        provider: "mboaSms",
        payload: {
          to: "+237677123456",
          from: "infos",
          text: "hello",
        },
      },
    ]);
  });

  it("routes Orange numbers to avlytext then mboaSms", () => {
    const route = getCameroonProviderRoute({
      to: "+237699123456",
      from: "CustomOrangeSender",
      text: "hello",
    });

    expect(route).toEqual([
      {
        provider: "avlytext",
        payload: {
          to: "+237699123456",
          from: "CustomOrangeSender",
          text: "hello",
        },
      },
      {
        provider: "mboaSms",
        payload: {
          to: "+237699123456",
          from: "CustomOrangeSender",
          text: "hello",
        },
      },
    ]);
  });

  it("does not override routing for non-Cameroon numbers", () => {
    expect(
      getCameroonProviderRoute({
        to: "+33612345678",
        from: "ReachDem",
        text: "hello",
      })
    ).toBeNull();
  });
});
