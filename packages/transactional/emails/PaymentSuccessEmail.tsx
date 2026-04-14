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
  Button,
  Hr,
  Link,
} from "@react-email/components";

interface PaymentSuccessEmailProps {
  name: string;
  amountFormatted: string;
  baseUrl: string;
}

export const PaymentSuccessEmail = ({
  name,
  amountFormatted,
  baseUrl,
}: PaymentSuccessEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your ReachDem payment was successful!</Preview>
      <Tailwind>
        <Body className="bg-[#f9f9f9] font-sans text-[#1b1b1b]">
          <Container className="mx-auto max-w-[600px] px-8 py-16 text-center">
            <Heading className="mx-0 mt-8 mb-6 p-0 text-4xl font-bold tracking-tight text-[#1b1b1b]">
              Payment Successful
            </Heading>

            <Text className="my-6 text-lg leading-relaxed text-[#5e5e5e]">
              Hello {name}, your payment of {amountFormatted} has been processed
              successfully. You can now continue sending multi-channel messages
              with Reachdem.
            </Text>

            <Section className="my-8 flex justify-center">
              <Button
                href={`${baseUrl}/campaign/new`}
                className="rounded-md border-0 bg-[#ff751f] px-8 py-4 text-base font-semibold tracking-wide text-white no-underline shadow-sm transition-opacity hover:opacity-90"
              >
                Create your campaign
              </Button>
            </Section>

            <Text className="mt-8 mb-6 text-sm text-[#ababab]">
              A copy of your invoice is attached to this email. You can also
              view it from your billing dashboard.
            </Text>

            <Hr className="my-10 border-[#e2e2e2]" />

            <Section className="py-6">
              <Text className="m-0 text-xs leading-relaxed font-semibold tracking-widest text-[#c6c6c6] uppercase">
                © {new Date().getFullYear()} REACHDEM TEAM
              </Text>
              <Text className="mt-4 mb-0 text-xs leading-relaxed font-medium tracking-wide text-[#c6c6c6]">
                <Link
                  href={`${baseUrl}/support`}
                  className="mr-4 text-[#a0a0a0] no-underline hover:text-[#333]"
                >
                  Support
                </Link>
                <Link
                  href={`${baseUrl}/privacy`}
                  className="mr-4 text-[#a0a0a0] no-underline hover:text-[#333]"
                >
                  Privacy
                </Link>
                <Link
                  href={`${baseUrl}/terms`}
                  className="text-[#a0a0a0] no-underline hover:text-[#333]"
                >
                  Terms
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

PaymentSuccessEmail.PreviewProps = {
  name: "John Doe",
  amountFormatted: "25,000 XAF",
  baseUrl: "https://reachdem.com",
} as PaymentSuccessEmailProps;

export default PaymentSuccessEmail;
