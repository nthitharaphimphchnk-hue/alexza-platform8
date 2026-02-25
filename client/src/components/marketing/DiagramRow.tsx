import { ArrowRight } from "lucide-react";

const nodes = [
  { id: "client", label: "Client" },
  { id: "api", label: "ALEXZA API" },
  { id: "orchestration", label: "Orchestration" },
  { id: "models", label: "Model Families" },
  { id: "output", label: "Output" },
];

export default function DiagramRow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 py-8 px-4">
      {nodes.map((node, i) => (
        <div key={node.id} className="flex items-center gap-2 md:gap-4">
          <div className="px-4 py-3 rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.1)] text-sm font-medium text-white whitespace-nowrap">
            {node.label}
          </div>
          {i < nodes.length - 1 && (
            <ArrowRight
              size={20}
              className="text-gray-500 flex-shrink-0 hidden sm:block"
            />
          )}
        </div>
      ))}
    </div>
  );
}
