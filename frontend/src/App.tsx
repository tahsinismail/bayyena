// src/App.tsx
import { Button, Flex, Text } from "@radix-ui/themes"

function App() {
  return (
    <Flex direction="column" gap="2" align="center" justify="center" className="min-h-screen">
      <Text size="8" weight="bold">LegalCaseBuilder</Text>
      <Text>Frontend is running successfully!</Text>
      <Button mt="4" size="3">
        Get Started
      </Button>
    </Flex>
  )
}

export default App
