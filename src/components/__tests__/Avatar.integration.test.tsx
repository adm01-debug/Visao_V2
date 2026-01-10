import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Avatar Integration", () => {
  it("should render avatar", async () => {
    const Avatar = await import("../ui/avatar");
    
    const { container } = render(
      <Avatar.Avatar>
        <Avatar.AvatarImage src="https://test.com/avatar.png" />
        <Avatar.AvatarFallback>JD</Avatar.AvatarFallback>
      </Avatar.Avatar>
    );

    expect(container).toBeTruthy();
  });
});

