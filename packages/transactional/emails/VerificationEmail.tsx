import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  Hr,
} from "@react-email/components";

interface ReachDemEmailOTPProps {
  otp: string;
  name: string;
}

export const VerificationEmail = ({ otp, name }: ReachDemEmailOTPProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your ReachDem email address</Preview>
      <Tailwind>
        <Body className="bg-white font-sans text-[#333]">
          <Container className="mx-auto px-3 max-w-[600px]">
            <Section className="py-5">
              {/* Optional: Add Logo if available
              <Img
                src={`${baseUrl}/static/reachdem-logo.png`}
                width="45"
                height="45"
                alt="ReachDem Logo"
              /> */}
            </Section>

            <Heading className="text-[#333] text-[24px] mt-8 mb-6 mx-0 p-0 font-bold">
              Verify your email address
            </Heading>

            <Text className="text-[#333] text-[14px] leading-[24px] my-6">
              Hi {name},<br />
              <br />
              Thanks for starting the new ReachDem account creation process. We
              want to make sure it's really you. Please enter the following
              verification code when prompted.
            </Text>

            <Section className="my-8">
              <Text className="text-[#333] text-[14px] mb-3">
                Your temporary verification code is:
              </Text>
              <code className="inline-block py-4 px-6 bg-[#f4f4f4] rounded-md border border-solid border-[#eee] text-[#333] text-[36px] font-bold tracking-[0.2em]">
                {otp}
              </code>
              <Text className="text-[#ababab] text-[14px] mt-3">
                (This code is valid for 10 minutes)
              </Text>
            </Section>

            <Text className="text-[#ababab] text-[14px] mt-8 mb-6">
              If you didn't try to register, you can safely ignore this email.
            </Text>

            <Hr className="border-[#eee] my-6" />

            <Section className="py-6">
              <Text className="text-[#898989] text-[12px] leading-[22px] m-0">
                ReachDem will never email you and ask you to disclose or verify
                your password, credit card, or banking account number.
              </Text>
              <Text className="text-[#898989] text-[12px] leading-[22px] mt-4 mb-0">
                This message was produced and distributed by ReachDem. ©{" "}
                {new Date().getFullYear()} ReachDem. All rights reserved. View
                our{" "}
                <Link
                  href="https://reachdem.com"
                  target="_blank"
                  className="text-[#2754C5] underline"
                >
                  privacy policy
                </Link>
                .
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

VerificationEmail.PreviewProps = {
  otp: "596853",
  name: "John Doe",
} as ReachDemEmailOTPProps;

export default VerificationEmail;
