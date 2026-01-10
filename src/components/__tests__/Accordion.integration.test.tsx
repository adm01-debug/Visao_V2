import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Accordion Integration", () => {
  it("should render accordion", async () => {
    const Accordion = await import("../ui/accordion");
    
    const { container } = render(
      <Accordion.Accordion type="single" collapsible>
        <Accordion.AccordionItem value="item-1">
          <Accordion.AccordionTrigger>Item 1</Accordion.AccordionTrigger>
          <Accordion.AccordionContent>Content 1</Accordion.AccordionContent>
        </Accordion.AccordionItem>
      </Accordion.Accordion>
    );

    expect(container).toBeTruthy();
  });
});

