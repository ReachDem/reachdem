import {
  Html,
  Head,
  Body,
  Preview,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

interface SinglePlanPricingProps {
  badge?: string;
  price?: number;
  period?: string;
  description?: string;
  features?: string[];
  ctaText?: string;
  ctaUrl?: string;
  disclaimer?: string;
  subDisclaimer?: string;
}

export function SinglePlanPricing({
  badge = "Exclusive Offer",
  price = 12,
  period = "month",
  description = "We've handcrafted the perfect plan tailored specifically for your needs. Unlock premium features at an unbeatable value.",
  features = [
    "Manage up to 25 premium products",
    "Grow your audience with 10,000 subscribers",
    "Make data-driven decisions with advanced analytics",
    "Priority support with 24-hour response time",
    "Seamless integration with your favorite tools",
  ],
  ctaText = "Claim Your Special Offer",
  ctaUrl = "#",
  disclaimer = "Limited time offer - Upgrade now and save 20%",
  subDisclaimer = "No credit card required. 14-day free trial available.",
}: SinglePlanPricingProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Preview>
          Exclusive Offer Just For You: Unlock Premium Features at ${price}/
          {period}
        </Preview>
        <Container className="mx-auto max-w-[500px] rounded-[12px] bg-white p-[24px]">
          <Section className="mb-0 w-full rounded-[12px] border border-solid border-gray-300 bg-white p-[28px] text-left text-gray-600">
            <Text className="mt-[16px] mb-[16px] text-[12px] leading-[20px] font-semibold tracking-wide text-indigo-600 uppercase">
              {badge}
            </Text>
            <Text className="mt-0 mb-[12px] text-[30px] leading-[36px] font-bold">
              <span className="text-[rgb(16,24,40)]">${price}</span>{" "}
              <span className="text-[16px] leading-[20px] font-medium">
                / {period}
              </span>
            </Text>
            <Text className="mt-[16px] mb-[24px] text-[14px] leading-[20px] text-gray-700">
              {description}
            </Text>
            <ul className="mb-[32px] pl-[14px] text-[14px] leading-[24px] text-gray-500">
              {features.map((feature, index) => (
                <li key={index} className="relative mb-[12px]">
                  <span className="relative">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              href={ctaUrl}
              className="mb-[24px] box-border inline-block w-full max-w-full rounded-[8px] bg-indigo-600 p-[14px] text-center text-[16px] leading-[24px] font-bold tracking-wide text-white"
            >
              {ctaText}
            </Button>
            <Hr />
            <Text className="mt-[24px] mb-[6px] text-center text-[12px] leading-[16px] text-gray-500 italic">
              {disclaimer}
            </Text>
            <Text className="m-0 text-center text-[12px] leading-[16px] text-gray-500">
              {subDisclaimer}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const singlePlanPricingMetadata = {
  name: "Single Plan Pricing",
  description: "Focused pricing card with features list",
  category: "pricing",
  preview: "https://react.email/static/braun-collection.jpg",
};
