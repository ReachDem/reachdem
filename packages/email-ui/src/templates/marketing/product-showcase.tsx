import {
  Html,
  Head,
  Body,
  Preview,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Link,
  Img,
} from "@react-email/components";

interface ProductShowcaseProps {
  title?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  heroImage?: string;
  products?: Array<{
    imageUrl: string;
    altText: string;
    title: string;
    description: string;
    linkUrl: string;
  }>;
}

export function ProductShowcase({
  title = "Coffee Storage",
  description = "Keep your coffee fresher for longer with innovative technology.",
  ctaText = "Shop now →",
  ctaUrl = "#",
  heroImage = "https://react.email/static/coffee-bean-storage.jpg",
  products = [
    {
      imageUrl: "/static/atmos-vacuum-canister.jpg",
      altText: "Auto-Sealing Vacuum Canister",
      title: "Auto-Sealing Vacuum Canister",
      description:
        "A container that automatically creates an airtight seal with a button press.",
      linkUrl: "#",
    },
    {
      imageUrl: "/static/vacuum-canister-clear-glass-bundle.jpg",
      altText: "3-Pack Vacuum Containers",
      title: "3-Pack Vacuum Containers",
      description:
        "Keep your coffee fresher for longer with this set of high-performance vacuum containers.",
      linkUrl: "#",
    },
  ],
}: ProductShowcaseProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Preview>{title}</Preview>
        <Container className="mx-auto max-w-[900px] overflow-hidden rounded-[8px] bg-white p-0">
          <Section>
            <Row className="m-0 w-full table-fixed border-separate [border-spacing:24px] bg-[rgb(41,37,36)]">
              <Column className="pl-[12px]">
                <Heading
                  as="h1"
                  className="mb-[10px] text-[28px] font-bold text-white"
                >
                  {title}
                </Heading>
                <Text className="m-0 text-[14px] leading-[20px] text-white/60">
                  {description}
                </Text>
                <Link
                  href={ctaUrl}
                  className="mt-[12px] block text-[14px] leading-[20px] font-semibold text-white/80 no-underline"
                >
                  {ctaText}
                </Link>
              </Column>
              <Column className="h-[250px] w-[42%]">
                <Img
                  src={heroImage}
                  alt={title}
                  className="-mr-[6px] h-full w-full rounded-[4px] object-cover object-center"
                />
              </Column>
            </Row>
          </Section>
          <Section className="mb-[24px]">
            <Row className="w-full table-fixed border-separate [border-spacing:12px]">
              {products.map((product) => (
                <Column key={product.title} className="mx-auto max-w-[180px]">
                  <Img
                    src={product.imageUrl}
                    alt={product.altText}
                    className="mb-[18px] w-full rounded-[4px]"
                  />
                  <div>
                    <Heading
                      as="h2"
                      className="mb-[8px] text-[14px] leading-[20px] font-bold"
                    >
                      {product.title}
                    </Heading>
                    <Text className="m-0 pr-[12px] text-[12px] leading-[20px] text-gray-500">
                      {product.description}
                    </Text>
                  </div>
                </Column>
              ))}
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const productShowcaseMetadata = {
  name: "Product Showcase",
  description: "Hero section with featured products grid",
  category: "marketing",
  preview: "https://react.email/static/coffee-bean-storage.jpg",
};
