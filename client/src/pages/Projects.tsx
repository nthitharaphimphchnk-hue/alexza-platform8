import { Button } from "@/components/ui/button";

/**
 * ALEXZA AI Projects Page
 * Design: Monochrome metallic theme
 * - List and manage all projects
 * - Create project modal with validation + toast
 * - Delete project confirmation dialog + toast
 */
import { Plus, Search, MoreHorizontal, Folder, Clock, Users, AlertCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";
import { useForm } from "@/hooks/useForm";
import { validateProjectForm, getFieldError, hasFieldError } from "@/lib/validation";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { showSuccessToast, showProjectCreatedToast, showProjectDeletedToast } from "@/lib/toast";

/**
 * ALEXZA AI Projects Page
 * Design: Monochrome metallic theme
 * - List and manage all projects
 * - Create project modal with validation
 * - Delete project confirmation dialog
 */

interface ProjectFormData {
  name: string;
  description: string;
  model: string;
}

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const mockProjects = [
    {
      id: 1,
      name: "Customer Support Bot",
      description: "AI-powered customer support automation",
      status: "Active",
      members: 3,
      created: "2 weeks ago",
      credits: "1,250/month",
    },
    {
      id: 2,
      name: "Content Generator",
      description: "Automated content creation pipeline",
      status: "Active",
      members: 2,
      created: "1 month ago",
      credits: "850/month",
    },
    {
      id: 3,
      name: "Data Analyzer",
      description: "Real-time data analysis and insights",
      status: "Paused",
      members: 4,
      created: "3 weeks ago",
      credits: "0/month",
    },
    {
      id: 4,
      name: "Email Classifier",
      description: "Intelligent email categorization",
      status: "Active",
      members: 1,
      created: "5 days ago",
      credits: "320/month",
    },
  ];

  const filteredProjects = mockProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedProject = mockProjects.find((p) => p.id === selectedProjectId);

    const form = useForm<ProjectFormData>({
      initialValues: {
        name: "",
        description: "",
        model: "GPT-4",
      },
      validate: validateProjectForm,
      onSubmit: async (values) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));
        showProjectCreatedToast(values.name);
        setShowCreateModal(false);
        form.reset();
      },
    });

  const handleDeleteProject = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (selectedProject) {
      showProjectDeletedToast(selectedProject.name);
    }
    setShowDeleteConfirm(false);
    setSelectedProjectId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <motion.div
          className="max-w-7xl mx-auto flex justify-between items-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="text-gray-400 mt-2">Manage all your AI projects</p>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold flex items-center gap-2"
            >
              <Plus size={18} /> New Project
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-8">
        <motion.div
          className="max-w-7xl mx-auto space-y-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Search */}
          <motion.div className="relative" variants={itemVariants}>
            <Search size={18} className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition"
            />
          </motion.div>

          {/* Projects Grid */}
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                className="p-6 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all cursor-pointer group"
                variants={staggerItemVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-[#c0c0c0]/10">
                      <Folder size={20} className="text-[#c0c0c0]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-[#c0c0c0] transition">
                        {project.name}
                      </h3>
                      <p className="text-xs text-gray-500">{project.status}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>

                <p className="text-sm text-gray-400 mb-4">{project.description}</p>

                <div className="space-y-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users size={14} />
                      {project.members} members
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock size={14} />
                      {project.created}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Monthly usage</span>
                    <span className="text-sm font-semibold text-[#c0c0c0]">{project.credits}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {filteredProjects.length === 0 && (
            <motion.div className="text-center py-12" variants={itemVariants}>
              <p className="text-gray-400">No projects found</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Create Project Modal */}
      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Create Project"
        description="Start building your next AI solution"
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={form.isSubmitting}
              className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={form.isSubmitting}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => form.handleSubmit(e as any)}
            >
              {form.isSubmitting ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={form.handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Project Name</label>
            <input
              type="text"
              name="name"
              value={form.values.name}
              onChange={form.handleChange}
              placeholder="My AI Project"
              disabled={form.isSubmitting}
              className={`w-full px-4 py-3 rounded-lg bg-[#050607] border transition text-white placeholder-gray-600 focus:outline-none ${
                hasFieldError(form.errors, "name")
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.12)]"
              } disabled:opacity-50`}
            />
            {hasFieldError(form.errors, "name") && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs text-red-500">{getFieldError(form.errors, "name")}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Description (Optional)</label>
            <textarea
              name="description"
              value={form.values.description}
              onChange={form.handleChange}
              placeholder="What is this project for?"
              disabled={form.isSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition resize-none h-20 disabled:opacity-50"
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">AI Model</label>
            <select
              name="model"
              value={form.values.model}
              onChange={form.handleChange}
              disabled={form.isSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.06)] text-white focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition disabled:opacity-50"
            >
              <option>GPT-4</option>
              <option>GPT-3.5</option>
              <option>Claude 3</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Project Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Project"
        description={`Are you sure you want to delete "${selectedProject?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}
