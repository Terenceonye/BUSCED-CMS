import { CrudPage } from "./crud-page";
import { truncate } from "@/lib/utils";

interface Faculty {
  _id: string;
  name: string;
  description?: string;
}

export default function FacultiesPage() {
  return (
    <CrudPage<Faculty>
      title="Faculties"
      description="Schools and faculties that departments belong to."
      endpoint="/api/v1/schools"
      singular="Faculty"
      fields={[
        {
          name: "name",
          label: "Name",
          type: "text",
          required: true,
          placeholder: "e.g. School of Engineering",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "A short description of this faculty",
        },
      ]}
      columns={[
        {
          header: "Name",
          cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
        },
        {
          header: "Description",
          className: "hidden md:table-cell",
          cell: (row) => (
            <span className="text-sm text-muted-foreground">
              {row.description ? truncate(row.description, 90) : "-"}
            </span>
          ),
        },
      ]}
    />
  );
}
