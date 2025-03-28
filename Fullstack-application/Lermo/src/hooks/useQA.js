import { useState, useEffect } from 'react';
import api from '../utils/api';

export const useQA = (searchQuery = "", page = 1, size = 10, language = "cs", category = null) => {
    const [questions, setQuestions] = useState([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const loadQuestions = async () => {
            try {
                const params = {
                    query: searchQuery,
                    page,
                    size,
                    language,
                };
                if (category) params.category = category;

                const response = await api.get('/api/qa/search', { params });
                setQuestions(response.data.items);
                setTotal(response.data.total);
            } catch (error) {
                console.error("Failed to fetch questions:", error);
            }
        };
        loadQuestions();
    }, [searchQuery, page, size, language, category]);

    return { questions, total };
};