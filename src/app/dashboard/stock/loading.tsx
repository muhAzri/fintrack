import { Card, Skeleton, SkeletonText, Stack } from "@chakra-ui/react";

export default function StockLoading() {
  return (
    <Stack gap={8}>
      <Stack gap={2}>
        <Skeleton h="8" w="40" />
        <Skeleton h="4" w="full" maxW="lg" />
      </Stack>

      <Stack gap={4}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card.Root key={index} variant="outline">
            <Card.Body>
              <SkeletonText noOfLines={2} />
            </Card.Body>
          </Card.Root>
        ))}
      </Stack>

      <Stack gap={3}>
        <Skeleton h="6" w="56" />
        <Card.Root variant="outline">
          <Card.Body>
            <SkeletonText noOfLines={4} />
          </Card.Body>
        </Card.Root>
      </Stack>
    </Stack>
  );
}
