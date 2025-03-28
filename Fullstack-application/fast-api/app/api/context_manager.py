import re
from collections import deque
from datetime import datetime, timedelta
from typing import List, Dict
from sentence_transformers import SentenceTransformer
import torch

class ContextManager:
    def __init__(self, model_name: str = "sentence-transformers/all-mpnet-base-v2"):
        self.model = SentenceTransformer(model_name)
        self.context_window = deque(maxlen=5)  # Keep last 5 exchanges
        self.entity_memory = {}
        self.topic_memory = {}
        self.recent_topics = []

    def preprocess_text(self, text: str) -> str:
        """Clean and normalize text"""
        text = text.lower().strip()
        text = re.sub(r'\s+', ' ', text)
        return text

    def extract_entities(self, text: str) -> List[str]:
        """Extract key entities from text"""
        entities = []
        product_pattern = r'(?i)(chatbot|widget|bot|ai|support)'
        number_pattern = r'\d+'
        
        products = re.findall(product_pattern, text)
        numbers = re.findall(number_pattern, text)
        
        entities.extend(products)
        entities.extend(numbers)
        
        return list(set(entities))

    def identify_topic(self, text: str) -> str:
        """Identify main topic of text"""
        topics = {
            'technical_support': ['error', 'problem', 'bug', 'fix', 'issue'],
            'pricing': ['price', 'cost', 'payment', 'subscription'],
            'features': ['feature', 'capability', 'can', 'able', 'support'],
            'installation': ['install', 'setup', 'configure', 'deployment'],
            'general_inquiry': ['what', 'how', 'when', 'who', 'where']
        }

        text = text.lower()
        topic_scores = {topic: 0 for topic in topics}
        
        for topic, keywords in topics.items():
            for keyword in keywords:
                if keyword in text:
                    topic_scores[topic] += 1
        
        return max(topic_scores.items(), key=lambda x: x[1])[0]

    def get_embeddings(self, text: str) -> torch.Tensor:
        """Get text embeddings using the model"""
        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True)
        with torch.no_grad():
            outputs = self.model(**inputs)
        return outputs.last_hidden_state.mean(dim=1)

    def update_context(self, message: Dict[str, str]):
        """Update context with new message"""
        text = message['content']
        entities = self.extract_entities(text)
        topic = self.identify_topic(text)
        
        self.context_window.append({
            'text': text,
            'entities': entities,
            'topic': topic,
            'timestamp': datetime.now()
        })
        
        for entity in entities:
            if entity not in self.entity_memory:
                self.entity_memory[entity] = {
                    'first_seen': datetime.now(),
                    'mentions': 0,
                    'last_context': ''
                }
            self.entity_memory[entity]['mentions'] += 1
            self.entity_memory[entity]['last_context'] = text
            
        if topic not in self.topic_memory:
            self.topic_memory[topic] = 0
        self.topic_memory[topic] += 1
        
        if topic not in self.recent_topics:
            self.recent_topics.append(topic)
            if len(self.recent_topics) > 3:
                self.recent_topics.pop(0)

    async def get_context_relevance(self, query: str, response: str) -> float:
        """Calculate relevance of response to query considering context"""
        if not self.context_window:
            return 1.0
            
        query_embedding = await self.get_embeddings(query)
        response_embedding = await self.get_embeddings(response)
        
        similarity = torch.cosine_similarity(query_embedding, response_embedding)
        
        query_topic = self.identify_topic(query)
        response_topic = self.identify_topic(response)
        topic_bonus = 0.1 if query_topic == response_topic else 0
        
        query_entities = set(self.extract_entities(query))
        response_entities = set(self.extract_entities(response))
        entity_overlap = len(query_entities.intersection(response_entities))
        entity_bonus = 0.05 * entity_overlap
        
        relevance = float(similarity) + topic_bonus + entity_bonus
        return min(1.0, relevance)

    def get_context_summary(self) -> Dict:
        """Get summary of current context"""
        return {
            'current_topic': self.recent_topics[-1] if self.recent_topics else None,
            'topic_history': self.recent_topics,
            'active_entities': [
                entity for entity, data in self.entity_memory.items()
                if (datetime.now() - data['first_seen']) < timedelta(minutes=30)
            ],
            'context_window': list(self.context_window)
        }

    def should_switch_topic(self, new_topic: str) -> bool:
        """Determine if it's appropriate to switch topics"""
        if not self.recent_topics:
            return True
            
        current_topic = self.recent_topics[-1]
        if new_topic == current_topic:
            return False
            
        topic_messages = sum(1 for ctx in self.context_window 
                           if ctx['topic'] == current_topic)
        
        return topic_messages >= 3