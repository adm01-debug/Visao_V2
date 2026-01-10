import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Card Integration", () => {
  it("should render card with content", async () => {
    const Card = await import("../ui/card");
    
    const { container } = render(
      <Card.Card>
        <Card.CardHeader>
          <Card.CardTitle>Title</Card.CardTitle>
          <Card.CardDescription>Description</Card.CardDescription>
        </Card.CardHeader>
        <Card.CardContent>Content</Card.CardContent>
        <Card.CardFooter>Footer</Card.CardFooter>
      </Card.Card>
    );

    expect(container).toBeTruthy();
  });
});

