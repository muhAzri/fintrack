import { Card, SimpleGrid, Skeleton, SkeletonText, Stack } from "@chakra-ui/react";

export default function DashboardLoading() {
  return (
    <Stack gap={8}>
      <Stack gap={2}>
        <Skeleton h="8" w="48" />
        <Skeleton h="4" w="72" />
      </Stack>

      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
        <Card.Root variant="elevated">
          <Card.Body>
            <SkeletonText noOfLines={2} />
          </Card.Body>
        </Card.Root>
        <Card.Root variant="elevated">
          <Card.Body>
            <SkeletonText noOfLines={2} />
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      <Card.Root variant="outline">
        <Card.Body>
          <SkeletonText noOfLines={2} />
        </Card.Body>
      </Card.Root>

      <Stack gap={3}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card.Root key={index} variant="outline">
            <Card.Body>
              <SkeletonText noOfLines={2} />
            </Card.Body>
          </Card.Root>
        ))}
      </Stack>
    </Stack>
  );
}
