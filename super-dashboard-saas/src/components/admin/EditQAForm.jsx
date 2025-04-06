import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import { toast } from "react-toastify";

const EditQAForm = ({ onClose, qaId }) => {
  const queryClient = useQueryClient();

  const { data: qaItem, isLoading } = useQuery({
    queryKey: ["qa", qaId],
    queryFn: async () => {
      if (!qaId) return null;
      const response = await api.get(`/api/qa/${qaId}`);
      return response.data;
    },
    enabled: !!qaId,
  });

  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    keywords: "",
    category: "",
    language: "cs",
    show_in_widget: false,
    widget_order: "",
    intent: "",
    intent_keywords: "",
    confidence_threshold: 0.7,
  });

  useEffect(() => {
    if (qaItem) {
      setFormData({
        question: qaItem.question || "",
        answer: qaItem.answer || "",
        keywords: Array.isArray(qaItem.keywords)
          ? qaItem.keywords.join(", ")
          : "",
        category: qaItem.category || "",
        language: "cs",
        show_in_widget: qaItem.show_in_widget || false,
        widget_order:
          qaItem.widget_order !== null ? qaItem.widget_order.toString() : "",
        intent: qaItem.intent || "",
        intent_keywords: Array.isArray(qaItem.intent_keywords)
          ? qaItem.intent_keywords.join(", ")
          : "",
        confidence_threshold: qaItem.confidence_threshold || 0.7,
      });
    }
  }, [qaItem]);

  const updateQAMutation = useMutation({
    mutationFn: (updatedQA) => {
      return api.put(`/api/qa/${qaId}`, updatedQA);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa"] });
      onClose();
      toast.success("QA item updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update QA item: ${error.message}`);
    },
  });

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.id]: value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const updatedQA = {
      ...formData,
      keywords: formData.keywords.split(",").map((k) => k.trim()).filter(k => k),
      intent_keywords: formData.intent_keywords
        .split(",")
        .map((ik) => ik.trim())
        .filter((ik) => ik),
      language: "cs",
      show_in_widget: formData.show_in_widget,
      widget_order: formData.widget_order
        ? parseInt(formData.widget_order, 10)
        : null,
      confidence_threshold: parseFloat(formData.confidence_threshold),
    };
    updateQAMutation.mutate(updatedQA);
  };

  if (isLoading) return <div className="p-4 text-center">Loading QA item...</div>;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-lg shadow-md" // Form container styling - same as AddQAForm
    >
      <div className="mb-4"> {/* Margin bottom for spacing */}
        <label
          className="block text-sm font-medium text-gray-700" // Label styling - same as AddQAForm
          htmlFor="question"
        >
          Question
        </label>
        <input
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Input field styling - same as AddQAForm
          id="question"
          type="text"
          placeholder="Question"
          value={formData.question}
          onChange={handleChange}
        />
      </div>

      <div className="mb-4"> {/* Margin bottom for spacing */}
        <label
          className="block text-sm font-medium text-gray-700" // Label styling - same as AddQAForm
          htmlFor="answer"
        >
          Answer
        </label>
        <textarea
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Textarea styling - same as AddQAForm
          id="answer"
          placeholder="Answer"
          value={formData.answer}
          onChange={handleChange}
          rows="4"
        />
      </div>

      <div className="mb-4"> {/* Margin bottom for spacing */}
        <label
          className="block text-sm font-medium text-gray-700" // Label styling - same as AddQAForm
          htmlFor="keywords"
        >
          Keywords (comma-separated)
        </label>
        <input
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Input field styling - same as AddQAForm
          id="keywords"
          type="text"
          placeholder="Keyword 1, Keyword 2, ..."
          value={formData.keywords}
          onChange={handleChange}
        />
      </div>

      <div className="mb-4"> {/* Margin bottom for spacing */}
        <label
          className="block text-sm font-medium text-gray-700" // Label styling - same as AddQAForm
          htmlFor="category"
        >
          Category
        </label>
        <input
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Input field styling - same as AddQAForm
          id="category"
          type="text"
          placeholder="Category"
          value={formData.category}
          onChange={handleChange}
        />
      </div>

      <div className="mb-4"> {/* Margin bottom for spacing */}
        <label
          className="block text-sm font-medium text-gray-700" // Label styling - same as AddQAForm
          htmlFor="show_in_widget"
        >
          Show in Widget
        </label>
        <input
          type="checkbox"
          id="show_in_widget"
          checked={formData.show_in_widget}
          onChange={handleChange}
          className="mt-1" // Margin top for spacing
        />
      </div>

      <div className="mb-4"> {/* Margin bottom for spacing */}
        <label
          className="block text-sm font-medium text-gray-700" // Label styling - same as AddQAForm
          htmlFor="widget_order"
        >
          Widget Order (lower number = higher priority)
        </label>
        <input
          type="number"
          id="widget_order"
          value={formData.widget_order}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Input field styling - same as AddQAForm
          placeholder="Widget Order"
        />
      </div>

      <div className="mb-4"> {/* Margin bottom for spacing */}
        <label
          className="block text-sm font-medium text-gray-700" // Label styling - same as AddQAForm
          htmlFor="intent"
        >
          Intent
        </label>
        <input
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Input field styling - same as AddQAForm
          id="intent"
          type="text"
          placeholder="Intent"
          value={formData.intent}
          onChange={handleChange}
        />
      </div>

      <div className="mb-4"> {/* Margin bottom for spacing */}
        <label
          className="block text-sm font-medium text-gray-700" // Label styling - same as AddQAForm
          htmlFor="intent_keywords"
        >
          Intent Keywords (comma-separated)
        </label>
        <input
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Input field styling - same as AddQAForm
          id="intent_keywords"
          type="text"
          placeholder="Intent Keyword 1, Intent Keyword 2, ..."
          value={formData.intent_keywords}
          onChange={handleChange}
        />
      </div>

      <div className="mb-4"> {/* Margin bottom for spacing */}
        <label
          className="block text-sm font-medium text-gray-700" // Label styling - same as AddQAForm
          htmlFor="confidence_threshold"
        >
          Confidence Threshold
        </label>
        <input
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Input field styling - same as AddQAForm
          id="confidence_threshold"
          type="number"
          step="0.01"
          min="0"
          max="1"
          placeholder="0.7"
          value={formData.confidence_threshold}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end space-x-4 mt-4"> {/* Button container styling - same as AddQAForm */}
        <button
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition-colors" // Cancel button styling - same as AddQAForm
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors" // Update QA button styling - same as AddQAForm
          type="submit"
          disabled={updateQAMutation.isPending}
        >
          {updateQAMutation.isPending ? "Updating..." : "Update QA"}
        </button>
      </div>
    </form>
  );
};

export default EditQAForm;