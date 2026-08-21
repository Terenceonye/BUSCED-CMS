import { CrudPage } from "./crud-page";
import { formatDate } from "@/lib/utils";

interface ProgramType {
  _id: string;
  programTypeName: string;
  createdAt?: string;
}

export default function ProgramTypesPage() {
  return (
    <CrudPage<ProgramType>
      title="Program Types"
      description="Categories used to group academic programs."
      endpoint="/api/v1/program-types"
      singular="Program type"
      searchKey="programTypeName"
      rowLabel={(row) => row.programTypeName}
      fields={[
        {
          name: "programTypeName",
          label: "Name",
          type: "text",
          required: true,
          placeholder: "e.g. Undergraduate",
          help: "Must be unique.",
        },
      ]}
      columns={[
        {
          header: "Name",
          cell: (row) => (
            <span className="text-sm font-medium">{row.programTypeName}</span>
          ),
        },
        {
          header: "Created",
          className: "hidden sm:table-cell",
          cell: (row) => (
            <span className="text-sm text-muted-foreground">
              {formatDate(row.createdAt)}
            </span>
          ),
        },
      ]}
    />
  );
}
