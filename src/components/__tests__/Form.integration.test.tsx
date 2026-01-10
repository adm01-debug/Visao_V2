import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { useForm } from "react-hook-form";

describe("Form Integration", () => {
  it("should render form", async () => {
    const Form = await import("../ui/form");
    
    const TestForm = () => {
      const form = useForm();
      return (
        <Form.Form {...form}>
          <form>
            <Form.FormField
              control={form.control}
              name="test"
              render={({ field }) => (
                <Form.FormItem>
                  <Form.FormLabel>Test</Form.FormLabel>
                  <Form.FormControl>
                    <input {...field} />
                  </Form.FormControl>
                </Form.FormItem>
              )}
            />
          </form>
        </Form.Form>
      );
    };

    const { container } = render(<TestForm />);
    expect(container).toBeTruthy();
  });
});

