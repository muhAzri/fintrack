import { Card, Skeleton, SkeletonText, Stack } from "@chakra-ui/react";

export default function SettingsLoading() {
  return (
    <Stack gap={8}>
      <Stack gap={2}>
        <Skeleton h="8" w="52" />
        <Skeleton h="4" w="64" />
      </Stack>

      <Card.Root variant="outline">
        <Card.Body>
          <SkeletonText noOfLines={4} />
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}
