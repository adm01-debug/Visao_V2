import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Carousel Integration", () => {
  it("should render carousel", async () => {
    const Carousel = await import("../ui/carousel");
    
    const { container } = render(
      <Carousel.Carousel>
        <Carousel.CarouselContent>
          <Carousel.CarouselItem>Item 1</Carousel.CarouselItem>
        </Carousel.CarouselContent>
      </Carousel.Carousel>
    );

    expect(container).toBeTruthy();
  });
});

