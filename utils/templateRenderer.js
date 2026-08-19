const fs = require('fs');
const path = require('path');

// Resolve templates directory relative to this file's location
// From utils/ go up one level to project root, then into backend/templates/emails
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'backend', 'templates', 'emails');

/**
 * Render an email template with the given data.
 * @param {string} templateName - Name of the template file (without .html)
 * @param {Object} data - Data to interpolate into the template
 * @returns {string} Rendered HTML
 */
function renderTemplate(templateName, data = {}) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }
  
  let html = fs.readFileSync(templatePath, 'utf8');
  
  // Add year to all templates
  const templateData = {
    ...data,
    year: new Date().getFullYear(),
  };
  
  // Simple placeholder replacement: {{key}} -> value
  // Also supports {{#if condition}}...{{/if}} and {{#each array}}...{{/each}}
  html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    return templateData[key] ? content : '';
  });
  
  html = html.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, content) => {
    const arr = templateData[key];
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr.map(item => {
      if (typeof item === 'object') {
        let itemContent = content;
        Object.entries(item).forEach(([k, v]) => {
          itemContent = itemContent.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
        });
        return itemContent;
      }
      return content.replace('{{this}}', item);
    }).join('');
  });
  
  // Simple {{key}} replacement
  Object.entries(templateData).forEach(([key, value]) => {
    if (typeof value !== 'object' || Array.isArray(value)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
  });
  
  return html;
}

/**
 * Render the invitation email template
 * @param {Object} data - { name, email, role, orgUnit, loginUrl }
 * @returns {string} Rendered HTML
 */
function renderInviteEmail(data) {
  return renderTemplate('invite', data);
}

/**
 * Render the password reset email template
 * @param {Object} data - { name, resetUrl }
 * @returns {string} Rendered HTML
 */
function renderPasswordResetEmail(data) {
  return renderTemplate('password-reset', data);
}

/**
 * Render a generic notification email template
 * @param {Object} data - { title, name, message, actionUrl, actionText, details, alert }
 * @returns {string} Rendered HTML
 */
function renderNotificationEmail(data) {
  return renderTemplate('notification', data);
}

module.exports = {
  renderTemplate,
  renderInviteEmail,
  renderPasswordResetEmail,
  renderNotificationEmail,
};