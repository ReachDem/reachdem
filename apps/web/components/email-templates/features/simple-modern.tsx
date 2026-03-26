import { Section, Row, Text, Hr, Column, Img } from "@react-email/components";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface SimpleModernFeaturesProps {
  title?: string;
  description?: string;
  features?: Feature[];
}

export function SimpleModernFeatures({
  title = "Functional Style",
  description = "Combine practicality and style effortlessly with our furniture, offering functional designs that enhance your living space.",
  features = [
    {
      icon: "https://react.email/static/heart-icon.png",
      title: "Versatile Comfort",
      description:
        "Experience ultimate comfort and versatility with our furniture collection, designed to adapt to your ever-changing needs.",
    },
    {
      icon: "https://react.email/static/rocket-icon.png",
      title: "Luxurious Retreat",
      description:
        "Transform your space into a haven of relaxation with our indulgent furniture collection.",
    },
  ],
}: SimpleModernFeaturesProps) {
  return (
    <Section className="my-[16px]">
      <Section>
        <Row>
          <Text className="m-0 text-[24px] leading-[32px] font-semibold text-gray-900">
            {title}
          </Text>
          <Text className="mt-[8px] text-[16px] leading-[24px] text-gray-500">
            {description}
          </Text>
        </Row>
      </Section>
      <Section>
        {features.map((feature, index) => (
          <div key={index}>
            <Hr className="mx-0 my-[32px] w-full border border-solid !border-gray-300" />
            <Section>
              <Row>
                <Column className="align-baseline">
                  <Img
                    alt={`${feature.title} icon`}
                    height="48"
                    src={feature.icon}
                    width="48"
                  />
                </Column>
                <Column className="w-[85%]">
                  <Text className="m-0 text-[20px] leading-[28px] font-semibold text-gray-900">
                    {feature.title}
                  </Text>
                  <Text className="m-0 mt-[8px] text-[16px] leading-[24px] text-gray-500">
                    {feature.description}
                  </Text>
                </Column>
              </Row>
            </Section>
          </div>
        ))}
        <Hr className="mx-0 my-[32px] w-full border border-solid !border-gray-300" />
      </Section>
    </Section>
  );
}

export const simpleModernFeaturesMetadata = {
  name: "Simple Modern Features",
  description: "Clean feature list with icons and dividers",
  category: "features",
  preview: "https://react.email/static/heart-icon.png",
};
