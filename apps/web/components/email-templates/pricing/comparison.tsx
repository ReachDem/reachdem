import {
  Html,
  Head,
  Body,
  Preview,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
} from "@react-email/components";

interface PricingPlan {
  title: string;
  price: number;
  highlighted: boolean;
  description: string;
  features: string[];
  buttonText: string;
  buttonUrl: string;
}

interface ComparisonPricingProps {
  title?: string;
  description?: string;
  plans?: PricingPlan[];
  footer?: string;
}

export function ComparisonPricing({
  title = "Choose the right plan for you",
  description = "Choose an affordable plan with top features to engage audiences, build loyalty, and boost sales.",
  plans = [
    {
      title: "Hobby",
      price: 29,
      highlighted: false,
      description: "The perfect plan for getting started.",
      features: [
        "25 products",
        "Up to 10,000 subscribers",
        "Advanced analytics",
        "24-hour support response time",
      ],
      buttonText: "Get started today",
      buttonUrl: "#",
    },
    {
      title: "Enterprise",
      price: 99,
      highlighted: true,
      description: "Dedicated support and enterprise ready.",
      features: [
        "Unlimited products",
        "Unlimited subscribers",
        "Advanced analytics",
        "Dedicated support representative",
        "Marketing automations",
        "Custom integrations",
      ],
      buttonText: "Get started today",
      buttonUrl: "#",
    },
  ],
  footer = "Customer Experience Research Team",
}: ComparisonPricingProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Preview>{title}</Preview>
        <Container className="mx-auto max-w-[600px] rounded-[8px] bg-white p-[24px]">
          <Section className="mb-[42px]">
            <Heading className="mb-[12px] text-center text-[24px] leading-[32px]">
              {title}
            </Heading>
            <Text className="mx-auto max-w-[500px] text-center text-[14px] leading-[20px] text-gray-500">
              {description}
            </Text>
          </Section>
          <Section className="flex items-start justify-center gap-[20px] pb-[24px]">
            {plans.map((plan) => (
              <Section
                key={plan.title}
                className={`${
                  plan.highlighted
                    ? "mb-[12px] border-[rgb(16,24,40)] bg-[rgb(16,24,40)] text-gray-300"
                    : "mb-[24px] border-gray-300 bg-white text-gray-600"
                } w-full rounded-[8px] border border-solid p-[24px] text-left`}
              >
                <Text
                  className={`${
                    plan.highlighted
                      ? "text-[rgb(124,134,255)]"
                      : "text-[rgb(79,70,229)]"
                  } mb-[16px] text-[14px] leading-[20px] font-semibold`}
                >
                  {plan.title}
                </Text>
                <Text className="mt-0 mb-[8px] text-[28px] font-bold">
                  <span
                    className={`${
                      plan.highlighted ? "text-white" : "text-[rgb(16,24,40)]"
                    }`}
                  >
                    ${plan.price}
                  </span>{" "}
                  <span className="text-[14px] leading-[20px]">/ month</span>
                </Text>
                <Text className="mt-[12px] mb-[24px]">{plan.description}</Text>
                <ul className="mb-[30px] pl-[14px] text-[12px] leading-[20px]">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="mb-[8px]">
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  href={plan.buttonUrl}
                  className="m-0 box-border inline-block w-full max-w-full rounded-[8px] bg-indigo-600 p-[12px] text-center font-semibold text-white"
                >
                  {plan.buttonText}
                </Button>
              </Section>
            ))}
          </Section>
          <Hr className="mt-0" />
          <Text className="mt-[30px] text-center text-[12px] leading-[16px] font-medium text-gray-500">
            {footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const comparisonPricingMetadata = {
  name: "Comparison Pricing",
  description: "Side-by-side pricing plans comparison",
  category: "pricing",
  preview: "https://react.email/static/braun-collection.jpg",
};
