import { CrudPage } from "./crud-page";
import { Badge } from "@/components/ui/badge";
import { truncate } from "@/lib/utils";

interface Department {
  _id: string;
  name: string;
  structure?: string;
  mission?: string;
  researchFocus?: string[];
  faculty?: { _id: string; name: string } | string;
}

export default function DepartmentsPage() {
  return (
    <CrudPage<Department>
      title="Departments"
      description="Departments and the faculty each one belongs to."
      endpoint="/api/departments"
      singular="Department"
      fields={[
        {
          name: "name",
          label: "Name",
          type: "text",
          required: true,
          placeholder: "e.g. Computer Science",
        },
        {
          name: "faculty",
          label: "Faculty",
          type: "select",
          required: true,
          optionsUrl: "/api/schools",
          optionLabel: (o) => o.name,
          placeholder: "Select a faculty",
        },
        {
          name: "structure",
          label: "Structure",
          type: "textarea",
          required: true,
          placeholder: "How the department is organised",
        },
        {
          name: "mission",
          label: "Mission",
          type: "textarea",
          required: true,
          placeholder: "The department mission statement",
        },
        {
          name: "researchFocus",
          label: "Research focus",
          type: "tags",
          required: true,
          placeholder: "Add a focus area and press Enter",
          help: "Press Enter or comma to add each area.",
        },
      ]}
      columns={[
        {
          header: "Name",
          cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
        },
        {
          header: "Faculty",
          className: "hidden sm:table-cell",
          cell: (row) => (
            <span className="text-sm text-muted-foreground">
              {typeof row.faculty === "object" && row.faculty
                ? row.faculty.name
                : "-"}
            </span>
          ),
        },
        {
          header: "Research focus",
          className: "hidden lg:table-cell",
          cell: (row) =>
            row.researchFocus?.length ? (
              <div className="flex flex-wrap gap-1">
                {row.researchFocus.slice(0, 3).map((f) => (
                  <Badge key={f} variant="secondary">
                    {truncate(f, 24)}
                  </Badge>
                ))}
                {row.researchFocus.length > 3 && (
                  <Badge variant="outline">
                    +{row.researchFocus.length - 3}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            ),
        },
      ]}
    />
  );
}
