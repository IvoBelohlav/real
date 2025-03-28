import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  GlobeAltIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import api from "../../utils/api";
import styles from "./ShopInfoManager.module.css";

const ShopInfoManager = () => {
  const queryClient = useQueryClient();
  const [currentLanguage, setCurrentLanguage] = useState("cs");
  const [languages, setLanguages] = useState(["cs"]);
  const [activeTab, setActiveTab] = useState("general");

  // Initialize formData with default empty values
  const [formData, setFormData] = useState({
    shop_name: "",
    legal_name: "",
    tagline: "",
    description_short: "",
    description_long: "",
    primary_email: "",
    support_email: "",
    sales_email: "",
    primary_phone: "",
    support_phone: "",
    sales_phone: "",
    website: "",
    founded_year: "",
    business_type: "",
    services: [],
    payment_methods: [],
    shipping_policy: "",
    return_policy: "",
    warranty_info: "",
    ai_prompt_summary: "",
    ai_faq_facts: [],
    ai_voice_style: "",
  });

  const [newService, setNewService] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [newFact, setNewFact] = useState("");

  // Fetch available languages
  const { data: languagesData } = useQuery({
    queryKey: ["shopInfoLanguages"],
    queryFn: async () => {
      const response = await api.get("/api/shop-info/languages");
      return response.data;
    },
    onSuccess: (data) => {
      setLanguages(data.length > 0 ? data : ["cs"]);
    },
    onError: (error) => {
      console.error("Failed to fetch languages", error);
      toast.error("Failed to load available languages");
    },
  });

  // Fetch shop info for the current language
  const {
    data: shopInfo,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["shopInfo", currentLanguage],
    queryFn: async () => {
      const response = await api.get(`/api/shop-info?language=${currentLanguage}`);
      return response.data;
    },
    onError: (error) => {
      console.error("Failed to fetch shop info", error);
      toast.error("Failed to load shop information");
    },
  });

  // Sync formData with shopInfo whenever it changes
  useEffect(() => {
    if (shopInfo) {
      setFormData({
        ...shopInfo,
        services: shopInfo.services || [],
        payment_methods: shopInfo.payment_methods || [],
        ai_faq_facts: shopInfo.ai_faq_facts || [],
      });
    }
  }, [shopInfo]);

  // Update shop info mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put("/api/shop-info", data, {
        params: { language: currentLanguage },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Shop information updated successfully");
      queryClient.invalidateQueries(["shopInfo", currentLanguage]);
    },
    onError: (error) => {
      console.error("Failed to update shop info", error);
      toast.error("Failed to update shop information");
    },
  });

  // Reset shop info mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/shop-info/reset?language=${currentLanguage}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Shop information reset to default values");
      queryClient.invalidateQueries(["shopInfo", currentLanguage]);
    },
    onError: (error) => {
      console.error("Failed to reset shop info", error);
      toast.error("Failed to reset shop information");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const emailRegex = /@/;
    if (formData.primary_email && !emailRegex.test(formData.primary_email)) {
      toast.error("Primary email must contain '@'.");
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? "" : parseInt(value, 10),
    }));
  };

  const handleLanguageChange = (e) => {
    setCurrentLanguage(e.target.value);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset to default values? This cannot be undone.")) {
      resetMutation.mutate();
    }
  };

  const handleAddService = () => {
    if (newService.trim()) {
      setFormData((prev) => ({
        ...prev,
        services: [...prev.services, newService.trim()],
      }));
      setNewService("");
    }
  };

  const handleRemoveService = (index) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  const handleAddPaymentMethod = () => {
    if (newPaymentMethod.trim()) {
      setFormData((prev) => ({
        ...prev,
        payment_methods: [...prev.payment_methods, newPaymentMethod.trim()],
      }));
      setNewPaymentMethod("");
    }
  };

  const handleRemovePaymentMethod = (index) => {
    setFormData((prev) => ({
      ...prev,
      payment_methods: prev.payment_methods.filter((_, i) => i !== index),
    }));
  };

  const handleAddFact = () => {
    if (newFact.trim()) {
      setFormData((prev) => ({
        ...prev,
        ai_faq_facts: [...prev.ai_faq_facts, newFact.trim()],
      }));
      setNewFact("");
    }
  };

  const handleRemoveFact = (index) => {
    setFormData((prev) => ({
      ...prev,
      ai_faq_facts: prev.ai_faq_facts.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <ExclamationCircleIcon className={styles.errorIcon} width={20} height={20} />
        <p className={styles.errorMessage}>
          Error loading shop information. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Shop Information Manager</h1>
      <p className={styles.description}>
        Manage your shop's details, contact information, policies, and AI-related settings.
        This information will be used across your website and for customer interactions.
      </p>
      
      <div className={styles.formContainer}>
        <div className={styles.languageSelector}>
          <label className={styles.languageLabel}>
            <GlobeAltIcon className={styles.languageIcon} width={20} height={20} />
            Language:
          </label>
          <select
            value={currentLanguage}
            onChange={handleLanguageChange}
            className={styles.languageSelect}
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
          <a 
            href={`/api/shop-info/export?language=${currentLanguage}`} 
            download={`shop-info-${currentLanguage}.csv`} 
            className={styles.resetButton}
            style={{ marginLeft: "auto" }}
          >
            <ArrowPathIcon width={16} height={16} className={styles.buttonIcon} />
            Export as CSV
          </a>
        </div>

        <div className={styles.tabContainer}>
          <div 
            className={activeTab === "general" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("general")}
          >
            General Information
          </div>
          <div 
            className={activeTab === "contact" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("contact")}
          >
            Contact & Services
          </div>
          <div 
            className={activeTab === "policies" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("policies")}
          >
            Policies
          </div>
          <div 
            className={activeTab === "ai" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("ai")}
          >
            AI Content
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === "general" && (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>General Information</h2>
              
              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label className={`${styles.label} ${styles.required}`}>
                    Shop Name
                  </label>
                  <input
                    type="text"
                    name="shop_name"
                    value={formData.shop_name || ""}
                    onChange={handleInputChange}
                    required
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.field}>
                  <label className={styles.label}>
                    Legal Name
                  </label>
                  <input
                    type="text"
                    name="legal_name"
                    value={formData.legal_name || ""}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Tagline
                </label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline || ""}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Short Description
                </label>
                <textarea
                  name="description_short"
                  value={formData.description_short || ""}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows={2}
                  maxLength={500}
                />
                <div style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "right", marginTop: "0.25rem" }}>
                  {(formData.description_short || "").length}/500 characters
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Detailed Description
                </label>
                <textarea
                  name="description_long"
                  value={formData.description_long || ""}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows={5}
                  maxLength={5000}
                />
                <div style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "right", marginTop: "0.25rem" }}>
                  {(formData.description_long || "").length}/5000 characters
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website || ""}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className={styles.field}>
                  <label className={styles.label}>
                    Founded Year
                  </label>
                  <input
                    type="number"
                    name="founded_year"
                    value={formData.founded_year || ""}
                    onChange={handleNumberChange}
                    className={styles.input}
                    placeholder="2023"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
                
                <div className={styles.field}>
                  <label className={styles.label}>
                    Business Type
                  </label>
                  <input
                    type="text"
                    name="business_type"
                    value={formData.business_type || ""}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="E-commerce Store, Digital Agency, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "contact" && (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Contact Information</h2>
              
              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label className={`${styles.label} ${styles.required}`}>
                    Primary Email
                  </label>
                  <input
                    type="email"
                    name="primary_email"
                    value={formData.primary_email || ""}
                    onChange={handleInputChange}
                    required
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.field}>
                  <label className={`${styles.label} ${styles.required}`}>
                    Primary Phone
                  </label>
                  <input
                    type="text"
                    name="primary_phone"
                    value={formData.primary_phone || ""}
                    onChange={handleInputChange}
                    required
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Support Email
                  </label>
                  <input
                    type="email"
                    name="support_email"
                    value={formData.support_email || ""}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.field}>
                  <label className={styles.label}>
                    Support Phone
                  </label>
                  <input
                    type="text"
                    name="support_phone"
                    value={formData.support_phone || ""}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Sales Email
                  </label>
                  <input
                    type="email"
                    name="sales_email"
                    value={formData.sales_email || ""}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.field}>
                  <label className={styles.label}>
                    Sales Phone
                  </label>
                  <input
                    type="text"
                    name="sales_phone"
                    value={formData.sales_phone || ""}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
              </div>

              <h3 className={styles.sectionTitle}>Services Offered</h3>
              <div className={styles.listContainer}>
                {formData.services.length > 0 ? (
                  formData.services.map((service, index) => (
                    <div key={index} className={styles.listItem}>
                      <span>{service}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(index)}
                        className={styles.removeButton}
                      >
                        <TrashIcon width={16} height={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "0.5rem", color: "#6b7280" }}>No services added yet.</div>
                )}
                
                <div className={styles.addItemContainer}>
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    placeholder="Add a service..."
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={handleAddService}
                    className={styles.addButton}
                  >
                    <PlusIcon width={16} height={16} className={styles.buttonIcon} />
                    Add
                  </button>
                </div>
              </div>

              <h3 className={styles.sectionTitle}>Payment Methods</h3>
              <div className={styles.listContainer}>
                {formData.payment_methods.length > 0 ? (
                  formData.payment_methods.map((method, index) => (
                    <div key={index} className={styles.listItem}>
                      <span>{method}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentMethod(index)}
                        className={styles.removeButton}
                      >
                        <TrashIcon width={16} height={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "0.5rem", color: "#6b7280" }}>No payment methods added yet.</div>
                )}
                
                <div className={styles.addItemContainer}>
                  <input
                    type="text"
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    placeholder="Add a payment method..."
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={handleAddPaymentMethod}
                    className={styles.addButton}
                  >
                    <PlusIcon width={16} height={16} className={styles.buttonIcon} />
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "policies" && (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Business Policies</h2>
              
              <div className={styles.field}>
                <label className={styles.label}>
                  Shipping Policy
                </label>
                <textarea
                  name="shipping_policy"
                  value={formData.shipping_policy || ""}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows={4}
                />
              </div>
              
              <div className={styles.field}>
                <label className={styles.label}>
                  Return Policy
                </label>
                <textarea
                  name="return_policy"
                  value={formData.return_policy || ""}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows={4}
                />
              </div>
              
              <div className={styles.field}>
                <label className={styles.label}>
                  Warranty Information
                </label>
                <textarea
                  name="warranty_info"
                  value={formData.warranty_info || ""}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows={4}
                />
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>AI Content Settings</h2>
              
              <div className={styles.field}>
                <label className={styles.label}>
                  AI Voice Style
                </label>
                <select
                  name="ai_voice_style"
                  value={formData.ai_voice_style || ""}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="">Select a voice style...</option>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="witty">Witty</option>
                </select>
              </div>
              
              <div className={styles.field}>
                <label className={styles.label}>
                  AI Prompt Summary
                </label>
                <textarea
                  name="ai_prompt_summary"
                  value={formData.ai_prompt_summary || ""}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows={4}
                  placeholder="Provide a summary of your business for the AI to use when introducing your company..."
                />
              </div>

              <h3 className={styles.sectionTitle}>FAQ Facts</h3>
              <p style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#4b5563" }}>
                Add key facts about your business that the AI can use when answering customer questions.
              </p>
              
              <div className={styles.listContainer}>
                {formData.ai_faq_facts.length > 0 ? (
                  formData.ai_faq_facts.map((fact, index) => (
                    <div key={index} className={styles.listItem}>
                      <span>{fact}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFact(index)}
                        className={styles.removeButton}
                      >
                        <TrashIcon width={16} height={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "0.5rem", color: "#6b7280" }}>No facts added yet.</div>
                )}
                
                <div className={styles.addItemContainer}>
                  <input
                    type="text"
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="Add a fact about your business..."
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={handleAddFact}
                    className={styles.addButton}
                  >
                    <PlusIcon width={16} height={16} className={styles.buttonIcon} />
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleReset}
              className={styles.resetButton}
            >
              <ArrowPathIcon width={16} height={16} className={styles.buttonIcon} />
              Reset to Default
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={updateMutation.isLoading}
            >
              {updateMutation.isLoading ? (
                <>
                  <svg className={styles.buttonIcon} width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="30 30">
                      <animateTransform 
                        attributeName="transform" 
                        attributeType="XML" 
                        type="rotate"
                        dur="1s" 
                        from="0 12 12"
                        to="360 12 12" 
                        repeatCount="indefinite" 
                      />
                    </circle>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon width={16} height={16} className={styles.buttonIcon} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShopInfoManager;