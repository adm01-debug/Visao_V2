import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("Table Integration", () => {
  it("should render table", async () => {
    const Table = await import("../ui/table");
    
    const { container } = render(
      <Table.Table>
        <Table.TableHeader>
          <Table.TableRow>
            <Table.TableHead>Name</Table.TableHead>
          </Table.TableRow>
        </Table.TableHeader>
        <Table.TableBody>
          <Table.TableRow>
            <Table.TableCell>John</Table.TableCell>
          </Table.TableRow>
        </Table.TableBody>
      </Table.Table>
    );

    expect(container.querySelector("table")).toBeTruthy();
  });
});

