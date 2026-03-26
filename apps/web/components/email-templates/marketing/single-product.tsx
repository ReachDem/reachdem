import { Section, Img, Text, Heading, Button } from "@react-email/components";

interface SingleProductProps {
  category?: string;
  title?: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  imageAlt?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export function SingleProduct({
  category = "Classic Watches",
  title = "Elegant Comfort",
  description = "Dieter Rams' work has an outstanding quality which distinguishes it from the vast majority of industrial design of the entire 20th Century.",
  price = "$210.00",
  imageUrl = "https://react.email/static/braun-collection.jpg",
  imageAlt = "Braun Collection",
  ctaText = "Buy now",
  ctaUrl = "https://react.email",
}: SingleProductProps) {
  return (
    <Section className="my-[16px]">
      <Img
        alt={imageAlt}
        className="w-full rounded-[12px] object-cover"
        height={320}
        src={imageUrl}
      />
      <Section className="mt-[32px] text-center">
        <Text className="mt-[16px] text-[18px] leading-[28px] font-semibold text-indigo-600">
          {category}
        </Text>
        <Heading
          as="h1"
          className="text-[36px] leading-[40px] font-semibold tracking-[0.4px] text-gray-900"
        >
          {title}
        </Heading>
        <Text className="mt-[8px] text-[16px] leading-[24px] text-gray-500">
          {description}
        </Text>
        <Text className="text-[16px] leading-[24px] font-semibold text-gray-900">
          {price}
        </Text>
        <Button
          className="mt-[16px] rounded-[8px] bg-indigo-600 px-[24px] py-[12px] font-semibold text-white"
          href={ctaUrl}
        >
          {ctaText}
        </Button>
      </Section>
    </Section>
  );
}

export const singleProductMetadata = {
  name: "Single Product",
  description: "Centered product showcase with image and CTA",
  category: "marketing",
  preview: "https://react.email/static/braun-collection.jpg",
};
