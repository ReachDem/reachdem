import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface OrganizationVerificationRejectedEmailProps {
  organizationName: string;
  reason: string;
}

export function OrganizationVerificationRejectedEmail({
  organizationName,
  reason,
}: OrganizationVerificationRejectedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your organization verification needs updates</Preview>
      <Tailwind>
        <Body className="bg-white font-sans text-[#1f2937]">
          <Container className="mx-auto max-w-[600px] px-3 py-8">
            <Section className="rounded-2xl border border-[#e5e7eb] px-8 py-10">
              <Text className="m-0 text-[12px] font-semibold tracking-[0.2em] text-[#ff751f] uppercase">
                ReachDem
              </Text>
              <Heading className="mt-6 mb-4 text-[24px] font-bold text-[#111827]">
                Your verification needs an update
              </Heading>
              <Text className="m-0 text-[14px] leading-[24px] text-[#374151]">
                We reviewed the verification submission for{" "}
                <strong>{organizationName}</strong>, but we cannot approve it in
                its current form.
              </Text>
              <Text className="mt-4 mb-2 text-[14px] font-semibold text-[#111827]">
                Reason
              </Text>
              <Section className="rounded-xl bg-[#f9fafb] px-4 py-3">
                <Text className="m-0 text-[14px] leading-[24px] whitespace-pre-wrap text-[#374151]">
                  {reason}
                </Text>
              </Section>
              <Text className="mt-4 mb-0 text-[14px] leading-[24px] text-[#374151]">
                Please update your submission and send the requested documents
                again from your workspace settings.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

OrganizationVerificationRejectedEmail.PreviewProps = {
  organizationName: "Acme Inc",
  reason:
    "Please upload a clearer government-issued ID and a valid business document.",
} satisfies OrganizationVerificationRejectedEmailProps;
