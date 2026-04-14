import {
  Section,
  Heading,
  Text,
  Img,
  Row,
  Column,
  Button,
} from "@react-email/components";

interface CartItem {
  imageUrl: string;
  imageAlt: string;
  name: string;
  quantity: number;
  price: string;
}

interface CartAbandonmentProps {
  title?: string;
  items?: CartItem[];
  ctaText?: string;
  ctaUrl?: string;
}

export function CartAbandonment({
  title = "You left something in your cart",
  items = [
    {
      imageUrl: "https://react.email/static/braun-classic-watch.jpg",
      imageAlt: "Braun Classic Watch",
      name: "Classic Watch",
      quantity: 1,
      price: "$210.00",
    },
    {
      imageUrl: "https://react.email/static/braun-analogue-clock.jpg",
      imageAlt: "Braun Analogue Clock",
      name: "Analogue Clock",
      quantity: 1,
      price: "$40.00",
    },
  ],
  ctaText = "Checkout",
  ctaUrl = "https://react.email",
}: CartAbandonmentProps) {
  return (
    <Section className="py-[16px] text-center">
      <Heading
        as="h1"
        className="mb-0 text-[30px] leading-[36px] font-semibold"
      >
        {title}
      </Heading>
      <Section className="my-[16px] rounded-[8px] border border-solid border-gray-200 p-[16px] pt-0">
        <table className="mb-[16px]" width="100%">
          <thead>
            <tr>
              <th className="border-0 border-b border-solid border-gray-200 py-[8px]">
                &nbsp;
              </th>
              <th
                align="left"
                className="border-0 border-b border-solid border-gray-200 py-[8px] text-gray-500"
                colSpan={6}
              >
                <Text className="font-semibold">Product</Text>
              </th>
              <th
                align="center"
                className="border-0 border-b border-solid border-gray-200 py-[8px] text-gray-500"
              >
                <Text className="font-semibold">Quantity</Text>
              </th>
              <th
                align="center"
                className="border-0 border-b border-solid border-gray-200 py-[8px] text-gray-500"
              >
                <Text className="font-semibold">Price</Text>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="border-0 border-b border-solid border-gray-200 py-[8px]">
                  <Img
                    alt={item.imageAlt}
                    className="rounded-[8px] object-cover"
                    height={110}
                    src={item.imageUrl}
                  />
                </td>
                <td
                  align="left"
                  className="border-0 border-b border-solid border-gray-200 py-[8px]"
                  colSpan={6}
                >
                  <Text>{item.name}</Text>
                </td>
                <td
                  align="center"
                  className="border-0 border-b border-solid border-gray-200 py-[8px]"
                >
                  <Text>{item.quantity}</Text>
                </td>
                <td
                  align="center"
                  className="border-0 border-b border-solid border-gray-200 py-[8px]"
                >
                  <Text>{item.price}</Text>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Row>
          <Column align="center">
            <Button
              className="box-border w-full rounded-[8px] bg-indigo-600 px-[12px] py-[12px] text-center font-semibold text-white"
              href={ctaUrl}
            >
              {ctaText}
            </Button>
          </Column>
        </Row>
      </Section>
    </Section>
  );
}

export const cartAbandonmentMetadata = {
  name: "Cart Abandonment",
  description: "Remind customers of items left in cart",
  category: "marketing",
  preview: "https://react.email/static/braun-classic-watch.jpg",
};
