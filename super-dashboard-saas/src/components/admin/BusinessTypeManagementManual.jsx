import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import styles from './BusinessTypeManagementManual.module.css';

const BusinessTypeManagementManual = ({ dynamicStyles = {} }) => {
  const [isManualVisible, setIsManualVisible] = useState(false);

  const toggleManual = () => {
    setIsManualVisible(!isManualVisible);
  };

  return (
    <div className={styles.container}>
      <div 
        className={styles.header} 
        onClick={toggleManual}
        style={dynamicStyles.header}
      >
        <h2 className={styles.title}>Business Type Management - User Manual</h2>
        <button onClick={toggleManual} className={styles.toggleButton}>
          {isManualVisible ? (
            <ChevronUpIcon className={styles.toggleIcon} aria-hidden="true" />
          ) : (
            <ChevronDownIcon className={styles.toggleIcon} aria-hidden="true" />
          )}
        </button>
      </div>

      {isManualVisible && (
        <div className={styles.content}>
          <p className={styles.paragraph}>
            Welcome to the Business Type Management section! Here, you can define and manage different business types
            for your products. Business types are used to configure comparison logic and recommendation templates,
            allowing for tailored experiences for different categories of products (e.g., Retail, Real Estate, etc.).
          </p>

          <h3 
            className={styles.sectionTitle}
            style={dynamicStyles.sectionTitle}
          >
            Overview of the Business Type Management Interface
          </h3>

          <p className={styles.paragraph}>
            The Business Type Management interface is divided into:
          </p>

          <ul className={styles.list}>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Business Type List:</strong> Displays a table of currently configured business types.</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Business Type Forms (Add & Edit):</strong> Forms to create new business types or modify existing ones. These forms appear in the right-hand panel.</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Product Management Area:</strong>  Located below the Business Type Management section, this area dynamically shows the product list for a selected business type and allows adding new products under that type.</li>
          </ul>

          <h3 
            className={styles.sectionTitle}
            style={dynamicStyles.sectionTitle}
          >
            1. Business Type List
          </h3>

          <p className={styles.paragraph}>
            The Business Type List provides an overview of all configured business types.
          </p>

          <table className={styles.table}>
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell}>Column</th>
                <th className={styles.tableHeaderCell}>Description</th>
                <th className={styles.tableHeaderCell}>Function</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.tableRow}>
                <td className={styles.tableCellHighlight}>Category</td>
                <td className={styles.tableCell}>The unique identifier for the business type (e.g., 'retail', 'realestate'). This is also used to categorize products.</td>
                <td className={styles.tableCell}>Identifies and categorizes business types.</td>
              </tr>
              <tr className={styles.tableRow}>
                <td className={styles.tableCellHighlight}>Actions</td>
                <td className={styles.tableCell}>Provides 'Edit' and 'Delete' buttons to manage business type configurations.</td>
                <td className={styles.tableCell}>Allows modifying or removing business types.</td>
              </tr>
              <tr>
                <td className={styles.tableCellHighlight}>View Products</td>
                <td className={styles.tableCell}>A button to view all products associated with the selected business type.</td>
                <td className={styles.tableCell}>Navigates to the product list, filtered by business type.</td>
              </tr>
            </tbody>
          </table>

          <h3 
            className={styles.sectionTitle}
            style={dynamicStyles.sectionTitle}
          >
            2. Business Type Forms (Add & Edit)
          </h3>
          <p className={styles.paragraph}>
            The Business Type Forms are used to create new business types or edit existing ones. These forms contain the following fields:
          </p>

          <ul className={styles.list}>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Category:</strong> (Required, unique identifier)  A unique name or identifier for the business type (e.g., 'electronics', 'clothing'). Must be unique and cannot be changed after creation.</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Key Features:</strong> (Optional, comma-separated)  List key features relevant to products of this business type. These are used for product comparison and recommendations (e.g., 'display_technology, screen_size, resolution').</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Comparison Metrics:</strong> (Optional, comma-separated) Define metrics used to compare products of this business type (e.g., 'price_difference, feature_similarity').</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Recommendation Template:</strong> (Optional) Customize the template used to generate product recommendations for this business type. Use placeholders to dynamically insert product features and comparison results.</li>
          </ul>

          <h3 
            className={styles.sectionTitle}
            style={dynamicStyles.sectionTitle}
          >
            How to Use Business Type Management Effectively
          </h3>
          <p className={styles.paragraph}>
            Here are some tips for effectively managing Business Types:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Start with core business types:</strong> Define the main business categories relevant to your product catalog first.</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Define key features carefully:</strong> Key features drive product comparison and recommendations. Choose features that are most important for users when comparing products within each business type.</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Customize recommendation templates:</strong> Tailor the recommendation templates to be specific and helpful for each business type. Use placeholders to make recommendations dynamic and informative.</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Review and update regularly:</strong> As your product catalog evolves, review and update your business type configurations to ensure they remain relevant and accurate.</li>
          </ul>

          <h3 
            className={styles.sectionTitle}
            style={dynamicStyles.sectionTitle}
          >
            What Not to Do
          </h3>
          <ul className={styles.list}>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Don't create too many business types initially:</strong> Start with a manageable number of core business types and expand as needed.</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Avoid vague categories:</strong> Business type categories should be specific enough to group similar products effectively (e.g., 'electronics' is better than 'products').</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Don't neglect Recommendation Templates:</strong> Customizing recommendation templates can significantly enhance the user experience and provide more relevant product suggestions.</li>
            <li className={styles.listItem}><strong className={styles.strongText} style={dynamicStyles.strongText}>Don't forget to test:</strong> After setting up or modifying business types, test the product comparison and recommendation features to ensure they are working correctly for each type.</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default BusinessTypeManagementManual;