import DOMPurify from 'dompurify';

export const sanitizeMessage = (message) => {
    return DOMPurify.sanitize(message);
};