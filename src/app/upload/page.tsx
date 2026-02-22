"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  X,
  Download,
  Edit3,
  Sparkles,
  Zap,
  Calendar,
  Users,
  DollarSign,
  Target,
  Send,
  Bot,
  User,
  Wand2,
} from "lucide-react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "parsing" | "done"
  >("idle");
  const [parsedData, setParsedData] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isProcessingPrompt, setIsProcessingPrompt] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{ type: string; message: string }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    if (
      selectedFile.type &&
      !selectedFile.type.startsWith("application/") &&
      !selectedFile.type.includes("pdf") &&
      !selectedFile.type.includes("document") &&
      !selectedFile.type.includes("text")
    ) {
      alert("Please upload a valid document file (PDF, DOC, DOCX, TXT)");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");

    setTimeout(() => {
      setStatus("parsing");
      setTimeout(() => {
        const initialData = {
          project: "E-Commerce Platform Redesign",
          budget: "$45,000",
          deadline: "2025-11-30",
          startDate: "2025-09-15",
          team: [
            {
              name: "John Smith",
              role: "Backend Developer",
              hours: 120,
              allocation: "60%",
            },
            {
              name: "Sarah Chen",
              role: "UI/UX Designer",
              hours: 80,
              allocation: "40%",
            },
            {
              name: "Mike Johnson",
              role: "Frontend Developer",
              hours: 100,
              allocation: "50%",
            },
          ],
          requirements: [
            "User authentication system",
            "Product catalog with search",
            "Shopping cart functionality",
            "Payment integration",
            "Order management dashboard",
          ],
          milestones: [
            { name: "Design Phase", deadline: "2025-10-15", progress: 0 },
            {
              name: "Development Sprint 1",
              deadline: "2025-10-30",
              progress: 0,
            },
            {
              name: "Development Sprint 2",
              deadline: "2025-11-15",
              progress: 0,
            },
            { name: "Testing & QA", deadline: "2025-11-25", progress: 0 },
          ],
          risks: [
            "Payment gateway integration complexity",
            "Mobile responsiveness requirements",
          ],
        };
        setParsedData(initialData);
        setStatus("done");

        setChatHistory([
          {
            type: "ai",
            message:
              "I've analyzed your project document! I can help you adjust timelines, reallocate resources, or modify requirements. What would you like to change?",
          },
        ]);
      }, 3000);
    }, 2000);
  };

  const handleAiPrompt = async () => {
    if (!aiPrompt.trim() || isProcessingPrompt) return;

    const userMessage = { type: "user", message: aiPrompt };
    setChatHistory((prev) => [...prev, userMessage]);
    setAiPrompt("");
    setIsProcessingPrompt(true);

    setTimeout(() => {
      
      let aiResponse = "";
      let updatedData = { ...parsedData };

      if (
        aiPrompt.toLowerCase().includes("budget") ||
        aiPrompt.toLowerCase().includes("cost")
      ) {
        updatedData.budget = "$52,000";
        aiResponse =
          "I've updated the budget to $52,000 to account for additional security features mentioned in your request.";
      } else if (
        aiPrompt.toLowerCase().includes("timeline") ||
        aiPrompt.toLowerCase().includes("deadline")
      ) {
        updatedData.deadline = "2025-12-15";
        aiResponse =
          "I've extended the deadline to December 15, 2025 to accommodate the additional testing phase.";
      } else if (
        aiPrompt.toLowerCase().includes("team") ||
        aiPrompt.toLowerCase().includes("resource")
      ) {
        updatedData.team.push({
          name: "Alex Rivera",
          role: "QA Engineer",
          hours: 60,
          allocation: "30%",
        });
        aiResponse =
          "I've added a QA engineer to the team to improve testing coverage. The budget has been adjusted accordingly.";
      } else if (
        aiPrompt.toLowerCase().includes("requirement") ||
        aiPrompt.toLowerCase().includes("feature")
      ) {
        updatedData.requirements.push("Advanced analytics dashboard");
        aiResponse =
          "I've added 'Advanced analytics dashboard' to the requirements. This will provide better insights into user behavior.";
      } else {
        aiResponse =
          "I've made adjustments based on your request. The project plan has been updated to reflect these changes.";
      }

      setParsedData(updatedData);
      setChatHistory((prev) => [...prev, { type: "ai", message: aiResponse }]);
      setIsProcessingPrompt(false);
    }, 2000);
  };

  const removeFile = () => {
    setFile(null);
    setStatus("idle");
    setParsedData(null);
    setChatHistory([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmProject = () => {
    alert("Project created successfully with all your customizations!");
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.includes(".pdf")) return "📄";
    if (fileName.includes(".doc")) return "📝";
    if (fileName.includes(".txt")) return "📃";
    return "📎";
  };

  const suggestedPrompts = [
    "Increase the budget by 15%",
    "Add a QA engineer to the team",
    "Extend the deadline by 2 weeks",
    "Add analytics dashboard requirement",
    "Reduce frontend development hours",
  ];

  return (
    <div className="pt-24 px-6 min-h-screen bg-[var(--color-primary)] text-white">
      <div className="max-w-6xl mx-auto">
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4 border border-white/20">
            <Sparkles size={16} className="text-[var(--color-accent)]" />
            <span className="text-sm font-medium">
              AI-Powered Document Parsing
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Upload Project Document
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Let APO automatically extract project details, requirements, and
            timelines from your documents
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`relative bg-[var(--color-surface)] border-2 border-dashed ${
            isDragging
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
              : "border-white/20"
          } p-8 lg:p-12 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 mb-8`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[var(--color-accent)] to-blue-600 rounded-2xl mb-6 shadow-lg">
              <Upload size={32} className="text-white" />
            </div>

            <h3 className="text-xl font-semibold mb-3">
              {file ? "Document Ready" : "Upload Project Document"}
            </h3>

            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {file
                ? "Click upload to extract project details with AI"
                : "Drag & drop your project document or click to browse. Supports PDF, DOC, DOCX, TXT (max 10MB)"}
            </p>

            {!file ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary mb-4"
                >
                  Browse Files
                </motion.button>
                <p className="text-sm text-gray-500">
                  or drag and drop your file here
                </p>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 rounded-xl p-4 border border-white/10 max-w-md mx-auto"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(file.name)}</span>
                    <div className="text-left">
                      <p className="font-medium text-sm truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {file && status === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center mb-8"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUpload}
                className="btn btn-primary flex items-center gap-3 mx-auto text-lg px-8 py-4"
              >
                <Zap size={20} />
                Upload & Parse with AI
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {status !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      status === "uploading"
                        ? "bg-blue-500/20 text-blue-400"
                        : status === "parsing"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {status === "uploading" && (
                      <Loader2 size={24} className="animate-spin" />
                    )}
                    {status === "parsing" && (
                      <FileText size={24} className="animate-pulse" />
                    )}
                    {status === "done" && <CheckCircle size={24} />}
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {status === "uploading" && "Uploading document..."}
                      {status === "parsing" &&
                        "AI is analyzing your document..."}
                      {status === "done" && "Analysis complete!"}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {status === "uploading" &&
                        "Preparing your document for AI analysis"}
                      {status === "parsing" &&
                        "Extracting project details, timelines, and requirements"}
                      {status === "done" &&
                        "All project elements have been identified"}
                    </p>
                  </div>
                </div>

                {status === "parsing" && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[var(--color-accent)]">
                      87%
                    </div>
                    <div className="text-gray-400 text-sm">AI Confidence</div>
                  </div>
                )}
              </div>

              {(status === "uploading" || status === "parsing") && (
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{
                        width: status === "uploading" ? "50%" : "100%",
                      }}
                      transition={{ duration: status === "uploading" ? 2 : 3 }}
                      className="h-2 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-blue-600"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {parsedData && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[var(--color-surface)] rounded-2xl shadow-lg border border-white/10 overflow-hidden backdrop-blur-sm mb-8"
              >
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        Project Overview
                      </h2>
                      <p className="text-gray-400">
                        AI-extracted project details from your document
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <Edit3 size={20} />
                      </button>
                      <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <Download size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <Target
                        className="text-[var(--color-accent)] mb-2"
                        size={20}
                      />
                      <h3 className="font-semibold mb-1">Project</h3>
                      <p className="text-gray-300">{parsedData.project}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <DollarSign className="text-green-400 mb-2" size={20} />
                      <h3 className="font-semibold mb-1">Budget</h3>
                      <p className="text-gray-300">{parsedData.budget}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <Calendar className="text-blue-400 mb-2" size={20} />
                      <h3 className="font-semibold mb-1">Deadline</h3>
                      <p className="text-gray-300">{parsedData.deadline}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <Users className="text-purple-400 mb-2" size={20} />
                      <h3 className="font-semibold mb-1">Team Size</h3>
                      <p className="text-gray-300">
                        {parsedData.team.length} members
                      </p>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-8">
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileText size={20} />
                        Key Requirements
                      </h3>
                      <div className="space-y-2">
                        {parsedData.requirements.map(
                          (req: string, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                            >
                              <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full"></div>
                              <span className="text-gray-300">{req}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users size={20} />
                        Team Allocation
                      </h3>
                      <div className="space-y-3">
                        {parsedData.team.map((member: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                          >
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-gray-400 text-sm">
                                {member.role}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {member.hours}h ({member.allocation})
                              </p>
                              <p className="text-gray-400 text-xs">allocated</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-[var(--color-surface)] rounded-2xl shadow-lg border border-white/10 overflow-hidden backdrop-blur-sm"
              >
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-[var(--color-accent)] to-purple-600 rounded-xl flex items-center justify-center">
                      <Bot size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        AI Project Assistant
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Make changes or ask questions about your project
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 max-h-96 overflow-y-auto">
                  <div className="space-y-4">
                    {chatHistory.map((chat, index) => (
                      <motion.div
                        key={index}
                        initial={{
                          opacity: 0,
                          x: chat.type === "user" ? 20 : -20,
                        }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex gap-3 ${
                          chat.type === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {chat.type === "ai" && (
                          <div className="w-8 h-8 bg-gradient-to-r from-[var(--color-accent)] to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot size={16} className="text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-4 rounded-2xl ${
                            chat.type === "user"
                              ? "bg-[var(--color-accent)] text-white rounded-br-none"
                              : "bg-white/5 border border-white/10 rounded-bl-none"
                          }`}
                        >
                          <p className="text-sm">{chat.message}</p>
                        </div>
                        {chat.type === "user" && (
                          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={16} className="text-gray-400" />
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {isProcessingPrompt && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-3 justify-start"
                      >
                        <div className="w-8 h-8 bg-gradient-to-r from-[var(--color-accent)] to-purple-600 rounded-full flex items-center justify-center">
                          <Bot size={16} className="text-white" />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-none p-4">
                          <div className="flex items-center gap-2">
                            <Loader2
                              size={16}
                              className="animate-spin text-[var(--color-accent)]"
                            />
                            <p className="text-sm text-gray-300">
                              AI is processing your request...
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {chatHistory.length === 1 && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-gray-400 mb-3">Try asking:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedPrompts.map((prompt, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setAiPrompt(prompt)}
                          className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-2 transition-colors"
                        >
                          {prompt}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-6 border-t border-white/10">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleAiPrompt()
                        }
                        placeholder="Ask to modify budget, timeline, team, or requirements..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                        disabled={isProcessingPrompt}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAiPrompt}
                        disabled={!aiPrompt.trim() || isProcessingPrompt}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isProcessingPrompt ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4 justify-end mt-6"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={removeFile}
                  className="btn btn-outline flex items-center gap-2"
                >
                  <X size={18} />
                  Upload Different File
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={confirmProject}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Wand2 size={18} />
                  Create Project with Changes
                </motion.button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
