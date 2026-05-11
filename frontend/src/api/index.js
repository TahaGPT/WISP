import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

export const getSample = async () => {
    const response = await axios.get(`${API_URL}/sample`);
    return response.data;
};

export const generateQuestion = async (article) => {
    const response = await axios.post(`${API_URL}/generate/question`, { article });
    return response.data;
};

export const generateOptions = async (article, question, correct_answer) => {
    const response = await axios.post(`${API_URL}/generate/options`, { 
        article, 
        question, 
        correct_answer 
    });
    return response.data;
};

export const verifyAnswer = async (article, question, selected_option, correct_answer, model_type) => {
    const response = await axios.post(`${API_URL}/verify`, {
        article,
        question,
        selected_option,
        correct_answer,
        model_type
    });
    return response.data;
};
