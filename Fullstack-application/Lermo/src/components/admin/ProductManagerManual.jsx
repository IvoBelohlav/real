import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import styles from './ProductManagerManual.module.css';

const ProductManagerManual = () => {
  const [isManualVisible, setIsManualVisible] = useState(false);

  const toggleManual = () => {
    setIsManualVisible(!isManualVisible);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header} onClick={toggleManual}>
        <h2 className={styles.title}>Product Manager - User Manual</h2>
        <button onClick={toggleManual} className={styles.iconButton}>
          {isManualVisible ? (
            <ChevronUpIcon className={styles.icon} aria-hidden="true" />
          ) : (
            <ChevronDownIcon className={styles.icon} aria-hidden="true" />
          )}
        </button>
      </div>

      {isManualVisible && (
        <div className={styles.content}>
          <p className={styles.paragraph}>
            Welcome to the Product Manager! This section of the admin panel allows you to manage products listed in your system.
            You can add, edit, and delete product entries. Accurate product information is essential for chatbot recommendations and comparisons.
          </p>

          <h3 className={styles.sectionHeading}>Overview of the Product Manager Interface</h3>

          <p className={styles.paragraph}>
            The Product Manager consists of two main parts:
          </p>

          <ul className={styles.list}>
            <li><strong>Product Table:</strong> Displays a list of all your products, categorized by Business Type if filtered.</li>
            <li><strong>Product Forms (Add & Edit):</strong> Used to create new product entries or modify existing ones.</li>
          </ul>

          <h3 className={styles.sectionHeading}>1. The Product Table</h3>

          <p className={styles.paragraph}>
            The Product Table provides a structured view of your product catalog. Each row represents a product.
          </p>

          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeaderCell}>Column</th>
                <th className={styles.tableHeaderCell}>Description</th>
                <th className={styles.tableHeaderCell}>Function</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.tableRow}>
                <td className={styles.tableCellHeading}>Product Name</td>
                <td className={styles.tableCell}>The name of the product as displayed to users and in the admin panel.</td>
                <td className={styles.tableCell}>Identifies each product uniquely.</td>
              </tr>
              <tr className={styles.tableRow}>
                <td className={styles.tableCellHeading}>Category</td>
                <td className={styles.tableCell}>The product category, used for organization and filtering.</td>
                <td className={styles.tableCell}>Categorizes products for management.</td>
              </tr>
              <tr className={styles.tableRow}>
                <td className={styles.tableCellHeading}>Price</td>
                <td className={styles.tableCell}>Displays the monthly price of the product (if available).</td>
                <td className={styles.tableCell}>Shows the product's pricing information.</td>
              </tr>
              <tr>
                <td className={styles.tableCellHeading}>Actions</td>
                <td className={styles.tableCell}>Provides buttons to Edit and Delete product entries.</td>
                <td className={styles.tableCell}>Allows modification or removal of products.</td>
              </tr>
            </tbody>
          </table>

          <h3 className={styles.sectionHeading}>2. Product Forms (Add & Edit)</h3>
          <p className={styles.paragraph}>
            The Product Forms are used to create new product entries and edit existing ones. When you click "Add Product" or "Edit" on a product, a form will appear with the following fields:
          </p>

          <ul className={styles.list}>
            <li><strong>Product Name:</strong> (Required) The official name of the product.</li>
            <li><strong>Description:</strong> (Required) A detailed description of the product, highlighting its features and benefits.</li>
            <li><strong>Features:</strong> (Optional) Key features of the product, listed comma-separated.</li>
            <li><strong>Pricing:</strong> (Optional) Pricing details including One-Time Price, Monthly Price, Annual Price, and Currency. Fill in applicable fields.</li>
            <li><strong>Category:</strong> (Required) Choose a relevant category for the product.</li>
            <li><strong>Business Type:</strong> (Pre-selected) Displays the Business Type, which is set when adding products from the Business Type Management section. This field is read-only here.</li>
            <li><strong>Target Audience:</strong> (Optional) Specify the target audience, comma-separated (e.g., Small Business, Enterprise).</li>
            <li><strong>Keywords:</strong> (Optional) Keywords to improve product searchability, comma-separated (e.g., software, productivity, CRM).</li>
            <li><strong>URL:</strong> (Optional) Link to the official product page or more information.</li>
            <li><strong>Product Image:</strong> (Optional) Upload an image for the product to be used in listings or recommendations.</li>
            <li><strong>Admin Priority:</strong> (Optional, Number 0-10) Set a priority for product recommendations. Higher numbers mean higher priority.</li>
          </ul>

          <h3 className={styles.sectionHeading}>How to Use the Product Manager Effectively</h3>
          <p className={styles.paragraph}>
            Here are some tips for using the Product Manager effectively:
          </p>
          <ul className={styles.list}>
            <li><strong>Complete all required fields:</strong> Ensure Product Name, Description, and Category are always filled.</li>
            <li><strong>Provide detailed descriptions:</strong>  A good description helps the chatbot understand the product better and provide relevant recommendations.</li>
            <li><strong>Use relevant keywords:</strong> Keywords are crucial for searchability and accurate product matching.</li>
            <li><strong>Keep pricing updated:</strong> Regularly update pricing information to ensure accuracy.</li>
            <li><strong>Utilize Admin Priority:</strong> Use Admin Priority to promote specific products in recommendations.</li>
          </ul>

          <h3 className={styles.sectionHeading}>What Not to Do</h3>
          <ul className={styles.list}>
            <li><strong>Don't leave required fields blank:</strong> Product Name and Category are essential for each product entry.</li>
            <li><strong>Avoid generic descriptions:</strong> Provide specific and detailed descriptions to differentiate products effectively.</li>
            <li><strong>Don't ignore pricing:</strong>  Where applicable, always include pricing information for accurate product representation.</li>
            <li><strong>Don't forget images:</strong>  Images enhance the visual appeal and user experience when products are displayed in the chatbot or admin panel.</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProductManagerManual;