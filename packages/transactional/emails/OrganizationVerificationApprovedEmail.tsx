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

interface OrganizationVerificationApprovedEmailProps {
  organizationName: string;
}

export function OrganizationVerificationApprovedEmail({
  organizationName,
}: OrganizationVerificationApprovedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your organization has been verified</Preview>
      <Tailwind>
        <Body className="bg-white font-sans text-[#1f2937]">
          <Container className="mx-auto max-w-[600px] px-3 py-8">
            <Section className="rounded-2xl border border-[#e5e7eb] px-8 py-10">
              <Text className="m-0 text-[12px] font-semibold tracking-[0.2em] text-[#ff751f] uppercase">
                ReachDem
              </Text>
              <Heading className="mt-6 mb-4 text-[24px] font-bold text-[#111827]">
                Your organization is verified
              </Heading>
              <Text className="m-0 text-[14px] leading-[24px] text-[#374151]">
                Good news. Your organization <strong>{organizationName}</strong>{" "}
                has been approved and is now verified on ReachDem.
              </Text>
              <Text className="mt-4 mb-0 text-[14px] leading-[24px] text-[#374151]">
                You can continue with your setup and use your approved sender ID
                flow without staying in test mode.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

OrganizationVerificationApprovedEmail.PreviewProps = {
  organizationName: "Acme Inc",
} satisfies OrganizationVerificationApprovedEmailProps;
