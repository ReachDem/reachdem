import { Section, Row, Text, Column, Img } from "@react-email/components";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface ThreeColumnFeaturesProps {
  title?: string;
  description?: string;
  features?: Feature[];
}

export function ThreeColumnFeatures({
  title = "Modern Comfort",
  description = "Experience contemporary bliss with our sleek and cozy furniture collection, designed for optimal comfort and style",
  features = [
    {
      icon: "https://react.email/static/heart-icon.png",
      title: "Timeless Charm",
      description:
        "Classic designs that never go out of style. Experience enduring elegance",
    },
    {
      icon: "https://react.email/static/rocket-icon.png",
      title: "Functional Beauty",
      description:
        "Seamlessly blending form and function. Furniture that enhances your everyday life.",
    },
    {
      icon: "https://react.email/static/megaphone-icon.png",
      title: "Endless Comfort",
      description:
        "Sink into pure relaxation. Discover furniture that embraces your well-being.",
    },
  ],
}: ThreeColumnFeaturesProps) {
  return (
    <Section className="my-[16px]">
      <Row>
        <Text className="m-0 text-[24px] leading-[32px] font-semibold text-gray-900">
          {title}
        </Text>
        <Text className="mt-[8px] text-[16px] leading-[24px] text-gray-500">
          {description}
        </Text>
      </Row>
      <Row className="mt-[16px]">
        {features.map((feature, index) => (
          <Column
            key={index}
            align="center"
            className={`w-1/3 align-baseline ${index > 0 ? "pl-[12px]" : index < features.length - 1 ? "pr-[12px]" : ""}`}
          >
            <Img
              alt={`${feature.title} icon`}
              height="48"
              src={feature.icon}
              width="48"
            />
            <Text className="m-0 mt-[16px] text-[20px] leading-[28px] font-semibold text-gray-900">
              {feature.title}
            </Text>
            <Text className="mt-[8px] mb-0 text-[16px] leading-[24px] text-gray-500">
              {feature.description}
            </Text>
          </Column>
        ))}
      </Row>
    </Section>
  );
}

export const threeColumnFeaturesMetadata = {
  name: "Three Column Features",
  description: "Feature grid with centered icons and text",
  category: "features",
  preview: "https://react.email/static/heart-icon.png",
};
