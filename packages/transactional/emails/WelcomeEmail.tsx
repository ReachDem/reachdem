import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  Link,
} from "@react-email/components";

interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to ReachDem</Preview>
      <Tailwind>
        <Body className="bg-white font-sans text-[#333]">
          <Container className="mx-auto max-w-[600px] px-3">
            <Section className="py-5">
              <Text className="my-6 text-[16px] leading-[24px] text-[#333]">
                Hey {name},
                <br />
                <br />
                It&apos;s Belrick, Founder of ReachDem, I saw you just signed
                up, welcome to the club :&gt;
                <br />
                If you have any questions about getting started, just reply to
                this email. I read EVERY ONE.
                <br />
                <br />
                If you&apos;d like to see how other teams are using Kodo or want
                a quick walkthrough, feel free to book a time here:{" "}
                <Link
                  href="https://cal.com/belrick/reachdem-onboarding"
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  https://cal.com/belrick/reachdem-onboarding
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

WelcomeEmail.PreviewProps = {
  name: "John Doe",
} as WelcomeEmailProps;

export default WelcomeEmail;
