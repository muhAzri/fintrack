import { Card, SimpleGrid, Skeleton, SkeletonText, Stack } from "@chakra-ui/react";

export default function AnalyticsLoading() {
  return (
    <Stack gap={8}>
      <Stack gap={2}>
        <Skeleton h="8" w="56" />
        <Skeleton h="4" w="full" maxW="lg" />
        <Skeleton h="8" w="40" mt={2} />
      </Stack>

      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card.Root key={index} variant="elevated">
            <Card.Body>
              <SkeletonText noOfLines={2} />
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>

      <Card.Root variant="outline">
        <Card.Body>
          <Skeleton h="48" />
        </Card.Body>
      </Card.Root>

      <Card.Root variant="outline">
        <Card.Body>
          <Skeleton h="48" />
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}
